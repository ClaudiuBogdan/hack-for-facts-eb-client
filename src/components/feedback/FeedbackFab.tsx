import { t } from "@lingui/core/macro"
import { Trans } from "@lingui/react/macro"
import { ChevronUp, MessageSquarePlus } from "lucide-react"
import { SupportMenu } from "@/components/footer/support-menu"
import { useSendFeedback } from "@/hooks/useSendFeedback"
import { cn } from "@/lib/utils"

const PART = "outline-none transition-colors motion-reduce:transition-none hover:bg-primary-foreground/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-foreground"

/**
 * The desktop corner button: „Feedback” opens the feedback form in one click; the
 * arrow opens the help menu (report a problem, contact). Phones use the bottom dock.
 * Chosen from prototype shell/feedback-corner, variant split-navy (owner, 24 November 2026).
 */
export function FeedbackFab() {
  const sendFeedback = useSendFeedback()

  return (
    <div className="fixed right-6 bottom-6 z-40 hidden h-10 items-stretch overflow-hidden rounded-full bg-primary text-primary-foreground shadow-md md:inline-flex print:hidden">
      <button type="button" onClick={sendFeedback} className={cn("inline-flex items-center gap-2 pr-3 pl-4 text-sm font-semibold", PART)}>
        <MessageSquarePlus className="size-4" aria-hidden />
        <Trans>Feedback</Trans>
      </button>
      <span aria-hidden className="my-2.5 w-px bg-primary-foreground/30" />
      <SupportMenu
        includeFeedback={false}
        contentSide="top"
        contentAlign="end"
        contentSideOffset={8}
        trigger={
          <button type="button" aria-label={t`Help`} className={cn("px-2.5 data-[state=open]:bg-primary-foreground/15", PART)}>
            <ChevronUp className="size-4" aria-hidden />
          </button>
        }
      />
    </div>
  )
}
