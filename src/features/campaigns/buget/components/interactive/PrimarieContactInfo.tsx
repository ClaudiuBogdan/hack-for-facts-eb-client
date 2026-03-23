import { useCallback, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Building2, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PRIMARIE_CONTACT_INFO_INTERACTION } from '../../civic-interaction-definitions'
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
export function PrimarieContactInfo({ ownerChallengeSlug }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<PrimarieContactInfoValue>({
    ownerChallengeSlug,
    interactionId: PRIMARIE_CONTACT_INFO_INTERACTION.interactionId,
    completionAction: 'pending_review',
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

  if (form.isSubmitted && form.savedValue) {
    return (
      <div className="rounded-[28px] border border-amber-200/60 dark:border-amber-800/40 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-amber-50/40 via-background to-amber-50/20 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10">
        <Building2 className="absolute top-4 right-4 h-20 w-20 rotate-6 text-amber-500/[0.06] pointer-events-none" />

        <div className="flex items-center justify-between gap-3 mb-5">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {t`City hall contact info`}
          </h3>
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1">
            {t`Pending review`}
          </span>
        </div>

        <div className="space-y-2.5 mb-6">
          <div className="flex items-center gap-2.5">
            <Mail className="h-4 w-4 text-amber-600/70 dark:text-amber-400/70" />
            <span className="text-sm font-semibold text-foreground">
              {form.savedValue.email}
            </span>
          </div>
          {form.savedValue.phone && (
            <div className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-amber-600/70 dark:text-amber-400/70" />
              <span className="text-sm font-semibold text-foreground">
                {form.savedValue.phone}
              </span>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          onClick={handleReset}
          className="rounded-[22px] h-10 font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40"
        >
          {t`Reset`}
        </Button>
      </div>
    )
  }

  const isSubmitDisabled = !draft.email

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <Building2 className="absolute top-4 right-4 h-20 w-20 rotate-6 opacity-[0.06] pointer-events-none" />

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="space-y-2">
          <Label htmlFor="primarie-email" className="text-sm font-bold text-foreground">
            <Trans>City hall email</Trans>
          </Label>
          <Input
            id="primarie-email"
            type="email"
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
            placeholder="+40..."
            value={draft.phone ?? ''}
            onChange={(e) => updateField('phone', e.target.value || null)}
            className="rounded-xl h-12 text-base"
          />
        </div>
      </div>

      <Button
        onClick={handleSubmit}
        disabled={isSubmitDisabled}
        className="rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform w-full"
      >
        {t`Save contact details`}
      </Button>
    </div>
  )
}
