import { HeatmapUATDataPoint, HeatmapCountyDataPoint } from "@/schemas/heatmap";
import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import React, { useState, lazy, Suspense } from "react";
import { getPercentileValues, createHeatmapStyleFunction } from "@/components/maps/utils";
import type { LeafletMouseEvent } from "leaflet";
import { UatProperties } from "@/components/maps/interfaces";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ClientOnly } from "@/components/ssr/ClientOnly";

// Lazy load InteractiveMap to prevent Leaflet from being evaluated on the server
const InteractiveMap = lazy(() => import("@/components/maps/InteractiveMap").then(m => ({ default: m.InteractiveMap })));
import { useGeoJsonData } from "@/hooks/useGeoJson";
import { MapFilter } from "@/components/filters/MapFilter";
import { MapLegend } from "@/components/maps/MapLegend";
import { Filter as FilterIcon, X, HelpCircleIcon, Check } from "lucide-react";
import { UatDataCharts } from "@/components/maps/charts/UatDataCharts";
import {
  SortingState,
  PaginationState,
} from "@tanstack/react-table";
import { HeatmapDataTable } from "@/components/maps/HeatmapDataTable";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogDescription,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useMapFilter } from "@/hooks/useMapFilter";
import { FloatingQuickNav } from "@/components/ui/FloatingQuickNav";
import { getSiteUrl } from "@/config/env";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { AnimatePresence, motion } from "framer-motion";
import { useUserCurrency } from "@/lib/hooks/useUserCurrency";
import { useUserInflationAdjusted } from "@/lib/hooks/useUserInflationAdjusted";
import type { AnalyticsFilterType, Currency, Normalization } from "@/schemas/charts";

export const Route = createLazyFileRoute("/map")({
  component: MapPage,
});

function MapPage() {
  const navigate = useNavigate({ from: '/map' });
  const { mapState, setFilters } = useMapFilter();
  const [userCurrency, setUserCurrency] = useUserCurrency();
  const [userInflationAdjusted, setUserInflationAdjusted] = useUserInflationAdjusted();

  const isMobile = useIsMobile();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 25,
  });
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isLegendModalOpen, setIsLegendModalOpen] = useState(false);

  const mapZoom = mapState.mapZoom ?? (isMobile ? 6 : 7.7);

  const effectiveNormalization: Normalization = React.useMemo(() => {
    const raw = mapState.filters.normalization ?? 'total';
    if (raw === 'total_euro') return 'total';
    if (raw === 'per_capita_euro') return 'per_capita';
    return raw;
  }, [mapState.filters.normalization]);

  const effectiveCurrency: Currency = React.useMemo(() => {
    const rawNormalization = mapState.filters.normalization;
    if (rawNormalization === 'total_euro' || rawNormalization === 'per_capita_euro') return 'EUR';
    return (mapState.filters.currency ?? userCurrency) as Currency;
  }, [mapState.filters.currency, mapState.filters.normalization, userCurrency]);

  const effectiveInflationAdjusted = React.useMemo(() => {
    if (effectiveNormalization === 'percent_gdp') return false;
    return Boolean(mapState.filters.inflation_adjusted ?? userInflationAdjusted);
  }, [effectiveNormalization, mapState.filters.inflation_adjusted, userInflationAdjusted]);

  const effectiveFilters: AnalyticsFilterType = React.useMemo(() => ({
    ...mapState.filters,
    normalization: effectiveNormalization,
    currency: effectiveCurrency,
    inflation_adjusted: effectiveInflationAdjusted,
  }), [effectiveCurrency, effectiveInflationAdjusted, effectiveNormalization, mapState.filters]);

  // Migrate legacy URL params (currency/inflation/legacy normalization) into global settings.
  React.useEffect(() => {
    const urlCurrency = mapState.filters.currency;
    const urlInflationAdjusted = mapState.filters.inflation_adjusted;
    const normalizationRaw = mapState.filters.normalization;

    const nextFilterPatch: Partial<AnalyticsFilterType> = {};
    let shouldPatchFilters = false;

    if (urlCurrency !== undefined) {
      if (urlCurrency !== userCurrency) setUserCurrency(urlCurrency);
      nextFilterPatch.currency = undefined;
      shouldPatchFilters = true;
    }

    if (urlInflationAdjusted !== undefined) {
      if (Boolean(urlInflationAdjusted) !== Boolean(userInflationAdjusted)) {
        setUserInflationAdjusted(Boolean(urlInflationAdjusted));
      }
      nextFilterPatch.inflation_adjusted = undefined;
      shouldPatchFilters = true;
    }

    if (normalizationRaw === 'total_euro' || normalizationRaw === 'per_capita_euro') {
      if (userCurrency !== 'EUR') setUserCurrency('EUR');
      nextFilterPatch.normalization = normalizationRaw === 'total_euro' ? 'total' : 'per_capita';
      shouldPatchFilters = true;
    }

    if (shouldPatchFilters) setFilters(nextFilterPatch);
  }, [
    mapState.filters.currency,
    mapState.filters.inflation_adjusted,
    mapState.filters.normalization,
    setFilters,
    setUserCurrency,
    setUserInflationAdjusted,
    userCurrency,
    userInflationAdjusted,
  ]);

  const {
    data: heatmapData,
    isLoading: isLoadingHeatmap,
    isFetching: isFetchingHeatmap,
    error: heatmapError,
  } = useHeatmapData(effectiveFilters, mapState.mapViewType);

  const handleFeatureClick = (properties: UatProperties, _event?: LeafletMouseEvent) => {
    // The entity map support only a limited set of filters, so we need to pass them as a search param.
    // If we set all the filters, the data doesn't make sense for the entity page, as the filters are not visible.
    const { report_period: period, account_category, normalization } = effectiveFilters;
    const searchParams = {
      mapFilters: {
        account_category,
        normalization,
        period,
      },
    };

    if (mapState.mapViewType === 'UAT') {
      const uatCui = (heatmapData as HeatmapUATDataPoint[])?.find(
        (data) => data.siruta_code === properties.natcode
      )?.uat_code;
      if (uatCui) {
        navigate({ to: `/entities/${uatCui}`, search: { ...searchParams } });
      }
    } else {
      const countyCui = (heatmapData as HeatmapCountyDataPoint[])?.find(
        (data) => data.county_code === properties.mnemonic
      )?.county_entity?.cui;
      if (countyCui) {
        navigate({ to: `/entities/${countyCui}`, search: { ...searchParams } });
      }
    }
  };

  const handleMapViewChange = (center: [number, number], zoom: number) => {
    const roundTo = (value: number, decimals: number) => {
      const factor = Math.pow(10, decimals);
      return Math.round(value * factor) / factor;
    };
    const newCenter: [number, number] = [roundTo(center[0], 5), roundTo(center[1], 5)];
    const newZoom = roundTo(zoom, 1);
    // Avoid redundant URL updates if nothing changed after rounding
    if (
      mapState.mapCenter &&
      Math.abs(mapState.mapCenter[0] - newCenter[0]) < 1e-6 &&
      Math.abs(mapState.mapCenter[1] - newCenter[1]) < 1e-6 &&
      typeof mapState.mapZoom === 'number' && Math.abs(mapState.mapZoom - newZoom) < 1e-6
    ) {
      return;
    }

    navigate({
      search: (prev) => ({
        ...(prev as Record<string, unknown>),
        mapCenter: newCenter,
        mapZoom: newZoom,
      }),
      replace: true,
      resetScroll: false,
    });
  };

  const {
    data: geoJsonData,
    isLoading: isLoadingGeoJson,
    error: geoJsonError
  } = useGeoJsonData(mapState.mapViewType);

  const valueKey = effectiveFilters.normalization === 'percent_gdp'
    ? 'amount'
    : (effectiveFilters.normalization === 'total' ? 'total_amount' : 'per_capita_amount');

  const { min: minAggregatedValue, max: maxAggregatedValue } = React.useMemo(() => {
    if (!heatmapData) return { min: 0, max: 0 };
    return getPercentileValues(heatmapData, 5, 95, valueKey);
  }, [heatmapData, valueKey]);

  const aDynamicGetFeatureStyle = React.useMemo(() => {
    if (!heatmapData) return () => ({});
    return createHeatmapStyleFunction(heatmapData, minAggregatedValue, maxAggregatedValue, mapState.mapViewType, valueKey);
  }, [heatmapData, minAggregatedValue, maxAggregatedValue, mapState.mapViewType, valueKey]);

  const isLoading = isLoadingHeatmap || isLoadingGeoJson || isFetchingHeatmap;
  const error = heatmapError || geoJsonError;

  let loadingText = t`Loading data...`;
  if (isLoadingHeatmap && isLoadingGeoJson) {
    loadingText = t`Loading map and heatmap data...`;
  } else if (isLoadingHeatmap || isFetchingHeatmap) {
    loadingText = t`Loading heatmap data...`;
  } else if (isLoadingGeoJson) {
    loadingText = t`Loading map data...`;
  }

  return (
    <div className="flex flex-col md:flex-row md:h-screen bg-background">
      {/* Head handled by Route.head */}
      <div className="hidden md:flex md:flex-col w-[320px] lg:w-[360px] flex-shrink-0 border-r border-border bg-card text-card-foreground overflow-y-auto">
        <MapFilter />
      </div>
      <div className="flex-grow flex flex-col relative">
        <FloatingQuickNav
          tableActive
          chartActive
          filterInput={effectiveFilters}
          mapViewType={mapState.mapViewType}
        />

        <div className="flex-grow overflow-hidden">
          {isLoading && !heatmapData ? (
            <div className="flex items-center justify-center h-full w-full" aria-live="polite" aria-busy="true">
              <LoadingSpinner size="lg" text={loadingText} />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-red-500"><Trans>Error loading data:</Trans> {error.message}</div>
          ) : !geoJsonData ? (
            <div className="p-4 text-center"><Trans>Map data not available.</Trans></div>
          ) : (
            <>
              {/* Map view - kept mounted but hidden when inactive to preserve Leaflet state */}
              <div className={mapState.activeView === "map" ? "sm:h-screen md:h-[calc(100vh-10rem)] w-full m-0 relative" : "hidden"}>
                {heatmapData ? (
                  <>
                    <ClientOnly fallback={<div className="flex items-center justify-center h-full w-full"><LoadingSpinner size="lg" text={t`Loading map...`} /></div>}>
                      <Suspense fallback={<div className="flex items-center justify-center h-full w-full"><LoadingSpinner size="lg" text={t`Loading map...`} /></div>}>
                        <InteractiveMap
                          onFeatureClick={handleFeatureClick}
                          getFeatureStyle={aDynamicGetFeatureStyle}
                          heatmapData={heatmapData}
                          geoJsonData={geoJsonData}
                          zoom={mapZoom}
                          center={mapState.mapCenter}
                          mapViewType={mapState.mapViewType}
                          filters={effectiveFilters}
                          onViewChange={handleMapViewChange}
                        />
                      </Suspense>
                    </ClientOnly>
                    <AnimatePresence>
                      {isLoading && (
                        <motion.div
                          className="absolute inset-0 bg-background/20 backdrop-blur-sm flex items-center justify-center z-30 h-screen"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                        >
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                          >
                            <LoadingSpinner size="md" text={loadingText} />
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full w-full">
                    <Trans>No data available for the map.</Trans>
                  </div>
                )}
                <MapLegend
                  min={minAggregatedValue}
                  max={maxAggregatedValue}
                  className="absolute bottom-[-6rem] right-[4rem] z-10 hidden md:block"
                  title={t`Aggregated Value Legend`}
                  normalization={effectiveFilters.normalization}
                  currency={effectiveFilters.currency}
                />
                <Dialog open={isLegendModalOpen} onOpenChange={setIsLegendModalOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute top-4 right-4 md:hidden rounded-full shadow-lg w-14 h-14 z-50"
                    >
                      <HelpCircleIcon className="w-6 h-6" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent hideCloseButton={true} className="p-0 m-0 w-full max-w-full h-full max-h-full sm:h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-lg flex flex-col">
                    <DialogHeader className="p-4 border-b flex flex-row justify-between items-center shrink-0">
                      <DialogTitle className="text-lg font-semibold"><Trans>Legend</Trans></DialogTitle>
                      <DialogDescription className="sr-only">
                        <Trans>View the color scale and values for the heatmap visualization</Trans>
                      </DialogDescription>
                      <DialogClose asChild>
                        <Button variant="ghost" size="icon" className="rounded-full">
                          <X className="h-5 w-5" />
                        </Button>
                      </DialogClose>
                    </DialogHeader>
                    <div className="p-4 overflow-y-auto">
                      <MapLegend
                        min={minAggregatedValue}
                        max={maxAggregatedValue}
                        title={t`Aggregated Value Legend`}
                        normalization={effectiveFilters.normalization}
                        currency={effectiveFilters.currency}
                        isInModal={true}
                      />
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Table view */}
              <div className={mapState.activeView === "table" ? "h-full m-0" : "hidden"}>
                <div className="p-4 h-full flex flex-col overflow-auto">
                  <h2 className="text-xl font-semibold mb-4"><Trans>Data Table View</Trans></h2>
                  <div className="flex-grow overflow-x-auto">
                    {heatmapData ? (
                      <HeatmapDataTable
                        data={heatmapData}
                        isLoading={isLoadingHeatmap}
                        sorting={sorting}
                        setSorting={setSorting}
                        pagination={pagination}
                        setPagination={setPagination}
                        mapViewType={mapState.mapViewType}
                      />
                    ) : isLoadingHeatmap ? (
                      <div className="flex items-center justify-center h-full">
                        <LoadingSpinner size="md" text={t`Loading table data...`} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground"><Trans>No data available for the table.</Trans></p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Chart view */}
              <div className={mapState.activeView === "chart" ? "h-full w-full m-0" : "hidden"}>
                <div className="h-full w-full p-4 overflow-y-auto">
                  {heatmapData && geoJsonData ? (
                    <UatDataCharts data={heatmapData} mapViewType={mapState.mapViewType} effectiveFilter={effectiveFilters} />
                  ) : (
                    <p className="text-center text-muted-foreground"><Trans>Chart data is loading or not available.</Trans></p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

      </div>

      <div className="md:hidden fixed right-6 bottom-[5.75rem] z-50 flex flex-col items-end gap-3">

        <Dialog open={isFilterModalOpen} onOpenChange={setIsFilterModalOpen}>
          <DialogTrigger asChild>
            <Button
              variant="default"
              size="icon"
              className="rounded-full shadow-lg w-14 h-14"
            >
              <FilterIcon className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent hideCloseButton={true} className="p-0 m-0 w-full max-w-full h-full max-h-full sm:h-[calc(100%-2rem)] sm:max-h-[calc(100%-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-md sm:rounded-lg flex flex-col">
            <DialogHeader className="p-4 border-b flex flex-row justify-between items-center shrink-0">
              <DialogTitle className="text-lg font-semibold"><Trans>Filters</Trans></DialogTitle>
              <DialogDescription className="sr-only">
                <Trans>Configure filters for the map view including period, account category, and normalization settings</Trans>
              </DialogDescription>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </DialogClose>
            </DialogHeader>
            <div className="flex-grow overflow-y-auto">
              <MapFilter />
            </div>
            {/* Floating submit button for mobile */}
            <div className="md:hidden fixed bottom-6 right-6 z-50">
              <DialogClose asChild>
                <Button size="lg" className="rounded-full shadow-lg w-14 h-14">
                  <Check className="w-6 h-6" />
                </Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function buildMapHead() {
  const site = getSiteUrl()
  const canonical = `${site}/map`
  const title = 'Romania spending heatmap – Transparenta.eu'
  const description = 'Explore choropleth maps of public spending by UAT/County with per-capita or total normalization.'
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'og:title', content: title },
      { name: 'og:description', content: description },
      { name: 'og:url', content: canonical },
      { name: 'canonical', content: canonical },
    ],
  }
}

export function head() {
  return buildMapHead()
}
