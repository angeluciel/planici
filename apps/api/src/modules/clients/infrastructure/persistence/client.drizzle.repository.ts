import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, or, type SQL, sql } from 'drizzle-orm';
import type { ClientStatus } from '@planici/schemas';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import { clients, forms, formRecords } from '@src/database/schema/index.js';
import { TenantScope } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import { ClientEmailTakenError } from '../../domain/errors/client.errors.js';
import type {
  ClientExecutor,
  ClientListFilter,
  ClientListRow,
  ClientRepository,
  NewClient,
  StoredClient,
} from '../../ports/client.repository.js';
import { guardQuery, pgErrorOf } from './guard-query.js';

const EMAIL_INDEX = 'idx_clients_tenant_email';
const UNIQUE_VIOLATION = '23505';

// `inactive` of the contract is stored as `suspended` (plan, Decision 2); this
// pair of functions is the only place that knows
const toStoredStatus = (status: ClientStatus) =>
  status === 'inactive' ? ('suspended' as const) : ('active' as const);

const toContractStatus = (status: string): ClientStatus =>
  status === 'active' ? 'active' : 'inactive';

const columns = {
  id: clients.id,
  tenantId: clients.tenantId,
  formRecordId: clients.formRecordId,
  name: clients.name,
  email: clients.email,
  phone: clients.phone,
  status: clients.status,
  consentAttestedBy: clients.consentAttestedBy,
  consentAttestedAt: clients.consentAttestedAt,
  consentTextVersion: clients.consentTextVersion,
};

function toStored(row: {
  id: string;
  tenantId: string;
  formRecordId: string;
  name: string;
  email: string;
  phone: string | null;
  status: string;
  consentAttestedBy: string;
  consentAttestedAt: Date;
  consentTextVersion: string;
}): StoredClient {
  return { ...row, status: toContractStatus(row.status) };
}

/** Runs a write that can break the e-mail index; that one is a 409, the rest a `ClientPersistenceError`. */
async function guardWrite<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const { code, constraint } = pgErrorOf(error);

    if (code === UNIQUE_VIOLATION && constraint === EMAIL_INDEX) {
      throw new ClientEmailTakenError();
    }

    return guardQuery(() => Promise.reject(error));
  }
}

@Injectable()
export class DrizzleClientRepository implements ClientRepository {
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

  insert(tx: TenantTransaction, client: NewClient): Promise<{ id: string }> {
    return guardWrite(async () => {
      const [row] = await tx
        .insert(clients)
        .values({
          tenantId: client.tenantId,
          formRecordId: client.formRecordId,
          name: client.name,
          nameKey: client.nameKey,
          email: client.email,
          phone: client.phone,
          consentAttestedBy: client.consentAttestedBy,
          consentAttestedAt: client.consentAttestedAt,
          consentTextVersion: client.consentTextVersion,
        })
        .returning({ id: clients.id });

      if (!row) throw new Error('insert into clients returned no row');

      return row;
    });
  }

  lockById(
    tx: TenantTransaction,
    tenantId: string,
    clientId: string,
  ): Promise<StoredClient | null> {
    return guardQuery(async () => {
      const [row] = await tx
        .select(columns)
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
        .for('update')
        .limit(1);

      return row ? toStored(row) : null;
    });
  }

  find(
    tenantId: string,
    clientId: string,
    executor: ClientExecutor = this.db,
  ): Promise<StoredClient | null> {
    return guardQuery(async () => {
      const [row] = await executor
        .select(columns)
        .from(clients)
        .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)))
        .limit(1);

      return row ? toStored(row) : null;
    });
  }

  updateAttributes(
    tx: TenantTransaction,
    tenantId: string,
    clientId: string,
    attributes: {
      name: string;
      nameKey: string;
      email: string;
      phone: string | null;
    },
  ): Promise<void> {
    return guardWrite(async () => {
      await tx
        .update(clients)
        .set({ ...attributes, updatedAt: new Date() })
        .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));
    });
  }

  setStatus(
    tx: TenantTransaction,
    tenantId: string,
    clientId: string,
    status: ClientStatus,
  ): Promise<void> {
    return guardQuery(async () => {
      await tx
        .update(clients)
        .set({ status: toStoredStatus(status), updatedAt: new Date() })
        .where(and(eq(clients.id, clientId), eq(clients.tenantId, tenantId)));
    });
  }

  list(tenantId: string, filter: ClientListFilter): Promise<ClientListRow[]> {
    return guardQuery(async () => {
      const conditions: (SQL | undefined)[] = [eq(clients.tenantId, tenantId)];

      if (filter.status !== 'all') {
        conditions.push(eq(clients.status, toStoredStatus(filter.status)));
      }

      if (filter.search) {
        const { pattern, phonePattern } = filter.search;

        conditions.push(
          or(
            sql`${clients.nameKey} like ${pattern}`,
            sql`${clients.email} like ${pattern}`,
            phonePattern
              ? sql`${clients.phone} like ${phonePattern}`
              : undefined,
          ),
        );
      }

      if (filter.after) {
        conditions.push(
          sql`(${clients.nameKey}, ${clients.id}) > (${filter.after.nameKey}, ${filter.after.id}::uuid)`,
        );
      }

      const rows = await this.db
        .select({
          id: clients.id,
          name: clients.name,
          nameKey: clients.nameKey,
          email: clients.email,
          phone: clients.phone,
          formId: formRecords.formId,
          formName: forms.name,
          status: clients.status,
        })
        .from(clients)
        .innerJoin(
          formRecords,
          and(
            eq(formRecords.id, clients.formRecordId),
            eq(formRecords.tenantId, tenantId),
          ),
        )
        .innerJoin(
          forms,
          and(eq(forms.id, formRecords.formId), eq(forms.tenantId, tenantId)),
        )
        .where(and(...conditions))
        .orderBy(asc(clients.nameKey), asc(clients.id))
        .limit(filter.take);

      return rows.map((row) => ({
        ...row,
        status: toContractStatus(row.status),
      }));
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
