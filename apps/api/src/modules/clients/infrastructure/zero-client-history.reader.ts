import { Injectable } from '@nestjs/common';
import type { ClientHistoryReader } from '../ports/client-history.reader.js';

/** No scheduling or payments exist yet, so no client has history. */
@Injectable()
export class ZeroClientHistoryReader implements ClientHistoryReader {
  hasHistory(): Promise<boolean> {
    return Promise.resolve(false);
  }
}
