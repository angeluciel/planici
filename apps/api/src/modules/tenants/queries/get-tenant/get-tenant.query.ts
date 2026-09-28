import type { Membership } from '../../domain/tenant.entity.js';

export class GetTenantQuery {
  constructor(readonly membership: Membership) {}
}
