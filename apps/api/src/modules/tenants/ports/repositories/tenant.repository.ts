import type { Membership, Tenant } from '../../domain/tenant.entity.js';

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY');

export type CreateTenantData = {
  name: string;
  slug: string;
};

export interface TenantRepository {
  findMembership(tenantId: string, userId: string): Promise<Membership | null>;

  listMemberships(userId: string): Promise<Membership[]>;

  slugExists(slug: string): Promise<boolean>;

  createWithOwner(data: CreateTenantData, ownerId: string): Promise<Tenant>;

  rename(tenantId: string, name: string): Promise<Tenant>;
}
