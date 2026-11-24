import type { FormTemplate as FormTemplateDto } from '@planici/schemas';
import type { FormTemplate } from '../domain/form-template.js';
import type { FormRecordStore } from '../ports/form-record-store.js';
import type { RecordHistoryReader } from '../ports/record-history.reader.js';

/** Reads the counts a FormTemplate response needs and builds the response. */
export async function presentForm(
  template: FormTemplate,
  store: Pick<FormRecordStore, 'counts' | 'valueCountsByField'>,
  history: RecordHistoryReader,
): Promise<FormTemplateDto> {
  const [counts, valueCounts, recordsWithHistory] = await Promise.all([
    store.counts(template.tenantId, template.id),
    store.valueCountsByField(template.tenantId, template.id),
    history.countRecordsWithHistory(template.tenantId, template.id),
  ]);

  return template.toPublic({ ...counts, recordsWithHistory, valueCounts });
}
