import type { RecordUpdateEnvelope } from '@planici/schemas';
import type { Membership } from '@modules/tenants/domain/tenant.entity.js';

export class UpdateClientCommand {
  constructor(
    readonly membership: Membership,
    readonly clientId: string,
    /** The envelope; its loose keys still hold the consent keys and the attributes. */
    readonly payload: RecordUpdateEnvelope,
  ) {}
}
