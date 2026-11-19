import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ClientListResponse } from '@planici/schemas';
import { buildClientSearch } from '../../domain/client-search.js';
import { decodeCursor, encodeCursor } from '../../domain/client-cursor.js';
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
    const { q, status, limit, after } = query.filter;

    const search = buildClientSearch(q);
    // the cursor is bound to the filter it was issued for
    const filter = { status, q: search?.key ?? '' };

    let position: { nameKey: string; id: string } | null = null;
    if (after !== undefined) {
      position = decodeCursor(this.cursorKey, after, filter);
      if (!position) throw new ClientCursorInvalidError();
    }

    const rows = await this.clients.list(tenantId, {
      status,
      search,
      after: position,
      take: limit + 1,
    });

    const page = rows.slice(0, limit);
    const last = page[page.length - 1];

    return {
      clients: page.map((row) => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        formId: row.formId,
        formName: row.formName,
        status: row.status,
      })),
      nextCursor:
        rows.length > limit && last
          ? encodeCursor(this.cursorKey, filter, {
              nameKey: last.nameKey,
              id: last.id,
            })
          : null,
    };
  }
}
