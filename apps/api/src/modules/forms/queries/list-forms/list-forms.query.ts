import type { ListFormsQueryData } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class ListFormsQuery {
  constructor(
    readonly membership: Membership,
    readonly filter: ListFormsQueryData,
  ) {}
}
