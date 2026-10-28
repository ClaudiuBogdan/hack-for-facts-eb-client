import { t } from "@lingui/core/macro";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useSentryConsent } from "@/hooks/useSentryConsent";
import { openSentryBugReport, withSentry } from "@/lib/sentry";

export function useSendBugReport() {
  const hasConsent = useSentryConsent();
  const navigate = useNavigate();

  const sendBugReport = () => {
    if (!hasConsent) {
      toast.warning(t`Cookie consent required`, {
        description: t`You need to accept cookies to send an error report.`,
        action: {
          label: t`Open cookies`,
          onClick: () => navigate({ to: "/cookies" }),
        },
        duration: 6000,
      });
      return;
    }

    try {
      if (typeof openSentryBugReport === "function") {
        openSentryBugReport();
      } else {
        const url = typeof window !== "undefined" ? window.location.href : "";
        withSentry((Sentry) => {
          Sentry.captureMessage("User initiated bug report", {
            level: "error",
            tags: { source: "quick-actions" },
            extra: { url },
          });
        });
        toast.success(t`Error signal sent`);
      }
    } catch (e) {
      console.error("Failed to open Sentry bug report", e);
      toast.error(t`Could not send error report.`);
    }
  };

  return sendBugReport;
}
