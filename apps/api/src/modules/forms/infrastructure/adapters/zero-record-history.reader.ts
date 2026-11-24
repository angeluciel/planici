import { Injectable } from '@nestjs/common';
import type { RecordHistoryReader } from '../../ports/record-history.reader.js';

/** No scheduling or payments exist yet, so no record has history. */
@Injectable()
export class ZeroRecordHistoryReader implements RecordHistoryReader {
  countRecordsWithHistory(): Promise<number> {
    return Promise.resolve(0);
  }
}
