import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ServiceListResponse } from '@planici/schemas';
import {
  type CursorPosition,
  decodeCursor,
  encodeCursor,
} from '@shared/list/list-cursor.js';
import { ServiceCursorInvalidError } from '../../domain/errors/service.errors.js';
import { buildServiceSearch } from '../../domain/service-search.js';
import { SERVICE_CURSOR_KEY } from '../../ports/service-cursor-key.js';
import {
  SERVICE_HISTORY_READER,
  type ServiceHistoryReader,
} from '../../ports/service-history.reader.js';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../ports/service.repository.js';
import { ListServicesQuery } from './list-services.query.js';

@QueryHandler(ListServicesQuery)
export class ListServicesHandler implements IQueryHandler<ListServicesQuery> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
    @Inject(SERVICE_HISTORY_READER)
    private readonly history: ServiceHistoryReader,
    @Inject(SERVICE_CURSOR_KEY) private readonly cursorKey: Buffer,
  ) {}

  async execute(query: ListServicesQuery): Promise<ServiceListResponse> {
    query.membership.assertCanManage();
    const tenantId = query.membership.tenant.id;
    const { q, status, formId, sort, limit, after } = query.filter;

    const search = buildServiceSearch(q);
    // the cursor is bound to the filters and the sort it was issued with
    // (SPEC-0006 R5)
    const filter = { status, q: search?.key ?? '', formId: formId ?? '', sort };

    let position: CursorPosition | null = null;
    if (after !== undefined) {
      position = decodeCursor(this.cursorKey, after, filter);
      if (!position) throw new ServiceCursorInvalidError();
    }

    const criteria = { status, search, formId: formId ?? null, sort };
    const rows = await this.services.list(tenantId, {
      ...criteria,
      after: position,
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const last = page[page.length - 1];

    // single-page rule (SPEC-0006 plan, API): a first page that holds every
    // match is its own total; otherwise count
    const total =
      after === undefined && rows.length <= limit
        ? rows.length
        : await this.services.count(tenantId, criteria);

    // one call per page (G-9)
    const withHistory = await this.history.withHistory(
      tenantId,
      page.map((row) => row.id),
    );

    return {
      services: page.map((row) => ({
        id: row.id,
        name: row.name,
        durationMinutes: row.durationMinutes,
        priceCents: row.priceCents,
        currency: row.currency,
        formId: row.formId,
        formName: row.formName,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
        hasHistory: withHistory.has(row.id),
      })),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor(this.cursorKey, filter, {
              key: last.sortKey,
              id: last.id,
            })
          : null,
      total,
    };
  }
}
