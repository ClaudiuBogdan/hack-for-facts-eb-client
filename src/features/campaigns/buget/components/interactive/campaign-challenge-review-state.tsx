import { type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { AlertCircle, CheckCircle2, Clock3, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn, getUserLocale } from '@/lib/utils'

export type SubmittedVariant = 'pending_review' | 'completed' | 'rejected'

export type ReviewSummaryItem = {
  readonly label: string
  readonly value: ReactNode
}

type CampaignChallengeReviewStateProps = {
  readonly title: string
  readonly eyebrow?: string
  readonly description?: string
  readonly submittedVariant: SubmittedVariant
  readonly feedbackText?: string | null
  readonly summaryItems?: readonly ReviewSummaryItem[]
  readonly summaryTitle?: string
  readonly onTryAgain?: () => void
  readonly onReset?: () => void
}

type ReviewTone = {
  readonly containerClassName: string
  readonly badgeClassName: string
  readonly accentClassName: string
  readonly summaryClassName: string
  readonly feedbackClassName: string
}

export function isSafeExternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function formatReviewDate(dateString: string | null | undefined): string | null {
  if (!dateString) {
    return null
  }

  const numericValue = Number(dateString)
  const parsedDate = Number.isFinite(numericValue)
    ? new Date(numericValue)
    : /^\d{4}-\d{2}-\d{2}$/.test(dateString)
      ? new Date(`${dateString}T00:00:00`)
      : new Date(dateString)

  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  const locale = getUserLocale()
  return new Intl.DateTimeFormat(locale === 'ro' ? 'ro-RO' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate)
}

export function CampaignChallengeSummaryLink({
  url,
  children,
}: {
  readonly url: string
  readonly children?: ReactNode
}) {
  const label = children ?? url

  if (!isSafeExternalUrl(url)) {
    return (
      <span className="block break-all text-foreground">
        {label}
      </span>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-w-0 items-center gap-1.5 font-semibold text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
    >
      <span className="min-w-0 break-all">{label}</span>
      <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
    </a>
  )
}

function getReviewTone(submittedVariant: SubmittedVariant): ReviewTone {
  switch (submittedVariant) {
    case 'pending_review':
      return {
        containerClassName: 'border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-background to-amber-50/20 dark:border-amber-800/30 dark:from-amber-950/15 dark:via-background dark:to-amber-950/8',
        badgeClassName: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        accentClassName: 'text-amber-500 dark:text-amber-400',
        summaryClassName: 'border-amber-200/50 bg-amber-50/30 dark:border-amber-900/30 dark:bg-amber-950/10',
        feedbackClassName: 'border-red-200/60 bg-red-50/50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200',
      }
    case 'rejected':
      return {
        containerClassName: 'border-red-200/60 bg-gradient-to-br from-red-50/40 via-background to-red-50/20 dark:border-red-800/30 dark:from-red-950/15 dark:via-background dark:to-red-950/8',
        badgeClassName: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
        accentClassName: 'text-red-500 dark:text-red-400',
        summaryClassName: 'border-red-200/50 bg-red-50/20 dark:border-red-900/30 dark:bg-red-950/10',
        feedbackClassName: 'border-red-200/60 bg-red-50/50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200',
      }
    case 'completed':
      return {
        containerClassName: 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/40 via-background to-emerald-50/20 dark:border-emerald-800/30 dark:from-emerald-950/15 dark:via-background dark:to-emerald-950/8',
        badgeClassName: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
        accentClassName: 'text-emerald-500 dark:text-emerald-400',
        summaryClassName: 'border-emerald-200/50 bg-emerald-50/20 dark:border-emerald-900/30 dark:bg-emerald-950/10',
        feedbackClassName: 'border-red-200/60 bg-red-50/50 text-red-900 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-200',
      }
  }
}

function getReviewStatusText(submittedVariant: SubmittedVariant): string {
  switch (submittedVariant) {
    case 'pending_review':
      return t`Your submission is saved. The system will validate it before it counts toward this challenge.`
    case 'rejected':
      return t`Update the submission and send it again.`
    case 'completed':
      return t`Your submission has been reviewed and accepted.`
  }
}

function getReviewBadgeLabel(submittedVariant: SubmittedVariant): string {
  switch (submittedVariant) {
    case 'pending_review':
      return t`Pending review`
    case 'rejected':
      return t`Needs changes`
    case 'completed':
      return t`Submitted`
  }
}

function ReviewBadgeIcon({ submittedVariant, className }: { readonly submittedVariant: SubmittedVariant, readonly className?: string }) {
  switch (submittedVariant) {
    case 'pending_review':
      return <Clock3 className={className} aria-hidden="true" />
    case 'rejected':
      return <AlertCircle className={className} aria-hidden="true" />
    case 'completed':
      return <CheckCircle2 className={className} aria-hidden="true" />
  }
}

export function CampaignChallengeReviewState({
  title,
  eyebrow,
  description,
  submittedVariant,
  feedbackText,
  summaryItems,
  summaryTitle,
  onTryAgain,
  onReset,
}: CampaignChallengeReviewStateProps) {
  const tone = getReviewTone(submittedVariant)
  const hasSummaryItems = Boolean(summaryItems?.length)
  const showTryAgain = submittedVariant === 'rejected' && Boolean(onTryAgain)
  const showReset = submittedVariant !== 'rejected' && Boolean(onReset)
  const trimmedFeedback = submittedVariant === 'rejected' ? feedbackText?.trim() : null

  return (
    <div className={cn('relative overflow-hidden rounded-[28px] border p-6 shadow-sm md:p-8', tone.containerClassName)}>
      <div className="space-y-5">
        {/* Header */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            {eyebrow ? (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : <span />}
            <span className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em]',
              tone.badgeClassName,
            )}>
              <ReviewBadgeIcon submittedVariant={submittedVariant} className="size-3" />
              {getReviewBadgeLabel(submittedVariant)}
            </span>
          </div>
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {title}
          </h3>
          <p className="text-sm font-medium leading-relaxed text-muted-foreground">
            {description ?? getReviewStatusText(submittedVariant)}
          </p>
        </div>

        {/* Status note (only if description is also present, to avoid duplication) */}
        {description && (
          <p role="status" aria-live="polite" className="text-[13px] leading-relaxed text-muted-foreground/80">
            {getReviewStatusText(submittedVariant)}
          </p>
        )}

        {/* Rejection feedback */}
        {trimmedFeedback && (
          <div className={cn('rounded-2xl border px-4 py-3.5', tone.feedbackClassName)}>
            <p className="text-sm font-medium leading-relaxed">{trimmedFeedback}</p>
          </div>
        )}

        {/* Submitted data summary */}
        {hasSummaryItems && (
          <section className={cn('rounded-2xl border p-4 md:p-5', tone.summaryClassName)}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {summaryTitle ?? t`What you submitted`}
            </p>
            <dl className="mt-3.5 space-y-3">
              {summaryItems?.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="grid gap-1 border-t border-border/30 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-4"
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="min-w-0 wrap-break-word text-sm font-medium leading-relaxed text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Actions */}
        {(showTryAgain || showReset) && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {showTryAgain && (
              <Button
                onClick={onTryAgain}
                className="h-12 w-full rounded-[22px] font-black shadow-lg shadow-primary/15 transition-transform hover:scale-[1.02] active:scale-95 sm:w-auto sm:min-w-40"
              >
                {t`Try again`}
              </Button>
            )}

            {showReset && (
              <Button
                variant="ghost"
                onClick={onReset}
                className="h-10 rounded-[22px] px-4 font-semibold text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
              >
                {t`Reset`}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
