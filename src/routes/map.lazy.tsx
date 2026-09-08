import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { buildStandaloneMapState } from "@/features/advanced-map-analytics/standalone-map-state";
import { MapStateSchema, type MapUrlState } from "@/schemas/map-filters";
import type { AdvancedMapAnalyticsUrlState } from "@/schemas/advanced-map-analytics";
import type { AnalyticsFilterType } from "@/schemas/charts";
import { useUserCurrency } from "@/lib/hooks/useUserCurrency";
import { useUserInflationAdjusted } from "@/lib/hooks/useUserInflationAdjusted";
import { parseCurrencyParam, parseBooleanParam } from "@/lib/globalSettings/params";
import { normalizeNormalizationOptions } from "@/lib/normalization";
import { ErrorBoundary } from "@/components/errors/ErrorBoundary";
import { getSiteUrl } from "@/config/env";

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

function buildMapHead() {
  const site = getSiteUrl();
  const canonical = `${site}/map`;
  const title = t`Romania spending heatmap - Transparenta.eu`;
  const description = t`Explore choropleth maps of public spending by UAT/County with per-capita or total normalization.`;
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "og:title", content: title },
      { name: "og:description", content: description },
      { name: "og:url", content: canonical },
      { name: "canonical", content: canonical },
    ],
  };
}

export function head() {
  return buildMapHead();
}
