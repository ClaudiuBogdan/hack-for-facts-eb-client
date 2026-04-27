import { EntityDetailsData } from '@/lib/api/entities';
import { StoredChart } from '@/components/charts/chartsStore';
import { Series } from '@/schemas/charts';

function isLineItemsSeries(
  series: Series
): series is Extract<Series, { type: 'line-items-aggregated-yearly' | 'commitments-analytics' }> {
  return series.type === 'line-items-aggregated-yearly' || series.type === 'commitments-analytics';
}

function isInsSeries(series: Series): series is Extract<Series, { type: 'ins-series' }> {
  return series.type === 'ins-series';
}

export function chartRelatesToEntity(chart: StoredChart, entity: EntityDetailsData): boolean {
  const cui = entity.cui;
  const isUatEntity = !!entity.is_uat;
  const uatId = entity.uat?.siruta_code != null ? String(entity.uat.siruta_code) : undefined;
  const isCountyEntity = entity.entity_type === 'admin_county_council';
  const countyCode = entity.uat?.county_code ?? undefined;

  return chart.series.some((s) => {
    if (isLineItemsSeries(s)) {
      const filter = (s.filter ?? {}) as Record<string, unknown>;

      const entityCuis = Array.isArray(filter.entity_cuis)
        ? (filter.entity_cuis as unknown[]).map(String)
        : [];
      if (entityCuis.includes(String(cui))) return true;

      if (isUatEntity && uatId) {
        const uatIds = Array.isArray(filter.uat_ids)
          ? (filter.uat_ids as unknown[]).map(String)
          : [];
        if (uatIds.includes(uatId)) return true;
      }

      if (isCountyEntity && countyCode) {
        const countyCodes = Array.isArray(filter.county_codes)
          ? (filter.county_codes as unknown[]).map(String)
          : [];
        if (countyCodes.includes(String(countyCode))) return true;
      }
    }

    if (isInsSeries(s)) {
      const sirutaCodes = Array.isArray(s.sirutaCodes) ? s.sirutaCodes.map(String) : [];
      const territoryCodes = Array.isArray(s.territoryCodes) ? s.territoryCodes.map(String) : [];

      if (isUatEntity && uatId && sirutaCodes.includes(uatId)) {
        return true;
      }

      if (isCountyEntity && countyCode) {
        const normalizedCountyCode = String(countyCode).toUpperCase();
        if (territoryCodes.map((code) => code.toUpperCase()).includes(normalizedCountyCode)) {
          return true;
        }
      }
    }

    return false;
  });
}
