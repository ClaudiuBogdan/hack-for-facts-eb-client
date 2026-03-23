import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ExternalLink, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { BUDGET_DOCUMENT_LINK_INTERACTION } from '../../civic-interaction-definitions'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type { BudgetDocumentLinkValue, CampaignInteractiveElementProps } from './types'

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const EMPTY_VALUE: BudgetDocumentLinkValue = {
  documentUrl: '',
  documentType: null,
  submittedAt: null,
}

function getDocumentTypeLabel(type: NonNullable<BudgetDocumentLinkValue['documentType']>): string {
  switch (type) {
    case 'pdf': return 'PDF'
    case 'webpage': return t`Webpage`
    case 'other': return t`Other`
  }
}

const DOCUMENT_TYPE_OPTIONS: ReadonlyArray<{
  readonly value: NonNullable<BudgetDocumentLinkValue['documentType']>
  readonly label: () => string
}> = [
  { value: 'pdf', label: () => 'PDF' },
  { value: 'webpage', label: () => t`Webpage` },
  { value: 'other', label: () => t`Other` },
]

/**
 * Submissions need async server validation. Backend should verify the URL
 * points to a real budget document.
 * Record key: campaign:budget-document-url::entity:{cui}
 */
export function BudgetDocumentLink({ ownerChallengeSlug }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<BudgetDocumentLinkValue>({
    ownerChallengeSlug,
    interactionId: BUDGET_DOCUMENT_LINK_INTERACTION.interactionId,
    completionAction: 'pending_review',
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
    const saved = form.savedValue
    return (
      <div className={`rounded-[28px] border shadow-sm p-6 md:p-8 relative overflow-hidden ${
        isPending
          ? 'border-amber-200/60 dark:border-amber-800/40 bg-gradient-to-br from-amber-50/40 via-background to-amber-50/20 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10'
          : isRejected
            ? 'border-red-200/60 dark:border-red-800/40 bg-gradient-to-br from-red-50/50 via-background to-red-50/20 dark:from-red-950/20 dark:via-background dark:to-red-950/10'
            : 'border-emerald-200/60 dark:border-emerald-800/40 bg-gradient-to-br from-emerald-50/50 via-background to-emerald-50/30 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10'
      }`}>
        <FileText className={`absolute top-4 right-4 h-20 w-20 rotate-6 pointer-events-none ${
          isPending
            ? 'text-amber-500/[0.06]'
            : isRejected
              ? 'text-red-500/[0.06]'
              : 'text-emerald-500/[0.06]'
        }`} />

        <div className="flex items-center justify-between gap-3 mb-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <Trans>Budget document</Trans>
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

        <h3 className="text-lg font-black tracking-tight text-foreground mb-4">
          <Trans>Budget document link</Trans>
        </h3>

        <div className="space-y-3">
          <a
            href={isSafeUrl(saved.documentUrl) ? saved.documentUrl : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-400 underline underline-offset-4 hover:opacity-80 transition-opacity"
          >
            {saved.documentUrl}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {saved.documentType && (
            <div>
              <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 inline-block">
                {getDocumentTypeLabel(saved.documentType)}
              </span>
            </div>
          )}
        </div>

        {isRejected && form.reviewFeedbackText && (
          <p className="mt-4 text-sm font-medium text-red-700 dark:text-red-400">
            {form.reviewFeedbackText}
          </p>
        )}

        <div className="mt-6">
          {isRejected ? (
            <Button
              onClick={handleTryAgain}
              className="w-full rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
            >
              {t`Try again`}
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={handleReset}
              className="rounded-[22px] h-10 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40"
            >
              {t`Reset`}
            </Button>
          )}
        </div>
      </div>
    )
  }

  const isSubmitDisabled = !draft.documentUrl.trim()

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <FileText className="absolute top-4 right-4 h-20 w-20 rotate-6 opacity-[0.06] pointer-events-none" />

      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
        <Trans>Budget document</Trans>
      </span>
      <h3 className="text-lg font-black tracking-tight text-foreground mt-1 mb-1">
        <Trans>Budget document link</Trans>
      </h3>
      <p className="text-sm text-muted-foreground mb-6">
        <Trans>Add the link to the city hall's budget document.</Trans>
      </p>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="budget-doc-url" className="text-sm font-medium">
            <Trans>Link to the budget document</Trans>
          </Label>
          <Input
            id="budget-doc-url"
            type="url"
            placeholder="https://..."
            value={draft.documentUrl}
            onChange={(e) => updateField('documentUrl', e.target.value)}
            className="rounded-xl h-12 text-base"
          />
        </div>

        <fieldset className="space-y-3">
          <Label className="text-sm font-medium">
            <Trans>Document type</Trans>
          </Label>
          <RadioGroup
            value={draft.documentType ?? ''}
            onValueChange={(v) => updateField('documentType', v as BudgetDocumentLinkValue['documentType'])}
            className="flex items-center gap-2"
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
      </div>

      <div className="mt-6">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform w-full"
        >
          {t`Submit link`}
        </Button>
      </div>
    </div>
  )
}
