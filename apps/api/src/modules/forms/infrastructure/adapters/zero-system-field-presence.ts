import { Injectable } from '@nestjs/common';
import type { SystemFieldPresence } from '../../ports/system-field-presence.js';

/** Returns no ids until SPEC-0004 provides the clients adapter. */
@Injectable()
export class ZeroSystemFieldPresence implements SystemFieldPresence {
  findRecordIdsWithoutClientPhone(): Promise<string[]> {
    return Promise.resolve([]);
  }
}
