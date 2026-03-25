import { type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Button } from '@/components/ui/button'
import {
  CampaignChallengeReviewState,
  type ReviewSummaryItem,
  type SubmittedVariant,
} from './campaign-challenge-review-state'

/**
 * Visual state for the submitted form.
 *
 * - 'pending_review': The submission needs async server validation before
 *   it can be considered final. Shows an amber "In asteptare" state.
 *   Backend reference: current records use `phase='pending'` while waiting
 *   for review. Legacy synced records may still appear as `phase='resolved'`
 *   without a `review` field, and the UI treats those as pending review
 *   until the server writes an explicit review decision.
 *
 * - 'completed': The submission is fully accepted. Shows a green "Trimis" state.
 *   Used for elements that don't need async validation (e.g., self-reported data
 *   like participation observations).
 */
type CampaignChallengeFormShellProps = {
  readonly title: string
  readonly eyebrow?: string
  readonly description?: string
  readonly isSubmitted: boolean
  /**
   * Controls the visual treatment of the submitted state.
   * - 'pending_review' (default): amber/waiting state for data that needs async validation
   * - 'completed': green/done state for data that is immediately accepted
   */
  readonly submittedVariant?: SubmittedVariant
  readonly feedbackText?: string | null
  readonly submittedSummaryItems?: readonly ReviewSummaryItem[]
  readonly submittedSummaryTitle?: string
  readonly onSubmit: () => void
  readonly onTryAgain?: () => void
  readonly onReset?: () => void
  readonly isSubmitDisabled: boolean
  readonly submitLabel?: string
  readonly children: ReactNode
}

export function CampaignChallengeFormShell({
  title,
  eyebrow,
  description,
  isSubmitted,
  submittedVariant = 'pending_review',
  feedbackText,
  submittedSummaryItems,
  submittedSummaryTitle,
  onSubmit,
  onTryAgain,
  onReset,
  isSubmitDisabled,
  submitLabel,
  children,
}: CampaignChallengeFormShellProps) {
  if (isSubmitted) {
    return (
      <CampaignChallengeReviewState
        title={title}
        eyebrow={eyebrow}
        description={description}
        submittedVariant={submittedVariant}
        feedbackText={feedbackText}
        summaryItems={submittedSummaryItems}
        summaryTitle={submittedSummaryTitle}
        onTryAgain={onTryAgain}
        onReset={onReset}
      />
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
