import type { CreateFormRequestData } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class CreateFormCommand {
  constructor(
    readonly membership: Membership,
    readonly payload: CreateFormRequestData,
  ) {}
}
