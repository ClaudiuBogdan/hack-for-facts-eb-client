import { t } from "@lingui/core/macro";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import { Check, Link2, MenuIcon, MessageSquare, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FloatingEntitySearch } from "@/components/entities/FloatingEntitySearch";
import { SupportMenu } from "@/components/footer/support-menu";
import { getSiteUrl } from "@/config/env";
import { ensureShortRedirectUrl } from "@/lib/api/shortLinks";
import { useAuth } from "@/lib/auth";
import { useSidebar } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { shouldHideMobileBottomDock } from "./mobile-bottom-dock-visibility";

const MOBILE_DOCK_HIDE_THRESHOLD = 80;
const MOBILE_DOCK_TOP_VISIBILITY_THRESHOLD = 16;
const MOBILE_DOCK_SAFE_AREA_PADDING = "calc(env(safe-area-inset-bottom) + 0.375rem)";

const MOBILE_DOCK_BUTTON_CLASS_NAME =
  "flex min-h-10 w-full touch-manipulation flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

export function MobileBottomDock() {
  const isMobile = useIsMobile();
  const location = useLocation();

  if (!isMobile || shouldHideMobileBottomDock(location.pathname)) {
    return null;
  }

  return <MobileBottomDockContent />;
}

function MobileBottomDockContent() {
  const { isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const { setOpenMobile } = useSidebar();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(true);
  const shareCopiedResetTimeoutRef = useRef<number | undefined>(undefined);
  const lastScrollYRef = useRef(0);
  const isDockVisibleRef = useRef(true);
  const scrollFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (shareCopiedResetTimeoutRef.current !== undefined) {
        window.clearTimeout(shareCopiedResetTimeoutRef.current);
      }
    };
  }, []);

  const resetShareCopiedStateWithDelay = useCallback(() => {
    if (shareCopiedResetTimeoutRef.current !== undefined) {
      window.clearTimeout(shareCopiedResetTimeoutRef.current);
    }

    shareCopiedResetTimeoutRef.current = window.setTimeout(() => {
      setIsShareCopied(false);
    }, 2000);
  }, []);

  useEffect(() => {
    const getScrollY = () =>
      window.pageYOffset || document.documentElement.scrollTop || 0;

    const updateDockVisibility = (nextVisibility: boolean) => {
      if (nextVisibility === isDockVisibleRef.current) {
        return;
      }

      isDockVisibleRef.current = nextVisibility;
      setIsDockVisible(nextVisibility);
    };

    lastScrollYRef.current = getScrollY();
    updateDockVisibility(
      lastScrollYRef.current <= MOBILE_DOCK_TOP_VISIBILITY_THRESHOLD ||
        lastScrollYRef.current <= MOBILE_DOCK_HIDE_THRESHOLD
    );

    const handleScroll = () => {
      if (scrollFrameRef.current !== null) {
        return;
      }

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        scrollFrameRef.current = null;

        const currentScrollY = getScrollY();
        const delta = currentScrollY - lastScrollYRef.current;
        const nextDirection = delta > 0 ? "down" : delta < 0 ? "up" : null;
        const nextVisibility =
          currentScrollY <= MOBILE_DOCK_TOP_VISIBILITY_THRESHOLD ||
          currentScrollY <= MOBILE_DOCK_HIDE_THRESHOLD ||
          nextDirection === "up";

        updateDockVisibility(nextVisibility);
        lastScrollYRef.current = currentScrollY;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (scrollFrameRef.current !== null) {
        window.cancelAnimationFrame(scrollFrameRef.current);
        scrollFrameRef.current = null;
      }
    };
  }, []);

  const handleCopyShareLink = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      let linkToCopy = currentUrl;

      if (isSignedIn) {
        try {
          linkToCopy = await ensureShortRedirectUrl(
            currentUrl,
            getSiteUrl(),
            queryClient
          );
        } catch (error) {
          console.error(
            "Failed to generate short link, falling back to full URL",
            error
          );
        }
      }

      await navigator.clipboard.writeText(linkToCopy);
      setIsShareCopied(true);
      resetShareCopiedStateWithDelay();
    } catch (error) {
      console.error("Copy failed", error);
      toast.error(t`Failed to copy link`);
    }
  }, [isSignedIn, queryClient, resetShareCopiedStateWithDelay]);

  const hiddenTabIndex = isDockVisible ? 0 : -1;

  return (
    <>
      <FloatingEntitySearch
        externalOpen={isSearchOpen}
        onOpenChange={setIsSearchOpen}
      />

      <div
        data-testid="mobile-bottom-dock"
        aria-hidden={!isDockVisible}
        className={cn(
          "pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden",
          "transition-[transform,opacity] duration-200 ease-out will-change-[transform,opacity]",
          "motion-reduce:transform-none motion-reduce:transition-opacity",
          isDockVisible
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        <div
          className="pointer-events-auto w-full overflow-hidden rounded-t-[24px] shadow-[0_-16px_34px_-22px_rgba(15,23,42,0.32)] backdrop-blur-xl"
        >
          <section
            className="rounded-t-[24px] border-x border-t border-border/50 bg-linear-to-br from-background/92 via-background/88 to-primary/[0.08] px-2.5 pt-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.32)] supports-[backdrop-filter]:bg-background/78"
            style={{ paddingBottom: MOBILE_DOCK_SAFE_AREA_PADDING }}
          >
            <nav
              aria-label={t`Mobile quick actions`}
              className="grid grid-cols-4 gap-1"
            >
              <SupportMenu
                contentAlign="center"
                contentClassName="w-[min(18rem,calc(100vw-1rem))]"
                contentSide="top"
                trigger={
                  <button
                    type="button"
                    aria-label={t`Help`}
                    className={MOBILE_DOCK_BUTTON_CLASS_NAME}
                    data-testid="mobile-bottom-dock-help"
                    tabIndex={hiddenTabIndex}
                  >
                    <MessageSquare className="h-4 w-4" aria-hidden="true" />
                    <span className="text-[10px] font-semibold leading-none">
                      {t`Help`}
                    </span>
                  </button>
                }
              />

              <button
                type="button"
                aria-label={t`Copy share link`}
                className={MOBILE_DOCK_BUTTON_CLASS_NAME}
                data-testid="mobile-bottom-dock-share"
                onClick={() => void handleCopyShareLink()}
                tabIndex={hiddenTabIndex}
              >
                {isShareCopied ? (
                  <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                ) : (
                  <Link2 className="h-4 w-4" aria-hidden="true" />
                )}
                <span className="text-[10px] font-semibold leading-none">
                  {t`Share`}
                </span>
              </button>

              <button
                type="button"
                aria-label={t`Search`}
                className={MOBILE_DOCK_BUTTON_CLASS_NAME}
                data-testid="mobile-bottom-dock-search"
                onClick={() => setIsSearchOpen(true)}
                tabIndex={hiddenTabIndex}
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                <span className="text-[10px] font-semibold leading-none">
                  {t`Search`}
                </span>
              </button>

              <button
                type="button"
                aria-label={t`Menu`}
                className={MOBILE_DOCK_BUTTON_CLASS_NAME}
                data-testid="mobile-bottom-dock-menu"
                onClick={() => setOpenMobile(true)}
                tabIndex={hiddenTabIndex}
              >
                <MenuIcon className="h-4 w-4" aria-hidden="true" />
                <span className="text-[10px] font-semibold leading-none">
                  {t`Menu`}
                </span>
              </button>
            </nav>
          </section>
        </div>
      </div>
    </>
  );
}
