import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class GetClientQuery {
  constructor(
    readonly membership: Membership,
    readonly clientId: string,
  ) {}
}
