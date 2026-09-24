import { i18n, type Messages } from "@lingui/core";

export const DEFAULT_LOCALE = "ro" as const;
export const LOCALE_COOKIE_NAME = "user-locale";
export type SupportedLocale = "ro" | "en";

type CatalogName = "messages" | "admin" | "pnrr";
type CatalogLoader = () => Promise<unknown>;
type CatalogEntry = unknown | CatalogLoader;
type ActivationOptions = {
  readonly pathname?: string;
};

const DEFAULT_CATALOG: CatalogName = "messages";
const ADMIN_CATALOG: CatalogName = "admin";
const PNRR_CATALOG: CatalogName = "pnrr";
const loadedCatalogs = new Map<string, Messages>();
const loadingCatalogs = new Map<string, Promise<Messages>>();
/** Catalogs already in Lingui's messages for their locale (`i18n.load` merges). */
const mergedCatalogs = new Set<string>();

const defaultCatalogsEager = import.meta.glob("../locales/*/messages.po", {
  eager: true,
}) as Record<string, unknown>;

const defaultCatalogsLazy = import.meta.glob("../locales/*/messages.po", {
  eager: false,
}) as Record<string, CatalogLoader>;

const adminCatalogsEager = import.meta.glob("../locales/*/admin.po", {
  eager: true,
}) as Record<string, unknown>;

const adminCatalogsLazy = import.meta.glob("../locales/*/admin.po", {
  eager: false,
}) as Record<string, CatalogLoader>;

const pnrrCatalogsEager = import.meta.glob("../locales/*/pnrr.po", {
  eager: true,
}) as Record<string, unknown>;

const pnrrCatalogsLazy = import.meta.glob("../locales/*/pnrr.po", {
  eager: false,
}) as Record<string, CatalogLoader>;

const localeCatalogs: Record<CatalogName, Record<string, CatalogEntry>> =
  import.meta.env.SSR
    ? {
        messages: defaultCatalogsEager,
        admin: adminCatalogsEager,
        pnrr: pnrrCatalogsEager,
      }
    : {
        messages: defaultCatalogsLazy,
        admin: adminCatalogsLazy,
        pnrr: pnrrCatalogsLazy,
      };

const DEFAULT_SCOPE = [DEFAULT_CATALOG] as const;

if (import.meta.env.SSR) {
  const defaultEntry =
    localeCatalogs.messages[`../locales/${DEFAULT_LOCALE}/messages.po`];
  if (defaultEntry && typeof defaultEntry !== "function") {
    loadedCatalogs.set(
      getCatalogCacheKey(DEFAULT_LOCALE, DEFAULT_CATALOG),
      extractMessages(defaultEntry),
    );
    i18n.load(
      DEFAULT_LOCALE,
      buildMergedMessages(DEFAULT_LOCALE, DEFAULT_SCOPE),
    );
  }
}

function extractMessages(module: unknown): Messages {
  if (!module || typeof module !== "object") return {};
  const record = module as { messages?: unknown; default?: unknown };
  if (record.messages && typeof record.messages === "object") {
    return record.messages as Messages;
  }
  const def = record.default;
  if (def && typeof def === "object") {
    const defRecord = def as { messages?: unknown };
    if (defRecord.messages && typeof defRecord.messages === "object") {
      return defRecord.messages as Messages;
    }
    return def as Messages;
  }
  return {};
}

function isCatalogLoader(entry: CatalogEntry): entry is CatalogLoader {
  return typeof entry === "function";
}

function getCatalogCacheKey(locale: string, catalogName: CatalogName): string {
  return `${locale}:${catalogName}`;
}

function getCatalogLoader(
  locale: string,
  catalogName: CatalogName,
): (() => Promise<unknown>) | undefined {
  const entry = localeCatalogs[catalogName][
    `../locales/${locale}/${catalogName}.po`
  ];
  if (!entry) return undefined;
  if (isCatalogLoader(entry)) {
    return entry;
  }
  return async () => entry;
}

function buildMergedMessages(
  locale: string,
  catalogNames: readonly CatalogName[],
): Messages {
  return catalogNames.reduce<Messages>((allMessages, catalogName) => {
    const catalogMessages = loadedCatalogs.get(
      getCatalogCacheKey(locale, catalogName),
    );
    if (!catalogMessages) return allMessages;
    return {
      ...allMessages,
      ...catalogMessages,
    };
  }, {});
}

function getCatalogNamesForPathname(pathname?: string): readonly CatalogName[] {
  if (isAdminPathname(pathname)) {
    return [DEFAULT_CATALOG, ADMIN_CATALOG] as const;
  }
  if (isPnrrPathname(pathname)) {
    return [DEFAULT_CATALOG, PNRR_CATALOG] as const;
  }
  return DEFAULT_SCOPE;
}

function isAdminPathname(pathname?: string): boolean {
  return typeof pathname === "string" && pathname.startsWith("/admin");
}

function isPnrrPathname(pathname?: string): boolean {
  return pathname === "/pnrr" || pathname?.startsWith("/pnrr/") === true;
}

async function ensureCatalogLoaded(
  locale: string,
  catalogName: CatalogName,
): Promise<void> {
  const cacheKey = getCatalogCacheKey(locale, catalogName);
  if (loadedCatalogs.has(cacheKey)) return;

  const existingLoad = loadingCatalogs.get(cacheKey);
  if (existingLoad) {
    await existingLoad;
    return;
  }

  const loader = getCatalogLoader(locale, catalogName);
  if (!loader) {
    if (catalogName === ADMIN_CATALOG || catalogName === PNRR_CATALOG) {
      loadedCatalogs.set(cacheKey, {});
      return;
    }
    throw new Error(
      `Missing i18n catalog "${catalogName}" for locale "${locale}"`,
    );
  }

  const loadPromise = (async () => {
    const module = await loader();
    const messages = extractMessages(module);
    loadedCatalogs.set(cacheKey, messages);
    return messages;
  })();

  loadingCatalogs.set(cacheKey, loadPromise);
  try {
    await loadPromise;
  } finally {
    loadingCatalogs.delete(cacheKey);
  }
}

export function normalizeLocale(
  value: string | null | undefined,
): SupportedLocale | null {
  if (value === "ro" || value === "en") {
    return value;
  }
  return null;
}

export function resolveLocale(options: {
  pathname: string;
  searchStr?: string;
  cookieLocale?: string | null;
  storedLocale?: string | null;
}): SupportedLocale {
  const searchParams = new URLSearchParams(options.searchStr ?? "");
  const searchLocale = normalizeLocale(searchParams.get("lang"));
  if (searchLocale) return searchLocale;

  const pathLocale = normalizeLocale(options.pathname.split("/")[1]);
  if (pathLocale) return pathLocale;

  const cookieLocale = normalizeLocale(options.cookieLocale);
  if (cookieLocale) return cookieLocale;

  const storedLocale = normalizeLocale(options.storedLocale);
  if (storedLocale) return storedLocale;

  return DEFAULT_LOCALE;
}

/** The locale cookie as the browser holds it; null on the server. */
export function readBrowserLocaleCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** The locale this browser stored; null on the server or without storage. */
export function readBrowserStoredLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCALE_COOKIE_NAME);
  } catch {
    return null;
  }
}

/**
 * The language a load of this address activates in the browser: the root
 * route's own resolution — the address, then the cookie, then storage.
 */
export function browserLocaleFor(location: {
  readonly pathname: string;
  readonly searchStr?: string;
}): SupportedLocale {
  return resolveLocale({
    pathname: location.pathname,
    searchStr: location.searchStr,
    cookieLocale: readBrowserLocaleCookie(),
    storedLocale: readBrowserStoredLocale(),
  });
}

export async function dynamicActivate(
  locale: string,
  options?: ActivationOptions,
): Promise<void> {
  const catalogNames = getCatalogNamesForPathname(options?.pathname);
  const cacheKeys = catalogNames.map((catalogName) =>
    getCatalogCacheKey(locale, catalogName),
  );
  // Already the active language, with these catalogs in it. Loading and
  // activating again changes nothing but still emits Lingui's `change`, which
  // re-renders everything that translates — on every navigation, and on
  // every hover that preloads a link, since the root's `beforeLoad` runs then
  // too. (So the first hover on a `/pnrr` or `/admin` link, whose catalog is
  // not in yet, does load it and re-render, where the click used to.)
  if (i18n.locale === locale && cacheKeys.every((key) => mergedCatalogs.has(key))) {
    return;
  }
  await Promise.all(
    catalogNames.map((catalogName) => ensureCatalogLoaded(locale, catalogName)),
  );
  i18n.load(locale, buildMergedMessages(locale, catalogNames));
  for (const key of cacheKeys) {
    if (loadedCatalogs.has(key)) mergedCatalogs.add(key);
  }
  i18n.activate(locale);
}
