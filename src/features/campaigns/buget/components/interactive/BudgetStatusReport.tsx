import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BUDGET_STATUS_REPORT_INTERACTION } from '../../civic-interaction-definitions'
import { CampaignChallengeFormShell } from './CampaignChallengeFormShell'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type { BudgetStatusReportValue, CampaignInteractiveElementProps } from './types'

const EMPTY_VALUE: BudgetStatusReportValue = {
  isPublished: null,
  budgetStage: null,
  submittedAt: null,
}

const IS_PUBLISHED_OPTIONS: ReadonlyArray<{
  readonly value: NonNullable<BudgetStatusReportValue['isPublished']>
  readonly label: () => string
}> = [
  { value: 'yes', label: () => t`Yes` },
  { value: 'no', label: () => t`No` },
  { value: 'dont_know', label: () => t`I don't know` },
]

const BUDGET_STAGE_OPTIONS: ReadonlyArray<{
  readonly value: NonNullable<BudgetStatusReportValue['budgetStage']>
  readonly label: () => string
}> = [
  { value: 'draft', label: () => t`Draft (public consultation)` },
  { value: 'approved', label: () => t`Approved` },
]

/**
 * This element collects crowdsourced budget status data. Submissions go to
 * pending_review because the data needs async server validation before being
 * considered authoritative. Backend: a review process (cron or admin) should
 * verify the reported status against the actual entity data.
 * Record key: campaign:budget-2026-status::entity:{cui}
 */
export function BudgetStatusReport({ ownerChallengeSlug }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<BudgetStatusReportValue>({
    ownerChallengeSlug,
    interactionId: BUDGET_STATUS_REPORT_INTERACTION.interactionId,
    completionAction: 'pending_review',
  })

  const [draft, setDraft] = useState<BudgetStatusReportValue>(
    form.savedValue ?? EMPTY_VALUE,
  )

  const handleIsPublishedChange = useCallback(
    (value: BudgetStatusReportValue['isPublished']) => {
      setDraft((prev) => {
        const next = {
          ...prev,
          isPublished: value,
          budgetStage: value === 'yes' ? prev.budgetStage : null,
        }
        void form.saveDraft(next)
        return next
      })
    },
    [form],
  )

  const handleBudgetStageChange = useCallback(
    (value: BudgetStatusReportValue['budgetStage']) => {
      setDraft((prev) => {
        const next = { ...prev, budgetStage: value }
        void form.saveDraft(next)
        return next
      })
    },
    [form],
  )

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

  if (!form.entityCui) {
    return null
  }

  const isSubmitDisabled =
    draft.isPublished === null
    || (draft.isPublished === 'yes' && draft.budgetStage === null)

  return (
    <CampaignChallengeFormShell
      submittedVariant="pending_review"
      title={t`Budget status 2026`}
      description={t`Report the publication status of the local budget for 2026.`}
      isSubmitted={form.isSubmitted}
      onSubmit={handleSubmit}
      onReset={handleReset}
      isSubmitDisabled={isSubmitDisabled}
      submitLabel={t`Report status`}
    >
      <fieldset className="space-y-3">
        <Label className="text-sm font-bold text-foreground">
          <Trans>Has the 2026 budget been published?</Trans>
        </Label>
        <RadioGroup
          value={draft.isPublished ?? ''}
          onValueChange={(v) => handleIsPublishedChange(v as BudgetStatusReportValue['isPublished'])}
          className="flex flex-wrap gap-2"
        >
          {IS_PUBLISHED_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'rounded-full border-2 px-4 py-2 text-sm font-bold cursor-pointer transition-colors',
                draft.isPublished === opt.value
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
              )}
            >
              <RadioGroupItem value={opt.value} className="sr-only" />
              {opt.label()}
            </label>
          ))}
        </RadioGroup>
      </fieldset>

      {draft.isPublished === 'yes' && (
        <fieldset className="space-y-3">
          <Label className="text-sm font-bold text-foreground">
            <Trans>What stage is it in?</Trans>
          </Label>
          <RadioGroup
            value={draft.budgetStage ?? ''}
            onValueChange={(v) => handleBudgetStageChange(v as BudgetStatusReportValue['budgetStage'])}
            className="flex flex-wrap gap-2"
          >
            {BUDGET_STAGE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'rounded-full border-2 px-4 py-2 text-sm font-bold cursor-pointer transition-colors',
                  draft.budgetStage === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 text-muted-foreground hover:border-border hover:text-foreground',
                )}
              >
                <RadioGroupItem value={opt.value} className="sr-only" />
                {opt.label()}
              </label>
            ))}
          </RadioGroup>
        </fieldset>
      )}
    </CampaignChallengeFormShell>
  )
}
