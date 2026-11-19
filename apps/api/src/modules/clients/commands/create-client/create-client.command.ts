import type { RecordCreateEnvelope } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class CreateClientCommand {
  constructor(
    readonly membership: Membership,
    /** The caller; recorded as `attestedBy` (R12). */
    readonly userId: string,
    /** The envelope; its loose keys still hold the consent and the attributes. */
    readonly payload: RecordCreateEnvelope,
  ) {}
}
