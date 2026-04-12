import { useCallback, useEffect, useState, type ReactElement } from "react";
import { Bell } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { usePersistedState } from "@/lib/hooks/usePersistedState";
import { useNotificationModal } from "../hooks/useNotificationModal";
import { Button } from "@/components/ui/button";

export function EntityNotificationAnnouncement(): ReactElement | null {
  const [hasSeenAnnouncement, setHasSeenAnnouncement] = usePersistedState<boolean>(
    'entity-notification-announcement-seen',
    false
  );
  const [isBannerVisible, setBannerVisible] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const { openModal, isOpen } = useNotificationModal();

  useEffect(() => {
    if (!hasSeenAnnouncement && isOpen) {
      setHasSeenAnnouncement(true);
      setBannerVisible(false);
      return;
    }

    if (hasSeenAnnouncement) return;

    const timer = setTimeout(() => {
      const hasCookieConsent = typeof window !== 'undefined' && !!window.localStorage.getItem('cookie-consent');

      if (hasCookieConsent) {
        setBannerVisible(true);
        setTimeout(() => setIsEntering(true), 50);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [hasSeenAnnouncement, isOpen, setHasSeenAnnouncement]);

  const handleDismiss = useCallback(() => {
    setIsEntering(false);
    setIsExiting(true);
    setHasSeenAnnouncement(true);
    setTimeout(() => setBannerVisible(false), 500);
  }, [setHasSeenAnnouncement]);

  const handleEnableNotifications = useCallback(() => {
    handleDismiss();
    openModal();
  }, [handleDismiss, openModal]);

  if (!isBannerVisible) return null;

  return (
    <div
      className={`fixed bottom-0 left-1/2 -translate-x-1/2 p-3 md:p-6 max-w-4xl w-full transition-transform duration-500 ease-in-out z-50 ${isExiting ? "translate-y-full" : isEntering ? "translate-y-0" : "translate-y-full"}`}
      role="dialog"
      aria-live="polite"
      aria-label="New feature announcement"
    >
      <div className="rounded-2xl border border-border/40 bg-card/80 shadow-2xl backdrop-blur-xl supports-[backdrop-filter]:bg-card/80">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-primary/10 p-2">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold md:text-xl text-foreground">
              <Trans>Monitor this institution</Trans>
            </h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            <Trans>
              Get monthly email updates about this institution. Receive alerts when new reports are published, budget changes occur, or important financial data is updated.
            </Trans>
          </p>

          <div className="mt-5 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full sm:w-auto"
            >
              <Trans>Maybe Later</Trans>
            </Button>
            <Button
              onClick={handleEnableNotifications}
              className="w-full sm:w-auto"
            >
              <Trans>Subscribe to Updates</Trans>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
