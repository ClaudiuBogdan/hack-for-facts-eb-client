import { describe, expect, it } from 'vitest';
import {
  AdvancedMapDatasetDraftRowSchema,
  AdvancedMapDatasetDraftSchema,
  createEmptyAdvancedMapDatasetDraft,
  type AdvancedMapDatasetDraft,
  type AdvancedMapDatasetReferenceRow,
} from '@/features/advanced-map-datasets/types';
import {
  hydrateAdvancedMapDatasetDraftWithReferenceRows,
  parseAdvancedMapDatasetTextImport,
  parseDatasetValueText,
  serializeAdvancedMapDatasetRowsToCsv,
  validateAdvancedMapDatasetDraftForSave,
} from './draft';

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

describe('advanced-map-datasets draft hydration', () => {
  it('hydrates missing UAT metadata from the reference directory', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);
    const staleRow = {
      ...draft.rows[0],
      levelName: null,
      reference: undefined,
    };
    const staleDraft: AdvancedMapDatasetDraft = {
      ...draft,
      rows: [staleRow],
      rowsBySirutaCode: {
        [staleRow.sirutaCode]: staleRow,
      },
    };

    const hydratedDraft = hydrateAdvancedMapDatasetDraftWithReferenceRows(staleDraft, referenceRows);

    expect(hydratedDraft).not.toBe(staleDraft);
    expect(hydratedDraft.rows[0]).toMatchObject({
      name: 'Sibiu',
      levelName: 'Municipiu resedinta de judet',
      countyName: 'Sibiu',
      countyCode: 'SB',
    });
    expect(hydratedDraft.rowsBySirutaCode['143450']).toMatchObject({
      levelName: 'Municipiu resedinta de judet',
      countyName: 'Sibiu',
    });
  });

  it('adds missing rows back into stale drafts when the reference directory is larger', () => {
    const staleDraft = createEmptyAdvancedMapDatasetDraft('resource-1', [referenceRows[1]]);

    const hydratedDraft = hydrateAdvancedMapDatasetDraftWithReferenceRows(staleDraft, referenceRows);

    expect(hydratedDraft.rows).toHaveLength(2);
    expect(hydratedDraft.rowsBySirutaCode['143450']).toMatchObject({
      name: 'Sibiu',
      levelName: 'Municipiu resedinta de judet',
    });
  });
});

describe('advanced-map-datasets numeric parsing', () => {
  it('parses grouped decimal formats without accepting malformed mixed separators', () => {
    expect(parseDatasetValueText('1.234,56')).toBeCloseTo(1234.56);
    expect(parseDatasetValueText('1,234.56')).toBeCloseTo(1234.56);
    expect(parseDatasetValueText('-1.234,56')).toBeCloseTo(-1234.56);
    expect(parseDatasetValueText('1,2.3')).toBeNull();
    expect(parseDatasetValueText('1.2,3')).toBeNull();
  });

  it('recomputes parsed numeric values for normalized draft rows', () => {
    const row = AdvancedMapDatasetDraftRowSchema.parse({
      ...referenceRows[0],
      value: '1,234.56',
      rawValue: '1,234.56',
      valueText: '1,234.56',
      source: 'manual',
      importedFrom: 'manual',
    });

    expect(row.parsedNumericValue).toBeCloseTo(1234.56);
    expect(row.isEmpty).toBe(false);
  });

  it('accepts grouped decimal values during CSV import', () => {
    const result = parseAdvancedMapDatasetTextImport(
      ['siruta_code,value', '143450,"1.234,56"', '144928,"1,234.56"'].join('\n'),
      referenceRows
    );

    expect(result.issues).toEqual([]);
    expect(result.importedCount).toBe(2);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sirutaCode: '143450',
          parsedNumericValue: 1234.56,
          validationMessage: null,
        }),
        expect.objectContaining({
          sirutaCode: '144928',
          parsedNumericValue: 1234.56,
          validationMessage: null,
        }),
      ])
    );
  });

  it('keeps save validation and payload conversion aligned with grouped decimal parsing', () => {
    const draft = AdvancedMapDatasetDraftSchema.parse({
      ...createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows),
      title: 'Population',
      unit: 'people',
      rowsBySirutaCode: {},
      rows: [
        {
          ...referenceRows[0],
          valueNumber: '1.234,56',
          valueJson: null,
          value: '1.234,56',
          rawValue: '1.234,56',
          valueText: '1.234,56',
          source: 'manual',
          importedFrom: 'manual',
        },
        {
          ...referenceRows[1],
          valueNumber: '1,234.56',
          valueJson: null,
          value: '1,234.56',
          rawValue: '1,234.56',
          valueText: '1,234.56',
          source: 'manual',
          importedFrom: 'manual',
        },
      ],
    });

    const result = validateAdvancedMapDatasetDraftForSave(draft);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.payload.rows).toEqual([
      { sirutaCode: '143450', valueNumber: '1.234,56', valueJson: null },
      { sirutaCode: '144928', valueNumber: '1,234.56', valueJson: null },
    ]);
  });

  it('uses payload types as CSV column names when payload rows are present', () => {
    const draft = createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows);

    const csv = serializeAdvancedMapDatasetRowsToCsv([
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
          type: 'markdown',
          value: { markdown: 'Important _context_' },
        },
      },
    ]);

    expect(csv).toBe(
      'siruta_code,value,text,markdown,name,county,cui,level\n'
      + '143450,10,Population note,,Sibiu,Sibiu,4270740,Municipiu resedinta de judet\n'
      + '144928,,,Important _context_,Miercurea Sibiului,Sibiu,4406266,Oras\n'
    );
  });

  it('derives payloadDraft from imported payload columns so the UI reflects imported payloads immediately', () => {
    const result = parseAdvancedMapDatasetTextImport(
      ['siruta_code,text', '143450,Imported note'].join('\n'),
      referenceRows
    );

    expect(result.issues).toEqual([]);
    expect(result.rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sirutaCode: '143450',
          valueJson: {
            type: 'text',
            value: { text: 'Imported note' },
          },
          payloadDraft: {
            type: 'text',
            value: 'Imported note',
            linkLabel: '',
          },
        }),
      ])
    );
  });

  it('fails save validation when a row only has an invalid payload draft', () => {
    const draft = AdvancedMapDatasetDraftSchema.parse({
      ...createEmptyAdvancedMapDatasetDraft('resource-1', referenceRows),
      title: 'Population',
      unit: 'people',
      rowsBySirutaCode: {},
      rows: [
        {
          ...referenceRows[0],
          valueNumber: '',
          valueJson: null,
          payloadDraft: {
            type: 'link',
            value: 'notaurl',
            linkLabel: 'Example',
          },
          value: '',
          rawValue: '',
          valueText: '',
          source: 'manual',
          importedFrom: 'manual',
        },
      ],
    });

    const result = validateAdvancedMapDatasetDraftForSave(draft);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.issues).toContain('Row for Sibiu must contain a valid payload.');
  });
});
