import { i18n, type Messages } from "@lingui/core";

export const DEFAULT_LOCALE = "ro" as const;
export const LOCALE_COOKIE_NAME = "user-locale";
export type SupportedLocale = "ro" | "en";

type CatalogName = "messages" | "admin";
type CatalogLoader = () => Promise<unknown>;
type CatalogEntry = unknown | CatalogLoader;
type ActivationOptions = {
  readonly pathname?: string;
};

const DEFAULT_CATALOG: CatalogName = "messages";
const ADMIN_CATALOG: CatalogName = "admin";
const loadedCatalogs = new Map<string, Messages>();
const loadingCatalogs = new Map<string, Promise<Messages>>();

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

const localeCatalogs: Record<CatalogName, Record<string, CatalogEntry>> =
  import.meta.env.SSR
    ? {
        messages: defaultCatalogsEager,
        admin: adminCatalogsEager,
      }
    : {
        messages: defaultCatalogsLazy,
        admin: adminCatalogsLazy,
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
  return DEFAULT_SCOPE;
}

function isAdminPathname(pathname?: string): boolean {
  return typeof pathname === "string" && pathname.startsWith("/admin");
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
    if (catalogName === ADMIN_CATALOG) {
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

export async function dynamicActivate(
  locale: string,
  options?: ActivationOptions,
): Promise<void> {
  const catalogNames = getCatalogNamesForPathname(options?.pathname);
  await Promise.all(
    catalogNames.map((catalogName) => ensureCatalogLoaded(locale, catalogName)),
  );
  i18n.load(locale, buildMergedMessages(locale, catalogNames));
  i18n.activate(locale);
}
