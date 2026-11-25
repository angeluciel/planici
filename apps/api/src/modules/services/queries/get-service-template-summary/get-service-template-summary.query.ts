import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class GetServiceTemplateSummaryQuery {
  constructor(readonly membership: Membership) {}
}
