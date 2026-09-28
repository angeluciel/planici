import type { TenantPlan, TenantRole } from '@planici/schemas';
import type { TenantRow } from '@src/database/schema/tenants.js';
import {
  Membership,
  Tenant,
  type TenantStatus,
} from '../../domain/tenant.entity.js';

export function toDomain(row: TenantRow): Tenant {
  return Tenant.fromProps({
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status as TenantStatus,
    plan: row.plan as TenantPlan,
    trialStartedAt: row.trialStartedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toMembership(row: TenantRow, role: string): Membership {
  return new Membership(toDomain(row), role as TenantRole);
}
