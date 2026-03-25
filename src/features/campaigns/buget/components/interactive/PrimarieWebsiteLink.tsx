import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PRIMARIE_WEBSITE_LINK_INTERACTION } from '../../civic-interaction-definitions'
import {
  CampaignChallengeReviewState,
  CampaignChallengeSummaryLink,
  formatReviewDate,
  type ReviewSummaryItem,
} from './campaign-challenge-review-state'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type { CampaignInteractiveElementProps, PrimarieWebsiteLinkValue } from './types'

const EMPTY_VALUE: PrimarieWebsiteLinkValue = {
  websiteUrl: '',
  submittedAt: null,
}

function getReviewSummaryItems(savedValue: PrimarieWebsiteLinkValue): ReviewSummaryItem[] {
  const submittedAt = formatReviewDate(savedValue.submittedAt)

  return [
    {
      label: t`Website link`,
      value: <CampaignChallengeSummaryLink url={savedValue.websiteUrl} />,
    },
    ...(submittedAt
      ? [{
          label: t`Submitted on`,
          value: submittedAt,
        }]
      : []),
  ]
}

/**
 * Submissions need async server validation. Backend should verify the URL is
 * a valid primarie website.
 * Record key: campaign:primarie-website-url::entity:{cui}
 */
export function PrimarieWebsiteLink({ ownerChallengeSlug, entityCui }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<PrimarieWebsiteLinkValue>({
    ownerChallengeSlug,
    interactionId: PRIMARIE_WEBSITE_LINK_INTERACTION.interactionId,
    lifecycleMode: PRIMARIE_WEBSITE_LINK_INTERACTION.lifecycleMode,
    entityCui,
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

  if (form.isSubmitted && form.savedValue) {
    return (
      <CampaignChallengeReviewState
        eyebrow={t`City hall link`}
        title={t`Official city hall website`}
        description={t`Share the official city hall website so others can verify the budget information.`}
        submittedVariant={form.submittedVariant}
        feedbackText={form.reviewFeedbackText}
        summaryItems={getReviewSummaryItems(form.savedValue)}
        onTryAgain={handleTryAgain}
        onReset={handleReset}
      />
    )
  }

  const isSubmitDisabled = draft.websiteUrl.trim().length === 0

  return (
    <div className="relative overflow-hidden rounded-[28px] border border-border/50 bg-gradient-to-br from-background via-background to-primary/[0.03] p-6 shadow-sm md:p-8">
      {/* Decorative watermark */}
      <Globe className="pointer-events-none absolute -top-2 right-4 h-20 w-20 rotate-6 text-foreground opacity-[0.06]" aria-hidden="true" />

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
            name="primarieWebsiteUrl"
            autoComplete="url"
            spellCheck={false}
            placeholder="https://www.primaria-…"
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
