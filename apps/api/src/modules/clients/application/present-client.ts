import { Inject, Injectable } from '@nestjs/common';
import type { ClientResponse } from '@planici/schemas';
import type { TransactionHandle } from '@modules/forms/ports/form-repository.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import { RecordService } from '@modules/records/application/record.service.js';
import { ClientNotFoundError } from '../domain/errors/client.errors.js';
import {
  CLIENT_HISTORY_READER,
  type ClientHistoryReader,
} from '../ports/client-history.reader.js';
import type { StoredClient } from '../ports/client.repository.js';

/**
 * The Client response of SPEC-0004 section 7: the record as SPEC-0003 reads it,
 * with the client's own attributes, status, history and attestation (SPEC-0003
 * point 5). `createdAt` and `updatedAt` come from the record (plan, Decision 9).
 */
@Injectable()
export class ClientPresenter {
  constructor(
    private readonly records: RecordService,
    @Inject(CLIENT_HISTORY_READER)
    private readonly history: ClientHistoryReader,
  ) {}

  async present(
    client: StoredClient,
    tx?: TenantTransaction,
  ): Promise<ClientResponse> {
    const record = await this.records.read(
      client.tenantId,
      client.formRecordId,
      { 'client.phone': client.phone !== null },
      tx,
    );
    // the client row without its record cannot happen (one-to-one, cascade)
    if (!record) throw new ClientNotFoundError();

    const hasHistory = await this.history.hasHistory(
      client.tenantId,
      client.id,
      tx as unknown as TransactionHandle | undefined,
    );

    return {
      ...record,
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      status: client.status,
      hasHistory,
      consentAttestation: {
        attestedBy: client.consentAttestedBy,
        attestedAt: client.consentAttestedAt.toISOString(),
        textVersion: client.consentTextVersion,
      },
    };
  }
}
