import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ne } from 'drizzle-orm';
import { DRIZZLE } from '@src/database/database.constants.js';
import type { Database } from '@src/database/database.module.js';
import { tenantMemberships, tenants } from '@src/database/schema/index.js';
import type {
  CreateTenantData,
  TenantRepository,
} from '../../ports/repositories/tenant.repository.js';
import { TenantSlugTakenError } from '../../domain/errors/tenant.errors.js';
import type { Membership, Tenant } from '../../domain/tenant.entity.js';
import { toDomain, toMembership } from './tenant.mapper.js';

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class DrizzleTenantRepository implements TenantRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Database) {}

  async findMembership(
    tenantId: string,
    userId: string,
  ): Promise<Membership | null> {
    const [row] = await this.db
      .select({ tenant: tenants, role: tenantMemberships.role })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userId, userId),
          eq(tenantMemberships.status, 'active'),
          ne(tenants.status, 'deleted'),
        ),
      )
      .limit(1);

    return row ? toMembership(row.tenant, row.role) : null;
  }

  async listMemberships(userId: string): Promise<Membership[]> {
    const rows = await this.db
      .select({ tenant: tenants, role: tenantMemberships.role })
      .from(tenantMemberships)
      .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
      .where(
        and(
          eq(tenantMemberships.userId, userId),
          eq(tenantMemberships.status, 'active'),
          ne(tenants.status, 'deleted'),
        ),
      )
      .orderBy(asc(tenants.createdAt));

    return rows.map((row) => toMembership(row.tenant, row.role));
  }

  async slugExists(slug: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);

    return Boolean(row);
  }

  async createWithOwner(
    data: CreateTenantData,
    ownerId: string,
  ): Promise<Tenant> {
    try {
      return await this.db.transaction(async (tx) => {
        const [row] = await tx
          .insert(tenants)
          .values({ name: data.name, slug: data.slug })
          .returning();

        if (!row) throw new Error('insert into tenants returned no row');

        await tx.insert(tenantMemberships).values({
          tenantId: row.id,
          userId: ownerId,
          role: 'owner',
        });

        return toDomain(row);
      });
    } catch (error) {
      throw this.translateUniqueViolation(error);
    }
  }

  async rename(tenantId: string, name: string): Promise<Tenant> {
    const [row] = await this.db
      .update(tenants)
      .set({ name, updatedAt: new Date() })
      .where(eq(tenants.id, tenantId))
      .returning();

    if (!row) throw new Error(`tenant ${tenantId} vanished during rename`);

    return toDomain(row);
  }

  private translateUniqueViolation(error: unknown): unknown {
    const candidate =
      error instanceof Error && error.cause ? error.cause : error;

    if (typeof candidate !== 'object' || candidate === null) return error;
    if ((candidate as { code?: string }).code !== UNIQUE_VIOLATION)
      return error;

    const constraint = (candidate as { constraint?: string }).constraint ?? '';
    if (constraint === 'idx_tenants_slug') return new TenantSlugTakenError();

    return error;
  }
}
