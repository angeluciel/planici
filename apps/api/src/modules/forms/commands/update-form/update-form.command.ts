import type { UpdateFormRequestInput } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class UpdateFormCommand {
  constructor(
    readonly membership: Membership,
    readonly formId: string,
    readonly payload: UpdateFormRequestInput,
  ) {}
}
