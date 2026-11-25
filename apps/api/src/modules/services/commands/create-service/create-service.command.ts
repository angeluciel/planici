import type { RecordCreateEnvelope } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class CreateServiceCommand {
  constructor(
    readonly membership: Membership,
    /** The envelope; its loose keys still hold the attributes. */
    readonly payload: RecordCreateEnvelope,
  ) {}
}
