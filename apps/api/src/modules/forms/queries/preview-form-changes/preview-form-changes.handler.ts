import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { FormChangePreviewResponse } from '@planici/schemas';
import { FormNotFoundError } from '../../domain/errors/form.errors.js';
import { FieldPolicy } from '../../domain/field-policy.js';
import { FormTemplate } from '../../domain/form-template.js';
import { toNextVersionShape } from '../../domain/next-version-shape.js';
import { diffSchema } from '../../domain/schema-diff.js';
import {
  FORM_RECORD_STORE,
  type FormRecordStore,
} from '../../ports/form-record-store.js';
import {
  FORM_REPOSITORY,
  type FormRepository,
} from '../../ports/form-repository.js';
import {
  SYSTEM_FIELD_PRESENCE,
  type SystemFieldPresence,
} from '../../ports/system-field-presence.js';
import { PreviewFormChangesQuery } from './preview-form-changes.query.js';

/** Stores nothing and does not change the revision: a query, not a command. */
@QueryHandler(PreviewFormChangesQuery)
export class PreviewFormChangesHandler implements IQueryHandler<PreviewFormChangesQuery> {
  constructor(
    @Inject(FORM_REPOSITORY) private readonly forms: FormRepository,
    @Inject(FORM_RECORD_STORE) private readonly records: FormRecordStore,
    @Inject(SYSTEM_FIELD_PRESENCE)
    private readonly presence: SystemFieldPresence,
  ) {}

  async execute(
    query: PreviewFormChangesQuery,
  ): Promise<FormChangePreviewResponse> {
    const { membership, formId, payload } = query;
    const tenantId = membership.tenant.id;

    const stored = await this.forms.findById(tenantId, formId);
    if (!stored) throw new FormNotFoundError();

    const template = FormTemplate.fromStored(stored);
    template.assertRevision(payload.revision);

    const planned = FieldPolicy.plan(
      { formType: stored.type, mode: 'update', current: stored.fields },
      payload.fields,
    );
    const diff = diffSchema(stored.fields, planned);
    const { recordCount } = await this.records.counts(tenantId, formId);

    if (!diff.schemaChanged) {
      return {
        schemaChanged: false,
        nextVersion: stored.latestVersion,
        recordCount,
        recordsLosingAnswers: 0,
        recordsGainingRequiredFields: 0,
        added: [],
        removed: [],
        changed: [],
      };
    }

    const next = toNextVersionShape(planned);
    const [valueCounts, losing, gaining, withoutPhone] = await Promise.all([
      this.records.valueCountsByField(tenantId, formId),
      this.records.countRecordsLosingAnswers(tenantId, formId, next),
      this.records.findRecordIdsGainingRequiredFields(tenantId, formId, next),
      this.recordIdsGainingPhone(tenantId, formId, planned),
    ]);

    // a record missing both a custom field and the phone counts once
    const pending = new Set([...gaining, ...withoutPhone]);

    return {
      schemaChanged: true,
      nextVersion: stored.latestVersion + 1,
      recordCount,
      recordsLosingAnswers: losing,
      recordsGainingRequiredFields: pending.size,
      added: diff.added,
      removed: diff.removed.map((field) => ({
        ...field,
        valueCount: valueCounts.get(field.id) ?? 0,
      })),
      changed: diff.changed,
    };
  }

  /**
   * `client.phone` is the only system field that can newly become required. It
   * counts only for records whose own version has it optional, when the next
   * version requires it (plan, "Pending required fields").
   */
  private async recordIdsGainingPhone(
    tenantId: string,
    formId: string,
    planned: readonly {
      id: string;
      systemKey: string | null;
      required: boolean;
    }[],
  ): Promise<string[]> {
    const phone = planned.find((f) => f.systemKey === 'client.phone');
    if (!phone?.required) return [];

    const ids = await this.presence.findRecordIdsWithoutClientPhone(
      tenantId,
      formId,
    );

    return this.records.filterRecordIdsNotRequiring(
      tenantId,
      formId,
      phone.id,
      ids,
    );
  }
}
