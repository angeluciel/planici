import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { FormListResponse } from '@planici/schemas';
import {
  FORM_RECORD_STORE,
  type FormRecordStore,
} from '../../ports/form-record-store.js';
import {
  FORM_REPOSITORY,
  type FormRepository,
} from '../../ports/form-repository.js';
import {
  RECORD_HISTORY_READER,
  type RecordHistoryReader,
} from '../../ports/record-history.reader.js';
import { ListFormsQuery } from './list-forms.query.js';

@QueryHandler(ListFormsQuery)
export class ListFormsHandler implements IQueryHandler<ListFormsQuery> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
    @Inject(FORM_RECORD_STORE) private readonly records: FormRecordStore,
    @Inject(RECORD_HISTORY_READER)
    private readonly history: RecordHistoryReader,
  ) {}

  async execute(query: ListFormsQuery): Promise<FormListResponse> {
    const tenantId = query.membership.tenant.id;
    const rows = await this.forms.list(tenantId, query.filter);

    const [recordCounts, withHistory] = await Promise.all([
      this.records.recordCountsByForm(tenantId),
      // at most 200 templates (R19), so one call each stays bounded
      Promise.all(
        rows.map((row) =>
          this.history.countRecordsWithHistory(tenantId, row.id),
        ),
      ),
    ]);

    return {
      forms: rows.map((row, index) => ({
        id: row.id,
        type: row.type,
        name: row.name,
        description: row.description,
        status: row.status,
        version: row.latestVersion,
        fieldCount: row.fieldCount,
        recordCount: recordCounts.get(row.id) ?? 0,
        recordsWithHistory: withHistory[index] ?? 0,
        updatedAt: row.updatedAt.toISOString(),
      })),
    };
  }
}
