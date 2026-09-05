import { t } from '@lingui/core/macro';

import type { InsObservation, InsPeriodicity } from '@/schemas/ins';
import { formatNumber, formatValueWithUnit } from '@/lib/utils';
import { getObservationClassificationSelectionMap } from '@/lib/ins/series-selection';

const PERIODICITY_LABELS: Record<InsPeriodicity, string> = {
  ANNUAL: t`Annual`,
  SEMESTRIAL: t`Semiannual`,
  RANGE: t`Interval`,
  OTHER: t`Other periodicity`,
  QUARTERLY: t`Quarterly`,
  MONTHLY: t`Monthly`,
};

const VALUE_STATUS_LABELS: Record<string, string> = {
  ':': t`Missing`,
  c: t`Confidential`,
  x: t`Confidential`,
};

export function getLocalizedText(
  ro: string | null | undefined,
  en: string | null | undefined,
  locale: 'ro' | 'en'
): string {
  if (locale === 'en') {
    return en || ro || '';
  }
  return ro || en || '';
}

export function formatDatasetPeriodicity(periodicities: InsPeriodicity[] | null | undefined): string {
  return (periodicities ?? [])
    .map((periodicity) => PERIODICITY_LABELS[periodicity] ?? periodicity)
    .join(', ');
}

export function formatPeriodLabel(period: InsObservation['time_period']) {
  if (!period) return t`Unknown`;
  if (period.periodicity === 'MONTHLY' && period.month) {
    const month = String(period.month).padStart(2, '0');
    return `${period.year}-${month}`;
  }
  if (period.periodicity === 'QUARTERLY' && period.quarter) {
    return `T${period.quarter} ${period.year}`;
  }
  return period.periodicity === 'ANNUAL' ? `${period.year}` : period.iso_period;
}

export function parseObservationValue(rawValue: string | null | undefined): number | null {
  if (rawValue == null) return null;
  const normalized = rawValue.replace(',', '.');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getObservationUnit(observation: InsObservation): string | null {
  return observation.unit?.symbol || observation.unit?.code || null;
}

export function getObservationStatusLabel(status: string | null | undefined): string | null {
  if (!status) return null;
  return VALUE_STATUS_LABELS[status] ?? t`Unavailable`;
}

function isPercentUnit(observation: InsObservation): boolean {
  const unitCandidates = [observation.unit?.symbol, observation.unit?.code, observation.unit?.name_ro]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());

  return unitCandidates.some((value) => value.includes('%') || value.includes('procent'));
}

export function getCardNumericValue(observation: InsObservation): { value: string; statusLabel?: string } {
  const statusLabel = getObservationStatusLabel(observation.value_status);
  if (statusLabel) return { value: '—', statusLabel };

  const numericValue = parseObservationValue(observation.value);
  if (numericValue == null) return { value: t`N/A` };

  const numberValue = formatNumber(numericValue, 'compact');
  if (isPercentUnit(observation)) {
    return { value: `${numberValue}%` };
  }

  return { value: numberValue };
}

export function normalizeLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function getClassificationLabel(observation: InsObservation): string {
  const labels = observation.classifications
    ?.map((item) => item.name_ro || item.code)
    .filter(Boolean) as string[] | undefined;

  if (!labels || labels.length === 0) return t`Total`;
  return labels.join(' • ');
}

export function buildSeriesSelectionFromObservation(
  observation: InsObservation | null | undefined
): Record<string, string[]> {
  if (!observation) return {};

  const classificationMap = getObservationClassificationSelectionMap(observation);
  const selection: Record<string, string[]> = {};

  for (const [typeCode, selectionKey] of Object.entries(classificationMap)) {
    if (!typeCode || !selectionKey) continue;
    selection[typeCode] = [selectionKey];
  }

  return selection;
}

export function buildObservationSeriesTupleSignature(observation: InsObservation): string {
  const classificationMap = getObservationClassificationSelectionMap(observation);
  const classificationPart = Object.entries(classificationMap)
    .sort(([leftTypeCode], [rightTypeCode]) => leftTypeCode.localeCompare(rightTypeCode, 'ro'))
    .map(([typeCode, selectionKey]) => `${typeCode}:${selectionKey}`)
    .join('|');
  const unitPart =
    observation.unit?.code?.trim() ||
    observation.unit?.symbol?.trim() ||
    observation.unit?.name_ro?.trim() ||
    '__none__';
  return `${unitPart}||${classificationPart}`;
}

export function formatObservationValue(observation: InsObservation): { value: string; statusLabel?: string } {
  const statusLabel = getObservationStatusLabel(observation.value_status);
  if (statusLabel) return { value: '—', statusLabel };

  const numericValue = parseObservationValue(observation.value);
  if (numericValue == null) return { value: t`N/A` };

  const unit = getObservationUnit(observation);
  if (!unit) return { value: formatNumber(numericValue, 'compact') };

  return { value: formatValueWithUnit(numericValue, unit, 'compact') };
}

export function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function getSearchScore(params: {
  normalizedQuery: string;
  normalizedName: string;
  normalizedContext: string;
  normalizedCode: string;
  normalizedSupplemental: string;
}): number {
  const { normalizedQuery, normalizedName, normalizedContext, normalizedCode, normalizedSupplemental } = params;
  if (normalizedQuery === '') return 100;

  const combinedText = `${normalizedName} ${normalizedContext} ${normalizedSupplemental} ${normalizedCode}`.trim();
  const tokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const scoreByField = (field: string, base: number): number => {
    if (!field) return -1;

    if (field === normalizedQuery) return base + 120;
    if (field.startsWith(normalizedQuery)) return base + 90 - Math.min(50, field.length - normalizedQuery.length);

    const fieldWords = field.split(/\s+/).filter(Boolean);
    if (fieldWords.some((word) => word.startsWith(normalizedQuery))) {
      return base + 70;
    }

    if (tokens.length > 0 && tokens.every((token) => field.includes(token))) {
      return base + 55 + Math.min(tokens.length, 6) * 5;
    }

    const directIndex = field.indexOf(normalizedQuery);
    if (directIndex >= 0) {
      return base + 40 - Math.min(40, directIndex);
    }

    return -1;
  };

  const nameScore = scoreByField(normalizedName, 1400);
  if (nameScore >= 0) return nameScore;

  const contextScore = scoreByField(normalizedContext, 1000);
  if (contextScore >= 0) return contextScore;

  const supplementalScore = scoreByField(normalizedSupplemental, 850);
  if (supplementalScore >= 0) return supplementalScore;

  const codeScore = scoreByField(normalizedCode, 700);
  if (codeScore >= 0) return codeScore;

  if (normalizedQuery.length > 2) {
    return -1;
  }

  let queryIndex = 0;
  for (const character of combinedText) {
    if (character === normalizedQuery[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === normalizedQuery.length) return 250;
    }
  }

  return -1;
}

export function getContextPathSegments(path: string | null | undefined): string[] {
  if (!path) return [];
  return path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function areStringArraysEqual(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}

export function toPlainTextLabel(value: string): string {
  const decoded = decodeHtmlEntities(value);
  return decoded
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeRootLabel(value: string): string {
  return value.replace(/^[A-H]\.\s*/i, '').trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export function isSafeExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  return href.startsWith('http://') || href.startsWith('https://');
}

function htmlToMarkdown(value: string): string {
  const withLinks = value.replace(
    /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi,
    (_match, href: string, label: string) => {
      const safeHref = href.trim();
      const safeLabel = toPlainTextLabel(label);
      if (!isSafeExternalHref(safeHref)) return safeLabel;
      return `[${safeLabel}](${safeHref})`;
    }
  );

  return withLinks
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function normalizeMarkdownText(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = decodeHtmlEntities(htmlToMarkdown(value));
  return text.trim() === '' ? null : text;
}

function normalizeMetadataKey(value: string): string {
  return normalizeLabel(value).replace(/[^a-z0-9]/g, '');
}

function metadataValueToText(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return normalizeMarkdownText(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const parts = value
      .map((entry) => metadataValueToText(entry))
      .filter(Boolean) as string[];
    if (parts.length === 0) return null;
    return parts.join(', ');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const priorityKeys = ['ro', 'text', 'description', 'value', 'name'];
    for (const key of priorityKeys) {
      if (record[key] != null) {
        const text = metadataValueToText(record[key]);
        if (text) return text;
      }
    }
  }
  return null;
}

export function findMetadataText(
  metadata: Record<string, unknown> | null | undefined,
  keys: string[]
): string | null {
  if (!metadata) return null;
  const targetKeys = new Set(keys.map((key) => normalizeMetadataKey(key)));

  for (const [rawKey, rawValue] of Object.entries(metadata)) {
    if (!targetKeys.has(normalizeMetadataKey(rawKey))) continue;
    const text = metadataValueToText(rawValue);
    if (text) return text;
  }

  return null;
}
