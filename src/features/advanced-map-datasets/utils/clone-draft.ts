import type { AdvancedMapDatasetDetail } from '@/features/advanced-map-datasets/api/schemas';
import {
  createAdvancedMapDatasetPayloadDraft,
  createEmptyAdvancedMapDatasetDraft,
  hasAdvancedMapDatasetPayloadDraftData,
  type AdvancedMapDatasetDraft,
  type AdvancedMapDatasetDraftRow,
} from '@/features/advanced-map-datasets/types';

function createCloneDraftRow(
  row: AdvancedMapDatasetDetail['rows'][number]
): AdvancedMapDatasetDraftRow {
  const valueNumber = row.valueNumber ?? '';

  return {
    uatId: '',
    sirutaCode: row.sirutaCode,
    cui: '',
    name: row.sirutaCode,
    countyName: '',
    countyCode: null,
    isCounty: false,
    valueNumber,
    valueJson: row.valueJson ?? null,
    payloadDraft: createAdvancedMapDatasetPayloadDraft(row.valueJson ?? null),
    value: valueNumber,
    rawValue: valueNumber,
    valueText: valueNumber,
    source: 'server',
    importedFrom: 'server',
    isEmpty: valueNumber.trim() === '' && row.valueJson === null && !hasAdvancedMapDatasetPayloadDraftData(createAdvancedMapDatasetPayloadDraft(row.valueJson ?? null)),
    parsedNumericValue: (() => { const v = valueNumber.trim(); if (v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; })(),
    payloadValidationMessage: null,
    validationMessage: null,
    validationError: null,
  };
}

export function createAdvancedMapDatasetCloneDraft(
  dataset: AdvancedMapDatasetDetail
): AdvancedMapDatasetDraft {
  const emptyDraft = createEmptyAdvancedMapDatasetDraft('clone');
  const rows = dataset.rows.map(createCloneDraftRow);

  return {
    ...emptyDraft,
    resourceKey: 'clone',
    title: `Copy of ${dataset.title}`,
    description: dataset.description ?? '',
    markdown: dataset.markdown ?? '',
    unit: dataset.unit ?? '',
    visibility: 'private',
    metadata: {
      ...emptyDraft.metadata,
      title: `Copy of ${dataset.title}`,
      description: dataset.description ?? '',
      markdownText: dataset.markdownText ?? dataset.markdown ?? '',
      markdown: dataset.markdown ?? dataset.markdownText ?? '',
      unit: dataset.unit ?? '',
      visibility: 'private',
    },
    updatedAt: new Date().toISOString(),
    rows,
    rowsBySirutaCode: Object.fromEntries(rows.map((row) => [row.sirutaCode, { ...row }])),
  };
}
