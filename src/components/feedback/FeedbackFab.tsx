import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { MessageSquarePlus } from "lucide-react"
import { useSendFeedback } from "@/hooks/useSendFeedback"
import { clsx } from "clsx"

export function FeedbackFab() {
  const sendFeedback = useSendFeedback()

  return (
    <button
      type="button"
      onClick={sendFeedback}
      aria-label={t`Send feedback`}
      className={clsx(
        "fixed z-40 right-6",
        "bottom-[9.5rem]",
        "hidden md:inline-flex items-center gap-2",
        "h-10 pl-3 pr-4",
        "bg-[var(--pnrr-green)]",
        "text-[var(--pnrr-fg)]",
        "text-sm font-bold",
        "transition-all duration-200",
        "hover:scale-105",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-fg)] focus-visible:ring-offset-2"
      )}
    >
      <MessageSquarePlus className="h-4 w-4" />
      <Trans>Feedback</Trans>
    </button>
  )
}
