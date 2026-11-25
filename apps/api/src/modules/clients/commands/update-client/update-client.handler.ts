import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  type ClientResponse,
  ClientAttributesSchema,
  ClientConsentUpdateSchema,
  textKey,
} from '@planici/schemas';
import { RecordService } from '@modules/records/application/record.service.js';
import { RecordNotFoundError } from '@modules/records/domain/errors/record.errors.js';
import { ClientPresenter } from '../../application/present-client.js';
import {
  ClientNotFoundError,
  ClientPhoneRequiredError,
} from '../../domain/errors/client.errors.js';
import { parseOrThrow } from '@shared/list/parse-or-throw.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../ports/client.repository.js';
import { UpdateClientCommand } from './update-client.command.js';

@CommandHandler(UpdateClientCommand)
export class UpdateClientHandler implements ICommandHandler<UpdateClientCommand> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    private readonly records: RecordService,
    private readonly presenter: ClientPresenter,
  ) {}

  async execute(command: UpdateClientCommand): Promise<ClientResponse> {
    const { membership, clientId, payload } = command;
    membership.assertCanManage();
    const tenantId = membership.tenant.id;

    return this.clients.transaction(tenantId, async (tx) => {
      const client = await this.clients.lockById(tx, tenantId, clientId);
      if (!client) throw new ClientNotFoundError();

      // SPEC-0003 section 6 steps 3 and 4
      const draft = await this.records
        .openForUpdate(tx, tenantId, client.formRecordId, 'client', {
          formVersion: payload.formVersion,
          revision: payload.revision,
        })
        .catch((error: unknown) => {
          throw error instanceof RecordNotFoundError
            ? new ClientNotFoundError()
            : error;
        });

      // SPEC-0004 section 6 order: consent, attributes, phone, values, e-mail
      parseOrThrow(ClientConsentUpdateSchema, payload);
      const attributes = parseOrThrow(ClientAttributesSchema, payload);
      if (draft.isRequired('client.phone') && attributes.phone === null) {
        throw new ClientPhoneRequiredError();
      }

      const values = draft.checkValues(payload.values);
      await draft.replace(values);

      // the attestation columns are never written here (AC-0004-27)
      await this.clients.updateAttributes(tx, tenantId, clientId, {
        name: attributes.name,
        nameKey: textKey(attributes.name),
        email: attributes.email,
        phone: attributes.phone,
      });

      const stored = await this.clients.find(tenantId, clientId, tx);
      return this.presenter.present(stored!, tx);
    });
  }
}
