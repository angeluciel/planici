import type { DeleteClientRequestInput } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class DeleteClientCommand {
  constructor(
    readonly membership: Membership,
    readonly clientId: string,
    readonly payload: DeleteClientRequestInput,
  ) {}
}
