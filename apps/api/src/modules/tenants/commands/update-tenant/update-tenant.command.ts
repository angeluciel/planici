import type { UpdateTenantRequestInput } from '@planici/schemas';
import type { Membership } from '../../domain/tenant.entity.js';

export class UpdateTenantCommand {
  constructor(
    readonly membership: Membership,
    readonly payload: UpdateTenantRequestInput,
  ) {}
}
