import { describe, expect, it } from 'vitest';
import { createEmptyAdvancedMapDatasetDraft, type AdvancedMapDatasetReferenceRow } from '@/features/advanced-map-datasets/types';
import {
  mergeAdvancedMapDatasetClipboardRowsIntoDraft,
  serializeAdvancedMapDatasetRowsToClipboardTsv,
  tryParseAdvancedMapDatasetTabularPaste,
} from './clipboard';

const referenceRows: AdvancedMapDatasetReferenceRow[] = [
  {
    uatId: 'uat-1',
    cui: '4270740',
    sirutaCode: '143450',
    name: 'Sibiu',
    levelName: 'Municipiu resedinta de judet',
    countyName: 'Sibiu',
    countyCode: 'SB',
    isCounty: false,
  },
  {
    uatId: 'uat-2',
    cui: '4406266',
    sirutaCode: '144928',
    name: 'Miercurea Sibiului',
    levelName: 'Oras',
    countyName: 'Sibiu',
    countyCode: 'SB',
    isCounty: false,
  },
];

describe('advanced-map-datasets clipboard', () => {
  it('serializes the current table rows as TSV for spreadsheet paste', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    const tsv = serializeAdvancedMapDatasetRowsToClipboardTsv([
      {
        ...draft.rows[0],
        rawValue: '10',
        valueText: '10',
      },
      {
        ...draft.rows[1],
        rawValue: '',
        valueText: '',
      },
    ]);

    expect(tsv).toBe(
      'siruta_code\tvalue\tname\tcounty\tcui\n'
      + '143450\t10\tSibiu\tSibiu\t4270740\n'
      + '144928\t\tMiercurea Sibiului\tSibiu\t4406266\n'
    );
  });

  it('uses payload types as clipboard column names when payload rows are present', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    const tsv = serializeAdvancedMapDatasetRowsToClipboardTsv([
      {
        ...draft.rows[0],
        valueNumber: '10',
        rawValue: '10',
        valueText: '10',
        valueJson: {
          type: 'text',
          value: { text: 'Population note' },
        },
      },
      {
        ...draft.rows[1],
        valueJson: {
          type: 'link',
          value: {
            url: 'https://example.com',
            label: 'Source',
          },
        },
      },
    ]);

    expect(tsv).toBe(
      'siruta_code\tvalue\ttext\tlink\tname\tcounty\tcui\n'
      + '143450\t10\tPopulation note\t\tSibiu\tSibiu\t4270740\n'
      + '144928\t\t\t[Source](https://example.com)\tMiercurea Sibiului\tSibiu\t4406266\n'
    );
  });

  it('accepts siruta/value clipboard tables and merges them into the draft', () => {
    const parsed = tryParseAdvancedMapDatasetTabularPaste('siruta_code,value\n143450,10\n144928,20', referenceRows);

    expect(parsed).not.toBeNull();
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    const mergedDraft = mergeAdvancedMapDatasetClipboardRowsIntoDraft(draft, parsed?.rows ?? [], 'paste');

    expect(mergedDraft.rowsBySirutaCode['143450']).toMatchObject({
      rawValue: '10',
      valueText: '10',
      parsedNumericValue: 10,
      source: 'paste',
      importedFrom: 'paste',
    });
    expect(mergedDraft.rowsBySirutaCode['144928']).toMatchObject({
      rawValue: '20',
      valueText: '20',
      parsedNumericValue: 20,
    });
  });

  it('accepts tabular pastes with headers and extra reference columns', () => {
    const parsed = tryParseAdvancedMapDatasetTabularPaste(
      'siruta_code\tvalue\tname\tcounty\tcui\n143450\t10\tSibiu\tSibiu\t4270740\n144928\t20\tMiercurea Sibiului\tSibiu\t4406266',
      referenceRows
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.importedCount).toBe(2);
    expect(parsed?.rows.find((row) => row.sirutaCode === '143450')).toMatchObject({
      rawValue: '10',
      valueText: '10',
    });
  });

  it('accepts headerless two-column tabular pastes using first column as siruta and second as value', () => {
    const parsed = tryParseAdvancedMapDatasetTabularPaste(
      '143450\t10\n144928\t20',
      referenceRows
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.importedCount).toBe(2);
  });

  it('accepts payload-only clipboard tables', () => {
    const parsed = tryParseAdvancedMapDatasetTabularPaste(
      'siruta_code\ttext\n143450\tPopulation note',
      referenceRows
    );

    expect(parsed).not.toBeNull();
    expect(parsed?.importedCount).toBe(1);

    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    const mergedDraft = mergeAdvancedMapDatasetClipboardRowsIntoDraft(draft, parsed?.rows ?? [], 'paste');

    expect(mergedDraft.rowsBySirutaCode['143450']).toMatchObject({
      valueJson: {
        type: 'text',
        value: {
          text: 'Population note',
        },
      },
      source: 'paste',
      importedFrom: 'paste',
    });
  });

  it('rejects clipboard tables that do not use siruta and value columns', () => {
    const parsed = tryParseAdvancedMapDatasetTabularPaste('name\tvalue\nSibiu\t10', referenceRows);

    expect(parsed).toBeNull();
  });
});
