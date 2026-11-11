import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class UnarchiveFormCommand {
  constructor(
    readonly membership: Membership,
    readonly formId: string,
  ) {}
}
