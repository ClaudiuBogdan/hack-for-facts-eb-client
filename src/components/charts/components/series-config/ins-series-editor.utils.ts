import type { OptionItem } from '@/components/filters/base-filter/interfaces';
import { defaultYearRange } from '@/schemas/charts';
import type { InsDataset, InsDimensionValue, InsPeriodicity } from '@/schemas/ins';
import type { PeriodDate, ReportPeriodInput, ReportPeriodType } from '@/schemas/reporting';
import { getUserLocale } from '@/lib/utils';

export type InsDimensionOptionKind =
  | 'classification'
  | 'source-territory'
  | 'unit'
  | 'territory'
  | 'siruta';

export type InsLocale = 'ro' | 'en';

const TOTAL_KEYWORDS = ['total', 'ambele', 'general'];
const PERIOD_TYPE_ORDER: ReportPeriodType[] = ['YEAR', 'QUARTER', 'MONTH'];

function resolveLocale(locale?: InsLocale): InsLocale {
  if (locale) return locale;
  return getUserLocale() === 'en' ? 'en' : 'ro';
}

function getLocalizedText(
  ro: string | null | undefined,
  en: string | null | undefined,
  locale: InsLocale
): string {
  return locale === 'en' ? en || ro || '' : ro || en || '';
}

function normalizeLabel(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isValidYearRange(yearRange?: number[] | null): yearRange is [number, number] {
  return (
    Array.isArray(yearRange) &&
    yearRange.length >= 2 &&
    Number.isFinite(yearRange[0]) &&
    Number.isFinite(yearRange[1])
  );
}

function normalizeYearRangeBounds(yearRange?: number[] | null): { start: number; end: number } {
  if (isValidYearRange(yearRange)) {
    return {
      start: Math.min(yearRange[0], yearRange[1]),
      end: Math.max(yearRange[0], yearRange[1]),
    };
  }
  return {
    start: defaultYearRange.start,
    end: defaultYearRange.end,
  };
}

function buildPeriodOptions(type: ReportPeriodType, range: { start: number; end: number }): PeriodDate[] {
  const options: PeriodDate[] = [];
  for (let year = range.start; year <= range.end; year += 1) {
    if (type === 'YEAR') {
      options.push(String(year) as PeriodDate);
      continue;
    }

    if (type === 'QUARTER') {
      options.push(`${year}-Q1` as PeriodDate);
      options.push(`${year}-Q2` as PeriodDate);
      options.push(`${year}-Q3` as PeriodDate);
      options.push(`${year}-Q4` as PeriodDate);
      continue;
    }

    options.push(`${year}-01` as PeriodDate);
    options.push(`${year}-02` as PeriodDate);
    options.push(`${year}-03` as PeriodDate);
    options.push(`${year}-04` as PeriodDate);
    options.push(`${year}-05` as PeriodDate);
    options.push(`${year}-06` as PeriodDate);
    options.push(`${year}-07` as PeriodDate);
    options.push(`${year}-08` as PeriodDate);
    options.push(`${year}-09` as PeriodDate);
    options.push(`${year}-10` as PeriodDate);
    options.push(`${year}-11` as PeriodDate);
    options.push(`${year}-12` as PeriodDate);
  }
  return options;
}

function isDateCompatibleWithType(date: string, type: ReportPeriodType): date is PeriodDate {
  if (type === 'YEAR') return /^\d{4}$/.test(date);
  if (type === 'QUARTER') return /^\d{4}-Q[1-4]$/.test(date);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(date);
}

function clampToAvailableOption(
  options: PeriodDate[],
  rawDate: string,
  side: 'start' | 'end'
): PeriodDate | null {
  if (options.length === 0) return null;
  if (options.includes(rawDate as PeriodDate)) {
    return rawDate as PeriodDate;
  }

  if (side === 'start') {
    const firstGreater = options.find((option) => option > rawDate);
    return firstGreater ?? options[options.length - 1] ?? null;
  }

  for (let index = options.length - 1; index >= 0; index -= 1) {
    const option = options[index];
    if (option && option < rawDate) {
      return option;
    }
  }
  return options[0] ?? null;
}

function normalizeAllowedPeriodTypes(allowedTypes?: ReportPeriodType[]): ReportPeriodType[] {
  if (!allowedTypes || allowedTypes.length === 0) {
    return PERIOD_TYPE_ORDER;
  }
  const allowed = new Set(allowedTypes);
  const normalized = PERIOD_TYPE_ORDER.filter((type) => allowed.has(type));
  return normalized.length > 0 ? normalized : PERIOD_TYPE_ORDER;
}

export function mapInsPeriodicityToReportType(
  periodicity: InsPeriodicity
): ReportPeriodType {
  if (periodicity === 'MONTHLY') return 'MONTH';
  if (periodicity === 'QUARTERLY') return 'QUARTER';
  return 'YEAR';
}

export function mapDatasetPeriodicitiesToAllowedTypes(
  periodicities: InsPeriodicity[] | null | undefined
): ReportPeriodType[] {
  if (!periodicities || periodicities.length === 0) {
    return PERIOD_TYPE_ORDER;
  }

  const allowed = new Set(periodicities.map(mapInsPeriodicityToReportType));
  return PERIOD_TYPE_ORDER.filter((type) => allowed.has(type));
}

export function buildDefaultInsPeriod(
  dataset: Pick<InsDataset, 'periodicity' | 'year_range'>,
  preferredType?: ReportPeriodType
): ReportPeriodInput {
  const allowedTypes = normalizeAllowedPeriodTypes(
    mapDatasetPeriodicitiesToAllowedTypes(dataset.periodicity)
  );
  const selectedType =
    preferredType && allowedTypes.includes(preferredType)
      ? preferredType
      : allowedTypes[0] ?? 'YEAR';
  const range = normalizeYearRangeBounds(dataset.year_range ?? undefined);
  const options = buildPeriodOptions(selectedType, range);
  const start = options[0] ?? `${range.start}`;
  const end = options[options.length - 1] ?? `${range.end}`;
  return {
    type: selectedType,
    selection: {
      interval: {
        start,
        end,
      },
    },
  };
}

export function clampPeriodToDatasetConstraints(
  period: ReportPeriodInput | undefined,
  allowedTypes?: ReportPeriodType[],
  yearRange?: { start: number; end: number }
): ReportPeriodInput | undefined {
  if (!period) return undefined;

  const normalizedAllowedTypes = normalizeAllowedPeriodTypes(allowedTypes);
  if (!normalizedAllowedTypes.includes(period.type)) {
    return undefined;
  }

  const hasCustomRange =
    !!yearRange &&
    Number.isFinite(yearRange.start) &&
    Number.isFinite(yearRange.end);

  if (!hasCustomRange) {
    if (period.selection.interval) {
      if (
        isDateCompatibleWithType(period.selection.interval.start, period.type) &&
        isDateCompatibleWithType(period.selection.interval.end, period.type)
      ) {
        return period;
      }
      return undefined;
    }

    const validDates = (period.selection.dates ?? []).filter((date) =>
      isDateCompatibleWithType(date, period.type)
    );
    if (validDates.length === 0) return undefined;
    return {
      type: period.type,
      selection: {
        dates: Array.from(new Set(validDates)),
      },
    };
  }

  const range = {
    start: Math.min(yearRange.start, yearRange.end),
    end: Math.max(yearRange.start, yearRange.end),
  };
  const options = buildPeriodOptions(period.type, range);
  const optionSet = new Set(options);

  if (period.selection.interval) {
    const nextStart = clampToAvailableOption(options, period.selection.interval.start, 'start');
    const nextEnd = clampToAvailableOption(options, period.selection.interval.end, 'end');
    if (!nextStart || !nextEnd) return undefined;

    const startIndex = options.indexOf(nextStart);
    const endIndex = options.indexOf(nextEnd);
    if (startIndex === -1 || endIndex === -1) return undefined;

    if (startIndex <= endIndex) {
      return {
        type: period.type,
        selection: {
          interval: {
            start: nextStart,
            end: nextEnd,
          },
        },
      };
    }

    return {
      type: period.type,
      selection: {
        interval: {
          start: nextStart,
          end: nextStart,
        },
      },
    };
  }

  const validDates = (period.selection.dates ?? []).filter(
    (date) => isDateCompatibleWithType(date, period.type) && optionSet.has(date)
  );
  if (validDates.length === 0) {
    return undefined;
  }

  return {
    type: period.type,
    selection: {
      dates: Array.from(new Set(validDates)),
    },
  };
}

export function areReportPeriodsEqual(
  left: ReportPeriodInput | undefined,
  right: ReportPeriodInput | undefined
): boolean {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return JSON.stringify(left) === JSON.stringify(right);
}

export function pickDefaultDimensionValue(values: InsDimensionValue[]): InsDimensionValue | null {
  if (values.length === 0) return null;

  const countryTotal = values.find((value) => value.territory?.code === 'RO');
  if (countryTotal) return countryTotal;

  const totalKeywordMatch = values.find((value) => {
    const label = String(value.label_ro ?? value.label_en ?? '');
    const normalizedLabel = normalizeLabel(label);
    return TOTAL_KEYWORDS.some((keyword) => normalizedLabel.includes(keyword));
  });
  if (totalKeywordMatch) return totalKeywordMatch;

  return values[0] ?? null;
}

export function mapInsDimensionValueToOption(
  value: InsDimensionValue,
  optionKind: InsDimensionOptionKind,
  classificationTypeCode?: string,
  locale?: InsLocale
): OptionItem | null {
  const resolvedLocale = resolveLocale(locale);

  if (optionKind === 'classification' || optionKind === 'source-territory') {
    const typeCode = value.classification_value?.type_code;
    const code = value.classification_value?.code;
    if (!typeCode || !code) return null;
    if (classificationTypeCode && typeCode !== classificationTypeCode) return null;

    const name =
      getLocalizedText(
        value.classification_value?.name_ro,
        value.classification_value?.name_en,
        resolvedLocale
      ) ||
      getLocalizedText(value.label_ro, value.label_en, resolvedLocale) ||
      code;
    return {
      id: code,
      label: `${code} - ${name}`,
    };
  }

  if (optionKind === 'unit') {
    const code = value.unit?.code;
    if (!code) return null;

    const unitLabel =
      getLocalizedText(value.unit?.name_ro, value.unit?.name_en, resolvedLocale) ||
      value.unit?.symbol ||
      code;
    return {
      id: code,
      label: `${code} - ${unitLabel}`,
    };
  }

  if (optionKind === 'territory') {
    const territoryCode = value.territory?.code;
    if (!territoryCode) return null;

    const territoryName =
      getLocalizedText(value.territory?.name_ro, value.territory?.name_en, resolvedLocale) ||
      getLocalizedText(value.label_ro, value.label_en, resolvedLocale) ||
      territoryCode;
    return {
      id: territoryCode,
      label: `${territoryCode} - ${territoryName}`,
    };
  }

  const sirutaCode = value.territory?.siruta_code;
  if (!sirutaCode) return null;

  const territoryName =
    getLocalizedText(value.territory?.name_ro, value.territory?.name_en, resolvedLocale) ||
    getLocalizedText(value.label_ro, value.label_en, resolvedLocale) ||
    sirutaCode;
  const territoryCode = value.territory?.code;
  const suffix = territoryCode ? ` (${territoryCode})` : '';
  return {
    id: sirutaCode,
    label: `${sirutaCode} - ${territoryName}${suffix}`,
  };
}

export function upsertSelectionRecord(
  current: Record<string, string[]> | undefined,
  key: string,
  nextValues: string[]
): Record<string, string[]> | undefined {
  const next: Record<string, string[]> = { ...(current ?? {}) };

  if (nextValues.length === 0) {
    delete next[key];
  } else {
    next[key] = nextValues;
  }

  return Object.keys(next).length > 0 ? next : undefined;
}
