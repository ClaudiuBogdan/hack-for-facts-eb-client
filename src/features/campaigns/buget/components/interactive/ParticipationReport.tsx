import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn, formatNumber } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { PARTICIPATION_REPORT_INTERACTION } from '../../civic-interaction-definitions'
import { CampaignChallengeFormShell } from './CampaignChallengeFormShell'
import { formatReviewDate, type ReviewSummaryItem } from './campaign-challenge-review-state'
import { logCampaignInteractiveError } from './log-campaign-interactive-error'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type { ParticipationReportValue, CampaignInteractiveElementProps } from './types'

const EMPTY_VALUE: ParticipationReportValue = {
  debateTookPlace: null,
  approximateAttendees: null,
  citizensAllowedToSpeak: null,
  citizenInputsRecorded: null,
  observations: null,
  submittedAt: null,
}

const DEBATE_OPTIONS: ReadonlyArray<{
  readonly value: NonNullable<ParticipationReportValue['debateTookPlace']>
  readonly label: () => string
}> = [
  { value: 'yes', label: () => t`Yes` },
  { value: 'no', label: () => t`No` },
  { value: 'dont_know', label: () => t`I don't know` },
]

const SPEAK_OPTIONS: ReadonlyArray<{
  readonly value: NonNullable<ParticipationReportValue['citizensAllowedToSpeak']>
  readonly label: () => string
}> = [
  { value: 'yes', label: () => t`Yes` },
  { value: 'no', label: () => t`No` },
  { value: 'partially', label: () => t`Partially` },
]

const RECORDED_OPTIONS: ReadonlyArray<{
  readonly value: NonNullable<ParticipationReportValue['citizenInputsRecorded']>
  readonly label: () => string
}> = [
  { value: 'yes', label: () => t`Yes` },
  { value: 'no', label: () => t`No` },
  { value: 'dont_know', label: () => t`I don't know` },
]

function getDebateAnswerLabel(value: NonNullable<ParticipationReportValue['debateTookPlace']>): string {
  switch (value) {
    case 'yes':
      return t`Yes`
    case 'no':
      return t`No`
    case 'dont_know':
      return t`I don't know`
  }
}

function getSpeakAnswerLabel(value: NonNullable<ParticipationReportValue['citizensAllowedToSpeak']>): string {
  switch (value) {
    case 'yes':
      return t`Yes`
    case 'no':
      return t`No`
    case 'partially':
      return t`Partially`
  }
}

function getRecordedAnswerLabel(value: NonNullable<ParticipationReportValue['citizenInputsRecorded']>): string {
  switch (value) {
    case 'yes':
      return t`Yes`
    case 'no':
      return t`No`
    case 'dont_know':
      return t`I don't know`
  }
}

export function ParticipationReport({ ownerChallengeSlug, entityCui }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<ParticipationReportValue>({
    ownerChallengeSlug,
    interactionId: PARTICIPATION_REPORT_INTERACTION.interactionId,
    lifecycleMode: PARTICIPATION_REPORT_INTERACTION.lifecycleMode,
    entityCui,
  })

  const [draft, setDraft] = useState<ParticipationReportValue>(
    form.savedValue ?? EMPTY_VALUE,
  )

  const updateField = useCallback(<K extends keyof ParticipationReportValue>(
    field: K,
    value: ParticipationReportValue[K],
  ) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'debateTookPlace' && value !== 'yes') {
        next.approximateAttendees = null
        next.citizensAllowedToSpeak = null
        next.citizenInputsRecorded = null
      }

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

  const isSubmitDisabled = draft.debateTookPlace === null

  const submittedSummaryItems: ReviewSummaryItem[] = form.savedValue
    ? [
        ...(form.savedValue.debateTookPlace
          ? [{
              label: t`Debate took place`,
              value: getDebateAnswerLabel(form.savedValue.debateTookPlace),
            }]
          : []),
        ...(form.savedValue.approximateAttendees !== null
          ? [{
              label: t`Approximate attendees`,
              value: formatNumber(form.savedValue.approximateAttendees),
            }]
          : []),
        ...(form.savedValue.citizensAllowedToSpeak
          ? [{
              label: t`Citizens allowed to speak`,
              value: getSpeakAnswerLabel(form.savedValue.citizensAllowedToSpeak),
            }]
          : []),
        ...(form.savedValue.citizenInputsRecorded
          ? [{
              label: t`Contributions recorded`,
              value: getRecordedAnswerLabel(form.savedValue.citizenInputsRecorded),
            }]
          : []),
        ...(form.savedValue.observations?.trim()
          ? [{
              label: t`Observations`,
              value: form.savedValue.observations,
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
      eyebrow={t`Participation`}
      title={t`Participation report`}
      description={t`Document your participation in the local budget debate.`}
      isSubmitted={form.isSubmitted}
      submittedVariant={form.submittedVariant}
      feedbackText={form.reviewFeedbackText}
      submittedSummaryItems={submittedSummaryItems}
      onTryAgain={handleTryAgain}
      onSubmit={handleSubmit}
      onReset={handleReset}
      isSubmitDisabled={isSubmitDisabled}
      submitLabel={t`Submit report`}
    >
      <fieldset className="space-y-3">
        <legend className="text-sm font-bold text-foreground">
          <Trans>Did the debate take place?</Trans>
        </legend>
        <RadioGroup
          value={draft.debateTookPlace ?? ''}
          onValueChange={(v) => updateField('debateTookPlace', v as ParticipationReportValue['debateTookPlace'])}
          className="flex flex-wrap gap-2"
        >
          {DEBATE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={cn(
                'rounded-full border-2 px-4 py-2 text-sm font-bold cursor-pointer transition-colors',
                draft.debateTookPlace === opt.value
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

      {draft.debateTookPlace === 'yes' && (
        <>
          <div className="space-y-2">
            <Label htmlFor="attendees" className="text-sm font-bold text-foreground">
              <Trans>Approximate number of attendees</Trans>
            </Label>
            <Input
              id="attendees"
              type="number"
              name="approximateAttendees"
              autoComplete="off"
              inputMode="numeric"
              min={0}
              placeholder="0"
              value={draft.approximateAttendees ?? ''}
              onChange={(e) => {
                const val = e.target.value ? parseInt(e.target.value, 10) : null
                updateField('approximateAttendees', val !== null && !isNaN(val) ? val : null)
              }}
              className="rounded-xl h-12 text-base"
            />
          </div>

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-foreground">
              <Trans>Were citizens allowed to speak?</Trans>
            </legend>
            <RadioGroup
              value={draft.citizensAllowedToSpeak ?? ''}
              onValueChange={(v) => updateField('citizensAllowedToSpeak', v as ParticipationReportValue['citizensAllowedToSpeak'])}
              className="flex flex-wrap gap-2"
            >
              {SPEAK_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'rounded-full border-2 px-4 py-2 text-sm font-bold cursor-pointer transition-colors',
                    draft.citizensAllowedToSpeak === opt.value
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

          <fieldset className="space-y-3">
            <legend className="text-sm font-bold text-foreground">
              <Trans>Were citizen contributions recorded?</Trans>
            </legend>
            <RadioGroup
              value={draft.citizenInputsRecorded ?? ''}
              onValueChange={(v) => updateField('citizenInputsRecorded', v as ParticipationReportValue['citizenInputsRecorded'])}
              className="flex flex-wrap gap-2"
            >
              {RECORDED_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'rounded-full border-2 px-4 py-2 text-sm font-bold cursor-pointer transition-colors',
                    draft.citizenInputsRecorded === opt.value
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
        </>
      )}

      <div className="space-y-2">
        <Label htmlFor="observations" className="text-sm font-bold text-foreground">
          <Trans>Observations (optional)</Trans>
        </Label>
        <Textarea
          id="observations"
          name="participationObservations"
          autoComplete="off"
          placeholder={t`Note your observations about the debate…`}
          maxLength={2000}
          rows={4}
          value={draft.observations ?? ''}
          onChange={(e) => updateField('observations', e.target.value || null)}
          className="rounded-xl text-base"
        />
      </div>
    </CampaignChallengeFormShell>
  )
}
