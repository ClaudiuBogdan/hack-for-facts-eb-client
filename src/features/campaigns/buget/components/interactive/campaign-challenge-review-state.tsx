import { type ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { AlertCircle, CheckCircle2, Clock3, ExternalLink } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  readonly iconClassName: string
  readonly summaryClassName: string
  readonly alertClassName: string
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
        containerClassName: 'border-amber-200/60 bg-gradient-to-br from-amber-50/50 via-background to-amber-50/25 dark:border-amber-800/40 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10',
        badgeClassName: 'border-transparent bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
        iconClassName: 'text-amber-500/[0.08]',
        summaryClassName: 'border-amber-200/70 bg-white/70 dark:border-amber-900/40 dark:bg-background/70',
        alertClassName: 'border-amber-200/80 bg-amber-50/80 text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
      }
    case 'rejected':
      return {
        containerClassName: 'border-red-200/60 bg-gradient-to-br from-red-50/60 via-background to-red-50/20 dark:border-red-800/40 dark:from-red-950/20 dark:via-background dark:to-red-950/10',
        badgeClassName: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
        iconClassName: 'text-red-500/[0.08]',
        summaryClassName: 'border-red-200/70 bg-white/70 dark:border-red-900/40 dark:bg-background/70',
        alertClassName: 'border-red-200/80 bg-red-50/85 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100',
      }
    case 'completed':
      return {
        containerClassName: 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/60 via-background to-emerald-50/25 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10',
        badgeClassName: 'border-transparent bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200',
        iconClassName: 'text-emerald-500/[0.08]',
        summaryClassName: 'border-emerald-200/70 bg-white/70 dark:border-emerald-900/40 dark:bg-background/70',
        alertClassName: 'border-emerald-200/80 bg-emerald-50/85 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100',
      }
  }
}

function getReviewMessage(submittedVariant: SubmittedVariant, feedbackText?: string | null) {
  switch (submittedVariant) {
    case 'pending_review':
      return {
        title: t`Pending review`,
        description: t`Your submission is saved. The system will validate it before it counts toward this challenge.`,
      }
    case 'rejected':
      return {
        title: t`System feedback`,
        description: feedbackText?.trim() || t`Review feedback is available. Update the submission and send it again.`,
      }
    case 'completed':
      return {
        title: t`Review accepted`,
        description: t`Your submission has been reviewed and accepted.`,
      }
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

function ReviewStateIcon({ submittedVariant, className }: { readonly submittedVariant: SubmittedVariant, readonly className?: string }) {
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
  const reviewMessage = getReviewMessage(submittedVariant, feedbackText)
  const hasSummaryItems = Boolean(summaryItems?.length)
  const showTryAgain = submittedVariant === 'rejected' && Boolean(onTryAgain)
  const showReset = submittedVariant !== 'rejected' && Boolean(onReset)

  return (
    <div className={cn('relative overflow-hidden rounded-[28px] border p-6 shadow-sm md:p-8', tone.containerClassName)}>
      <ReviewStateIcon
        submittedVariant={submittedVariant}
        className={cn('pointer-events-none absolute right-4 top-4 size-16 md:size-20', tone.iconClassName)}
      />

      <div className="relative space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            {eyebrow && (
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                {eyebrow}
              </p>
            )}
            <h3 className="text-lg font-black tracking-tight text-foreground">
              {title}
            </h3>
            {description && (
              <p className="max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>

          <Badge className={cn('rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]', tone.badgeClassName)}>
            {getReviewBadgeLabel(submittedVariant)}
          </Badge>
        </div>

        <Alert
          role="status"
          aria-live="polite"
          className={cn('border shadow-none [&>svg~*]:pl-8 [&>svg]:left-4 [&>svg]:top-4', tone.alertClassName)}
        >
          <ReviewStateIcon submittedVariant={submittedVariant} className="size-4" />
          <div className="space-y-1">
            <AlertTitle className="text-sm font-semibold">
              {reviewMessage.title}
            </AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              {reviewMessage.description}
            </AlertDescription>
          </div>
        </Alert>

        {hasSummaryItems && (
          <section className={cn('rounded-[22px] border p-4 md:p-5', tone.summaryClassName)}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">
              {summaryTitle ?? t`What you submitted`}
            </p>
            <dl className="mt-4 space-y-3">
              {summaryItems?.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="grid gap-1 border-t border-border/40 pt-3 first:border-t-0 first:pt-0 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-4"
                >
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {item.label}
                  </dt>
                  <dd className="min-w-0 break-words text-sm font-medium leading-relaxed text-foreground">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

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
