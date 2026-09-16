import { t } from '@lingui/core/macro';

import type { InsObservation } from '@/schemas/ins';
import { formatNumber } from '@/lib/utils';
import type {
  DerivedIndicator,
  DerivedIndicatorExplanation,
  DerivedIndicatorGroup,
  DerivedIndicatorId,
  DerivedIndicatorRuntimeContext,
} from './ins-stats-view.types';
import { parseObservationValue } from './ins-stats-view.formatters';

function extractIndicatorNumericMap(
  values: Array<{ datasetCode: string; observation?: InsObservation | null }>
): Map<string, number> {
  const result = new Map<string, number>();

  for (const row of values) {
    const code = row.datasetCode;
    const value = parseObservationValue(row.observation?.value);
    if (value != null) {
      result.set(code, value);
    }
  }

  return result;
}

function extractIndicatorUnitMap(
  values: Array<{ datasetCode: string; observation?: InsObservation | null }>
): Map<string, string> {
  const result = new Map<string, string>();

  for (const row of values) {
    const unit = row.observation ? getObservationSourceUnitForDerived(row.observation) : null;
    if (!unit) continue;
    result.set(row.datasetCode, unit);
  }

  return result;
}

export function getObservationSourceUnitForDerived(observation: InsObservation): string | null {
  const candidates = [observation.unit?.symbol, observation.unit?.name_ro, observation.unit?.code];

  for (const rawCandidate of candidates) {
    if (!rawCandidate) continue;
    const candidate = String(rawCandidate).trim();
    if (!candidate) continue;
    if (/^\d+$/.test(candidate)) continue;
    return candidate;
  }

  return null;
}

function formatDerivedMetric(value: number, mode: 'rate' | 'value'): string {
  if (!Number.isFinite(value)) return '—';
  if (mode === 'rate') {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
  return formatNumber(value, 'compact');
}

export const DERIVED_INDICATOR_GROUP_META: Record<
  DerivedIndicatorGroup,
  { label: string; description: string }
> = {
  demography: {
    label: t`Demography`,
    description: t`Birth, mortality, and migration balance.`,
  },
  economy_housing: {
    label: t`Economy & housing`,
    description: t`Labor market and housing pressure indicators.`,
  },
  utilities: {
    label: t`Utilities`,
    description: t`Water, gas, and network service proxies.`,
  },
};

export const DERIVED_INDICATOR_GROUP_ORDER: DerivedIndicatorGroup[] = [
  'demography',
  'economy_housing',
  'utilities',
];

export const DERIVED_INDICATOR_EXPLANATIONS: Record<DerivedIndicatorId, DerivedIndicatorExplanation> = {
  'birth-rate': {
    whyItMatters: t`Birth rate tracks demographic renewal and future pressure on schools, childcare, and local services.`,
    formula: t`(Live births / Population) × 1,000`,
    inputs: [t`Live births (POP201D)`, t`Population (POP107D)`],
    notes: t`Compare with death rate and migration to understand if growth is structural or temporary.`,
  },
  'death-rate': {
    whyItMatters: t`Death rate captures health and age-structure pressure and helps explain natural change in population.`,
    formula: t`(Deaths / Population) × 1,000`,
    inputs: [t`Deaths (POP206D)`, t`Population (POP107D)`],
    notes: t`Interpret together with birth rate and local age profile; short-term spikes can occur in crisis years.`,
  },
  'natural-increase': {
    whyItMatters: t`Natural increase shows the absolute demographic balance from births versus deaths.`,
    formula: t`Live births − Deaths`,
    inputs: [t`Live births (POP201D)`, t`Deaths (POP206D)`],
    notes: t`Positive values indicate natural growth; negative values indicate natural decline.`,
  },
  'natural-increase-rate': {
    whyItMatters: t`Natural increase rate normalizes birth-death balance for locality size so territories can be compared fairly.`,
    formula: t`((Live births − Deaths) / Population) × 1,000`,
    inputs: [t`Live births (POP201D)`, t`Deaths (POP206D)`, t`Population (POP107D)`],
    notes: t`A negative rate means deaths exceed births even if total population may still grow via migration.`,
  },
  'net-migration': {
    whyItMatters: t`Net migration in absolute terms shows whether people are moving in or out overall.`,
    formula: t`Immigrants − Emigrants`,
    inputs: [t`Immigrants (POP310E)`, t`Emigrants (POP309E)`],
    notes: t`Use alongside natural increase to separate demographic change from movement-driven change.`,
  },
  'net-migration-rate': {
    whyItMatters: t`Net migration rate captures attractiveness and retention dynamics adjusted for population size.`,
    formula: t`((Immigrants − Emigrants) / Population) × 1,000`,
    inputs: [t`Immigrants (POP310E)`, t`Emigrants (POP309E)`, t`Population (POP107D)`],
    notes: t`High volatility can appear in small localities where modest flows create large per-capita swings.`,
  },
  'employees-rate': {
    whyItMatters: t`Employees per 1,000 inhabitants is a simple proxy for local labor-market intensity.`,
    formula: t`(Employees / Population) × 1,000`,
    inputs: [t`Employees (FOM104D)`, t`Population (POP107D)`],
    notes: t`This is not an employment rate by age group; it is a general intensity indicator.`,
  },
  'dwellings-rate': {
    whyItMatters: t`Dwellings per 1,000 inhabitants signals housing capacity relative to resident population.`,
    formula: t`(Existing dwellings / Population) × 1,000`,
    inputs: [t`Existing dwellings (LOC101B)`, t`Population (POP107D)`],
    notes: t`Use with living-area indicator for a fuller view of housing availability and crowding pressure.`,
  },
  'living-area': {
    whyItMatters: t`Living area per inhabitant measures residential space availability and housing quality pressure.`,
    formula: t`Living area / Population`,
    inputs: [t`Total living area (LOC103B)`, t`Population (POP107D)`],
    notes: t`Differences can reflect housing stock structure, tourism pressure, and suburbanization patterns.`,
  },
  water: {
    whyItMatters: t`Water volume per inhabitant is a proxy for household and economic utility demand intensity.`,
    formula: t`Water distributed / Population`,
    inputs: [t`Water distributed (GOS107A)`, t`Population (POP107D)`],
    notes: t`Interpret with network coverage and industrial structure; utility demand is not only household demand.`,
  },
  gas: {
    whyItMatters: t`Gas volume per inhabitant indicates reliance on gas infrastructure and energy-use profile.`,
    formula: t`Gas distributed / Population`,
    inputs: [t`Gas distributed (GOS118A)`, t`Population (POP107D)`],
    notes: t`Weather, heating systems, and local industry can materially affect year-to-year variation.`,
  },
  'sewer-rate': {
    whyItMatters: t`Sewer network length per 1,000 inhabitants approximates sanitation infrastructure intensity.`,
    formula: t`(Sewer network length / Population) × 1,000`,
    inputs: [t`Sewer network length (GOS110A)`, t`Population (POP107D)`],
    notes: t`Coverage quality still depends on connection rates and settlement density, not only network length.`,
  },
  'gas-network-rate': {
    whyItMatters: t`Gas network length per 1,000 inhabitants shows gas infrastructure reach relative to population size.`,
    formula: t`(Gas network length / Population) × 1,000`,
    inputs: [t`Gas network length (GOS116A)`, t`Population (POP107D)`],
    notes: t`Network expansion may precede household connections, so combine with consumption indicators.`,
  },
};

export function getDerivedIndicatorExplanation(id: DerivedIndicatorId): DerivedIndicatorExplanation {
  return DERIVED_INDICATOR_EXPLANATIONS[id];
}

export function buildDerivedIndicatorRuntimeContext(params: {
  selectedPeriodLabel: string;
  dataPeriodLabel: string;
  sourceDatasetCode: string | null;
  hasFallback: boolean;
}): DerivedIndicatorRuntimeContext {
  const sourceDatasetCode =
    params.sourceDatasetCode && params.sourceDatasetCode.trim() !== ''
      ? params.sourceDatasetCode.trim().toUpperCase()
      : null;

  return {
    selectedPeriodLabel: params.selectedPeriodLabel,
    dataPeriodLabel: params.dataPeriodLabel,
    sourceDatasetCode,
    hasFallback: params.hasFallback,
  };
}

export function getDerivedIndicatorGroup(id: DerivedIndicatorId): DerivedIndicatorGroup {
  switch (id) {
    case 'birth-rate':
    case 'death-rate':
    case 'natural-increase':
    case 'natural-increase-rate':
    case 'net-migration':
    case 'net-migration-rate':
      return 'demography';
    case 'employees-rate':
    case 'dwellings-rate':
    case 'living-area':
      return 'economy_housing';
    case 'water':
    case 'gas':
    case 'sewer-rate':
    case 'gas-network-rate':
      return 'utilities';
    default:
      return 'demography';
  }
}

export function computeDerivedIndicators(
  indicatorValues: Array<{ datasetCode: string; observation?: InsObservation | null }>
) {
  const map = extractIndicatorNumericMap(indicatorValues);
  const unitMap = extractIndicatorUnitMap(indicatorValues);
  const population = map.get('POP107D');
  if (population == null || population <= 0) {
    return [] as DerivedIndicator[];
  }

  const safeDivide = (numerator: number | undefined, denominator: number): number | null => {
    if (numerator == null || denominator <= 0) return null;
    return numerator / denominator;
  };

  const births = map.get('POP201D');
  const deaths = map.get('POP206D');
  const emigrants = map.get('POP309E');
  const immigrants = map.get('POP310E');
  const employees = map.get('FOM104D');
  const dwellings = map.get('LOC101B');
  const livingArea = map.get('LOC103B');
  const water = map.get('GOS107A');
  const gas = map.get('GOS118A');
  const sewerKm = map.get('GOS110A');
  const gasNetworkKm = map.get('GOS116A');

  const rows: DerivedIndicator[] = [];

  // The source's unit symbol is kept for brevity (`m²`, `km`), but its generic
  // counting symbols are English tokens ("persons", "count", "number", "other")
  // that read as a foreign word in a Romanian row. Those fall back to the
  // curated short label; unit identity is still checked on `unit.code` by the
  // caller, so the label choice never masks a real unit difference.
  const GENERIC_UNIT_SYMBOLS = new Set(['persons', 'person', 'count', 'number', 'other', 'numar', 'persoane']);
  const getBaseUnit = (datasetCode: string, fallbackBaseUnit: string) => {
    const symbol = unitMap.get(datasetCode);
    if (!symbol || GENERIC_UNIT_SYMBOLS.has(symbol.trim().toLowerCase())) return fallbackBaseUnit;
    return symbol;
  };

  const makePerThousandUnit = (datasetCode: string, fallbackBaseUnit: string) => {
    const baseUnit = getBaseUnit(datasetCode, fallbackBaseUnit);
    return `${baseUnit} / ${t`1,000 inhabitants`}`;
  };

  const makePerCapitaUnit = (datasetCode: string, fallbackBaseUnit: string) => {
    const baseUnit = getBaseUnit(datasetCode, fallbackBaseUnit);
    return `${baseUnit} / ${t`inhabitant`}`;
  };

  const pushRate = (
    id: DerivedIndicator['id'],
    label: string,
    value: number | null,
    sourceDatasetCode: string | null,
    unitLabel: string = t`per 1,000 inhabitants`
  ) => {
    if (value == null) return;
    rows.push({ id, label, value: formatDerivedMetric(value, 'rate'), sourceDatasetCode, unitLabel });
  };

  const pushValue = (
    id: DerivedIndicator['id'],
    label: string,
    value: number | null,
    sourceDatasetCode: string | null,
    unitLabel: string = t`per capita`
  ) => {
    if (value == null) return;
    rows.push({ id, label, value: formatDerivedMetric(value, 'value'), sourceDatasetCode, unitLabel });
  };

  pushRate(
    'birth-rate',
    t`Birth rate`,
    safeDivide(births, population) != null ? (births! / population) * 1000 : null,
    'POP201D',
    makePerThousandUnit('POP201D', 'pers.')
  );
  pushRate(
    'death-rate',
    t`Death rate`,
    safeDivide(deaths, population) != null ? (deaths! / population) * 1000 : null,
    'POP206D',
    makePerThousandUnit('POP206D', 'pers.')
  );
  pushRate(
    'natural-increase-rate',
    t`Natural increase`,
    births != null && deaths != null ? ((births - deaths) / population) * 1000 : null,
    'POP201D',
    makePerThousandUnit('POP201D', 'pers.')
  );
  pushRate(
    'net-migration-rate',
    t`Net migration`,
    immigrants != null && emigrants != null ? ((immigrants - emigrants) / population) * 1000 : null,
    'POP310E',
    makePerThousandUnit('POP310E', 'pers.')
  );
  pushRate(
    'employees-rate',
    t`Employees`,
    employees != null ? (employees / population) * 1000 : null,
    'FOM104D',
    makePerThousandUnit('FOM104D', 'pers.')
  );
  pushRate(
    'dwellings-rate',
    t`Dwellings`,
    dwellings != null ? (dwellings / population) * 1000 : null,
    'LOC101B',
    makePerThousandUnit('LOC101B', 'nr.')
  );
  pushValue(
    'living-area',
    t`Living area`,
    livingArea != null ? livingArea / population : null,
    'LOC103B',
    makePerCapitaUnit('LOC103B', 'm²')
  );
  pushValue('water', t`Water`, water != null ? water / population : null, 'GOS107A', makePerCapitaUnit('GOS107A', 'm³'));
  pushValue('gas', t`Gas`, gas != null ? gas / population : null, 'GOS118A', makePerCapitaUnit('GOS118A', 'm³'));
  pushRate(
    'sewer-rate',
    t`Sewer network`,
    sewerKm != null ? (sewerKm / population) * 1000 : null,
    'GOS110A',
    makePerThousandUnit('GOS110A', 'km')
  );
  pushRate(
    'gas-network-rate',
    t`Gas network`,
    gasNetworkKm != null ? (gasNetworkKm / population) * 1000 : null,
    'GOS116A',
    makePerThousandUnit('GOS116A', 'km')
  );

  return rows;
}
