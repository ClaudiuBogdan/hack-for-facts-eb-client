import {
  createRootRouteWithContext,
  HeadContent,
  Link,
  Scripts,
} from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import GlobalErrorPage from "@/components/errors/GlobalErrorPage";
import { Button } from "@/components/ui/button";
import { Home, FileQuestion } from "lucide-react";
import { t } from "@lingui/core/macro";
import { i18n } from "@lingui/core";
import { z } from "zod";
import type { RouterContext } from "@/router-context";
import appCss from "@/index.css?url";
import { env, getRuntimeConfigBootstrapScript, getSiteUrl } from "@/config/env";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  dynamicActivate,
  resolveLocale,
} from "@/lib/i18n";
import { AppShell } from "@/components/app/app-shell";
import {
  THEME_COOKIE_NAME,
  type ResolvedTheme,
} from "@/components/theme/theme-provider";
import { createNoStoreHeaders } from "@/lib/http-cache";

const ANONYMOUS_CROSS_ORIGIN = "anonymous" as const;
const DEFAULT_THEME: ResolvedTheme = "light";

// Global search schema for settings that persist across routes
// Without this, TanStack Router strips unknown params on navigation
// NOTE: Using union + transform instead of preprocess to preserve optionality for type inference
const globalSearchSchema = z
  .object({
    currency: z.enum(["RON", "EUR", "USD"]).optional(),
    // Accept boolean or string from URL, transform to boolean | undefined
    inflation_adjusted: z
      .union([z.boolean(), z.literal("true"), z.literal("false")])
      .optional()
      .transform((val) => {
        if (val === "true") return true;
        if (val === "false") return false;
        return val;
      }),
  })
  .passthrough(); // Allow child routes to add their own params

export const Route = createRootRouteWithContext<RouterContext>()({
  validateSearch: globalSearchSchema,
  ssr: true,
  headers: () => createNoStoreHeaders(),
  head: getGlobalHead,
  beforeLoad: async ({ location }) => {
    // Read locale from cookie/storage
    const cookieLocale = await readLocaleCookie();
    const storedLocale = readStoredLocale();
    const locale = resolveLocale({
      pathname: location.pathname,
      searchStr: location.searchStr,
      cookieLocale,
      storedLocale,
    });
    await dynamicActivate(locale);

    // Read theme from cookie for SSR (prevents FOUC)
    const themeCookie = await readThemeCookie();
    const ssrTheme = resolveThemeFromCookie(themeCookie);

    return { ssrTheme };
  },
  errorComponent: ({ error }) => <GlobalErrorPage error={error} />,
  notFoundComponent: NotFoundPage,
  component: RootComponent,
});

function RootComponent() {
  const { queryClient, ssrTheme } = Route.useRouteContext();
  const themeClass = ssrTheme || DEFAULT_THEME;

  return (
    <html lang={i18n.locale || DEFAULT_LOCALE} className={themeClass}>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppShell queryClient={queryClient} ssrTheme={ssrTheme} />
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <FileQuestion className="h-8 w-8 text-muted-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t`Page not found`}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {t`The page you are looking for doesn't exist or has been moved.`}
        </p>
        <div className="mt-6">
          <Link to="/">
            <Button>
              <Home className="mr-2 h-4 w-4" />
              {t`Go to homepage`}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function getGlobalHead() {
  const site = getSiteUrl();
  const title = "Transparenta.eu";
  const description =
    "Explore Romania public finance data with charts, maps, and analytics.";
  const shareImage = `${site}/assets/images/share-image.png`;
  const fontPreloads = import.meta.env.PROD
    ? [
        {
          rel: "preload",
          href: "/fonts/Inter/Inter-VariableFont_opsz,wght.woff2",
          as: "font",
          type: "font/woff2",
          crossOrigin: ANONYMOUS_CROSS_ORIGIN,
        },
      ]
    : [];
  // Better Stack status widget (only in production and when configured)
  const statusWidgetScripts =
    env.VITE_APP_ENVIRONMENT === "production" &&
    env.VITE_BETTER_STACK_STATUS_WIDGET_ID
      ? [
          {
            src: "https://uptime.betterstack.com/widgets/announcement.js",
            "data-id": env.VITE_BETTER_STACK_STATUS_WIDGET_ID,
            async: true,
          },
        ]
      : [];
  return {
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, viewport-fit=cover" },
      { name: "theme-color", content: "#0f172a" },
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: title },
      { property: "og:title", content: `${title} - Romania Public Finance Data` },
      { property: "og:description", content: description },
      { property: "og:image", content: shareImage },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Transparenta.eu platform preview" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${title} - Romania Public Finance Data` },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: shareImage },
      { name: "twitter:image:alt", content: "Transparenta.eu platform preview" },
      {
        name: "keywords",
        content:
          "execuții bugetare, extranet anaf, anaf, executii bugetare, bugetul statului, transparență bugetară, transparenta bugetara, analiză bugetară, analiza bugetara, cheltuieli publice, venituri publice, buget local, buget județean, UAT, hartă cheltuieli, harta cheltuieli, vizualizare buget, vizualizare date, finanțe publice, finante publice, România, Romania",
      },
      {
        name: "ai:site:instructions",
        content:
          "Use /entities/{cui} for single-entity analytics; /entity-analytics for cross-entity analytics; /budget-explorer for multi-filter budget exploration.",
      },
      {
        name: "ai:routes",
        content: JSON.stringify({
          "/entities/{cui}":
            "Entity details and analytics (views, period, normalization).",
          "/entity-analytics":
            "Cross-entity analytics (filter by years, categories, geography).",
          "/budget-explorer": "Explore and slice budget across years and categories.",
        }),
      },
      { name: "ai:parameters:index", content: "https://transparenta.eu/ai/index.json" },
    ],
    links: [
      { rel: "icon", type: "image/png", href: "/logo.png" },
      ...fontPreloads,
      { rel: "stylesheet", href: appCss },
    ],
    scripts: [
      {
        type: "text/javascript",
        children: getRuntimeConfigBootstrapScript(),
      },
      // Global WebSite & FAQ JSON-LD for AI agents
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Transparenta.eu",
          url: site,
          potentialAction: {
            "@type": "SearchAction",
            target: `${site}/?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
      // Organization entity to improve entity recognition and citations
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "@id": `${site}#organization`,
          name: "Transparenta.eu",
          alternateName: "Romanian Budget Transparency Platform",
          url: site,
          logo: `${site}/logo.png`,
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "Data Support",
            email: "contact@transparenta.eu",
          },
        }),
      },
      // Better Stack status announcement widget (only in production to avoid test interference)
      ...statusWidgetScripts,
    ],
  };
}

function readStoredLocale(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(LOCALE_COOKIE_NAME);
  } catch {
    return null;
  }
}

const readRequestCookie = createIsomorphicFn()
  .client(async (_name: string): Promise<string | null> => null)
  .server(async (name: string): Promise<string | null> => {
    const { getCookie } = await import("@tanstack/react-start/server");
    return getCookie(name) ?? null;
  });

async function readLocaleCookie(): Promise<string | null> {
  const requestCookieValue = await readRequestCookie(LOCALE_COOKIE_NAME);
  if (requestCookieValue !== null) return requestCookieValue;
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

async function readThemeCookie(): Promise<string | null> {
  const requestCookieValue = await readRequestCookie(THEME_COOKIE_NAME);
  if (requestCookieValue !== null) return requestCookieValue;
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Resolves the theme from cookie value to a concrete theme class.
 * "system" cannot be resolved during SSR (no access to prefers-color-scheme),
 * so we default to light theme for SSR when system is selected.
 */
function resolveThemeFromCookie(cookieValue: string | null): ResolvedTheme {
  if (cookieValue === "dark") return "dark";
  if (cookieValue === "light") return "light";
  // For "system" or missing cookie, default to light during SSR
  // Client will adjust if system preference is dark
  return DEFAULT_THEME;
}
