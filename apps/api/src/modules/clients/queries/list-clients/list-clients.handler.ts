import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ClientListResponse } from '@planici/schemas';
import { buildClientSearch } from '../../domain/client-search.js';
import {
  type CursorPosition,
  decodeCursor,
  encodeCursor,
} from '../../domain/client-cursor.js';
import { ClientCursorInvalidError } from '../../domain/errors/client.errors.js';
import { CLIENT_CURSOR_KEY } from '../../ports/client-cursor-key.js';
import {
  CLIENT_REPOSITORY,
  type ClientRepository,
} from '../../ports/client.repository.js';
import { ListClientsQuery } from './list-clients.query.js';

@QueryHandler(ListClientsQuery)
export class ListClientsHandler implements IQueryHandler<ListClientsQuery> {
  constructor(
    @Inject(CLIENT_REPOSITORY) private readonly clients: ClientRepository,
    @Inject(CLIENT_CURSOR_KEY) private readonly cursorKey: Buffer,
  ) {}

  async execute(query: ListClientsQuery): Promise<ClientListResponse> {
    query.membership.assertCanManage();
    const tenantId = query.membership.tenant.id;
    const { q, status, formId, sort, limit, after } = query.filter;

    const search = buildClientSearch(q);
    // the cursor is bound to the filters and the sort it was issued with
    // (SPEC-0006 R5)
    const filter = { status, q: search?.key ?? '', formId: formId ?? '', sort };

    let position: CursorPosition | null = null;
    if (after !== undefined) {
      position = decodeCursor(this.cursorKey, after, filter);
      if (!position) throw new ClientCursorInvalidError();
    }

    const criteria = { status, search, formId: formId ?? null, sort };
    const rows = await this.clients.list(tenantId, {
      ...criteria,
      after: position,
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const last = page[page.length - 1];

    // single-page rule (SPEC-0006 plan, API): a first page that holds every
    // match is its own total; otherwise count, after the list, on its own
    const total =
      after === undefined && rows.length <= limit
        ? rows.length
        : await this.clients.count(tenantId, criteria);

    return {
      clients: page.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        formId: row.formId,
        formName: row.formName,
        status: row.status,
        updatedAt: row.updatedAt.toISOString(),
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
