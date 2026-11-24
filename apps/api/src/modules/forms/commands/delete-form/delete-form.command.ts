import type { DeleteFormRequestInput } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class DeleteFormCommand {
  constructor(
    readonly membership: Membership,
    readonly formId: string,
    readonly payload: DeleteFormRequestInput,
  ) {}
}
