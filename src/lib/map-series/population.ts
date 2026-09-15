import type { UatFeature } from '@/components/maps/interfaces';
import type {
  MapSupportedSeries,
  GeoJsonDatasetSeriesConfiguration,
} from '@/schemas/advanced-map-analytics';
import type { MapPopulationCell } from '@/lib/api/map-population';
import type { MapSeriesVectorCache, MapSeriesWarning } from './interfaces';
import { t } from '@lingui/core/macro';
import type { Operand } from '@/schemas/charts';

/** Disabled inputs still matter when an enabled calculation/group/filter references them. */
export function populationSeriesInUse(
  series: readonly MapSupportedSeries[],
  roots?: ReadonlySet<string>,
) {
  const required = new Set<string>();
  const pending = [
    ...(roots ??
      new Set(
        series.filter((entry) => entry.enabled).map((entry) => entry.id),
      )),
  ];
  const byId = new Map(series.map((entry) => [entry.id, entry]));
  const operandsSeen = new WeakSet<object>();
  const addOperand = (operand: Operand) => {
    if (typeof operand === 'string') pending.push(operand);
    else if (
      operand &&
      typeof operand === 'object' &&
      !operandsSeen.has(operand)
    ) {
      operandsSeen.add(operand);
      operand.args.forEach(addOperand);
    }
  };
  while (pending.length) {
    const id = pending.pop()!;
    if (required.has(id)) continue;
    required.add(id);
    const entry = byId.get(id);
    if (entry?.type === 'aggregated-series-calculation')
      addOperand(entry.calculation);
    if (entry?.type === 'map-grouped-value-series')
      pending.push(entry.sourceSeriesId);
  }
  return series.filter(
    (entry): entry is GeoJsonDatasetSeriesConfiguration =>
      entry.type === 'geojson-dataset-series' && required.has(entry.id),
  );
}

/** Geometry only supplies keys/filters. Annual values never fall back to embedded census data. */
export function buildPopulationVectors(
  series: readonly MapSupportedSeries[],
  features: readonly UatFeature[],
  granularity: 'UAT' | 'County',
  annual: ReadonlyMap<number, readonly MapPopulationCell[]>,
) {
  const values: MapSeriesVectorCache = new Map();
  const units = new Map<string, string | undefined>();
  const warnings: MapSeriesWarning[] = [];
  for (const entry of series) {
    if (entry.type !== 'geojson-dataset-series') continue;
    const vector = new Map<string, string | undefined>();
    values.set(entry.id, vector);
    units.set(entry.id, entry.unit.trim() || 'inhabitants');
    const cells = entry.year === undefined ? undefined : annual.get(entry.year);
    const byCode = new Map(cells?.map((cell) => [cell.territoryCode, cell]));
    let carried = 0;
    let missing = 0;
    let maxAge = 0;
    let oldestSourceYear = entry.year;
    for (const feature of features) {
      const p = feature.properties;
      const code = String(
        granularity === 'County' ? (p?.mnemonic ?? '') : (p?.natcode ?? ''),
      );
      if (
        !code ||
        (entry.countyFilterIds.length > 0 &&
          !entry.countyFilterIds.includes(Number(p.countyId))) ||
        (entry.regionFilterIds.length > 0 &&
          !entry.regionFilterIds.includes(Number(p.regionId)))
      )
        continue;
      if (entry.datasetKey === 'annualPopulation') {
        const cell = byCode.get(code);
        vector.set(
          code,
          cell?.population == null ? undefined : String(cell.population),
        );
        if (cell?.population == null) missing++;
        if (cell?.metadata && cell.metadata.carriedCount > 0) {
          carried++;
          maxAge = Math.max(maxAge, cell.metadata.maxCarryAge);
          oldestSourceYear = Math.min(
            oldestSourceYear ?? cell.metadata.sourceYearMin,
            cell.metadata.sourceYearMin,
          );
        }
      } else {
        const value = p?.insPop2021;
        if (
          typeof value === 'number' &&
          Number.isSafeInteger(value) &&
          value >= 0
        )
          vector.set(code, String(value));
      }
    }
    if (entry.datasetKey === 'annualPopulation' && cells) {
      const year = entry.year ?? '';
      const sourceYear = oldestSourceYear ?? year;
      warnings.push({
        type: 'population_provenance',
        seriesId: entry.id,
        message: t`Live annual INS population for ${year}. ${carried} territories use earlier observations (oldest source year: ${sourceYear}; maximum age: ${maxAge} years). ${missing} territories are unavailable.`,
        details: { year, carried, missing, maxAge, oldestSourceYear },
      });
    }
  }
  return { values, units, warnings };
}
