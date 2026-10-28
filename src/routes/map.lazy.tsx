import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MapFilter } from "@/components/filters/MapFilter";
import { MapAnalyticsWorkspace } from "@/features/advanced-map-analytics/components/map-analytics-workspace";
import { warmAdvancedAnalyticsMapResources } from "@/features/advanced-map-analytics/analytics-map-warmup";
import { buildStandaloneMapState } from "@/features/advanced-map-analytics/standalone-map-state";
import { MapStateSchema, type MapUrlState } from "@/schemas/map-filters";
import type { AdvancedMapAnalyticsUrlState } from "@/schemas/advanced-map-analytics";
import type { AnalyticsFilterType } from "@/schemas/charts";
import { useUserCurrency } from "@/lib/hooks/useUserCurrency";
import { useUserInflationAdjusted } from "@/lib/hooks/useUserInflationAdjusted";
import { parseCurrencyParam, parseBooleanParam } from "@/lib/globalSettings/params";
import { normalizeNormalizationOptions } from "@/lib/normalization";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";

export const Route = createLazyFileRoute("/map")({ component: MapPage });

function MapPage() {
  const search = Route.useSearch();
  const mapState = useMemo(() => MapStateSchema.parse(search), [search]);
  const navigate = useNavigate({ from: "/map" });
  const [currency] = useUserCurrency();
  const [inflationAdjusted] = useUserInflationAdjusted();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filter: AnalyticsFilterType = {
    ...mapState.filters,
    ...normalizeNormalizationOptions({
      ...mapState.filters,
      currency: parseCurrencyParam((search as Record<string, unknown>).currency) ?? mapState.filters.currency ?? currency,
      inflation_adjusted:
        parseBooleanParam((search as Record<string, unknown>).inflation_adjusted) ?? mapState.filters.inflation_adjusted ?? inflationAdjusted,
    }),
  };
  // Query changes reset the preset. View and viewport changes keep interaction state.
  const selectionKey = JSON.stringify([
    filter,
    mapState.preset,
    mapState.mapViewType,
  ]);
  return (
    <main>
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
        <label className="flex items-center gap-2 text-sm font-medium">
          {t`Map configuration`}
          <select
            aria-label={t`Map configuration`}
            value={mapState.preset ?? ""}
            onChange={(event) => {
              const preset = event.target.value || undefined;
              void navigate({
                search: (previous) => ({ ...previous, preset }),
                replace: true,
                resetScroll: false,
              });
            }}
            className="h-9 rounded-md border bg-background px-3"
          >
            <option value="">{t`Custom filters`}</option>
            <option value="expenses">{t`Expenses`}</option>
            <option value="income">{t`Income`}</option>
            <option value="balance">{t`Budget balance`}</option>
            <option value="local-taxes">{t`Local taxes`}</option>
          </select>
        </label>
        <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              {t`Filters`}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{t`Map Filters`}</DialogTitle>
            </DialogHeader>
            <MapFilter presetMode={mapState.preset !== undefined} currencyOverride={filter.currency} />
          </DialogContent>
        </Dialog>
      </div>
      <ErrorBoundary key={selectionKey} fallback={InvalidMapConfiguration}>
        <StandaloneMapWorkspace urlState={mapState} filter={filter} />
      </ErrorBoundary>
    </main>
  );
}

function InvalidMapConfiguration() {
  return (
    <p
      role="alert"
      className="p-5 text-destructive"
    >{t`Map configuration is invalid. Check the amount limits in Filters.`}</p>
  );
}

function StandaloneMapWorkspace({
  urlState,
  filter,
}: Readonly<{ urlState: MapUrlState; filter: AnalyticsFilterType }>) {
  const navigate = useNavigate({ from: "/map" });
  const [interactionState, setInteractionState] = useState(() =>
    buildStandaloneMapState(urlState, filter),
  );
  const activeView =
    urlState.activeView === "chart" ? "analytics" : urlState.activeView;
  const state: AdvancedMapAnalyticsUrlState = {
    ...interactionState,
    activeView,
  };
  const queryClient = useQueryClient();
  const { mapViewType } = state;
  const drawsCountyBoundaries = state.mapLayers.countyBoundaries;
  const showsMap = activeView === "map";
  // The workspace fetches the boundaries once it mounts, but imports the
  // renderer only when the boundaries and the figures are both in, and
  // MapLibre then asks for its workers and the label glyphs only after it has
  // laid the boundaries out. Started together here, at hydration, they overlap
  // instead of following one another. The route's `beforeLoad` does the same
  // for the boundaries on a client navigation; it does not run on hydration.
  useEffect(() => {
    void warmAdvancedAnalyticsMapResources({
      queryClient,
      mapViewType,
      includeCountyGeoJson: drawsCountyBoundaries,
      preloadInteractiveMap: showsMap,
      prewarmRenderer: true,
    });
  }, [queryClient, mapViewType, drawsCountyBoundaries, showsMap]);
  const setMapState = (
    updater:
      | AdvancedMapAnalyticsUrlState
      | ((
          previous: AdvancedMapAnalyticsUrlState,
        ) => AdvancedMapAnalyticsUrlState),
  ) => {
    const next = typeof updater === "function" ? updater(state) : updater;
    setInteractionState(next);
    if (next.activeView !== activeView) {
      void navigate({
        search: (previous) => ({
          ...previous,
          activeView:
            next.activeView === "analytics" ? "chart" : next.activeView,
        }),
        replace: true,
        resetScroll: false,
      });
    }
  };
  return (
    <MapAnalyticsWorkspace
      layout="standalone"
      mode="public"
      capabilities={{ readOnly: true }}
      mapState={state}
      setMapState={setMapState}
      mapCenterOverride={urlState.mapCenter}
      mapZoomOverride={urlState.mapZoom}
      onMapViewportChange={(viewport) => {
        void navigate({
          search: (previous) => ({
            ...previous,
            mapCenter: viewport.mapCenter,
            mapZoom: viewport.mapZoom,
          }),
          replace: true,
          resetScroll: false,
        });
      }}
    />
  );
}
