import { DisclosureWatch, PublicationScope } from "@/features/procurement/hooks/use-disclosure-watch";
import { useEffect } from "react";
import { Outlet, useLocation, useRouter, useRouterState } from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { I18nProvider } from "@lingui/react";
import { i18n } from "@lingui/core";
import { getUserLocale } from "@/lib/utils";
import { hasAnalyticsConsent, onConsentChange } from "@/lib/consent";
import { useSentryConsent } from "@/hooks/useSentryConsent";
import { AuthProvider, authKey } from "@/lib/auth";
import { cleanupSentry, initSentry } from "@/lib/sentry";
import { ThemeProvider, type ResolvedTheme } from "@/components/theme/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { Toaster } from "sonner";
import { ErrorProvider } from "@/contexts/ErrorContext";
import { HotkeysProvider } from "react-hotkeys-hook";
import { AppFooter } from "@/components/footer/AppFooter";
import { NavigationProgress } from "@/components/app/navigation-progress";
import { useWarmRouteCodeOnIntent } from "@/hooks/use-warm-route-code";
import { FeedbackFab } from "@/components/feedback/FeedbackFab";
import { PageNotice } from "@/components/data-trust/page-notice";
import { pageNoticeScope } from "@/components/data-trust/page-notice-scope";
import { ConsentCardHost } from "@/features/privacy/components/consent-card-host";
import { MobileBottomDock } from "@/components/mobile/mobile-bottom-dock";
import { shouldHideMobileBottomDock } from "@/components/mobile/mobile-bottom-dock-visibility";
import { Analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { Currency } from "@/schemas/charts";

type AppShellProps = {
  queryClient: QueryClient;
  /** Theme resolved during SSR from cookie, used to prevent FOUC */
  ssrTheme?: ResolvedTheme;
  /** Currency resolved during SSR from cookie, used for hydration-safe global controls */
  ssrCurrency?: Currency;
  /** Inflation preference resolved during SSR from cookie, used for hydration-safe global controls */
  ssrInflationAdjusted?: boolean;
};

export function AppShell({
  queryClient,
  ssrTheme,
  ssrCurrency,
  ssrInflationAdjusted,
}: AppShellProps) {
  const router = useRouter();
  const location = useLocation();
  const hasSentryConsent = useSentryConsent();
  const hideMobileBottomDock = shouldHideMobileBottomDock(location.pathname);
  // A page that doesn't exist is no page being worked on: the not-found page shows no notice.
  const notFound = useRouterState({ select: (state) => state.matches.some((match) => match.status === "notFound" || match.globalNotFound) });
  const pageNotice = notFound ? null : pageNoticeScope(location.pathname);
  useWarmRouteCodeOnIntent();

  useEffect(() => {
    const userLocale = getUserLocale();
    Analytics.capture(Analytics.EVENTS.DefaultLanguage, { locale: userLocale });
    try {
      document.documentElement.setAttribute("lang", userLocale);
    } catch {
      // Ignore DOM access errors during early hydration.
    }
  }, []);

  useEffect(() => {
    if (hasSentryConsent) {
      initSentry(router);
    } else {
      cleanupSentry();
    }
  }, [hasSentryConsent, router]);

  useEffect(() => {
    let lastAnalyticsConsent = hasAnalyticsConsent();

    // If the user has not consented, proactively clear any existing PostHog persistence.
    // This avoids leaving `ph_*` identifiers around from previous sessions.
    if (!lastAnalyticsConsent) {
      Analytics.clearPostHogPersistence();
    }

    const unsubscribe = onConsentChange((prefs) => {
      // When the user opts in, capture a pageview for the current page.
      // (Route-based pageviews won't fire until the next navigation.)
      if (prefs.analytics && !lastAnalyticsConsent) {
        Analytics.capturePageview();
      }

      // When the user opts out, clear PostHog cookies/localStorage identifiers.
      if (!prefs.analytics && lastAnalyticsConsent) {
        Analytics.clearPostHogPersistence();
      }

      lastAnalyticsConsent = prefs.analytics;
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthProvider publishableKey={authKey}>
      <ErrorProvider>
        <QueryClientProvider client={queryClient}>
          <I18nProvider i18n={i18n}>
            <ThemeProvider defaultTheme="light" ssrTheme={ssrTheme}>
              <HotkeysProvider>
                <SidebarProvider>
                  <NavigationProgress />
                  <DisclosureWatch />
                  <div className="flex min-h-screen min-w-full">
                    <AppSidebar
                      initialCurrency={ssrCurrency}
                      initialInflationAdjusted={ssrInflationAdjusted}
                    />
                    <SidebarInset>
                      <main
                        role="main"
                        className={cn(
                          "flex min-h-0 min-w-0 flex-1 flex-col md:pb-0",
                          hideMobileBottomDock
                            ? "pb-0"
                            : "pb-[calc(env(safe-area-inset-bottom)+4.5rem)]"
                        )}
                      >
                        <div className="flex min-h-full min-w-0 flex-1 flex-col">
                          <AnalyticsPageviewBridge />
                          {/* Every page but the landing and the no-data ones, for now (owner, 24 November 2026). */}
                          {pageNotice && <PageNotice key={pageNotice} id={pageNotice} contentClassName="mx-auto max-w-6xl px-4 md:px-6" />}
                          {/* D6: a retired publication's answers leave every view that shows them. */}
                          <PublicationScope>
                            <Outlet />
                          </PublicationScope>
                          <Toaster />
                        </div>
                      </main>
                      <AppFooter />
                      <FeedbackFab />
                      <MobileBottomDock />
                      <ConsentCardHost />
                    </SidebarInset>
                  </div>
                </SidebarProvider>
              </HotkeysProvider>
            </ThemeProvider>
          </I18nProvider>
        </QueryClientProvider>
      </ErrorProvider>
    </AuthProvider>
  );
}

function AnalyticsPageviewBridge() {
  Analytics.pageviewHook();
  return null;
}
