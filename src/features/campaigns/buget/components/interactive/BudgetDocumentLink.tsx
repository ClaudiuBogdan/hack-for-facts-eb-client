import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { BUDGET_DOCUMENT_LINK_INTERACTION } from '../../civic-interaction-definitions'
import {
  CampaignChallengeReviewState,
  CampaignChallengeSummaryLink,
  formatReviewDate,
  type ReviewSummaryItem,
} from './campaign-challenge-review-state'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type { BudgetDocumentLinkValue, CampaignInteractiveElementProps } from './types'

const EMPTY_VALUE: BudgetDocumentLinkValue = {
  documentUrl: '',
  documentType: null,
  submittedAt: null,
}

function getDocumentTypeLabel(type: NonNullable<BudgetDocumentLinkValue['documentType']>): string {
  switch (type) {
    case 'pdf': return 'PDF'
    case 'word': return 'Word'
    case 'excel': return 'Excel'
    case 'webpage': return t`Webpage`
    case 'graphics': return t`Graphics`
    case 'other': return t`Other`
  }
}

function getReviewSummaryItems(savedValue: BudgetDocumentLinkValue): ReviewSummaryItem[] {
  const submittedAt = formatReviewDate(savedValue.submittedAt)

  return [
    {
      label: t`Document link`,
      value: <CampaignChallengeSummaryLink url={savedValue.documentUrl} />,
    },
    ...(savedValue.documentType
      ? [{
          label: t`Document type`,
          value: getDocumentTypeLabel(savedValue.documentType),
        }]
      : []),
    ...(submittedAt
      ? [{
          label: t`Submitted on`,
          value: submittedAt,
        }]
      : []),
  ]
}

const DOCUMENT_TYPE_OPTIONS: ReadonlyArray<{
  readonly value: NonNullable<BudgetDocumentLinkValue['documentType']>
  readonly label: () => string
}> = [
  { value: 'pdf', label: () => 'PDF' },
  { value: 'word', label: () => 'Word' },
  { value: 'excel', label: () => 'Excel' },
  { value: 'webpage', label: () => t`Webpage` },
  { value: 'graphics', label: () => t`Graphics` },
  { value: 'other', label: () => t`Other` },
]

/**
 * Submissions need async server validation. Backend should verify the URL
 * points to a real budget document.
 * Record key: campaign:budget-document-url::entity:{cui}
 */
export function BudgetDocumentLink({ ownerChallengeSlug, entityCui }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<BudgetDocumentLinkValue>({
    ownerChallengeSlug,
    interactionId: BUDGET_DOCUMENT_LINK_INTERACTION.interactionId,
    lifecycleMode: BUDGET_DOCUMENT_LINK_INTERACTION.lifecycleMode,
    entityCui,
  })

  const [draft, setDraft] = useState<BudgetDocumentLinkValue>(
    form.savedValue ?? EMPTY_VALUE,
  )

  const updateField = useCallback(<K extends keyof BudgetDocumentLinkValue>(
    field: K,
    value: BudgetDocumentLinkValue[K],
  ) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      void form.saveDraft(next)
      return next
    })
  }, [form])

  const isSubmitDisabled = draft.documentUrl.trim().length === 0

  const handleSubmit = useCallback(() => {
    if (draft.documentUrl.trim().length === 0) {
      return
    }

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
        eyebrow={t`Budget document`}
        title={t`Budget document link`}
        description={t`Add the link to the city hall's budget document.`}
        submittedVariant={form.submittedVariant}
        feedbackText={form.reviewFeedbackText}
        summaryItems={getReviewSummaryItems(form.savedValue)}
        onTryAgain={handleTryAgain}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <FileText className="absolute top-4 right-4 h-20 w-20 rotate-6 opacity-[0.06] pointer-events-none" aria-hidden="true" />

      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        <Trans>Budget document</Trans>
      </span>
      <h3 className="text-lg font-black tracking-tight text-foreground mt-1 mb-1">
        <Trans>Budget document link</Trans>
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        <Trans>Add the link to the city hall's budget document.</Trans>
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
        className="space-y-6"
      >
        <div className="space-y-2">
          <Label htmlFor="budget-doc-url" className="text-sm font-medium">
            <Trans>Link to the budget document</Trans>
          </Label>
          <Input
            id="budget-doc-url"
            type="url"
            name="budgetDocumentUrl"
            autoComplete="url"
            spellCheck={false}
            placeholder="https://…"
            value={draft.documentUrl}
            onChange={(e) => updateField('documentUrl', e.target.value)}
            className="rounded-xl h-12 text-base"
          />
        </div>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium">
            <Trans>Document type</Trans>
          </legend>
          <RadioGroup
            value={draft.documentType ?? ''}
            onValueChange={(v) => updateField('documentType', v as BudgetDocumentLinkValue['documentType'])}
            className="flex flex-wrap gap-2"
          >
            {DOCUMENT_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'rounded-full border-2 px-4 py-2 text-sm font-bold cursor-pointer transition-colors',
                  draft.documentType === opt.value
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

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform w-full"
        >
          {t`Submit link`}
        </Button>
      </form>
    </div>
  )
}
