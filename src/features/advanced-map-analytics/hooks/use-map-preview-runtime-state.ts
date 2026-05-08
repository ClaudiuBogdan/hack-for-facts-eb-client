import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import type {
  Currency,
  ReportPeriodInputZ,
  SeriesConfiguration,
} from '@/schemas/charts';
import { applyMapRuntimeConfig } from '@/features/advanced-map-analytics/map-runtime-config';

interface UseMapPreviewRuntimeStateInput {
  mapKey: string;
  mapStateDefinition: AdvancedMapAnalyticsUrlState;
  reportPeriodOverride?: ReportPeriodInputZ;
  selectedYearOverride?: number;
  reportTypeOverride?: SeriesConfiguration['filter']['report_type'];
  normalizationOverride?: 'total' | 'per_capita';
  currencyOverride?: Currency;
  inflationAdjustedOverride?: boolean;
  mapNameOverride?: string;
  forceMapActiveView?: boolean;
}

interface UseMapPreviewRuntimeStateResult {
  mapState: AdvancedMapAnalyticsUrlState;
  setMapState: Dispatch<SetStateAction<AdvancedMapAnalyticsUrlState>>;
}

export function useMapPreviewRuntimeState({
  mapStateDefinition,
  reportPeriodOverride,
  selectedYearOverride,
  reportTypeOverride,
  normalizationOverride,
  currencyOverride,
  inflationAdjustedOverride,
  mapNameOverride,
  forceMapActiveView = false,
}: Readonly<UseMapPreviewRuntimeStateInput>): UseMapPreviewRuntimeStateResult {
  const runtimeMapConfig = useMemo(
    () =>
      applyMapRuntimeConfig(mapStateDefinition, {
        reportPeriodOverride,
        selectedYearOverride,
        reportTypeOverride,
        normalizationOverride,
        currencyOverride,
        inflationAdjustedOverride,
        mapNameOverride,
        forceMapActiveView,
      }),
    [
      currencyOverride,
      forceMapActiveView,
      inflationAdjustedOverride,
      mapNameOverride,
      mapStateDefinition,
      normalizationOverride,
      reportPeriodOverride,
      reportTypeOverride,
      selectedYearOverride,
    ]
  );
  const [mapState, setMapState] = useState<AdvancedMapAnalyticsUrlState>(() => runtimeMapConfig);

  useEffect(() => {
    setMapState(runtimeMapConfig);
  }, [runtimeMapConfig]);

  return {
    mapState,
    setMapState,
  };
}
