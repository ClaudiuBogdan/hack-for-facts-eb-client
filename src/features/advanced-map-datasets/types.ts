import { z } from 'zod';
import {
  type AdvancedMapDatasetDetail as ApiAdvancedMapDatasetDetail,
  type AdvancedMapDatasetJsonItem as ApiAdvancedMapDatasetJsonItem,
  type AdvancedMapDatasetJsonItemType as ApiAdvancedMapDatasetJsonItemType,
  AdvancedMapDatasetJsonItemSchema,
  type AdvancedMapDatasetSummary as ApiAdvancedMapDatasetSummary,
  AdvancedMapDatasetVisibilitySchema,
  type AdvancedMapDatasetVisibility,
} from '@/features/advanced-map-datasets/api/schemas';

export type {
  AdvancedMapDatasetVisibility,
} from '@/features/advanced-map-datasets/api/schemas';

export type AdvancedMapDatasetSummary = ApiAdvancedMapDatasetSummary;
export type AdvancedMapDatasetDetail = ApiAdvancedMapDatasetDetail;
export type AdvancedMapDatasetJsonItem = ApiAdvancedMapDatasetJsonItem;
export type AdvancedMapDatasetJsonItemType = ApiAdvancedMapDatasetJsonItemType;

export interface AdvancedMapDatasetPayloadDraft {
  type: 'none' | AdvancedMapDatasetJsonItemType;
  value: string;
  linkLabel: string;
}

export interface UatDirectoryEntry {
  uatId: string;
  id: string;
  cui: string;
  sirutaCode: string;
  name: string;
  levelName?: string | null;
  countyName: string;
  countyCode?: string | null;
  isCounty?: boolean;
}

export interface AdvancedMapDatasetReferenceRow {
  uatId: string;
  sirutaCode: string;
  cui: string;
  name: string;
  levelName?: string | null;
  countyName: string;
  countyCode?: string | null;
  isCounty?: boolean;
}

export interface AdvancedMapDatasetDraftMetadata {
  title: string;
  description: string;
  unit: string;
  visibility: AdvancedMapDatasetVisibility;
  markdownText: string;
  markdown: string;
}

export interface AdvancedMapDatasetDraftRow extends AdvancedMapDatasetReferenceRow {
  valueNumber: string;
  valueJson: AdvancedMapDatasetJsonItem | null;
  payloadDraft?: AdvancedMapDatasetPayloadDraft | null;
  value?: string | number | null;
  rawValue?: string;
  valueText?: string;
  source?: 'manual' | 'paste' | 'import' | 'file' | 'server';
  importedFrom?: 'manual' | 'paste' | 'import' | 'file' | 'server';
  isEmpty?: boolean;
  parsedNumericValue?: number | null;
  payloadValidationMessage?: string | null;
  validationMessage?: string | null;
  validationError?: string | null;
  reference?: UatDirectoryEntry;
}

export interface AdvancedMapDatasetDraftSnapshot {
  draftId: string | null;
  datasetId: string | null;
  publicId: string | null;
  metadata: AdvancedMapDatasetDraftMetadata;
  rowsBySirutaCode: Record<string, AdvancedMapDatasetDraftRow>;
  updatedAt: string | null;
}

export interface AdvancedMapDatasetDraft extends AdvancedMapDatasetDraftSnapshot {
  resourceKey: string;
  title: string;
  description: string;
  markdown: string;
  unit: string;
  visibility: AdvancedMapDatasetVisibility;
  rows: AdvancedMapDatasetDraftRow[];
}

export interface AdvancedMapDatasetSaveRow {
  sirutaCode: string;
  valueNumber: string | null;
  valueJson: AdvancedMapDatasetJsonItem | null;
}

export interface AdvancedMapDatasetSavePayload {
  title: string;
  description: string | null;
  markdown: string | null;
  markdownText?: string | null;
  unit: string | null;
  visibility: AdvancedMapDatasetVisibility;
  rows?: AdvancedMapDatasetSaveRow[];
  csvText?: string;
  rowsCsv?: string;
  rowCount?: number;
  hasJsonRows?: boolean;
}

export interface AdvancedMapDatasetImportIssue {
  rowIndex: number;
  rowNumber: number;
  message: string;
}

export interface AdvancedMapDatasetImportResult {
  rows: readonly AdvancedMapDatasetDraftRow[];
  draftRows: readonly AdvancedMapDatasetDraftRow[];
  importedCount: number;
  rejectedCount: number;
  skippedCount: number;
  issues: AdvancedMapDatasetImportIssue[];
}

export interface AdvancedMapDatasetClonePayload {
  sourceDatasetId?: string | null;
  sourcePublicId: string | null;
  draft: AdvancedMapDatasetDraft | AdvancedMapDatasetDraftSnapshot;
}

const EMPTY_REFERENCE_ROW: AdvancedMapDatasetReferenceRow = {
  uatId: '',
  sirutaCode: '',
  cui: '',
  name: '',
  levelName: null,
  countyName: '',
  countyCode: null,
  isCounty: false,
};

const COMMA_GROUPED_DECIMAL_PATTERN = /^[+-]?\d{1,3}(?:,\d{3})+\.\d+$/;
const DOT_GROUPED_DECIMAL_PATTERN = /^[+-]?\d{1,3}(?:\.\d{3})+,\d+$/;
const COMMA_GROUPED_INTEGER_PATTERN = /^[+-]?\d{1,3}(?:,\d{3}){2,}$/;
const DOT_GROUPED_INTEGER_PATTERN = /^[+-]?\d{1,3}(?:\.\d{3}){2,}$/;

function normalizeString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}

function normalizeNullableString(value: unknown): string | null {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (value === null) {
    return null;
  }

  return null;
}

function parseFiniteNumber(valueText: string): number | null {
  const parsed = Number(valueText);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePayloadDraftType(value: unknown): AdvancedMapDatasetPayloadDraft['type'] {
  return value === 'text' || value === 'markdown' || value === 'link' || value === 'none'
    ? value
    : 'none';
}

export function createEmptyAdvancedMapDatasetPayloadDraft(): AdvancedMapDatasetPayloadDraft {
  return {
    type: 'none',
    value: '',
    linkLabel: '',
  };
}

export function createAdvancedMapDatasetPayloadDraft(
  valueJson: AdvancedMapDatasetJsonItem | null | undefined
): AdvancedMapDatasetPayloadDraft {
  if (valueJson?.type === 'text') {
    return {
      type: 'text',
      value: valueJson.value.text,
      linkLabel: '',
    };
  }

  if (valueJson?.type === 'markdown') {
    return {
      type: 'markdown',
      value: valueJson.value.markdown,
      linkLabel: '',
    };
  }

  if (valueJson?.type === 'link') {
    return {
      type: 'link',
      value: valueJson.value.url,
      linkLabel: valueJson.value.label ?? '',
    };
  }

  return createEmptyAdvancedMapDatasetPayloadDraft();
}

function normalizePayloadDraft(
  input: unknown,
  fallbackValueJson: AdvancedMapDatasetJsonItem | null | undefined = null
): AdvancedMapDatasetPayloadDraft | null {
  if (!input || typeof input !== 'object') {
    return fallbackValueJson ? createAdvancedMapDatasetPayloadDraft(fallbackValueJson) : null;
  }

  const record = input as Record<string, unknown>;
  return {
    type: normalizePayloadDraftType(record.type),
    value: normalizeString(record.value),
    linkLabel: normalizeString(record.linkLabel ?? record.link_label),
  };
}

export function hasAdvancedMapDatasetPayloadDraftData(
  payloadDraft: AdvancedMapDatasetPayloadDraft | null | undefined
): boolean {
  if (!payloadDraft || payloadDraft.type === 'none') {
    return false;
  }

  if (payloadDraft.type === 'link') {
    return payloadDraft.value.trim() !== '' || payloadDraft.linkLabel.trim() !== '';
  }

  return payloadDraft.value.trim() !== '';
}

export function resolveAdvancedMapDatasetPayloadDraft(
  payloadDraft: AdvancedMapDatasetPayloadDraft | null | undefined,
  fallbackValueJson: AdvancedMapDatasetJsonItem | null | undefined = null
): {
  payloadDraft: AdvancedMapDatasetPayloadDraft;
  valueJson: AdvancedMapDatasetJsonItem | null;
  validationMessage: string | null;
  hasDraftData: boolean;
} {
  const normalizedPayloadDraft = payloadDraft ?? createAdvancedMapDatasetPayloadDraft(fallbackValueJson);

  if (normalizedPayloadDraft.type === 'none') {
    return {
      payloadDraft: normalizedPayloadDraft,
      valueJson: null,
      validationMessage: null,
      hasDraftData: false,
    };
  }

  if (normalizedPayloadDraft.type === 'text') {
    const text = normalizedPayloadDraft.value.trim();
    return {
      payloadDraft: normalizedPayloadDraft,
      valueJson: text === '' ? null : { type: 'text', value: { text } },
      validationMessage: null,
      hasDraftData: text !== '',
    };
  }

  if (normalizedPayloadDraft.type === 'markdown') {
    const markdown = normalizedPayloadDraft.value.trim();
    return {
      payloadDraft: normalizedPayloadDraft,
      valueJson: markdown === '' ? null : { type: 'markdown', value: { markdown } },
      validationMessage: null,
      hasDraftData: markdown !== '',
    };
  }

  const url = normalizedPayloadDraft.value.trim();
  const label = normalizedPayloadDraft.linkLabel.trim();
  const hasDraftData = url !== '' || label !== '';

  if (url === '') {
    return {
      payloadDraft: normalizedPayloadDraft,
      valueJson: null,
      validationMessage: hasDraftData ? 'Link URL cannot be empty.' : null,
      hasDraftData,
    };
  }

  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return {
        payloadDraft: normalizedPayloadDraft,
        valueJson: null,
        validationMessage: 'Link URL must use http or https.',
        hasDraftData,
      };
    }

    return {
      payloadDraft: normalizedPayloadDraft,
      valueJson: {
        type: 'link',
        value: {
          url,
          label: label === '' ? null : label,
        },
      },
      validationMessage: null,
      hasDraftData,
    };
  } catch {
    return {
      payloadDraft: normalizedPayloadDraft,
      valueJson: null,
      validationMessage: 'Link URL must be valid.',
      hasDraftData,
    };
  }
}

export function parseAdvancedMapDatasetNumericValue(valueText: string): number | null {
  const trimmed = valueText.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const compact = trimmed.replace(/\s+/g, '');
  if (compact.length === 0) {
    return null;
  }

  const directParsed = parseFiniteNumber(compact);
  if (directParsed !== null && !compact.includes(',')) {
    return directParsed;
  }

  // Mixed separators are only accepted when they follow standard 3-digit grouping.
  if (compact.includes('.') && compact.includes(',')) {
    if (DOT_GROUPED_DECIMAL_PATTERN.test(compact)) {
      return parseFiniteNumber(compact.replace(/\./g, '').replace(',', '.'));
    }

    if (COMMA_GROUPED_DECIMAL_PATTERN.test(compact)) {
      return parseFiniteNumber(compact.replace(/,/g, ''));
    }

    return null;
  }

  const commaCount = compact.split(',').length - 1;
  if (commaCount === 1) {
    return parseFiniteNumber(compact.replace(',', '.'));
  }

  if (commaCount > 1 && COMMA_GROUPED_INTEGER_PATTERN.test(compact)) {
    return parseFiniteNumber(compact.replace(/,/g, ''));
  }

  if (directParsed !== null) {
    return directParsed;
  }

  if (DOT_GROUPED_INTEGER_PATTERN.test(compact)) {
    return parseFiniteNumber(compact.replace(/\./g, ''));
  }

  return null;
}

export function getAdvancedMapDatasetPayloadType(
  row: Pick<AdvancedMapDatasetDraftRow, 'valueJson' | 'payloadDraft'>
): AdvancedMapDatasetJsonItemType | '' {
  const payloadDraft = row.payloadDraft;

  if (payloadDraft && hasAdvancedMapDatasetPayloadDraftData(payloadDraft)) {
    return payloadDraft.type === 'none' ? '' : payloadDraft.type;
  }

  return row.valueJson?.type ?? '';
}

export function getAdvancedMapDatasetPayloadText(
  row: Pick<AdvancedMapDatasetDraftRow, 'valueJson' | 'payloadDraft'>
): string {
  const payloadDraft = row.payloadDraft;

  if (payloadDraft && hasAdvancedMapDatasetPayloadDraftData(payloadDraft)) {
    return payloadDraft.value;
  }

  if (row.valueJson === null) {
    return '';
  }

  if (row.valueJson.type === 'text') {
    return row.valueJson.value.text;
  }

  if (row.valueJson.type === 'markdown') {
    return row.valueJson.value.markdown;
  }

  return row.valueJson.value.url;
}

export function setAdvancedMapDatasetPayload(
  row: AdvancedMapDatasetDraftRow,
  payloadType: AdvancedMapDatasetJsonItemType | '',
  payloadText: string
): AdvancedMapDatasetDraftRow {
  const payloadState = resolveAdvancedMapDatasetPayloadDraft({
    type: payloadType === '' ? 'none' : payloadType,
    value: payloadText,
    linkLabel: '',
  });

  return {
    ...row,
    payloadDraft: payloadState.payloadDraft,
    valueJson: payloadState.valueJson,
    payloadValidationMessage: payloadState.validationMessage,
  };
}

function normalizeReferenceRow(input: unknown): AdvancedMapDatasetReferenceRow {
  if (!input || typeof input !== 'object') {
    return { ...EMPTY_REFERENCE_ROW };
  }

  const record = input as Record<string, unknown>;

  return {
    uatId: normalizeString(record.uatId ?? record.id),
    sirutaCode: normalizeString(record.sirutaCode ?? record.siruta_code),
    cui: normalizeString(record.cui ?? record.uat_code),
    name: normalizeString(record.name),
    levelName: normalizeNullableString(record.levelName ?? record.level_name ?? record.natLevName ?? record.nat_lev_name),
    countyName: normalizeString(record.countyName ?? record.county_name),
    countyCode: normalizeNullableString(record.countyCode ?? record.county_code),
    isCounty: Boolean(record.isCounty ?? record.is_county ?? false),
  };
}

function normalizeDraftMetadata(input: unknown): AdvancedMapDatasetDraftMetadata {
  const record = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const markdownText = normalizeString(record.markdownText ?? record.markdown);
  const markdown = normalizeString(record.markdown ?? record.markdownText);

  return {
    title: normalizeString(record.title),
    description: normalizeString(record.description),
    unit: normalizeString(record.unit),
    visibility: AdvancedMapDatasetVisibilitySchema.parse(
      record.visibility === 'public' || record.visibility === 'unlisted' || record.visibility === 'private'
        ? record.visibility
        : 'private'
    ),
    markdownText,
    markdown,
  };
}

function normalizeDraftRow(input: unknown): AdvancedMapDatasetDraftRow {
  const record = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const reference = normalizeReferenceRow(record.reference as Partial<AdvancedMapDatasetReferenceRow> | undefined);
  const baseReference = normalizeReferenceRow({
    uatId: record.uatId ?? reference.uatId,
    sirutaCode: record.sirutaCode ?? record.siruta_code ?? reference.sirutaCode,
    cui: record.cui ?? reference.cui,
    name: record.name ?? reference.name,
    levelName: record.levelName ?? record.level_name ?? reference.levelName,
    countyName: record.countyName ?? reference.countyName,
    countyCode: record.countyCode ?? reference.countyCode,
    isCounty: record.isCounty ?? reference.isCounty,
  });
  const rawValue = normalizeString(
    record.valueNumber ?? record.value_number ?? record.rawValue ?? record.valueText ?? record.value
  );
  const valueText = normalizeString(
    record.valueNumber ?? record.value_number ?? record.valueText ?? record.rawValue ?? record.value
  );
  const parsedValueJson = AdvancedMapDatasetJsonItemSchema.safeParse(
    record.valueJson ?? record.value_json
  );
  const payloadDraft = normalizePayloadDraft(
    record.payloadDraft ?? record.payload_draft,
    parsedValueJson.success ? parsedValueJson.data : null
  );
  const payloadState = resolveAdvancedMapDatasetPayloadDraft(
    payloadDraft,
    parsedValueJson.success ? parsedValueJson.data : null
  );
  const source = (record.source ?? record.importedFrom ?? 'manual') as AdvancedMapDatasetDraftRow['source'];
  const importedFrom = (record.importedFrom ?? record.source ?? 'manual') as AdvancedMapDatasetDraftRow['importedFrom'];
  const validationMessage = normalizeNullableString(record.validationMessage);
  const validationError = normalizeNullableString(record.validationError ?? record.validationMessage);
  const payloadValidationMessage = normalizeNullableString(
    record.payloadValidationMessage ?? record.payload_validation_message ?? payloadState.validationMessage
  );
  const parsedNumericValue =
    typeof record.parsedNumericValue === 'number' && Number.isFinite(record.parsedNumericValue)
      ? record.parsedNumericValue
      : parseAdvancedMapDatasetNumericValue(valueText);

  return {
    ...baseReference,
    valueNumber: rawValue,
    valueJson: payloadState.valueJson,
    payloadDraft: payloadState.payloadDraft,
    value: rawValue,
    rawValue,
    valueText,
    source: source ?? 'manual',
    importedFrom: importedFrom ?? 'manual',
    isEmpty:
      rawValue.trim().length === 0
      && valueText.trim().length === 0
      && payloadState.valueJson === null
      && !payloadState.hasDraftData,
    parsedNumericValue,
    payloadValidationMessage,
    validationMessage,
    validationError,
    reference: record.reference ? normalizeUatEntry(record.reference) : undefined,
  };
}

function normalizeUatEntry(input: unknown): UatDirectoryEntry {
  const record = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};

  return {
    uatId: normalizeString(record.uatId ?? record.id),
    id: normalizeString(record.id ?? record.uatId),
    cui: normalizeString(record.cui ?? record.uat_code),
    sirutaCode: normalizeString(record.sirutaCode ?? record.siruta_code),
    name: normalizeString(record.name),
    levelName: normalizeNullableString(record.levelName ?? record.level_name ?? record.natLevName ?? record.nat_lev_name),
    countyName: normalizeString(record.countyName ?? record.county_name),
    countyCode: normalizeNullableString(record.countyCode ?? record.county_code),
    isCounty: Boolean(record.isCounty ?? record.is_county ?? false),
  };
}

function createRowsBySirutaCode(rows: readonly AdvancedMapDatasetDraftRow[]): Record<string, AdvancedMapDatasetDraftRow> {
  const rowsBySirutaCode: Record<string, AdvancedMapDatasetDraftRow> = {};

  for (const row of rows) {
    const normalizedRow = normalizeDraftRow(row);
    if (normalizedRow.sirutaCode.length > 0) {
      rowsBySirutaCode[normalizedRow.sirutaCode] = normalizedRow;
    }
  }

  return rowsBySirutaCode;
}

function normalizeDraftSnapshot(input: unknown): AdvancedMapDatasetDraftSnapshot {
  const record = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const metadata = normalizeDraftMetadata(record.metadata);
  const rowsBySirutaCodeRecord =
    typeof record.rowsBySirutaCode === 'object' && record.rowsBySirutaCode !== null
      ? (record.rowsBySirutaCode as Record<string, unknown>)
      : {};

  const rowsBySirutaCode: Record<string, AdvancedMapDatasetDraftRow> = {};
  for (const [sirutaCode, rowValue] of Object.entries(rowsBySirutaCodeRecord)) {
    const normalizedRow = normalizeDraftRow({
      ...(typeof rowValue === 'object' && rowValue !== null ? (rowValue as Record<string, unknown>) : {}),
      sirutaCode,
    });
    if (normalizedRow.sirutaCode.length > 0) {
      rowsBySirutaCode[normalizedRow.sirutaCode] = normalizedRow;
    }
  }

  return {
    draftId: normalizeNullableString(record.draftId),
    datasetId: normalizeNullableString(record.datasetId),
    publicId: normalizeNullableString(record.publicId),
    metadata,
    rowsBySirutaCode,
    updatedAt: normalizeNullableString(record.updatedAt),
  };
}

function normalizeDraft(input: unknown): AdvancedMapDatasetDraft {
  const record = typeof input === 'object' && input !== null ? (input as Record<string, unknown>) : {};
  const metadata = normalizeDraftMetadata(record.metadata ?? record);
  const rowsInput = Array.isArray(record.rows) ? record.rows : [];
  const rowsFromInput = rowsInput.map((row) => normalizeDraftRow(row));
  const rowsBySirutaCodeInput =
    typeof record.rowsBySirutaCode === 'object' && record.rowsBySirutaCode !== null
      ? (record.rowsBySirutaCode as Record<string, unknown>)
      : {};

  const rowsBySirutaCode: Record<string, AdvancedMapDatasetDraftRow> = {
    ...createRowsBySirutaCode(rowsFromInput),
  };

  for (const [sirutaCode, rowValue] of Object.entries(rowsBySirutaCodeInput)) {
    const normalizedRow = normalizeDraftRow({
      ...(typeof rowValue === 'object' && rowValue !== null ? (rowValue as Record<string, unknown>) : {}),
      sirutaCode,
    });

    if (normalizedRow.sirutaCode.length > 0) {
      rowsBySirutaCode[normalizedRow.sirutaCode] = normalizedRow;
    }
  }

  const rows = Object.values(rowsBySirutaCode).sort((left, right) =>
    left.sirutaCode.localeCompare(right.sirutaCode, 'ro')
  );

  return {
    resourceKey: normalizeString(record.resourceKey),
    draftId: normalizeNullableString(record.draftId),
    datasetId: normalizeNullableString(record.datasetId),
    publicId: normalizeNullableString(record.publicId),
    metadata,
    title: normalizeString(record.title ?? metadata.title),
    description: normalizeString(record.description ?? metadata.description),
    markdown: normalizeString(record.markdown ?? metadata.markdown),
    unit: normalizeString(record.unit ?? metadata.unit),
    visibility: AdvancedMapDatasetVisibilitySchema.parse(
      record.visibility === 'public' || record.visibility === 'unlisted' || record.visibility === 'private'
        ? record.visibility
        : metadata.visibility
    ),
    rows,
    rowsBySirutaCode,
    updatedAt: normalizeNullableString(record.updatedAt),
  };
}

export const AdvancedMapDatasetDraftMetadataSchema = z.any().transform((value) => normalizeDraftMetadata(value));
export const AdvancedMapDatasetReferenceRowSchema = z.any().transform((value) => normalizeReferenceRow(value));
export const UatDirectoryEntrySchema = z.any().transform((value) => normalizeUatEntry(value));
export const AdvancedMapDatasetDraftRowSchema = z.any().transform((value) => normalizeDraftRow(value));
export const AdvancedMapDatasetDraftSnapshotSchema = z.any().transform((value) => normalizeDraftSnapshot(value));
export const AdvancedMapDatasetDraftSchema = z.any().transform((value) => normalizeDraft(value));

export function createEmptyAdvancedMapDatasetDraft(
  resourceKey: string,
  rows: AdvancedMapDatasetReferenceRow[] = []
): AdvancedMapDatasetDraft {
  const normalizedRows = rows.map((row) =>
    AdvancedMapDatasetDraftRowSchema.parse({
      ...row,
      valueNumber: '',
      valueJson: null,
      payloadDraft: null,
      value: '',
      reference: normalizeUatEntry({
        uatId: row.uatId,
        id: row.uatId,
        cui: row.cui,
        sirutaCode: row.sirutaCode,
        name: row.name,
        levelName: row.levelName,
        countyName: row.countyName,
        countyCode: row.countyCode,
        isCounty: row.isCounty,
      }),
      rawValue: '',
      valueText: '',
      source: 'manual',
      importedFrom: 'manual',
      isEmpty: true,
      parsedNumericValue: null,
      payloadValidationMessage: null,
      validationMessage: null,
      validationError: null,
    })
  );

  const rowsBySirutaCode = createRowsBySirutaCode(normalizedRows);
  const metadata = AdvancedMapDatasetDraftMetadataSchema.parse({});

  return {
    resourceKey: resourceKey.trim(),
    draftId: null,
    datasetId: null,
    publicId: null,
    metadata,
    title: metadata.title,
    description: metadata.description,
    markdown: metadata.markdown,
    unit: metadata.unit,
    visibility: metadata.visibility,
    rows: normalizedRows,
    rowsBySirutaCode,
    updatedAt: null,
  };
}

export function mapDatasetDetailToDraft(
  resourceKey: string,
  dataset: AdvancedMapDatasetDetail,
  rowsBySirutaCode: Map<string, AdvancedMapDatasetReferenceRow>
): AdvancedMapDatasetDraft {
  const metadata = AdvancedMapDatasetDraftMetadataSchema.parse({
    title: dataset.title,
    description: dataset.description ?? '',
    unit: dataset.unit ?? '',
    visibility: dataset.visibility,
    markdownText: dataset.markdownText ?? dataset.markdown ?? '',
    markdown: dataset.markdown ?? dataset.markdownText ?? '',
  });
  const rowBySirutaCode = new Map(dataset.rows.map((row) => [row.sirutaCode, row]));
  const referenceRows = Array.from(rowsBySirutaCode.values()).sort((left, right) =>
    left.sirutaCode.localeCompare(right.sirutaCode)
  );

  const rows = referenceRows.map((referenceRow) => {
    const datasetRow = rowBySirutaCode.get(referenceRow.sirutaCode);
    const rawValue = datasetRow?.valueNumber ?? '';
    return AdvancedMapDatasetDraftRowSchema.parse({
      ...referenceRow,
      valueNumber: rawValue,
      valueJson: datasetRow?.valueJson ?? null,
      rawValue,
      valueText: rawValue,
      source: rawValue === '' && datasetRow?.valueJson === null ? 'manual' : 'server',
      importedFrom: rawValue === '' && datasetRow?.valueJson === null ? 'manual' : 'server',
      isEmpty: rawValue === '' && datasetRow?.valueJson === null,
      parsedNumericValue: rawValue === '' ? null : parseAdvancedMapDatasetNumericValue(rawValue),
      validationMessage: null,
      validationError: null,
      reference: normalizeUatEntry(referenceRow),
    });
  });

  return AdvancedMapDatasetDraftSchema.parse({
    resourceKey: resourceKey.trim(),
    draftId: null,
    datasetId: dataset.id,
    publicId: dataset.publicId,
    metadata,
    title: dataset.title,
    description: dataset.description ?? '',
    markdown: dataset.markdownText ?? dataset.markdown ?? '',
    unit: dataset.unit ?? '',
    visibility: dataset.visibility,
    rows,
    rowsBySirutaCode: Object.fromEntries(rows.map((row) => [row.sirutaCode, row])),
    updatedAt: dataset.updatedAt,
  });
}

export function toSerializableAdvancedMapDatasetDraft(
  draft: AdvancedMapDatasetDraft
): AdvancedMapDatasetDraft {
  const rows = draft.rows.map((row) => AdvancedMapDatasetDraftRowSchema.parse(row));
  const rowsBySirutaCode = Object.fromEntries(rows.map((row) => [row.sirutaCode, row]));
  const metadata = AdvancedMapDatasetDraftMetadataSchema.parse(draft.metadata);

  return AdvancedMapDatasetDraftSchema.parse({
    resourceKey: draft.resourceKey,
    draftId: draft.draftId,
    datasetId: draft.datasetId,
    publicId: draft.publicId,
    metadata,
    title: draft.title,
    description: draft.description,
    markdown: draft.markdown,
    unit: draft.unit,
    visibility: draft.visibility,
    rows,
    rowsBySirutaCode,
    updatedAt: draft.updatedAt,
  });
}
