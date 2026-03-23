import { type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { AlertCircle, CheckCircle2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Visual state for the submitted form.
 *
 * - 'pending_review': The submission needs async server validation before
 *   it can be considered final. Shows an amber "In asteptare" state.
 *   Backend reference: records with this state have phase='resolved' in the
 *   learning progress store but need a server-side review process (cron job
 *   or admin action) to validate the data. Until validated, the record key
 *   can be read by the backend to trigger review workflows.
 *
 * - 'completed': The submission is fully accepted. Shows a green "Trimis" state.
 *   Used for elements that don't need async validation (e.g., self-reported data
 *   like participation observations).
 */
export type SubmittedVariant = 'pending_review' | 'completed' | 'rejected'

type CampaignChallengeFormShellProps = {
  readonly title: string
  readonly description?: string
  readonly isSubmitted: boolean
  /**
   * Controls the visual treatment of the submitted state.
   * - 'pending_review' (default): amber/waiting state for data that needs async validation
   * - 'completed': green/done state for data that is immediately accepted
   */
  readonly submittedVariant?: SubmittedVariant
  readonly feedbackText?: string | null
  readonly onSubmit: () => void
  readonly onTryAgain?: () => void
  readonly onReset?: () => void
  readonly isSubmitDisabled: boolean
  readonly submitLabel?: string
  readonly children: ReactNode
}

export function CampaignChallengeFormShell({
  title,
  description,
  isSubmitted,
  submittedVariant = 'pending_review',
  feedbackText,
  onSubmit,
  onTryAgain,
  onReset,
  isSubmitDisabled,
  submitLabel,
  children,
}: CampaignChallengeFormShellProps) {
  if (isSubmitted) {
    const isPending = submittedVariant === 'pending_review'
    const isRejected = submittedVariant === 'rejected'

    return (
      <div className={`relative rounded-[28px] border shadow-sm p-6 md:p-8 ${
        isPending
          ? 'border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-background to-amber-50/20 dark:border-amber-800/40 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10'
          : isRejected
            ? 'border-red-200/60 bg-gradient-to-br from-red-50/50 via-background to-red-50/20 dark:border-red-800/40 dark:from-red-950/20 dark:via-background dark:to-red-950/10'
          : 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 via-background to-emerald-50/30 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10'
      }`}>
        {isPending ? (
          <Clock className="absolute top-4 right-4 h-16 w-16 text-amber-500/[0.08]" />
        ) : isRejected ? (
          <AlertCircle className="absolute top-4 right-4 h-16 w-16 text-red-500/[0.08]" />
        ) : (
          <CheckCircle2 className="absolute top-4 right-4 h-16 w-16 text-emerald-500/[0.08]" />
        )}

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {title}
          </h3>
          <span className={`rounded-full text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 ${
            isPending
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              : isRejected
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          }`}>
            {isPending ? t`Pending review` : isRejected ? t`Needs changes` : t`Submitted`}
          </span>
        </div>

        {description && (
          <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
            {description}
          </p>
        )}

        {isPending && (
          <p className="mt-2 text-xs text-amber-600/80 dark:text-amber-400/80">
            {t`Your information has been recorded and is being reviewed.`}
          </p>
        )}

        {isRejected && (
          <p className="mt-2 text-xs text-red-600/80 dark:text-red-400/80">
            {feedbackText?.trim() || t`Review feedback is available. Please update your submission.`}
          </p>
        )}

        {isRejected && onTryAgain && (
          <div className="mt-5">
            <Button
              onClick={onTryAgain}
              className="w-full rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
            >
              {t`Try again`}
            </Button>
          </div>
        )}

        {!isRejected && onReset && (
          <div className="mt-5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="rounded-[22px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            >
              {t`Reset`}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm bg-gradient-to-br from-background via-background to-primary/[0.03] p-6 md:p-8">
      <h3 className="text-lg font-black tracking-tight text-foreground">
        {title}
      </h3>
      {description && (
        <p className="mt-2 text-sm text-muted-foreground font-medium leading-relaxed">
          {description}
        </p>
      )}

      <div className="mt-5 space-y-5">{children}</div>

      <div className="mt-6">
        <Button
          onClick={onSubmit}
          disabled={isSubmitDisabled}
          className="w-full rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
        >
          {submitLabel ?? t`Submit`}
        </Button>
      </div>
    </div>
  )
}
