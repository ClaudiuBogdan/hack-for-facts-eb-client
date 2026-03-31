import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PRIMARIE_CONTACT_INFO_INTERACTION } from '../../civic-interaction-definitions'
import {
  CampaignChallengeReviewState,
  formatReviewDate,
} from './campaign-challenge-review-state'
import { logCampaignInteractiveError } from './log-campaign-interactive-error'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import type { CampaignInteractiveElementProps, PrimarieContactInfoValue } from './types'

const EMPTY_VALUE: PrimarieContactInfoValue = {
  email: null,
  phone: null,
  submittedAt: null,
}

/**
 * Contact info feeds into DebateRequestForm and ContestationBuilder for email
 * pre-fill. Submissions need async server validation to verify email accuracy.
 * Incorrect emails would cause debate requests to fail.
 * Record key: campaign:primarie-contact-info::entity:{cui}
 */
export function PrimarieContactInfo({ ownerChallengeSlug, entityCui }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<PrimarieContactInfoValue>({
    ownerChallengeSlug,
    interactionId: PRIMARIE_CONTACT_INFO_INTERACTION.interactionId,
    lifecycleMode: PRIMARIE_CONTACT_INFO_INTERACTION.lifecycleMode,
    entityCui,
  })

  const [draft, setDraft] = useState<PrimarieContactInfoValue>(
    form.savedValue ?? EMPTY_VALUE,
  )

  const updateField = useCallback(<K extends keyof PrimarieContactInfoValue>(
    field: K,
    value: PrimarieContactInfoValue[K],
  ) => {
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      void form.saveDraft(next)
      return next
    })
  }, [form])

  const isSubmitDisabled = !draft.email?.trim()

  const handleSubmit = useCallback(() => {
    if (!draft.email?.trim()) {
      return
    }

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

  if (form.isSubmitted && form.savedValue) {
    return (
      <CampaignChallengeReviewState
        eyebrow={t`City hall contact`}
        title={t`City hall contact info`}
        description={t`Add the city hall's contact details for future communications.`}
        submittedVariant={form.submittedVariant}
        feedbackText={form.reviewFeedbackText}
        summaryItems={[
          ...(form.savedValue.email
            ? [{
                label: t`Email`,
                value: form.savedValue.email,
              }]
            : []),
          ...(form.savedValue.phone
            ? [{
                label: t`Phone`,
                value: form.savedValue.phone,
              }]
            : []),
          ...(formatReviewDate(form.savedValue.submittedAt)
            ? [{
                label: t`Submitted on`,
                value: formatReviewDate(form.savedValue.submittedAt) as string,
              }]
            : []),
        ]}
        onTryAgain={handleTryAgain}
        onReset={handleReset}
      />
    )
  }

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <Building2 className="absolute top-4 right-4 h-20 w-20 rotate-6 opacity-[0.06] pointer-events-none" aria-hidden="true" />

      <div className="mb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Trans>City hall contact</Trans>
        </span>
        <h3 className="text-lg font-black tracking-tight text-foreground mt-1">
          {t`City hall contact info`}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t`Add the city hall's contact details for future communications.`}
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          handleSubmit()
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Label htmlFor="primarie-email" className="text-sm font-bold text-foreground">
              <Trans>City hall email</Trans>
            </Label>
            <Input
              id="primarie-email"
              type="email"
              name="primarieEmail"
              autoComplete="email"
              spellCheck={false}
              placeholder="primaria@example.ro"
              value={draft.email ?? ''}
              onChange={(e) => updateField('email', e.target.value || null)}
              className="rounded-xl h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="primarie-phone" className="text-sm font-bold text-foreground">
              <Trans>City hall phone (optional)</Trans>
            </Label>
            <Input
              id="primarie-phone"
              type="tel"
              name="primariePhone"
              autoComplete="tel"
              placeholder="+40…"
              value={draft.phone ?? ''}
              onChange={(e) => updateField('phone', e.target.value || null)}
              className="rounded-xl h-12 text-base"
            />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform w-full"
        >
          {t`Save contact details`}
        </Button>
      </form>
    </div>
  )
}
