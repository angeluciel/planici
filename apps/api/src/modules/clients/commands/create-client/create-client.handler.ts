import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ClientResponse,
  ClientAttributesSchema,
  ClientConsentCreateSchema,
  textKey,
} from '@planici/schemas';
import { RecordService } from '@modules/records/application/record.service.js';
import { ClientPresenter } from '../../application/present-client.js';
import {
  ClientPhoneRequiredError,
  ConsentTextOutdatedError,
} from '../../domain/errors/client.errors.js';
import { parseOrThrow } from '../../domain/parse.js';
import { CLIENT_CONSENT_VERSION } from '../../ports/client-consent-version.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../ports/client.repository.js';
import { CreateClientCommand } from './create-client.command.js';

@CommandHandler(CreateClientCommand)
export class CreateClientHandler implements ICommandHandler<CreateClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(CLIENT_CONSENT_VERSION) private readonly consentVersion: string,
    private readonly records: RecordService,
    private readonly presenter: ClientPresenter,
  ) {}

  async execute(command: CreateClientCommand): Promise<ClientResponse> {
    const { membership, userId, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    return this.clients.transaction(tenantId, async (tx) => {
      // SPEC-0003 section 6 steps 2 to 4
      const draft = await this.records.openForCreate(tx, tenantId, 'client', {
        formId: payload.formId,
        formVersion: payload.formVersion,
      });

      // SPEC-0004 section 6 order: consent, attributes, phone, values, e-mail
      const consent = parseOrThrow(ClientConsentCreateSchema, payload);
      if (consent.consentTextVersion !== this.consentVersion) {
        throw new ConsentTextOutdatedError();
      }

      const attributes = parseOrThrow(ClientAttributesSchema, payload);
      if (draft.isRequired('client.phone') && attributes.phone === null) {
        throw new ClientPhoneRequiredError();
      }

      const values = draft.checkValues(payload.values);
      const formRecordId = await draft.insert(values);

      const { id } = await this.clients.insert(tx, {
        tenantId,
        formRecordId,
        name: attributes.name,
        nameKey: textKey(attributes.name),
        email: attributes.email,
        phone: attributes.phone,
        consentAttestedBy: userId,
        consentAttestedAt: new Date(),
        consentTextVersion: consent.consentTextVersion,
      });

      const stored = await this.clients.find(tenantId, id, tx);
      return this.presenter.present(stored!, tx);
    });
  }
}
