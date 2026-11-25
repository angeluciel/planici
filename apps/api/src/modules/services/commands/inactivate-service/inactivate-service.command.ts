import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class InactivateServiceCommand {
  constructor(
    readonly membership: Membership,
    readonly serviceId: string,
  ) {}
}
