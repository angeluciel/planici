import type { RecordUpdateEnvelope } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class UpdateServiceCommand {
  constructor(
    readonly membership: Membership,
    readonly serviceId: string,
    /** The envelope; its loose keys still hold the attributes. */
    readonly payload: RecordUpdateEnvelope,
  ) {}
}
