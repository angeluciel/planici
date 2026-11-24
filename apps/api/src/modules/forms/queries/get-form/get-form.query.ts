import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class GetFormQuery {
  constructor(
    readonly membership: Membership,
    readonly formId: string,
  ) {}
}
