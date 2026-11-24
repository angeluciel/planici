import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class GetFormVersionQuery {
  constructor(
    readonly membership: Membership,
    readonly formId: string,
    readonly version: number,
  ) {}
}
