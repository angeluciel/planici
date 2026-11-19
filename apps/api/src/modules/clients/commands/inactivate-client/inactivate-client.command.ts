import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class InactivateClientCommand {
  constructor(
    readonly membership: Membership,
    readonly clientId: string,
  ) {}
}
