import { useEffect, type ReactNode } from "react";
import { Outlet, useLocation, useRouter } from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { PostHogProvider } from "posthog-js/react";
import posthog from "posthog-js";
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
import { ChatFab } from "@/components/footer/ChatFab";
import { FeedbackFab } from "@/components/feedback/FeedbackFab";
import { CookieConsentBanner } from "@/components/privacy/CookieConsentBanner";
import { MobileBottomDock } from "@/components/mobile/mobile-bottom-dock";
import { shouldHideMobileBottomDock } from "@/components/mobile/mobile-bottom-dock-visibility";
import { Analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { Currency } from "@/schemas/charts";

const isBrowser = typeof window !== 'undefined';

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
      <SSRSafePostHogProvider>
        <ErrorProvider>
          <QueryClientProvider client={queryClient}>
            <I18nProvider i18n={i18n}>
              <ThemeProvider defaultTheme="light" ssrTheme={ssrTheme}>
                <HotkeysProvider>
                  <SidebarProvider>
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
                            <Outlet />
                            <Toaster />
                          </div>
                        </main>
                        <AppFooter />
                        <ChatFab />
                        <FeedbackFab />
                        <MobileBottomDock />
                        <CookieConsentBanner />
                      </SidebarInset>
                    </div>
                  </SidebarProvider>
                </HotkeysProvider>
              </ThemeProvider>
            </I18nProvider>
          </QueryClientProvider>
        </ErrorProvider>
      </SSRSafePostHogProvider>
    </AuthProvider>
  );
}

function AnalyticsPageviewBridge() {
  Analytics.pageviewHook();
  return null;
}

/**
 * SSR-safe PostHog provider that only initializes PostHog on the client.
 * PostHog requires browser APIs (window, document) and cannot run during SSR.
 */
function SSRSafePostHogProvider({ children }: { readonly children: ReactNode }) {
  if (!isBrowser) {
    // During SSR, skip PostHog entirely and just render children
    return <>{children}</>;
  }

  return (
    <PostHogProvider client={posthog}>
      {children}
    </PostHogProvider>
  );
}
