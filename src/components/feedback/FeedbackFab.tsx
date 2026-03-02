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
        "h-10 pl-3 pr-4 rounded-full",
        "bg-zinc-900 dark:bg-zinc-100",
        "text-zinc-50 dark:text-zinc-900",
        "text-sm font-medium",
        "shadow-lg shadow-zinc-900/20 dark:shadow-zinc-950/30",
        "transition-all duration-200",
        "hover:scale-105 hover:shadow-xl",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
    >
      <MessageSquarePlus className="h-4 w-4" />
      <Trans>Feedback</Trans>
      {/* Speech bubble tail pointing down toward chat button */}
      <span
        aria-hidden="true"
        className={clsx(
          "absolute -bottom-2 right-4",
          "w-0 h-0",
          "border-l-12 border-l-transparent",
          "border-r-12 border-r-transparent",
          "border-t-12 border-t-zinc-900 dark:border-t-zinc-100"
        )}
      />
    </button>
  )
}
