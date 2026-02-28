import { describe, expect, it } from 'vitest';

import {
  parseGroupedSeriesWideCsv,
  serializeGroupedSeriesWideMatrixCsv,
} from '@/lib/map-series/csv';

describe('parseGroupedSeriesWideCsv', () => {
  it('parses valid wide rows', () => {
    const csv = ['siruta_code,s1,s2', '12345,10,20', '12346,11.5,null'].join('\n');

    const parsed = parseGroupedSeriesWideCsv(csv);

    expect(parsed.seriesIds).toEqual(['s1', 's2']);
    expect(parsed.valuesBySeriesId.get('s1')?.get('12345')).toBe(10);
    expect(parsed.valuesBySeriesId.get('s1')?.get('12346')).toBe(11.5);
    expect(parsed.valuesBySeriesId.get('s2')?.get('12345')).toBe(20);
    expect(parsed.valuesBySeriesId.get('s2')?.has('12346')).toBe(false);
    expect(parsed.warnings).toEqual([]);
  });

  it('skips invalid values and emits warnings', () => {
    const csv = ['siruta_code,s1', '12345,abc', ',11'].join('\n');

    const parsed = parseGroupedSeriesWideCsv(csv);

    expect(parsed.valuesBySeriesId.get('s1')?.size).toBe(0);
    expect(parsed.warnings.length).toBe(2);
    expect(parsed.warnings.every((warning) => warning.type === 'invalid_row')).toBe(true);
  });

  it('applies deterministic duplicate row policy (last row wins)', () => {
    const csv = ['siruta_code,s1', '12345,10', '12345,15'].join('\n');

    const parsed = parseGroupedSeriesWideCsv(csv);

    expect(parsed.valuesBySeriesId.get('s1')?.get('12345')).toBe(15);
    expect(parsed.warnings.some((warning) => warning.type === 'duplicate_row')).toBe(true);
  });
});

describe('serializeGroupedSeriesWideMatrixCsv', () => {
  it('serializes row-oriented values to wide matrix format', () => {
    const csv = serializeGroupedSeriesWideMatrixCsv(
      [
        { series_id: 's1', siruta_code: '1002', value: 2 },
        { series_id: 's1', siruta_code: '1001', value: 1 },
        { series_id: 's2', siruta_code: '1002', value: 20 },
      ],
      ['s1', 's2']
    );

    expect(csv).toBe(['siruta_code,s1,s2', '1001,1,null', '1002,2,20'].join('\n'));
  });
});
