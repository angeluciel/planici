import { Injectable } from '@nestjs/common';
import type { ServiceHistoryReader } from '../ports/service-history.reader.js';

/** No scheduling exists yet, so no service has history. */
@Injectable()
export class ZeroServiceHistoryReader implements ServiceHistoryReader {
  hasHistory(): Promise<boolean> {
    return Promise.resolve(false);
  }

  withHistory(): Promise<Set<string>> {
    return Promise.resolve(new Set());
  }
}
