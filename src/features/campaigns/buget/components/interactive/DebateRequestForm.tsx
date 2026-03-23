import { useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Mail, Send, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useCustomInteraction } from '@/features/learning/hooks/interactions/use-custom-interaction'
import {
  DEBATE_REQUEST_INTERACTION,
  PRIMARIE_CONTACT_INFO_INTERACTION,
} from '../../civic-interaction-definitions'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import { buildDebateRequestMailto } from './mailto-utils'
import type {
  DebateRequestFormValue,
  CampaignInteractiveElementProps,
  PrimarieContactInfoValue,
} from './types'

const CURRENT_YEAR = 2026

const EMPTY_VALUE: DebateRequestFormValue = {
  primariaEmail: '',
  isNgo: false,
  organizationName: null,
  submissionPath: null,
  submittedAt: null,
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type Step = 1 | 2 | 3

/**
 * Debate request form with a 3-step flow: contact info, identity, send path.
 *
 * Validation flow:
 * - Submissions go to pending_review (amber state) because the platform
 *   needs to track whether the email was actually sent and received.
 * - Backend reference: the record key is campaign:debate-request::entity:{cui}.
 *   A cron job or admin process should:
 *   1. For 'request_platform' submissions: trigger the actual email dispatch
 *      via the InstitutionEmailThreads table (request_type: 'public_debate').
 *   2. For 'send_yourself' submissions: optionally verify via CC email receipt.
 *   3. Transition the challenge status to 'completed' once verified.
 */
export function DebateRequestForm({ ownerChallengeSlug }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<DebateRequestFormValue>({
    ownerChallengeSlug,
    interactionId: DEBATE_REQUEST_INTERACTION.interactionId,
    completionAction: 'pending_review',
  })

  const { progress } = useCampaignProgress()
  const entityCui = progress.selectedEntityCui ?? undefined

  const contactInfo = useCustomInteraction<PrimarieContactInfoValue>({
    lessonId: PRIMARIE_CONTACT_INFO_INTERACTION.ownerChallengeSlug,
    interactionId: PRIMARIE_CONTACT_INFO_INTERACTION.interactionId,
    scopePolicy: 'entity',
    entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
  })

  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<DebateRequestFormValue>(
    form.savedValue ?? EMPTY_VALUE,
  )
  const [prefilled, setPrefilled] = useState(false)
  const [isAwaitingSelfSendConfirmation, setIsAwaitingSelfSendConfirmation] = useState(false)

  // Pre-fill primariaEmail from PrimarieContactInfo when available
  useEffect(() => {
    if (prefilled) return
    const prefilledEmail = contactInfo.savedValue?.email
    if (prefilledEmail && !draft.primariaEmail) {
      setPrefilled(true)
      setDraft((prev) => {
        const next = { ...prev, primariaEmail: prefilledEmail }
        void form.saveDraft(next)
        return next
      })
    }
  }, [contactInfo.savedValue?.email, draft.primariaEmail, form, prefilled])

  const updateField = useCallback(<K extends keyof DebateRequestFormValue>(
    field: K,
    value: DebateRequestFormValue[K],
  ) => {
    setIsAwaitingSelfSendConfirmation(false)
    setDraft((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'isNgo' && value === false) {
        next.organizationName = null
      }

      void form.saveDraft(next)
      return next
    })
  }, [form])

  const handleOpenEmail = useCallback(() => {
    const mailtoUrl = buildDebateRequestMailto({
      primariaEmail: draft.primariaEmail,
      organizationName: draft.organizationName?.trim() || null,
      year: CURRENT_YEAR,
    })

    window.open(mailtoUrl, '_blank')
    setIsAwaitingSelfSendConfirmation(true)
  }, [draft.organizationName, draft.primariaEmail])

  const handleConfirmSelfSend = useCallback(() => {
    const submittedValue: DebateRequestFormValue = {
      ...draft,
      submissionPath: 'send_yourself',
      submittedAt: new Date().toISOString(),
    }
    void form.submit(submittedValue)
  }, [draft, form])

  const handleRequestPlatform = useCallback(() => {
    const submittedValue: DebateRequestFormValue = {
      ...draft,
      submissionPath: 'request_platform',
      submittedAt: new Date().toISOString(),
    }
    void form.submit(submittedValue)
  }, [draft, form])

  if (!form.entityCui) {
    return null
  }

  const hasValidEmail = isValidEmail(draft.primariaEmail)
  const hasOrganizationName = Boolean(draft.organizationName?.trim())
  const canUseNgoSendFlow = hasValidEmail && draft.isNgo && hasOrganizationName

  if (form.isSubmitted) {
    const submittedPath = form.savedValue?.submissionPath
    return (
      <div className="relative rounded-[28px] border border-amber-200/60 shadow-sm p-6 md:p-8 bg-gradient-to-br from-amber-50/40 via-background to-amber-50/20 dark:border-amber-800/40 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10">
        <Clock className="absolute top-4 right-4 h-16 w-16 text-amber-500/[0.08] pointer-events-none" />

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black tracking-tight text-foreground">{t`Public debate request`}</h3>
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1">
            {submittedPath === 'send_yourself' ? t`Sent by you` : t`Requested`}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
          {submittedPath === 'send_yourself'
            ? t`You sent the public debate request via email.`
            : t`We received your request. We will send the request on your behalf.`}
        </p>

        <p className="mt-2 text-xs text-amber-600/80 dark:text-amber-400/80">
          {t`Your information has been recorded and is being reviewed.`}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <Send className="absolute top-4 right-4 h-20 w-20 rotate-6 opacity-[0.06] pointer-events-none" />
      <div className="space-y-1.5 mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Trans>Debate request</Trans>
        </p>
        <h3 className="text-lg font-black tracking-tight text-foreground">{t`Public debate request`}</h3>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
          <Trans>Fill in the city hall's contact details and send the request to organize a public debate on the local budget.</Trans>
        </p>
      </div>
      <div className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted/40'
            )} />
          ))}
        </div>

        {/* Step 1 - Contact info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="primaria-email" className="text-sm font-bold text-foreground">
                <Trans>City hall email</Trans>
              </Label>
              <Input
                id="primaria-email"
                type="email"
                className="rounded-xl h-12 text-base"
                placeholder="primaria@example.ro"
                value={draft.primariaEmail}
                onChange={(e) => updateField('primariaEmail', e.target.value)}
              />
              {draft.primariaEmail && !isValidEmail(draft.primariaEmail) && (
                <p className="text-xs text-destructive">
                  <Trans>The email address is not valid.</Trans>
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                disabled={!hasValidEmail}
                onClick={() => setStep(2)}
                className="rounded-[22px] h-11 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
              >
                {t`Continue`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 - Identity */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Switch
                id="is-ngo"
                checked={draft.isNgo}
                onCheckedChange={(checked) => updateField('isNgo', checked)}
              />
              <Label htmlFor="is-ngo" className="text-sm font-bold text-foreground">
                <Trans>Are you part of an NGO?</Trans>
              </Label>
            </div>

            {draft.isNgo && (
              <div className="space-y-3 pl-1">
                <p className="text-xs text-muted-foreground">
                  <Trans>Under Law 52/2003, requests from NGOs carry greater legal weight.</Trans>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-sm font-bold text-foreground">
                    <Trans>Organization name</Trans>
                  </Label>
                  <Input
                    id="org-name"
                    className="rounded-xl h-12 text-base"
                    placeholder={t`NGO name`}
                    value={draft.organizationName ?? ''}
                    onChange={(e) => updateField('organizationName', e.target.value || null)}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-[22px] h-11 font-bold text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/40"
              >
                {t`Back`}
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="rounded-[22px] h-11 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
              >
                {t`Continue`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 - Choose path */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              <Trans>Choose how you want the public debate request to be sent.</Trans>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card A - Send yourself */}
              <div className={cn(
                'rounded-[24px] border-2 border-border/40 p-6 text-center transition-all',
                draft.isNgo
                  ? 'hover:border-border/80 hover:shadow-sm'
                  : 'opacity-50 cursor-not-allowed'
              )}>
                <Mail className="h-10 w-10 text-muted-foreground mb-3 mx-auto" />
                <p className="text-base font-black tracking-tight">{t`Send it yourself`}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Trans>Opens your email client with the completed request. Recommended for NGOs.</Trans>
                </p>
                {!draft.isNgo && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    <Trans>Available for NGOs.</Trans>
                  </p>
                )}
                {draft.isNgo && !hasOrganizationName && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    <Trans>Add your organization name to use this option.</Trans>
                  </p>
                )}
                <Button
                  variant="outline"
                  disabled={!canUseNgoSendFlow}
                  onClick={handleOpenEmail}
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-4"
                >
                  {isAwaitingSelfSendConfirmation ? t`Open email again` : t`Open email`}
                </Button>
                {isAwaitingSelfSendConfirmation && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <Trans>After the message opens and you send it from your email client, confirm below.</Trans>
                    </p>
                    <Button
                      onClick={handleConfirmSelfSend}
                      className="rounded-[22px] h-11 w-full font-black"
                    >
                      {t`I sent the email`}
                    </Button>
                  </div>
                )}
              </div>

              {/* Card B - Request platform */}
              <div className="rounded-[24px] border-2 border-border/40 p-6 text-center transition-all hover:border-border/80 hover:shadow-sm">
                <Send className="h-10 w-10 text-muted-foreground mb-3 mx-auto" />
                <p className="text-base font-black tracking-tight">{t`Ask us to send it`}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Trans>We will send the debate request on your behalf.</Trans>
                </p>
                <Button
                  disabled={!hasValidEmail}
                  onClick={handleRequestPlatform}
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-4"
                >
                  {t`Request submission`}
                </Button>
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="rounded-[22px] h-11 font-bold text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/40"
              >
                {t`Back`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
