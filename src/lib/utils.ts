import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { i18n } from "@lingui/core";
import { msg as t } from "@lingui/core/macro";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/i18n";

// i18n messages for normalization units
const normalizationMessages = {
  percentOfGdp: t`% of GDP`,
  perCapita: t`/capita`,
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, notation?: "standard" | "compact", currency: "RON" | "EUR" | "USD" = "RON"): string {
  const locale = getUserLocale();
  const numberLocale = locale === "ro" ? "ro-RO" : "en-US";
  const formatted = new Intl.NumberFormat(numberLocale, {
    style: "currency",
    currency: currency,
    notation: notation || "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  // ro-RO compact uses "K" for thousands — replace with "mii"
  if (notation === 'compact' && locale === 'ro') {
    return formatted.replace(/\sK$/, ' mii');
  }
  return formatted;
}

/**
 * Formats a number according to locale settings.
 * Handles thousands separators (.) and decimal comma (,).
 */
export const formatNumber = (value: number | null | undefined, notation?: "standard" | "compact"): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A';

  const locale = getUserLocale();

  const numberLocale = locale === "ro" ? "ro-RO" : "en-GB";
  const formatted = new Intl.NumberFormat(numberLocale, {
    style: "decimal",
    notation: notation || "standard",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
  // ro-RO compact uses "K" for thousands — replace with "mii"
  if (notation === 'compact' && locale === 'ro') {
    return formatted.replace(/\sK$/, ' mii');
  }
  return formatted;
};

export function generateHash(message: string): string {
  let hash = 0x811c9dc5; // FNV1a 32-bit offset basis

  for (let i = 0; i < message.length; i++) {
    hash ^= message.charCodeAt(i);
    // Math.imul performs a 32-bit integer multiplication.
    // This helps keep the hash within 32-bit integer behavior
    // and is efficient.
    hash = Math.imul(hash, 0x01000193); // FNV1a 32-bit prime
  }

  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function capitalize(str: string) {
  return str.toLocaleLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function convertDaysToMs(days: number): number {
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Converts input into a URL-friendly slug.
 * Lowercases, trims, replaces non-alphanumerics with dashes, and collapses repeats.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

type Locale = SupportedLocale;

const LOCALE_COOKIE_MAX_AGE_DAYS = 365;

function getLocaleFromCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`),
  );
  if (!match) return null;
  return normalizeLocale(decodeURIComponent(match[1]));
}

/**
 * Gets the user's locale with the following priority:
 * 0. Activated Lingui locale (when available)
 * 1. URL query parameter `lang` (for shareable links)
 * 2. Cookie value
 * 3. localStorage value
 * 4. Default to 'ro'
 */
export function getUserLocale(): Locale {
  const activeLocale = normalizeLocale(i18n.locale);
  if (activeLocale) return activeLocale;

  // Check URL query parameter first
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const langParam = normalizeLocale(urlParams.get('lang'));
    if (langParam) return langParam;

    const cookieLocale = getLocaleFromCookie();
    if (cookieLocale) return cookieLocale;
  }

  // Fall back to localStorage
  const savedLocale: Locale | null =
    typeof window !== 'undefined'
      ? normalizeLocale(window.localStorage.getItem(LOCALE_COOKIE_NAME))
      : null;
  return savedLocale || DEFAULT_LOCALE;
}

export function setUserLocale(locale: Locale): void {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(LOCALE_COOKIE_NAME, locale);
    const maxAgeSeconds = LOCALE_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
    const cookieParts = [
      `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
      "Path=/",
      `Max-Age=${maxAgeSeconds}`,
      "SameSite=Lax",
    ];
    if (window.location.protocol === "https:") {
      cookieParts.push("Secure");
    }
    document.cookie = cookieParts.join("; ");
  }
}


type NormalizationUnitCurrency = 'RON' | 'EUR' | 'USD'

type NormalizationUnitInput =
  | {
      normalization?: 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro'
      currency?: NormalizationUnitCurrency
      show_period_growth?: boolean
    }
  | undefined

export function getNormalizationUnit(
  normalization: 'total' | 'per_capita' | 'percent_gdp' | 'total_euro' | 'per_capita_euro' | undefined,
  currency?: NormalizationUnitCurrency,
  showPeriodGrowth?: boolean,
): string
export function getNormalizationUnit(options: NormalizationUnitInput): string
export function getNormalizationUnit(
  normalizationOrOptions:
    | 'total'
    | 'per_capita'
    | 'percent_gdp'
    | 'total_euro'
    | 'per_capita_euro'
    | NormalizationUnitInput,
  currencyArg?: NormalizationUnitCurrency,
  showPeriodGrowthArg?: boolean,
): string {
  const normalization =
    typeof normalizationOrOptions === 'string'
      ? normalizationOrOptions
      : normalizationOrOptions?.normalization
  const currency =
    typeof normalizationOrOptions === 'string'
      ? currencyArg
      : normalizationOrOptions?.currency
  const showPeriodGrowth =
    typeof normalizationOrOptions === 'string'
      ? showPeriodGrowthArg
      : normalizationOrOptions?.show_period_growth

  if (showPeriodGrowth) return '%'
  if (normalization === 'percent_gdp') return i18n._(normalizationMessages.percentOfGdp)

  const effectiveCurrency: NormalizationUnitCurrency =
    normalization === 'total_euro' || normalization === 'per_capita_euro'
      ? 'EUR'
      : (currency ?? 'RON')

  const isPerCapita = normalization === 'per_capita' || normalization === 'per_capita_euro'
  return isPerCapita ? `${effectiveCurrency}${i18n._(normalizationMessages.perCapita)}` : effectiveCurrency
}

type ValueNotation = 'standard' | 'compact'

export function formatValueWithUnit(value: number, unit: string, notation: ValueNotation = 'compact'): string {
  if (value == null || Number.isNaN(value)) return 'N/A'

  if (unit === '%') {
    return `${formatNumber(value, notation)}%`
  }

  if (unit === 'RON' || unit === 'EUR' || unit === 'USD') {
    return formatCurrency(value, notation, unit)
  }

  const perCapitaSuffix = i18n._(normalizationMessages.perCapita)
  if (unit.endsWith(perCapitaSuffix)) {
    const currency = unit.replace(perCapitaSuffix, '') as NormalizationUnitCurrency
    return `${formatCurrency(value, notation, currency)}${perCapitaSuffix}`
  }

  if (unit.includes('%')) {
    return `${formatNumber(value, notation)}${unit}`.trim()
  }

  return `${formatNumber(value, notation)} ${unit}`.trim()
}

export function formatNormalizedValue(value: number, options: NormalizationUnitInput, notation: ValueNotation = 'compact'): string {
  return formatValueWithUnit(value, getNormalizationUnit(options), notation)
}

/**
 * Returns a Tailwind color class based on the sign of a numeric value.
 * Negative → red, Positive → green, Zero/undefined → muted.
 */
export function getSignClass(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return 'text-muted-foreground';
  if (value < 0) return 'text-red-600';
  if (value > 0) return 'text-green-600';
  return 'text-muted-foreground';
}
