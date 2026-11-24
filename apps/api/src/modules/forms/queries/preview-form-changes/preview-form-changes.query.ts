import type { PreviewFormChangesRequestInput } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class PreviewFormChangesQuery {
  constructor(
    readonly membership: Membership,
    readonly formId: string,
    readonly payload: PreviewFormChangesRequestInput,
  ) {}
}
