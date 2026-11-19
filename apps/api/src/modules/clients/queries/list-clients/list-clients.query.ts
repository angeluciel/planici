import type { ListClientsQueryData } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class ListClientsQuery {
  constructor(
    readonly membership: Membership,
    readonly filter: ListClientsQueryData,
  ) {}
}
