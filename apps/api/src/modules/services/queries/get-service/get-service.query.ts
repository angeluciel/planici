import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class GetServiceQuery {
  constructor(
    readonly membership: Membership,
    readonly serviceId: string,
  ) {}
}
