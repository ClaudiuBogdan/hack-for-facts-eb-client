import type { InsDatasetDimension, InsObservation } from '@/schemas/ins';

export interface InsSeriesOption {
  code: string;
  rawCode: string;
  label: string;
  typeCode: string;
  typeLabel: string;
  sortOrder: number | null;
  isTotalLike: boolean;
}

export interface InsSeriesGroup {
  typeCode: string;
  typeLabel: string;
  index: number;
  options: InsSeriesOption[];
}

export interface InsUnitOption {
  key: string;
  label: string;
  count: number;
  hasExplicitUnit: boolean;
}

export function normalizeSeriesLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function isTotalLikeSeriesLabel(value: string): boolean {
  const normalized = normalizeSeriesLabel(value);
  if (normalized === 'total') return true;
  return normalized.includes('total general') || normalized.includes('ambele sexe') || normalized.includes('din total');
}

function buildClassificationSelectionKey(classification: NonNullable<InsObservation['classifications']>[number]): string {
  const id = classification.id?.trim();
  if (id) {
    return `id:${id}`;
  }

  const code = classification.code?.trim() ?? '';
  const sortOrder = classification.sort_order != null ? String(classification.sort_order) : '';
  const label = normalizeSeriesLabel(classification.name_ro || classification.name_en || '');
  return `fallback:${code}|${sortOrder}|${label}`;
}

export function getObservationClassificationSelectionMap(observation: InsObservation): Record<string, string> {
  const map: Record<string, string> = {};
  for (const classification of observation.classifications ?? []) {
    const typeCode = classification.type_code?.trim();
    if (!typeCode) continue;
    map[typeCode] = buildClassificationSelectionKey(classification);
  }
  return map;
}

export function getObservationUnitKey(observation: InsObservation): string | null {
  const code = observation.unit?.code?.trim();
  const symbol = observation.unit?.symbol?.trim();
  const name = observation.unit?.name_ro?.trim();
  return code || symbol || name || null;
}

function getObservationUnitLabel(observation: InsObservation): string {
  return observation.unit?.symbol || observation.unit?.name_ro || observation.unit?.code || 'Unspecified unit';
}

function getObservationPeriodKey(observation: InsObservation): number {
  return (
    observation.time_period.year * 10000 +
    (observation.time_period.quarter ?? 0) * 100 +
    (observation.time_period.month ?? 0)
  );
}

function getObservationDeterministicScore(observation: InsObservation): number {
  let score = 0;
  if (!observation.value_status) score += 4;
  if (observation.value != null && observation.value.trim() !== '') score += 2;
  const unitKey = getObservationUnitKey(observation);
  if (unitKey) score += 1;
  return score;
}

function getObservationClassSignature(observation: InsObservation): string {
  const parts = (observation.classifications ?? [])
    .map((item) => `${item.type_code ?? ''}:${item.code ?? ''}`)
    .sort();
  return parts.join('|');
}

function compareSeriesOptions(left: InsSeriesOption, right: InsSeriesOption): number {
  if (left.isTotalLike !== right.isTotalLike) {
    return left.isTotalLike ? -1 : 1;
  }
  if (left.sortOrder != null && right.sortOrder != null && left.sortOrder !== right.sortOrder) {
    return left.sortOrder - right.sortOrder;
  }
  if (left.sortOrder != null && right.sortOrder == null) return -1;
  if (left.sortOrder == null && right.sortOrder != null) return 1;
  const labelComparison = left.label.localeCompare(right.label, 'ro');
  if (labelComparison !== 0) return labelComparison;
  return left.code.localeCompare(right.code, 'ro');
}

function compareObservationDeterministically(left: InsObservation, right: InsObservation): number {
  const scoreDiff = getObservationDeterministicScore(right) - getObservationDeterministicScore(left);
  if (scoreDiff !== 0) return scoreDiff;

  const leftClasses = getObservationClassSignature(left);
  const rightClasses = getObservationClassSignature(right);
  const classDiff = leftClasses.localeCompare(rightClasses, 'ro');
  if (classDiff !== 0) return classDiff;

  const leftUnit = getObservationUnitKey(left) ?? '';
  const rightUnit = getObservationUnitKey(right) ?? '';
  const unitDiff = leftUnit.localeCompare(rightUnit, 'ro');
  if (unitDiff !== 0) return unitDiff;

  const leftValue = left.value ?? '';
  const rightValue = right.value ?? '';
  const valueDiff = rightValue.localeCompare(leftValue, 'ro');
  if (valueDiff !== 0) return valueDiff;

  return right.dataset_code.localeCompare(left.dataset_code, 'ro');
}

function pickDefaultOption(group: InsSeriesGroup): InsSeriesOption | null {
  if (group.options.length === 0) return null;
  const totalOption = group.options.find((option) => option.isTotalLike);
  return totalOption ?? group.options[0];
}

function buildSeriesOptionLookups(group: InsSeriesGroup): {
  optionByCode: Map<string, InsSeriesOption>;
  optionByRawCode: Map<string, InsSeriesOption>;
} {
  return {
    optionByCode: new Map(group.options.map((option) => [option.code, option])),
    optionByRawCode: new Map(group.options.map((option) => [option.rawCode, option])),
  };
}

function sortRemainingTypeCodes(
  typeCodes: string[],
  typeLabelByCode: Map<string, string>
): string[] {
  return [...typeCodes].sort((left, right) => {
    const leftLabel = typeLabelByCode.get(left) ?? left;
    const rightLabel = typeLabelByCode.get(right) ?? right;
    const labelDiff = leftLabel.localeCompare(rightLabel, 'ro');
    if (labelDiff !== 0) return labelDiff;
    return left.localeCompare(right, 'ro');
  });
}

export function buildSeriesGroups(
  observations: InsObservation[],
  dimensions: InsDatasetDimension[]
): InsSeriesGroup[] {
  const optionsByTypeCode = new Map<string, Map<string, InsSeriesOption>>();
  const typeLabelByCode = new Map<string, string>();

  for (const observation of observations) {
    for (const classification of observation.classifications ?? []) {
      const typeCode = classification.type_code?.trim();
      const rawCode = classification.code?.trim();
      if (!typeCode || !rawCode) continue;

      if (!optionsByTypeCode.has(typeCode)) {
        optionsByTypeCode.set(typeCode, new Map());
      }

      const typeLabel = classification.type_name_ro || classification.type_name_en || typeCode;
      typeLabelByCode.set(typeCode, typeLabel);

      const optionMap = optionsByTypeCode.get(typeCode)!;
      const selectionKey = buildClassificationSelectionKey(classification);
      const existing = optionMap.get(selectionKey);
      if (existing) {
        if (existing.sortOrder == null && classification.sort_order != null) {
          existing.sortOrder = classification.sort_order;
        }
        continue;
      }

      const optionLabel = classification.name_ro || classification.name_en || rawCode;
      optionMap.set(selectionKey, {
        code: selectionKey,
        rawCode,
        label: optionLabel,
        typeCode,
        typeLabel,
        sortOrder: classification.sort_order ?? null,
        isTotalLike: isTotalLikeSeriesLabel(optionLabel),
      });
    }
  }

  if (optionsByTypeCode.size === 0) return [];

  const orderedTypeCodesFromDimensions = dimensions
    .filter((dimension) => dimension.type === 'CLASSIFICATION' && dimension.classification_type?.code)
    .sort((left, right) => left.index - right.index)
    .map((dimension) => dimension.classification_type?.code)
    .filter((code): code is string => Boolean(code));

  for (const dimension of dimensions) {
    if (dimension.type !== 'CLASSIFICATION' || !dimension.classification_type?.code) continue;
    const code = dimension.classification_type.code;
    if (!typeLabelByCode.has(code)) {
      typeLabelByCode.set(code, dimension.classification_type.name_ro || dimension.classification_type.name_en || code);
    }
  }

  const observedTypeCodes = Array.from(optionsByTypeCode.keys());
  const usedTypeCodes = new Set<string>();
  const orderedTypeCodes: string[] = [];

  for (const typeCode of orderedTypeCodesFromDimensions) {
    if (!optionsByTypeCode.has(typeCode) || usedTypeCodes.has(typeCode)) continue;
    orderedTypeCodes.push(typeCode);
    usedTypeCodes.add(typeCode);
  }

  const remainingTypeCodes = observedTypeCodes.filter((typeCode) => !usedTypeCodes.has(typeCode));
  orderedTypeCodes.push(...sortRemainingTypeCodes(remainingTypeCodes, typeLabelByCode));

  return orderedTypeCodes.map((typeCode, index) => {
    const options = Array.from(optionsByTypeCode.get(typeCode)?.values() ?? []).sort(compareSeriesOptions);
    return {
      typeCode,
      typeLabel: typeLabelByCode.get(typeCode) ?? typeCode,
      index,
      options,
    };
  });
}

export function buildDefaultSeriesSelection(groups: InsSeriesGroup[]): Record<string, string[]> {
  const selection: Record<string, string[]> = {};

  for (const group of groups) {
    const option = pickDefaultOption(group);
    if (option) {
      selection[group.typeCode] = [option.code];
    }
  }

  return selection;
}

export function mergeSeriesSelection(
  groups: InsSeriesGroup[],
  previousSelection: Record<string, string[]>
): Record<string, string[]> {
  const mergedSelection: Record<string, string[]> = {};

  for (const group of groups) {
    const hasExplicitSelection = Object.prototype.hasOwnProperty.call(previousSelection, group.typeCode);
    const selectedCodes = previousSelection[group.typeCode] ?? [];
    if (hasExplicitSelection && selectedCodes.length === 0) {
      mergedSelection[group.typeCode] = [];
      continue;
    }

    const { optionByCode, optionByRawCode } = buildSeriesOptionLookups(group);
    const validSelection = Array.from(
      new Set(
        selectedCodes
          .map((selectedCode) => {
            const byCode = optionByCode.get(selectedCode);
            if (byCode) return byCode.code;

            const byRawCode = optionByRawCode.get(selectedCode);
            if (byRawCode) return byRawCode.code;

            return null;
          })
          .filter((selectedCode): selectedCode is string => Boolean(selectedCode))
      )
    );
    if (validSelection.length > 0) {
      const containsTotalLike = validSelection.some((selectedCode) => optionByCode.get(selectedCode)?.isTotalLike);
      if (containsTotalLike && validSelection.length > 1) {
        const withoutTotalLike = validSelection.filter((selectedCode) => !optionByCode.get(selectedCode)?.isTotalLike);
        mergedSelection[group.typeCode] = withoutTotalLike.length > 0 ? withoutTotalLike : [validSelection[0]];
      } else {
        mergedSelection[group.typeCode] = validSelection;
      }
      continue;
    }

    const defaultOption = pickDefaultOption(group);
    if (defaultOption) {
      mergedSelection[group.typeCode] = [defaultOption.code];
    }
  }

  return mergedSelection;
}

export function buildUnitOptions(observations: InsObservation[]): InsUnitOption[] {
  const optionMap = new Map<string, InsUnitOption>();

  for (const observation of observations) {
    const key = getObservationUnitKey(observation) ?? '__none__';
    const label = getObservationUnitLabel(observation);
    const hasExplicitUnit = key !== '__none__';
    const existing = optionMap.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    optionMap.set(key, {
      key,
      label,
      count: 1,
      hasExplicitUnit,
    });
  }

  return Array.from(optionMap.values()).sort((left, right) => {
    if (left.hasExplicitUnit !== right.hasExplicitUnit) {
      return left.hasExplicitUnit ? -1 : 1;
    }
    if (left.count !== right.count) {
      return right.count - left.count;
    }
    return left.label.localeCompare(right.label, 'ro');
  });
}

export function getDefaultUnitSelection(unitOptions: InsUnitOption[]): string | null {
  if (unitOptions.length === 0) return null;
  return unitOptions[0]?.key ?? null;
}

export function mergeUnitSelection(unitOptions: InsUnitOption[], previousUnitKey: string | null): string | null {
  if (unitOptions.length === 0) return null;
  if (previousUnitKey && unitOptions.some((option) => option.key === previousUnitKey)) {
    return previousUnitKey;
  }
  return getDefaultUnitSelection(unitOptions);
}

export function filterObservationsBySeriesSelection(
  observations: InsObservation[],
  selectedClassificationCodes: Record<string, string[]>,
  selectedUnitKey: string | null
): InsObservation[] {
  const selectionEntries = Object.entries(selectedClassificationCodes);
  const hasNoClassificationFilters = selectionEntries.length === 0;

  return observations.filter((observation) => {
    if (selectedUnitKey) {
      const observationUnitKey = getObservationUnitKey(observation) ?? '__none__';
      if (observationUnitKey !== selectedUnitKey) return false;
    }

    if (hasNoClassificationFilters) {
      return true;
    }

    const observationClassifications = new Map<string, string>(
      Object.entries(getObservationClassificationSelectionMap(observation))
    );

    for (const [typeCode, selectedCodes] of selectionEntries) {
      if (selectedCodes.length === 0) continue;
      if (!selectedCodes.includes(observationClassifications.get(typeCode) ?? '')) {
        return false;
      }
    }

    return true;
  });
}

export function buildStableSeries(observations: InsObservation[]): InsObservation[] {
  const byPeriod = new Map<string, InsObservation[]>();

  for (const observation of observations) {
    const periodKey = observation.time_period?.iso_period;
    if (!periodKey) continue;
    const existing = byPeriod.get(periodKey);
    if (existing) {
      existing.push(observation);
    } else {
      byPeriod.set(periodKey, [observation]);
    }
  }

  const series = Array.from(byPeriod.values())
    .map((periodRows) => [...periodRows].sort(compareObservationDeterministically)[0])
    .filter((observation): observation is InsObservation => Boolean(observation));

  return series.sort((left, right) => getObservationPeriodKey(right) - getObservationPeriodKey(left));
}
