import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class ReactivateClientCommand {
  constructor(
    readonly membership: Membership,
    readonly clientId: string,
  ) {}
}
