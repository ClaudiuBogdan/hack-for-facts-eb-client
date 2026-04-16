import React, { useMemo, lazy, Suspense } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Maximize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useNavigate } from '@tanstack/react-router';
import { useGeoJsonData } from '@/hooks/useGeoJson';
import { createHeatmapStyleFunction, getPercentileValues } from '@/components/maps/utils';
import { EntityDetailsData } from '@/lib/api/entities';
import { getEntityFeatureInfo } from '@/components/entities/utils';
import { HeatmapCountyDataPoint, HeatmapUATDataPoint } from '@/schemas/heatmap';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UatProperties } from '@/components/maps/interfaces';
import type { LeafletMouseEvent } from 'leaflet';
import { useHeatmapData } from '@/hooks/useHeatmapData';
import { AnalyticsFilterType } from '@/schemas/charts';
import { Trans } from '@lingui/react/macro';
import { ReportPeriodInput } from '@/schemas/reporting';
import { cn } from '@/lib/utils';
import { ClientOnly } from '@/components/ssr/ClientOnly';
import { t } from '@lingui/core/macro';

// Lazy load InteractiveMap to prevent Leaflet from being evaluated on the server
const InteractiveMap = lazy(() => import('@/components/maps/InteractiveMap').then(m => ({ default: m.InteractiveMap })));

interface MapViewProps {
  entity: EntityDetailsData | null | undefined;
  mapFilters: AnalyticsFilterType;
  updateMapFilters: (filters: Partial<AnalyticsFilterType>) => void;
  period: ReportPeriodInput;
}

export const MapView: React.FC<MapViewProps> = ({ entity, mapFilters, updateMapFilters, period }) => {
  const mapViewType: "UAT" | "County" = entity?.entity_type === 'admin_county_council' || entity?.cui === '4267117' ? 'County' : 'UAT';
  const navigate = useNavigate();
  
  const selectedPeriod = useMemo(() => {
    if (period.selection.dates && period.selection.dates.length > 0) {
      return period.selection.dates[0];
    }
    if (period.selection.interval) {
      return period.selection.interval.start;
    }
    return period.type;
  }, [period]);

  const {
    data: geoJsonData,
    isLoading: isLoadingGeoJson,
    error: geoJsonError,
  } = useGeoJsonData(mapViewType);

  const mapHeight = '60vh';
  const { center, zoom, featureId } = useMemo(() => {
    const defaultState = { center: undefined, zoom: 7, featureId: '' };
    if (!entity || !geoJsonData) {
      return defaultState;
    }

    const featureInfo = getEntityFeatureInfo(entity, geoJsonData);
    if (!featureInfo) {
      return defaultState;
    } else {
      return featureInfo;
    }
  }, [entity, geoJsonData]);

  const {
    data: heatmapData,
    isLoading: isLoadingHeatmap,
    error: heatmapError,
  } = useHeatmapData({ ...mapFilters, report_period: period }, mapViewType);

  const { min: minAggregatedValue, max: maxAggregatedValue } = useMemo(() => {
    if (!heatmapData || !Array.isArray(heatmapData)) return { min: 0, max: 0 };
    return getPercentileValues(heatmapData, 5, 95, mapFilters.normalization === 'per_capita' || mapFilters.normalization === 'per_capita_euro' ? 'per_capita_amount' : 'total_amount');
  }, [heatmapData, mapFilters.normalization]);

  const getFeatureStyle = useMemo(() => {
    if (!heatmapData || !Array.isArray(heatmapData)) {
      return () => ({});
    }
    const valueKey = mapFilters.normalization === 'per_capita' || mapFilters.normalization === 'per_capita_euro' ? 'per_capita_amount' : 'total_amount';
    return createHeatmapStyleFunction(heatmapData, minAggregatedValue, maxAggregatedValue, mapViewType, valueKey);
  }, [heatmapData, minAggregatedValue, maxAggregatedValue, mapViewType, mapFilters.normalization]);

  const handleOpenMap = () => {

    navigate({
      to: '/map',
      search: {
        filters: mapFilters,
        mapViewType: mapViewType,
        activeView: 'map',
      },
    });
  };

  const handleFeatureClick = (properties: UatProperties, _event?: LeafletMouseEvent) => {
    const clickedFeatureId = properties.natcode || properties.mnemonic;
    if (clickedFeatureId === featureId) return;

    const targetEntity = (heatmapData as (HeatmapUATDataPoint[] | HeatmapCountyDataPoint[]))?.find(d => {
      if ('uat_code' in d) return d.siruta_code?.toString() === clickedFeatureId;
      if ('county_code' in d) return d.county_code === clickedFeatureId;
      return false;
    });

    const cui = targetEntity && ('uat_code' in targetEntity ? targetEntity.uat_code : targetEntity.county_entity?.cui);

    if (cui) {
      navigate({ to: '/entities/$cui', params: { cui } });
    }
  };

  const error = heatmapError || geoJsonError;

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center">
            <h3 className="text-lg font-semibold">
              <Trans>Geographical View</Trans> ({selectedPeriod})
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <ToggleGroup type="single" size="sm" value={mapFilters.account_category} onValueChange={(value: 'vn' | 'ch') => { if (value) updateMapFilters({ account_category: value }) }}>
              <ToggleGroupItem value="ch" className={cn(
                'px-4 transition-colors duration-200 data-[state=on]:bg-black data-[state=on]:text-slate-100 data-[state=on]:hover:bg-slate-700',
                mapFilters.account_category !== 'ch' && 'bg-slate-50 hover:bg-slate-200 text-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
              )}><Trans>Expenses</Trans></ToggleGroupItem>
              <ToggleGroupItem value="vn" className={cn(
                'px-4 transition-colors duration-200 data-[state=on]:bg-black data-[state=on]:text-slate-100 data-[state=on]:hover:bg-slate-700',
                mapFilters.account_category !== 'vn' && 'bg-slate-50 hover:bg-slate-200 text-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
              )}><Trans>Income</Trans></ToggleGroupItem>
            </ToggleGroup>
            <ToggleGroup
              type="single"
              size="sm"
              value={mapFilters.normalization === 'per_capita' || mapFilters.normalization === 'per_capita_euro' ? 'per_capita' : 'total'}
              onValueChange={(value: 'per_capita' | 'total') => {
                if (value) {
                  updateMapFilters({ normalization: value });
                }
              }}
            >
              <ToggleGroupItem value="per_capita" className={cn(
                'px-4 transition-colors duration-200 data-[state=on]:bg-black data-[state=on]:text-slate-100 data-[state=on]:hover:bg-slate-700',
                !(mapFilters.normalization === 'per_capita' || mapFilters.normalization === 'per_capita_euro') && 'bg-slate-50 hover:bg-slate-200 text-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
              )}><Trans>Per Capita</Trans></ToggleGroupItem>
              <ToggleGroupItem value="total" className={cn(
                'px-4 transition-colors duration-200 data-[state=on]:bg-black data-[state=on]:text-slate-100 data-[state=on]:hover:bg-slate-700',
                (mapFilters.normalization === 'per_capita' || mapFilters.normalization === 'per_capita_euro') && 'bg-slate-50 hover:bg-slate-200 text-black dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white'
              )}><Trans>Total</Trans></ToggleGroupItem>
            </ToggleGroup>
            <Button onClick={handleOpenMap} variant="outline" size="sm">
              <Maximize className="mr-2 h-4 w-4" />
              <Trans>Explore Full Map</Trans>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full relative rounded-md overflow-hidden border" style={{ height: mapHeight }}>
          {(isLoadingGeoJson || isLoadingHeatmap) &&
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-20">
              <LoadingSpinner text={isLoadingGeoJson ? "Loading map geometry..." : "Loading financial data..."} />
            </div>
          }
          {geoJsonData && (
            <ClientOnly fallback={<div className="flex items-center justify-center h-full w-full"><LoadingSpinner size="lg" text={t`Loading map...`} /></div>}>
              <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><LoadingSpinner size="lg" text={t`Loading map...`} /></div>}>
                <InteractiveMap
                  onFeatureClick={handleFeatureClick}
                  getFeatureStyle={getFeatureStyle}
                  heatmapData={heatmapData || []}
                  geoJsonData={geoJsonData}
                  center={center}
                  zoom={zoom}
                  highlightedFeatureId={featureId?.toString()}
                  scrollWheelZoom={false}
                  mapHeight={mapHeight}
                  mapViewType={mapViewType}
                  filters={mapFilters}
                />
              </Suspense>
            </ClientOnly>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
