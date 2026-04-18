import entityCategoriesEn from "@/assets/entity-categories-en.json";
import entityCategoriesRo from "@/assets/entity-categories-ro.json";
import { getSiteUrl } from "@/config/env";
import { DEFAULT_SELECTED_YEAR, type Currency, type Normalization } from "@/schemas/charts";
import {
  resolveEntityPageRoutePolicy,
} from "@/features/entities/page-core/seo/entity-page-route-policy";
import type { EntityPageRouteId } from "@/features/entities/page-core/types";

export type ShareLocale = "ro" | "en";

export type EntityShareFilterContext = {
  readonly year: number;
  readonly period: "YEAR" | "MONTH" | "QUARTER";
  readonly month?: string;
  readonly quarter?: string;
  readonly reportType?: string;
  readonly mainCreditorCui?: string;
  readonly normalization: Normalization;
  readonly currency: Currency;
  readonly inflationAdjusted: boolean;
  readonly showPeriodGrowth: boolean;
  readonly lang?: ShareLocale;
};

export type EntitySeoSnapshot = {
  readonly cui: string;
  readonly name?: string | null;
  readonly entityType?: string | null;
  readonly defaultReportType?: string | null;
  readonly countyName?: string | null;
  readonly population?: number | null;
  readonly totalIncome?: number | null;
  readonly totalExpenses?: number | null;
  readonly budgetBalance?: number | null;
  readonly filterContext: EntityShareFilterContext;
};

const ENTITY_TYPE_MAP = {
  ro: entityCategoriesRo.categories,
  en: entityCategoriesEn.categories,
} as const;

function normalizeShareLocale(locale: unknown): ShareLocale {
  return locale === "en" ? "en" : "ro";
}

function getEntityTypeLabel(
  entityType: string | null | undefined,
  locale: ShareLocale,
): string | undefined {
  if (!entityType) return undefined;
  const mapped = ENTITY_TYPE_MAP[locale][entityType as keyof typeof ENTITY_TYPE_MAP.ro];
  if (mapped) return mapped;
  return entityType.split("_").join(" ");
}

function formatCompactCurrency(
  value: number,
  currency: Currency,
  locale: ShareLocale,
): string {
  const numberLocale = locale === "en" ? "en-US" : "ro-RO";
  return new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactNumber(value: number, locale: ShareLocale): string {
  const numberLocale = locale === "en" ? "en-US" : "ro-RO";
  return new Intl.NumberFormat(numberLocale, {
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function buildEntityDescription(
  snapshot: EntitySeoSnapshot | null | undefined,
  locale: ShareLocale,
  fallbackCui: string,
): string {
  if (!snapshot) {
    if (locale === "en") {
      return `Explore budget trends and reports for entity ${fallbackCui}.`;
    }
    return `Explorează evoluția bugetară și rapoartele pentru entitatea ${fallbackCui}.`;
  }

  const name = snapshot.name ?? `Entity ${snapshot.cui}`;
  const year = snapshot.filterContext.year;
  const countyPart = snapshot.countyName
    ? locale === "en"
      ? ` in ${snapshot.countyName} county`
      : ` din județul ${snapshot.countyName}`
    : "";

  const incomePart =
    typeof snapshot.totalIncome === "number"
      ? locale === "en"
        ? `Income ${formatCompactCurrency(snapshot.totalIncome, snapshot.filterContext.currency, locale)}`
        : `Venituri ${formatCompactCurrency(snapshot.totalIncome, snapshot.filterContext.currency, locale)}`
      : undefined;

  const expensesPart =
    typeof snapshot.totalExpenses === "number"
      ? locale === "en"
        ? `Expenses ${formatCompactCurrency(snapshot.totalExpenses, snapshot.filterContext.currency, locale)}`
        : `Cheltuieli ${formatCompactCurrency(snapshot.totalExpenses, snapshot.filterContext.currency, locale)}`
      : undefined;

  const balancePart =
    typeof snapshot.budgetBalance === "number"
      ? locale === "en"
        ? `Balance ${formatCompactCurrency(snapshot.budgetBalance, snapshot.filterContext.currency, locale)}`
        : `Balanta ${formatCompactCurrency(snapshot.budgetBalance, snapshot.filterContext.currency, locale)}`
      : undefined;

  const financialSummary = [incomePart, expensesPart, balancePart]
    .filter(Boolean)
    .join(", ");

  if (locale === "en") {
    if (!financialSummary) return `${name}${countyPart}. Budget overview for ${year}.`;
    return `${name}${countyPart}. ${financialSummary} for ${year}.`;
  }

  if (!financialSummary) return `${name}${countyPart}. Prezentare bugetară pentru ${year}.`;
  return `${name}${countyPart}. ${financialSummary} pentru ${year}.`;
}

function buildEntityTitle(
  snapshot: EntitySeoSnapshot | null | undefined,
  locale: ShareLocale,
  fallbackCui: string,
): string {
  const year = snapshot?.filterContext.year ?? DEFAULT_SELECTED_YEAR;
  const entityName = snapshot?.name?.trim() || `Entity ${fallbackCui}`;

  if (locale === "en") {
    return `${entityName} - ${year} Budget Overview | Transparenta.eu`;
  }

  return `${entityName} - Buget ${year} | Transparenta.eu`;
}

export function buildEntityShareImageUrl(params: {
  readonly siteUrl?: string;
  readonly cui: string;
  readonly context: EntityShareFilterContext;
  readonly routeId?: EntityPageRouteId;
}): string {
  const siteUrl = params.siteUrl ?? getSiteUrl();
  const query = new URLSearchParams();
  const routeId = params.routeId ?? "entities";
  const routePolicy = resolveEntityPageRoutePolicy({
    routeId,
    cui: params.cui,
  });

  query.set("year", String(params.context.year));
  query.set("period", params.context.period);
  query.set("normalization", params.context.normalization);
  query.set("currency", params.context.currency);
  query.set("inflation_adjusted", String(params.context.inflationAdjusted));
  query.set("show_period_growth", String(params.context.showPeriodGrowth));

  if (params.context.month) query.set("month", params.context.month);
  if (params.context.quarter) query.set("quarter", params.context.quarter);
  if (params.context.reportType) query.set("report_type", params.context.reportType);
  if (params.context.mainCreditorCui) {
    query.set("main_creditor_cui", params.context.mainCreditorCui);
  }
  if (params.context.lang) query.set("lang", params.context.lang);

  return `${siteUrl}${routePolicy.shareImagePathname}?${query.toString()}`;
}

function getDefaultFilterContext(locale: ShareLocale): EntityShareFilterContext {
  return {
    year: DEFAULT_SELECTED_YEAR,
    period: "YEAR",
    normalization: "total",
    currency: "RON",
    inflationAdjusted: false,
    showPeriodGrowth: false,
    lang: locale,
  };
}

export function buildEntityRouteHead(params: {
  readonly cui: string;
  readonly snapshot?: EntitySeoSnapshot | null;
  readonly searchLang?: string;
  readonly siteUrl?: string;
  readonly routeId?: EntityPageRouteId;
}) {
  const locale = normalizeShareLocale(params.snapshot?.filterContext.lang ?? params.searchLang);
  const site = params.siteUrl ?? getSiteUrl();
  const context = params.snapshot?.filterContext ?? getDefaultFilterContext(locale);
  const routeId = params.routeId ?? "entities";
  const routePolicy = resolveEntityPageRoutePolicy({
    routeId,
    cui: params.cui,
  });
  const canonical = `${site}${routePolicy.canonicalPathname}`;
  const title = buildEntityTitle(params.snapshot, locale, params.cui);
  const description = buildEntityDescription(params.snapshot, locale, params.cui);
  const shareImageUrl = buildEntityShareImageUrl({
    siteUrl: site,
    cui: params.cui,
    context: { ...context, lang: locale },
    routeId,
  });

  const entityName = params.snapshot?.name ?? `Entity ${params.cui}`;
  const entityType = getEntityTypeLabel(params.snapshot?.entityType, locale);
  const population =
    typeof params.snapshot?.population === "number"
      ? formatCompactNumber(params.snapshot.population, locale)
      : undefined;

  const imageAlt = locale === "en"
    ? `Share preview for ${entityName}`
    : `Previzualizare partajare pentru ${entityName}`;

  const thing = {
    "@context": "https://schema.org",
    "@type": "Thing",
    identifier: params.cui,
    url: canonical,
    name: entityName,
    additionalType: entityType,
    ...(population ? { additionalProperty: [{ "@type": "PropertyValue", name: "population", value: population }] } : {}),
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: routePolicy.isIndexable ? "index,follow" : "noindex,follow" },
      { name: "canonical", content: canonical },
      { property: "og:type", content: "website" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:image", content: shareImageUrl },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: imageAlt },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: shareImageUrl },
      { name: "twitter:image:alt", content: imageAlt },
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify(thing) }],
  };
}
