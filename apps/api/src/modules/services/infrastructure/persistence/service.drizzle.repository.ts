import { Inject, Injectable } from '@nestjs/common';
import { and, asc, desc, eq, type SQL, sql } from 'drizzle-orm';
import type { ServiceStatus, ServiceTemplateSummary } from '@planici/schemas';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import { forms, formRecords, services } from '@src/database/schema/index.js';
import { TenantScope } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import { ServiceNameTakenError } from '../../domain/errors/service.errors.js';
import type {
  NewService,
  ServiceAttributes,
  ServiceCountFilter,
  ServiceExecutor,
  ServiceListFilter,
  ServiceListRow,
  ServiceRepository,
  StoredService,
} from '../../ports/service.repository.js';
import { guardQuery, pgErrorOf } from './guard-query.js';

const NAME_INDEX = 'idx_services_tenant_name_key';
const UNIQUE_VIOLATION = '23505';

// `inactive` of the contract is stored as `suspended` (plan, G-4); this pair of
// functions is the only place that knows
const toStoredStatus = (status: ServiceStatus) =>
  status === 'inactive' ? ('suspended' as const) : ('active' as const);

const toContractStatus = (status: string): ServiceStatus =>
  status === 'active' ? 'active' : 'inactive';

const columns = {
  id: services.id,
  tenantId: services.tenantId,
  formRecordId: services.formRecordId,
  name: services.name,
  durationMinutes: services.durationMinutes,
  priceCents: services.priceCents,
  status: services.status,
  createdAt: services.createdAt,
  updatedAt: services.updatedAt,
};

// the exact stored `updated_at`, microseconds included, as the `-updatedAt`
// cursor key (SPEC-0006 plan, G-6)
const updatedAtKey = sql<string>`to_char(${services.updatedAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

// the `form` sort orders by (template name key, service name key, id); its
// cursor key carries the first two as a JSON array
const formSortKey = sql<string>`json_build_array(${forms.nameKey}, ${services.nameKey})::text`;

/** The conditions `list` and `count` share: tenant, status, search, template. */
function filterConditions(
  tenantId: string,
  filter: ServiceCountFilter,
): (SQL | undefined)[] {
  const conditions: (SQL | undefined)[] = [
    eq(services.tenantId, tenantId),
    // the join to a template of type `service` of this tenant (R11)
    eq(forms.type, 'service'),
  ];

  if (filter.status !== 'all') {
    conditions.push(eq(services.status, toStoredStatus(filter.status)));
  }

  if (filter.search) {
    conditions.push(sql`${services.nameKey} like ${filter.search.pattern}`);
  }

  if (filter.formId) {
    conditions.push(eq(formRecords.formId, filter.formId));
  }

  return conditions;
}

/** Order, keyset and cursor key of each sort (SPEC-0005 R11). */
function sortOf(filter: ServiceListFilter) {
  const after = filter.after;

  switch (filter.sort) {
    case '-name':
      return {
        orderBy: [desc(services.nameKey), desc(services.id)],
        keyset: after
          ? sql`(${services.nameKey}, ${services.id}) < (${after.key}, ${after.id}::uuid)`
          : undefined,
        sortKey: sql<string>`${services.nameKey}`,
      };
    case '-updatedAt':
      return {
        orderBy: [desc(services.updatedAt), desc(services.id)],
        keyset: after
          ? sql`(${services.updatedAt}, ${services.id}) < (${after.key}::timestamptz, ${after.id}::uuid)`
          : undefined,
        sortKey: updatedAtKey,
      };
    case 'form':
      return {
        orderBy: [asc(forms.nameKey), asc(services.nameKey), asc(services.id)],
        keyset: after
          ? sql`(${forms.nameKey}, ${services.nameKey}, ${services.id}) > ((${after.key}::json->>0), (${after.key}::json->>1), ${after.id}::uuid)`
          : undefined,
        sortKey: formSortKey,
      };
    case 'name':
      return {
        orderBy: [asc(services.nameKey), asc(services.id)],
        keyset: after
          ? sql`(${services.nameKey}, ${services.id}) > (${after.key}, ${after.id}::uuid)`
          : undefined,
        sortKey: sql<string>`${services.nameKey}`,
      };
  }
}

function toStored(row: {
  id: string;
  tenantId: string;
  formRecordId: string;
  name: string;
  durationMinutes: number;
  priceCents: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): StoredService {
  return { ...row, currency: 'BRL', status: toContractStatus(row.status) };
}

/** Runs a write that can break the name index; that one is a 409, the rest a `ServicePersistenceError`. */
async function guardWrite<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const { code, constraint } = pgErrorOf(error);

    if (code === UNIQUE_VIOLATION && constraint === NAME_INDEX) {
      throw new ServiceNameTakenError();
    }

    return guardQuery(() => Promise.reject(error));
  }
}

@Injectable()
export class DrizzleServiceRepository implements ServiceRepository {
  constructor(
    @Inject(DRIZZLE) private readonly db: Database,
    private readonly scope: TenantScope,
  ) {}

  transaction<T>(
    tenantId: string,
    work: (tx: TenantTransaction) => Promise<T>,
  ): Promise<T> {
    return this.scope.run(tenantId, work);
  }

  insert(tx: TenantTransaction, service: NewService): Promise<{ id: string }> {
    return guardWrite(async () => {
      const [row] = await tx
        .insert(services)
        .values({
          tenantId: service.tenantId,
          formRecordId: service.formRecordId,
          name: service.name,
          nameKey: service.nameKey,
          durationMinutes: service.durationMinutes,
          priceCents: service.priceCents,
          currency: 'BRL',
        })
        .returning({ id: services.id });

      if (!row) throw new Error('insert into services returned no row');

      return row;
    });
  }

  lockById(
    tx: TenantTransaction,
    tenantId: string,
    serviceId: string,
  ): Promise<StoredService | null> {
    return guardQuery(async () => {
      const [row] = await tx
        .select(columns)
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
        .for('update')
        .limit(1);

      return row ? toStored(row) : null;
    });
  }

  find(
    tenantId: string,
    serviceId: string,
    executor: ServiceExecutor = this.db,
  ): Promise<StoredService | null> {
    return guardQuery(async () => {
      const [row] = await executor
        .select(columns)
        .from(services)
        .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
        .limit(1);

      return row ? toStored(row) : null;
    });
  }

  updateAttributes(
    tx: TenantTransaction,
    tenantId: string,
    serviceId: string,
    attributes: ServiceAttributes,
  ): Promise<void> {
    return guardWrite(async () => {
      await tx
        .update(services)
        .set({ ...attributes, updatedAt: new Date() })
        .where(
          and(eq(services.id, serviceId), eq(services.tenantId, tenantId)),
        );
    });
  }

  setStatus(
    tx: TenantTransaction,
    tenantId: string,
    serviceId: string,
    status: ServiceStatus,
  ): Promise<Date> {
    return guardQuery(async () => {
      const [row] = await tx
        .update(services)
        .set({ status: toStoredStatus(status), updatedAt: new Date() })
        .where(and(eq(services.id, serviceId), eq(services.tenantId, tenantId)))
        .returning({ updatedAt: services.updatedAt });

      if (!row) throw new Error('update of services returned no row');

      return row.updatedAt;
    });
  }

  list(tenantId: string, filter: ServiceListFilter): Promise<ServiceListRow[]> {
    return guardQuery(async () => {
      const { orderBy, keyset, sortKey } = sortOf(filter);
      const conditions = [...filterConditions(tenantId, filter), keyset];

      const rows = await this.db
        .select({
          id: services.id,
          name: services.name,
          durationMinutes: services.durationMinutes,
          priceCents: services.priceCents,
          formId: formRecords.formId,
          formName: forms.name,
          status: services.status,
          updatedAt: services.updatedAt,
          sortKey,
        })
        .from(services)
        .innerJoin(
          formRecords,
          and(
            eq(formRecords.id, services.formRecordId),
            eq(formRecords.tenantId, tenantId),
          ),
        )
        .innerJoin(
          forms,
          and(eq(forms.id, formRecords.formId), eq(forms.tenantId, tenantId)),
        )
        .where(and(...conditions))
        .orderBy(...orderBy)
        .limit(filter.take);

      return rows.map((row) => ({
        ...row,
        currency: 'BRL' as const,
        status: toContractStatus(row.status),
      }));
    });
  }

  count(tenantId: string, filter: ServiceCountFilter): Promise<number> {
    return guardQuery(async () => {
      const [row] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(services)
        .innerJoin(
          formRecords,
          and(
            eq(formRecords.id, services.formRecordId),
            eq(formRecords.tenantId, tenantId),
          ),
        )
        .innerJoin(
          forms,
          and(eq(forms.id, formRecords.formId), eq(forms.tenantId, tenantId)),
        )
        .where(and(...filterConditions(tenantId, filter)));

      return row?.total ?? 0;
    });
  }

  templateSummary(tenantId: string): Promise<ServiceTemplateSummary> {
    return guardQuery(async () => {
      const templates = await this.db
        .select({
          id: forms.id,
          name: forms.name,
          status: forms.status,
          activeCount: sql<number>`count(*)::int`,
        })
        .from(forms)
        .innerJoin(
          formRecords,
          and(
            eq(formRecords.formId, forms.id),
            eq(formRecords.tenantId, tenantId),
          ),
        )
        .innerJoin(
          services,
          and(
            eq(services.formRecordId, formRecords.id),
            eq(services.tenantId, tenantId),
            eq(services.status, 'active'),
          ),
        )
        .where(and(eq(forms.tenantId, tenantId), eq(forms.type, 'service')))
        .groupBy(forms.id, forms.name, forms.status, forms.nameKey)
        .orderBy(asc(forms.nameKey), asc(forms.id));

      const [archived] = await this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(services)
        .where(
          and(
            eq(services.tenantId, tenantId),
            eq(services.status, 'suspended'),
          ),
        );

      return {
        templates: templates.map((row) => ({
          id: row.id,
          name: row.name,
          status: row.status === 'archived' ? 'archived' : 'active',
          activeCount: row.activeCount,
        })),
        archivedCount: archived?.total ?? 0,
      };
    });
  }

  deleteRecord(
    tx: TenantTransaction,
    tenantId: string,
    formRecordId: string,
  ): Promise<void> {
    return guardQuery(async () => {
      await tx
        .delete(formRecords)
        .where(
          and(
            eq(formRecords.id, formRecordId),
            eq(formRecords.tenantId, tenantId),
          ),
        );
    });
  }
}
