import { Inject, Injectable } from '@nestjs/common';
import type { ServiceResponse } from '@planici/schemas';
import type { TransactionHandle } from '@modules/forms/ports/form-repository.js';
import type { TenantTransaction } from '@modules/tenants/infrastructure/persistence/tenant-scope.js';
import { RecordService } from '@modules/records/application/record.service.js';
import { ServiceNotFoundError } from '../domain/errors/service.errors.js';
import {
  SERVICE_HISTORY_READER,
  type ServiceHistoryReader,
} from '../ports/service-history.reader.js';
import type { StoredService } from '../ports/service.repository.js';

/**
 * The Service response of SPEC-0005 section 7: the record as SPEC-0003 reads it
 * (presence `{}`: the service has no optional system field), with the service's
 * own attributes, status and history. `createdAt` and `updatedAt` come from the
 * service row, so the view and the list report the same last update time (R11).
 */
@Injectable()
export class ServicePresenter {
  constructor(
    private readonly records: RecordService,
    @Inject(SERVICE_HISTORY_READER)
    private readonly history: ServiceHistoryReader,
  ) {}

  async present(
    service: StoredService,
    tx?: TenantTransaction,
  ): Promise<ServiceResponse> {
    const record = await this.records.read(
      service.tenantId,
      service.formRecordId,
      {},
      tx,
    );
    // the service row without its record cannot happen (one-to-one, cascade)
    if (!record) throw new ServiceNotFoundError();

    const hasHistory = await this.history.hasHistory(
      service.tenantId,
      service.id,
      tx as unknown as TransactionHandle | undefined,
    );

    return {
      ...record,
      id: service.id,
      name: service.name,
      durationMinutes: service.durationMinutes,
      priceCents: service.priceCents,
      currency: service.currency,
      status: service.status,
      createdAt: service.createdAt.toISOString(),
      updatedAt: service.updatedAt.toISOString(),
      hasHistory,
    };
  }
}
