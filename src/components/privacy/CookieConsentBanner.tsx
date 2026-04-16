import { useCallback, useEffect, useState, type ReactElement } from "react";
import { CookieIcon } from "lucide-react";
import { acceptAll, declineAll } from "@/lib/consent";
import { hasStoredConsentDecision, onConsentChange } from "@/lib/consent";
import { Analytics } from "@/lib/analytics";
import { Trans } from "@lingui/react/macro";
import { Link, useLocation, useSearch } from "@tanstack/react-router";
import { ToastProvider } from "@/components/ui/toast";
import * as ToastPrimitives from "@radix-ui/react-toast";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * CookieConsentBanner
 *
 * A GDPR-compliant cookie consent banner that clearly explains data usage,
 * provides balanced choices, and respects user privacy.
 */
export function CookieConsentBanner(): ReactElement | null {
  const [isMounted, setMounted] = useState(false);
  const [isBannerVisible, setBannerVisible] = useState(false);
  const location = useLocation();
  const search = useSearch({ strict: false }) as Readonly<{
    notificationModal?: string;
  }>;
  const isMobile = useIsMobile();

  const showBanner = useCallback(() => {
    if (typeof window === "undefined") return;
    const isCookiesPage = location.pathname.includes("/cookies");
    const isNotificationModalOpen = search.notificationModal === "open";

    const shouldHideBanner =
      isCookiesPage || (isMobile && isNotificationModalOpen) || hasStoredConsentDecision();

    if (shouldHideBanner) return;

    setMounted(true);
  }, [location.pathname, search.notificationModal, isMobile]);

  useEffect(() => {
    if (isMounted) {
      // Delay opening to allow for mounting and transition
      const timer = setTimeout(() => setBannerVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isMounted]);

  useEffect(() => {
    const timer = setTimeout(() => {
      showBanner();
    }, 500);
    return () => clearTimeout(timer);
  }, [location.pathname, showBanner]);

  const handleDecision = (consentFunction: () => void) => {
    consentFunction();
    setBannerVisible(false);
  };

  const dismissBanner = useCallback(() => {
    setBannerVisible(false);
  }, []);

  useEffect(() => {
    if (!isBannerVisible && isMounted) {
      // Allow time for exit animation before unmounting
      const timer = setTimeout(() => {
        setMounted(false);
      }, 300); // Corresponds to animation duration
      return () => clearTimeout(timer);
    }
  }, [isBannerVisible, isMounted]);

  if (!isMounted) return null;

  return (
    <ToastProvider duration={20000}>
      {/* Bottom-center, above everything, allow clicks only on the toast */}
      <ToastPrimitives.Viewport className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 md:p-6 pointer-events-none" />

      <ToastPrimitives.Root
        open={isBannerVisible}
        onOpenChange={setBannerVisible}
        aria-live="polite"
        className="group pointer-events-auto relative w-full max-w-5xl rounded-md border-0 bg-transparent p-0 shadow-none transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-bottom-full data-[state=closed]:slide-out-to-bottom-full"
      >
        <div className="rounded-2xl border border-slate-200/30 bg-white/80 shadow-2xl backdrop-blur-lg supports-[backdrop-filter]:bg-white/80">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <CookieIcon className="h-6 w-6 text-blue-600" />
              <h2 className="text-lg font-semibold md:text-xl text-gray-900">
                <Trans>We value your privacy</Trans>
              </h2>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              <Trans>
                We use essential cookies and browser storage to run the service. With your permission, we also use PostHog for analytics and Sentry for enhanced error reporting. You can choose essential-only, accept all, or manage your preferences at any time. For more information, please see our{" "}
                <Link to="/privacy" className="font-medium text-blue-600 hover:underline">
                  Privacy Policy
                </Link>.
              </Trans>
            </p>

            <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <button
                onClick={() => handleDecision(declineAll)}
                className="w-full sm:w-auto rounded-lg py-2 px-5 text-center text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
              >
                <Trans>Allow essential only</Trans>
              </button>
              <Link
                to="/cookies"
                // After managing preferences, return to the current page
                search={{ redirect: `${location.pathname}${location.searchStr ?? ""}` }}
                onClick={dismissBanner}
                className="w-full sm:w-auto rounded-lg py-2 px-5 text-center text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <Trans>Advanced</Trans>
              </Link>
              <button
                onClick={() => handleDecision(acceptAll)}
                className="w-full sm:w-auto sm:ml-auto rounded-lg bg-blue-600 py-2 px-5 text-sm font-medium text-white hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Trans>Accept All</Trans>
              </button>
            </div>
          </div>
        </div>
      </ToastPrimitives.Root>
    </ToastProvider>
  );
}

// Emit analytics when consent changes (runs once in module scope; safe in client)
if (typeof window !== "undefined") {
  try {
    onConsentChange((prefs) => {
      Analytics.capture(Analytics.EVENTS.CookieConsentChanged, {
        analytics: prefs.analytics,
        sentry: prefs.sentry,
      });
    });
  } catch {
    // ignore
  }
}
