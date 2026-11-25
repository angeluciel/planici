import type { ListServicesQueryData } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class ListServicesQuery {
  constructor(
    readonly membership: Membership,
    readonly filter: ListServicesQueryData,
  ) {}
}
