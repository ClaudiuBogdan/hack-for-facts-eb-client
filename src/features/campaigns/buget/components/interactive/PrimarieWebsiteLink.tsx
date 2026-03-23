import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ExternalLink, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PRIMARIE_WEBSITE_LINK_INTERACTION } from '../../civic-interaction-definitions'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type { CampaignInteractiveElementProps, PrimarieWebsiteLinkValue } from './types'

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const EMPTY_VALUE: PrimarieWebsiteLinkValue = {
  websiteUrl: '',
  submittedAt: null,
}

/**
 * Submissions need async server validation. Backend should verify the URL is
 * a valid primarie website.
 * Record key: campaign:primarie-website-url::entity:{cui}
 */
export function PrimarieWebsiteLink({ ownerChallengeSlug }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<PrimarieWebsiteLinkValue>({
    ownerChallengeSlug,
    interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
    completionAction: 'pending_review',
  })

  const [draft, setDraft] = useState<PrimarieWebsiteLinkValue>(
    form.savedValue ?? EMPTY_VALUE,
  )

  const handleUrlChange = useCallback((value: string) => {
    setDraft((prev) => {
      const next = { ...prev, websiteUrl: value }
      void form.saveDraft(next)
      return next
    })
  }, [form])

  const handleSubmit = useCallback(() => {
    void form.submit({
      ...draft,
      submittedAt: new Date().toISOString(),
    })
  }, [draft, form])

  const handleReset = useCallback(() => {
    setDraft(EMPTY_VALUE)
    void form.reset()
  }, [form])

  const handleTryAgain = useCallback(() => {
    void form.reset()
  }, [form])

  if (!form.entityCui) {
    return null
  }

  if (form.isSubmitted && form.savedValue) {
    const isPending = form.submittedVariant === 'pending_review'
    const isRejected = form.submittedVariant === 'rejected'

    return (
      <div className={`relative overflow-hidden rounded-[28px] border p-6 shadow-sm md:p-8 ${
        isPending
          ? 'border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-background to-amber-50/20 dark:border-amber-800/40 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10'
          : isRejected
            ? 'border-red-200/60 bg-gradient-to-br from-red-50/50 via-background to-red-50/20 dark:border-red-800/40 dark:from-red-950/20 dark:via-background dark:to-red-950/10'
            : 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 via-background to-emerald-50/30 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10'
      }`}>
        {/* Decorative watermark */}
        <Globe className={`pointer-events-none absolute -top-2 right-4 h-20 w-20 rotate-6 ${
          isPending
            ? 'text-amber-500/[0.06]'
            : isRejected
              ? 'text-red-500/[0.06]'
              : 'text-emerald-500/[0.06]'
        }`} />

        <div className="relative space-y-4">
          {/* Micro-label + badge row */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <Trans>City hall link</Trans>
            </span>
            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
              isPending
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : isRejected
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            }`}>
              {isPending ? t`Pending review` : isRejected ? t`Needs changes` : t`Submitted`}
            </span>
          </div>

          {/* Title */}
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {t`Official city hall website`}
          </h3>

          {/* Submitted URL */}
          <a
            href={isSafeUrl(form.savedValue.websiteUrl) ? form.savedValue.websiteUrl : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 underline underline-offset-4 dark:text-amber-400"
          >
            {form.savedValue.websiteUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>

          {isRejected && form.reviewFeedbackText && (
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              {form.reviewFeedbackText}
            </p>
          )}

          {/* Reset button */}
          <div className="pt-2">
            {isRejected ? (
              <Button
                onClick={handleTryAgain}
                className="w-full rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 transition-transform hover:scale-[1.02] active:scale-95"
              >
                {t`Try again`}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="rounded-[22px] h-10 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40"
              >
                {t`Reset`}
              </Button>
            )}
          </div>
        </div>
      </div>
    )
  }

  const isSubmitDisabled = draft.websiteUrl.trim().length === 0

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/50 bg-gradient-to-br from-background via-background to-primary/[0.03] p-6 shadow-sm md:p-8">
      {/* Decorative watermark */}
      <Globe className="pointer-events-none absolute -top-2 right-4 h-20 w-20 rotate-6 text-foreground opacity-[0.06]" />

      <div className="relative space-y-5">
        {/* Micro-label */}
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Trans>City hall link</Trans>
        </span>

        {/* Title */}
        <h3 className="text-lg font-black tracking-tight text-foreground">
          {t`Official city hall website`}
        </h3>

        {/* URL input */}
        <div className="space-y-2">
          <Label htmlFor="primarie-website-url" className="text-sm font-medium">
            <Trans>Link to the official city hall website</Trans>
          </Label>
          <Input
            id="primarie-website-url"
            type="url"
            placeholder="https://www.primaria-..."
            value={draft.websiteUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
            className="rounded-xl h-12 text-base"
          />
        </div>

        {/* Submit button */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="rounded-[22px] h-12 w-full font-black shadow-lg shadow-primary/15 transition-transform hover:scale-[1.02] active:scale-95"
        >
          {t`Submit link`}
        </Button>
      </div>
    </div>
  )
}
