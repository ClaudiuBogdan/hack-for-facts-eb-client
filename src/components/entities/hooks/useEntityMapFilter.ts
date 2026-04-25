import { AnalyticsFilterType, createDefaultExecutionYearReportPeriod } from "@/schemas/charts";
import { DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES, DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES } from "@/lib/analytics-defaults";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import { withDefaultExcludes } from "@/lib/filterUtils";

const ENTITY_MAP_REPORT_TYPE = 'Executie bugetara agregata la nivel de ordonator principal';

const getDefaultMapFilters = (currency: 'RON' | 'EUR' | 'USD'): AnalyticsFilterType => withDefaultExcludes({
  report_period: createDefaultExecutionYearReportPeriod(),
  account_category: 'ch',
  normalization: 'per_capita',
  currency,
  inflation_adjusted: false,
  exclude: {
    economic_prefixes: [...DEFAULT_EXPENSE_EXCLUDE_ECONOMIC_PREFIXES],
    functional_prefixes: [...DEFAULT_INCOME_EXCLUDE_FUNCTIONAL_PREFIXES], 
  },
});

interface UseEntityMapFilterProps {
    year: number;
    currency?: 'RON' | 'EUR' | 'USD';
}

export const useEntityMapFilter = ({ year, currency = 'RON' }: UseEntityMapFilterProps) => {
    const navigate = useNavigate({ from: '/entities/$cui' });
    const search = useSearch({ from: '/entities/$cui' });
    const searchMapFilters = search.mapFilters;

    // We want the year from the entity page to override the year from the map filters.
    const mapFilters = useMemo<AnalyticsFilterType>(() => ({
        ...(searchMapFilters ?? getDefaultMapFilters(currency)),
        report_period: {
            type: 'YEAR',
            selection: { dates: [String(year)] },
        },
        report_type: ENTITY_MAP_REPORT_TYPE,
    }), [currency, searchMapFilters, year]);

    const updateMapFilters = useCallback((filters: Partial<AnalyticsFilterType>) => {
      navigate({
        search: (prev) => {
          const prevMapFilters = (prev as { mapFilters?: AnalyticsFilterType }).mapFilters;
          const hasChanges = Object.entries(filters).some(([key, value]) => (
            prevMapFilters?.[key as keyof AnalyticsFilterType] !== value
          ));

          if (!hasChanges) return prev;

          return { ...prev, mapFilters: { ...prevMapFilters, ...filters } }
        },
        replace: true,
        resetScroll: false,
      });
    }, [navigate]);

    useEffect(() => {
        if (!mapFilters.currency) {
            updateMapFilters({ currency })
            return
        }
        if (mapFilters.normalization === 'total_euro') {
            updateMapFilters({ normalization: 'total', currency: 'EUR' })
            return
        }
        if (mapFilters.normalization === 'per_capita_euro') {
            updateMapFilters({ normalization: 'per_capita', currency: 'EUR' })
        }
    }, [currency, mapFilters.currency, mapFilters.normalization, updateMapFilters])

    return { mapFilters, updateMapFilters };
};
