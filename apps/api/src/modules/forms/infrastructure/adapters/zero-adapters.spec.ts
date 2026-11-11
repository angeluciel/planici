import { describe, expect, it } from 'vitest';
import { ZeroRecordHistoryReader } from './zero-record-history.reader.js';
import { ZeroSystemFieldPresence } from './zero-system-field-presence.js';

describe('zero adapters', () => {
  it('reports no records with history', async () => {
    expect(await new ZeroRecordHistoryReader().countRecordsWithHistory()).toBe(
      0,
    );
  });

  it('reports no records missing client.phone', async () => {
    expect(
      await new ZeroSystemFieldPresence().findRecordIdsWithoutClientPhone(),
    ).toEqual([]);
  });
});
