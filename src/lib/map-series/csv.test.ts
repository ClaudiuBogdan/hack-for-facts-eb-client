import { describe, expect, it } from 'vitest';
import { parseGroupedSeriesCsv } from '@/lib/map-series/csv';

describe('parseGroupedSeriesCsv', () => {
  it('parses valid rows', () => {
    const csv = ['series_id,siruta_code,value', 's1,12345,10', 's1,12346,11.5'].join('\n');

    const parsed = parseGroupedSeriesCsv(csv);

    expect(parsed.rows).toEqual([
      { series_id: 's1', siruta_code: '12345', value: 10 },
      { series_id: 's1', siruta_code: '12346', value: 11.5 },
    ]);
    expect(parsed.warnings).toEqual([]);
  });

  it('skips invalid rows and emits warnings', () => {
    const csv = ['series_id,siruta_code,value', 's1,12345,abc', ',12346,11', 's1,,12'].join('\n');

    const parsed = parseGroupedSeriesCsv(csv);

    expect(parsed.rows).toEqual([]);
    expect(parsed.warnings.length).toBe(3);
    expect(parsed.warnings.every((warning) => warning.type === 'invalid_row')).toBe(true);
  });

  it('applies deterministic duplicate policy (last value wins)', () => {
    const csv = ['series_id,siruta_code,value', 's1,12345,10', 's1,12345,15'].join('\n');

    const parsed = parseGroupedSeriesCsv(csv);

    expect(parsed.rows).toEqual([{ series_id: 's1', siruta_code: '12345', value: 15 }]);
    expect(parsed.warnings.some((warning) => warning.type === 'duplicate_row')).toBe(true);
  });
});
