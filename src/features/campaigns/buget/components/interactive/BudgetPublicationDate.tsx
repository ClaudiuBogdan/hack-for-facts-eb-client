import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BUDGET_PUBLICATION_DATE_INTERACTION } from '../../civic-interaction-definitions'
import { CampaignChallengeFormShell } from './CampaignChallengeFormShell'
import {
  CampaignChallengeSummaryLink,
  formatReviewDate,
  type ReviewSummaryItem,
} from './campaign-challenge-review-state'
import { logCampaignInteractiveError } from './log-campaign-interactive-error'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type {
  BudgetPublicationDateSourceType,
  BudgetPublicationDateValue,
  CampaignInteractiveElementProps,
} from './types'

const SOURCE_OPTIONS: ReadonlyArray<{
  readonly value: BudgetPublicationDateSourceType
  readonly label: () => string
}> = [
  { value: 'website', label: () => t`City hall website` },
  { value: 'press', label: () => t`Local press` },
  { value: 'social_media', label: () => t`Social media` },
  { value: 'other', label: () => t`Other source` },
]

const EMPTY_VALUE: BudgetPublicationDateValue = {
  publicationDate: null,
  sources: [],
  submittedAt: null,
}

/** Returns the translated label for a given source type. */
function getSourceLabel(type: BudgetPublicationDateSourceType): string {
  switch (type) {
    case 'website':
      return t`City hall website`
    case 'press':
      return t`Local press`
    case 'social_media':
      return t`Social media`
    case 'other':
      return t`Other source`
  }
}

export function BudgetPublicationDate({ ownerChallengeSlug, entityCui }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<BudgetPublicationDateValue>({
    ownerChallengeSlug,
    interactionId: BUDGET_PUBLICATION_DATE_INTERACTION.interactionId,
    lifecycleMode: BUDGET_PUBLICATION_DATE_INTERACTION.lifecycleMode,
    entityCui,
  })

  const [draft, setDraft] = useState<BudgetPublicationDateValue>(
    form.savedValue ?? EMPTY_VALUE,
  )

  const updatePublicationDate = useCallback((value: string | null) => {
    setDraft((prev) => {
      const next = { ...prev, publicationDate: value }
      void form.saveDraft(next)
      return next
    })
  }, [form])

  /** Toggle a source type in/out of the sources array. */
  const toggleSource = useCallback((sourceType: BudgetPublicationDateSourceType) => {
    setDraft((prev) => {
      const exists = prev.sources.some((s) => s.type === sourceType)
      const nextSources = exists
        ? prev.sources.filter((s) => s.type !== sourceType)
        : [...prev.sources, { type: sourceType, url: null }]
      const next = { ...prev, sources: nextSources }
      void form.saveDraft(next)
      return next
    })
  }, [form])

  /** Update the URL for a specific source type entry. */
  const updateSourceUrl = useCallback((sourceType: BudgetPublicationDateSourceType, url: string | null) => {
    setDraft((prev) => {
      const nextSources = prev.sources.map((s) =>
        s.type === sourceType ? { ...s, url } : s,
      )
      const next = { ...prev, sources: nextSources }
      void form.saveDraft(next)
      return next
    })
  }, [form])

  const handleSubmit = useCallback(() => {
    form.submit({
      ...draft,
      submittedAt: new Date().toISOString(),
    }).catch((error) => {
      logCampaignInteractiveError('submit', error)
    })
  }, [draft, form])

  const handleReset = useCallback(() => {
    setDraft(EMPTY_VALUE)
    void form.reset()
  }, [form])

  const handleTryAgain = useCallback(() => {
    void form.reset()
  }, [form])

  const isSubmitDisabled = draft.publicationDate === null

  const submittedSummaryItems: ReviewSummaryItem[] = form.savedValue
    ? [
        ...(form.savedValue.publicationDate
          ? [{
              label: t`Publication date`,
              value: formatReviewDate(form.savedValue.publicationDate) ?? form.savedValue.publicationDate,
            }]
          : []),
        ...(form.savedValue.sources.length > 0
          ? [{
              label: t`Sources`,
              value: (
                <div className="space-y-2">
                  {form.savedValue.sources.map((entry) => (
                    <div key={entry.type} className="space-y-1">
                      <div className="font-semibold text-foreground">
                        {getSourceLabel(entry.type)}
                      </div>
                      {entry.url ? (
                        <CampaignChallengeSummaryLink url={entry.url} />
                      ) : (
                        <span className="text-muted-foreground">
                          {t`No link added`}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ),
            }]
          : []),
        ...(formatReviewDate(form.savedValue.submittedAt)
          ? [{
              label: t`Submitted on`,
              value: formatReviewDate(form.savedValue.submittedAt) as string,
            }]
          : []),
      ]
    : []

  return (
    <CampaignChallengeFormShell
      eyebrow={t`Publication date`}
      title={t`Budget draft publication date`}
      description={t`Indicate when your city hall's budget draft was published.`}
      isSubmitted={form.isSubmitted}
      /*
       * pending_review: This data feeds into the budget calendar timeline.
       * Incorrect dates would affect deadline calculations for all users
       * viewing this entity. The backend validates the submitted date before
       * it becomes authoritative (via a review workflow / admin action).
       */
      submittedVariant={form.submittedVariant}
      feedbackText={form.reviewFeedbackText}
      submittedSummaryItems={submittedSummaryItems}
      onSubmit={handleSubmit}
      onTryAgain={handleTryAgain}
      onReset={handleReset}
      isSubmitDisabled={isSubmitDisabled}
      submitLabel={t`Submit information`}
    >
      <div className="space-y-2">
        <Label htmlFor="publication-date" className="text-sm font-bold text-foreground">
          <Trans>When was the budget draft published?</Trans>
        </Label>
        <Input
          id="publication-date"
          type="date"
          name="publicationDate"
          autoComplete="off"
          value={draft.publicationDate ?? ''}
          onChange={(e) => updatePublicationDate(e.target.value || null)}
          className="rounded-xl h-12 text-base"
        />
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-foreground">
          <Trans>Where did you find the information?</Trans>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((opt) => {
            const isSelected = draft.sources.some((s) => s.type === opt.value)
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleSource(opt.value)}
                className={cn(
                  'rounded-full border-2 px-4 py-2 text-sm font-bold cursor-pointer transition-colors',
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                {opt.label()}
              </button>
            )
          })}
        </div>
      </fieldset>

      {draft.sources.length > 0 && (
        <div className="space-y-4">
          {draft.sources.map((entry) => (
            <div key={entry.type} className="space-y-2">
              <Label htmlFor={`source-url-${entry.type}`} className="text-sm font-bold text-foreground">
                {t`Link`}: {getSourceLabel(entry.type)}
              </Label>
              <Input
                id={`source-url-${entry.type}`}
                type="url"
                name={`sourceUrl-${entry.type}`}
                autoComplete="url"
                spellCheck={false}
                placeholder="https://…"
                value={entry.url ?? ''}
                onChange={(e) => updateSourceUrl(entry.type, e.target.value || null)}
                className="rounded-xl h-12 text-base"
              />
            </div>
          ))}
        </div>
      )}
    </CampaignChallengeFormShell>
  )
}
