import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { useLocation } from "@tanstack/react-router";
import { env } from "@/config/env";
import { hasAnalyticsConsent } from "@/lib/consent";
import {
  sanitizeJusticeTelemetryValue,
  sanitizeJusticeUrlFragment,
} from "@/lib/privacy/sensitive-route-sanitizer";
import type { AnalyticsFilterType } from "@/schemas/charts";

/** Centralized, consent-aware analytics helpers (PostHog). */
const EVENTS = {
  EntitySearchPerformed: "entity_search_performed",
  EntitySearchSelected: "entity_search_selected",
  EntityViewOpened: "entity_view_opened",
  EntityViewChanged: "entity_view_changed",

  ChartsBackupExported: "charts_backup_exported",
  ChartsBackupImported: "charts_backup_imported",

  ChartCreated: "chart_created",
  ChartOpened: "chart_opened",
  ChartUpdated: "chart_updated",
  ChartDuplicated: "chart_duplicated",
  ChartViewChanged: "chart_view_changed",
  ChartFavoritedToggled: "chart_favorited_toggled",
  ChartDeleted: "chart_deleted",
  ChartCategoryToggled: "chart_category_toggled",

  ChartSeriesAdded: "chart_series_added",
  ChartSeriesDeleted: "chart_series_deleted",
  ChartSeriesDuplicated: "chart_series_duplicated",
  ChartSeriesReordered: "chart_series_reordered",
  ChartSeriesEnabledAll: "chart_series_enabled_all",
  ChartSeriesDisabledAll: "chart_series_disabled_all",

  ChartUndoPerformed: "chart_undo_performed",
  ChartRedoPerformed: "chart_redo_performed",

  ChartAnnotationAdded: "chart_annotation_added",
  ChartAnnotationDeleted: "chart_annotation_deleted",
  ChartAnnotationUpdated: "chart_annotation_updated",
  ChartAnnotationDuplicated: "chart_annotation_duplicated",

  AlertCreated: "alert_created",
  AlertCreateStarted: "alert_create_started",
  AlertCloned: "alert_cloned",
  AlertUpdated: "alert_updated",
  AlertDeleted: "alert_deleted",
  AlertOpened: "alert_opened",
  AlertViewChanged: "alert_view_changed",

  MapFeatureClicked: "map_feature_clicked",
  MapFilterChanged: "map_filter_changed",
  MapActiveViewChanged: "map_active_view_changed",
  MapViewTypeChanged: "map_view_type_changed",
  AdvancedMapAnalyticsLegacyEditorUrlMigrated:
    "advanced_map_analytics_legacy_editor_url_migrated",
  AdvancedMapAnalyticsLegacyCloneStateUsed:
    "advanced_map_analytics_legacy_clone_state_used",
  AdvancedMapAnalyticsCloneHandoffUsed:
    "advanced_map_analytics_clone_handoff_used",
  AdvancedMapAnalyticsStorageFallbackTriggered:
    "advanced_map_analytics_storage_fallback_triggered",

  CampaignEntitySelectorOpened: "campaign_entity_selector_opened",
  CampaignEntityMapSelectorOpened: "campaign_entity_map_selector_opened",
  CampaignEntitySelected: "campaign_entity_selected",
  CampaignEntitySelectedFromSearch: "campaign_entity_selected_from_search",
  CampaignEntitySelectedFromMap: "campaign_entity_selected_from_map",
  CampaignEntitySelectionChanged: "campaign_entity_selection_changed",
  CampaignPrincipalEntityRecovered: "campaign_principal_entity_recovered",
  CampaignPrincipalEntityRecoveryFailedRedirectLanding: "campaign_principal_entity_recovery_failed_redirect_landing",
  CampaignLandingCtaToSearchClicked: "campaign_landing_cta_to_search_clicked",

  EntityAnalyticsFilterChanged: "entity_analytics_filter_changed",
  EntityAnalyticsFilterReset: "entity_analytics_filter_reset",
  EntityAnalyticsViewChanged: "entity_analytics_view_changed",
  EntityAnalyticsSortChanged: "entity_analytics_sort_changed",
  EntityAnalyticsPaginationChanged: "entity_analytics_pagination_changed",
  EntityAnalyticsExportCsv: "entity_analytics_export_csv",

  ErrorOccurred: "error_occurred",

  CookieConsentChanged: "cookie_consent_changed",
  LanguageChanged: "language_changed",
  DefaultLanguage: "default_language",
} as const;

export type AnalyticsEventName = typeof EVENTS[keyof typeof EVENTS];

const isBrowser = typeof window !== "undefined";
let posthogInitialized = false;

export function isAnalyticsEnabled(): boolean {
  return (
    isBrowser &&
    Boolean(env.VITE_POSTHOG_ENABLED) &&
    Boolean(env.VITE_POSTHOG_API_KEY) &&
    Boolean(env.VITE_POSTHOG_HOST) &&
    hasAnalyticsConsent()
  );
}

function ensurePostHogInitialized(): void {
  if (posthogInitialized) return;
  if (!isBrowser) return;
  if (!env.VITE_POSTHOG_ENABLED) return;
  if (!hasAnalyticsConsent()) return;

  const apiKey = env.VITE_POSTHOG_API_KEY;
  const apiHost = env.VITE_POSTHOG_HOST;
  if (!apiKey || !apiHost) return;

  try {
    posthog.init(apiKey, {
      api_host: apiHost,
      autocapture: false,
      rageclick: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_pageview: false,
      capture_pageleave: true,
      disable_session_recording: true,
      person_profiles: env.VITE_POSTHOG_PERSON_PROFILES ?? "identified_only",
    });
    posthogInitialized = true;
  } catch {
    return;
  }

  try {
    posthog.register({
      app_version: env.VITE_APP_VERSION,
      app_name: env.VITE_APP_NAME,
      environment: env.VITE_APP_ENVIRONMENT,
    });
  } catch {
    // Ignore PostHog registration failures.
  }
}

let _lastEventKey = "";
let _lastEventTs = 0;
const DEDUPE_MS = 300;

export function captureEvent(
  name: AnalyticsEventName,
  properties?: Record<string, unknown>
): void {
  try {
    if (!isAnalyticsEnabled()) return;
    ensurePostHogInitialized();
    const sanitized = sanitizeProps(properties);
    const key = `${name}:${JSON.stringify(sanitized ?? {})}`;
    const now = Date.now();
    if (_lastEventKey === key && now - _lastEventTs < DEDUPE_MS) return;
    _lastEventKey = key;
    _lastEventTs = now;
    posthog.capture(name, sanitized);
  } catch {
    // silent
  }
}

function sanitizeProps(
  props?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!props) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined) continue;
    if (value === null) {
      clean[key] = null;
      continue;
    }
    const sanitizedValue = sanitizeJusticeTelemetryValue(value, key);
    const t = typeof value;
    if (t === "string" || t === "number" || t === "boolean") {
      clean[key] = sanitizedValue;
    } else if (Array.isArray(sanitizedValue)) {
      clean[key] = sanitizedValue.slice(0, 20);
    } else if (t === "object") {
      clean[key] = JSON.parse(JSON.stringify(sanitizedValue));
    }
  }
  return clean;
}

export function safeTruncate(input: string, max: number = 80): string {
  if (input.length <= max) return input;
  return `${input.slice(0, Math.max(0, max - 1))}…`;
}

export function summarizeFilter(
  filter: AnalyticsFilterType
): Record<string, unknown> {
  return {
    period_type: filter.report_period?.type,
    period_selection: filter.report_period?.selection.dates ? "dates" : "interval",
    period_len: filter.report_period?.selection.dates?.length ?? 1,
    account_category: filter.account_category,
    normalization: filter.normalization,
    fn_codes_len: filter.functional_codes?.length ?? 0,
    ec_codes_len: filter.economic_codes?.length ?? 0,
    entity_types_len: filter.entity_types?.length ?? 0,
    uat_len: filter.uat_ids?.length ?? 0,
    counties_len: filter.county_codes?.length ?? 0,
    budget_sector_len: filter.budget_sector_ids?.length ?? 0,
    funding_source_len: filter.funding_source_ids?.length ?? 0,
    has_prefixes: Boolean(
      (filter.functional_prefixes?.length ?? 0) +
        (filter.economic_prefixes?.length ?? 0)
    ),
  };
}

export function capturePageview(payload?: {
  pathname?: string;
  search?: string;
}): void {
  try {
    if (!isAnalyticsEnabled()) return;
    ensurePostHogInitialized();

    const rawPathname = payload?.pathname ?? window.location.pathname;
    const searchRaw = payload?.search ?? window.location.search ?? "";
    const rawSearch = searchRaw && !searchRaw.startsWith("?") ? `?${searchRaw}` : searchRaw;

    // Sanitize sensitive justice route params (partyKey, caseNumber, from,
    // unknown params) before they reach PostHog. Only the safe aggregate
    // allowlist is preserved on /justitie* URLs.
    const sanitizedFragment = sanitizeJusticeUrlFragment(
      `${rawPathname}${rawSearch}`,
    );
    const queryIndex = sanitizedFragment.indexOf("?");
    const pathname = queryIndex === -1 ? sanitizedFragment : sanitizedFragment.slice(0, queryIndex);
    const search = queryIndex === -1 ? "" : sanitizedFragment.slice(queryIndex);

    const url = `${window.location.origin}${pathname}${search}`;
    posthog.capture("$pageview", {
      $current_url: url,
      $pathname: pathname,
      $host: window.location.host,
    });
  } catch {
    // silent
  }
}

// Pageview tracking tied to TanStack Router location
export function usePageviewTracking(): void {
  const location = useLocation();
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    const pathname = location.pathname;
    const search = location.searchStr ?? "";
    const key = `${pathname}${search}`;
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;

    capturePageview({ pathname, search });
  }, [location]);
}

export function clearPostHogPersistence(): void {
  if (!isBrowser) return;

  const shouldClearKey = (key: string) =>
    key.startsWith("ph_") || key.startsWith("__ph_opt_in_out_");

  try {
    for (const key of Object.keys(window.localStorage)) {
      if (shouldClearKey(key)) window.localStorage.removeItem(key);
    }
  } catch {
    // ignore
  }

  try {
    for (const key of Object.keys(window.sessionStorage)) {
      if (shouldClearKey(key)) window.sessionStorage.removeItem(key);
    }
  } catch {
    // ignore
  }

  try {
    const cookieNames = document.cookie
      .split(";")
      .map((entry) => entry.split("=")[0]?.trim())
      .filter((name): name is string => Boolean(name && shouldClearKey(name)));

    const expires = "Thu, 01 Jan 1970 00:00:00 GMT";
    const baseDomain = window.location.hostname
      .split(".")
      .slice(-2)
      .join(".");
    const domain = baseDomain.includes(".") ? `.${baseDomain}` : undefined;

    for (const name of cookieNames) {
      document.cookie = `${name}=; expires=${expires}; path=/`;
      if (domain) {
        document.cookie = `${name}=; expires=${expires}; path=/; domain=${domain}`;
      }
    }
  } catch {
    // ignore
  }
}

export const Analytics = {
  EVENTS,
  capture: captureEvent,
  pageviewHook: usePageviewTracking,
  capturePageview,
  clearPostHogPersistence,
  summarizeFilter,
  safeTruncate,
};

export default Analytics;
