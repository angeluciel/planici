import type { DeleteServiceRequestInput } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class DeleteServiceCommand {
  constructor(
    readonly membership: Membership,
    readonly serviceId: string,
    readonly payload: DeleteServiceRequestInput,
  ) {}
}
