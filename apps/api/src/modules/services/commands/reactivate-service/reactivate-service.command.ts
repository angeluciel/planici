import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class ReactivateServiceCommand {
  constructor(
    readonly membership: Membership,
    readonly serviceId: string,
  ) {}
}
