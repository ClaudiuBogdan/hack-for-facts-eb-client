import { useCallback, useEffect, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Mail, Send } from 'lucide-react'
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
import {
  CampaignChallengeReviewState,
  formatReviewDate,
  type ReviewSummaryItem,
} from './campaign-challenge-review-state'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import { preparePublicDebateSelfSend } from '../../api/institution-correspondence'
import { buildMailtoUrl } from './mailto-utils'
import type {
  DebateRequestFormValue,
  CampaignInteractiveElementProps,
  PrimarieContactInfoValue,
} from './types'

const EMPTY_VALUE: DebateRequestFormValue = {
  primariaEmail: '',
  isNgo: false,
  organizationName: null,
  ngoSenderEmail: null,
  threadKey: null,
  submissionPath: null,
  submittedAt: null,
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type Step = 1 | 2 | 3
type PreparedSelfSendState = {
  readonly threadKey: string
  readonly subject: string
  readonly body: string
  readonly cc: readonly string[]
}

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
 *   2. For 'send_yourself' submissions: prepare a thread-keyed email and
 *      optionally verify via CC email receipt.
 *   3. Transition the challenge status to 'completed' once verified.
 */
export function DebateRequestForm({ ownerChallengeSlug, entityCui }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<DebateRequestFormValue>({
    ownerChallengeSlug,
    interactionId: DEBATE_REQUEST_INTERACTION.interactionId,
    lifecycleMode: DEBATE_REQUEST_INTERACTION.lifecycleMode,
    entityCui,
  })

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
    form.savedValue ? { ...EMPTY_VALUE, ...form.savedValue } : EMPTY_VALUE,
  )
  const [prefilled, setPrefilled] = useState(false)
  const [isAwaitingSelfSendConfirmation, setIsAwaitingSelfSendConfirmation] = useState(false)
  const [isPreparingSelfSend, setIsPreparingSelfSend] = useState(false)
  const [prepareSelfSendError, setPrepareSelfSendError] = useState<string | null>(null)
  const [preparedSelfSend, setPreparedSelfSend] = useState<PreparedSelfSendState | null>(
    form.savedValue?.threadKey
      ? {
        threadKey: form.savedValue.threadKey,
        subject: '',
        body: '',
        cc: [],
      }
      : null,
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Pre-fill primariaEmail from PrimarieContactInfo when available
  useEffect(() => {
    if (prefilled) return
    const prefilledEmail = contactInfo.savedValue?.email
    if (prefilledEmail && !draft.primariaEmail) {
      setPrefilled(true)
      const next = { ...draft, primariaEmail: prefilledEmail }
      setDraft(next)
      void form.saveDraft(next)
    }
  }, [contactInfo.savedValue?.email, draft, form, prefilled])

  const updateField = useCallback(<K extends keyof DebateRequestFormValue>(
    field: K,
    value: DebateRequestFormValue[K],
  ) => {
    setIsAwaitingSelfSendConfirmation(false)
    setPrepareSelfSendError(null)
    setPreparedSelfSend(null)
    setSubmitError(null)
    setDraft((prev) => {
      const next = { ...prev, [field]: value }

      if (field === 'isNgo' && value === false) {
        next.organizationName = null
        next.ngoSenderEmail = null
      }

      next.threadKey = null

      return next
    })
  }, [])

  // Sync draft changes to backend (debounced by React batching)
  const pendingDraftRef = useCallback(<K extends keyof DebateRequestFormValue>(
    field: K,
    value: DebateRequestFormValue[K],
  ) => {
    const next = { ...draft, [field]: value }
    if (field === 'isNgo' && value === false) {
      (next as Record<string, unknown>).organizationName = null;
      (next as Record<string, unknown>).ngoSenderEmail = null
    }
    (next as Record<string, unknown>).threadKey = null
    void form.saveDraft(next)
  }, [draft, form])

  const handleFieldChange = useCallback(<K extends keyof DebateRequestFormValue>(
    field: K,
    value: DebateRequestFormValue[K],
  ) => {
    updateField(field, value)
    pendingDraftRef(field, value)
  }, [updateField, pendingDraftRef])

  const handleOpenEmail = useCallback(async () => {
    setPrepareSelfSendError(null)
    setSubmitError(null)
    setIsPreparingSelfSend(true)

    const openedWindow = window.open('', '_blank')

    try {
      let prepared: PreparedSelfSendState

      if (
        preparedSelfSend !== null
        && preparedSelfSend.subject !== ''
        && preparedSelfSend.threadKey === draft.threadKey
      ) {
        prepared = preparedSelfSend
      } else {
        const response = await preparePublicDebateSelfSend({
          entityCui,
          institutionEmail: draft.primariaEmail,
          requesterOrganizationName: draft.organizationName?.trim() || null,
          consentCapturedAt: null,
        })

        if (response.subject === null || response.body === null) {
          throw new Error('Prepared email response was incomplete.')
        }

        prepared = {
          threadKey: response.threadKey,
          subject: response.subject,
          body: response.body,
          cc: response.cc,
        }

        setPreparedSelfSend(prepared)

        const nextDraft = { ...draft, threadKey: response.threadKey }
        setDraft(nextDraft)
        await form.saveDraft(nextDraft)
      }

      const mailtoUrl = buildMailtoUrl({
        to: draft.primariaEmail,
        cc: prepared.cc.join(','),
        subject: prepared.subject,
        body: prepared.body,
      })

      if (openedWindow === null) {
        window.location.href = mailtoUrl
      } else {
        openedWindow.location.href = mailtoUrl
      }
      setIsAwaitingSelfSendConfirmation(true)
    } catch (error) {
      if (openedWindow !== null) {
        openedWindow.close()
      }
      setPrepareSelfSendError(
        error instanceof Error
          ? error.message
          : t`We could not prepare the email. Please try again.`,
      )
    } finally {
      setIsPreparingSelfSend(false)
    }
  }, [
    draft,
    entityCui,
    form,
    preparedSelfSend,
  ])

  const handleConfirmSelfSend = useCallback(async () => {
    if (draft.threadKey === null) {
      setPrepareSelfSendError(t`Please open the prepared email before confirming.`)
      return
    }

    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const submittedValue: DebateRequestFormValue = {
        ...draft,
        ngoSenderEmail: draft.isNgo ? draft.ngoSenderEmail?.trim() || null : null,
        submissionPath: 'send_yourself',
        submittedAt: new Date().toISOString(),
      }
      await form.submit(submittedValue)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t`Submission failed. Please try again.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [draft, form])

  const handleRequestPlatform = useCallback(async () => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const submittedValue: DebateRequestFormValue = {
        ...draft,
        ngoSenderEmail: null,
        threadKey: null,
        submissionPath: 'request_platform',
        submittedAt: new Date().toISOString(),
      }
      await form.submit(submittedValue)
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : t`Submission failed. Please try again.`,
      )
    } finally {
      setIsSubmitting(false)
    }
  }, [draft, form])

  const handleTryAgain = useCallback(() => {
    setStep(1)
    setIsAwaitingSelfSendConfirmation(false)
    setPrepareSelfSendError(null)
    setPreparedSelfSend(null)
    setSubmitError(null)
    void form.reset()
  }, [form])

  const hasValidEmail = isValidEmail(draft.primariaEmail)
  const hasOrganizationName = Boolean(draft.organizationName?.trim())
  const hasValidNgoSenderEmail = draft.ngoSenderEmail !== null && isValidEmail(draft.ngoSenderEmail)
  const canUseAssociationSendFlow = hasValidEmail && draft.isNgo && hasOrganizationName && hasValidNgoSenderEmail

  if (form.isSubmitted) {
    const submittedPath = form.savedValue?.submissionPath
    const submittedDescription =
      submittedPath === 'send_yourself'
        ? t`You opened the prepared email and confirmed that you sent the public debate request.`
        : submittedPath === 'request_platform'
          ? t`You asked the platform to send the public debate request on your behalf.`
          : t`Your public debate request was recorded.`
    const submittedSummaryItems: ReviewSummaryItem[] = form.savedValue
      ? [
          {
            label: t`Delivery path`,
            value:
              submittedPath === 'send_yourself'
                ? t`Sent by you`
                : submittedPath === 'request_platform'
                  ? t`Requested platform delivery`
                  : t`Recorded`,
          },
          {
            label: t`City hall email`,
            value: form.savedValue.primariaEmail,
          },
          ...(form.savedValue.isNgo && form.savedValue.organizationName?.trim()
            ? [{
                label: t`Association`,
                value: form.savedValue.organizationName,
              }]
            : []),
          ...(form.savedValue.ngoSenderEmail?.trim()
            ? [{
                label: t`Association email`,
                value: form.savedValue.ngoSenderEmail,
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
      <CampaignChallengeReviewState
        eyebrow={t`Debate request`}
        title={t`Public debate request`}
        description={submittedDescription}
        submittedVariant={form.submittedVariant}
        feedbackText={form.reviewFeedbackText}
        summaryItems={submittedSummaryItems}
        onTryAgain={handleTryAgain}
      />
    )
  }

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <Send className="absolute top-4 right-4 h-20 w-20 rotate-6 opacity-[0.06] pointer-events-none" aria-hidden="true" />
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
                name="debateRequestEmail"
                autoComplete="email"
                spellCheck={false}
                className="rounded-xl h-12 text-base"
                placeholder="primaria@example.ro"
                value={draft.primariaEmail}
                onChange={(e) => handleFieldChange('primariaEmail', e.target.value)}
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
                onCheckedChange={(checked) => handleFieldChange('isNgo', checked)}
              />
              <Label htmlFor="is-ngo" className="text-sm font-bold text-foreground">
                <Trans>Do you represent a legally established association?</Trans>
              </Label>
            </div>

            {draft.isNgo && (
              <div className="space-y-3 pl-1">
                <p className="text-xs text-muted-foreground">
                  <Trans>Under Law 52/2003, requests from legally established associations can trigger the obligation to organize a public debate.</Trans>
                </p>
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-sm font-bold text-foreground">
                    <Trans>Association name</Trans>
                  </Label>
                  <Input
                    id="org-name"
                    name="organizationName"
                    autoComplete="organization"
                    className="rounded-xl h-12 text-base"
                    placeholder={t`Association name`}
                    value={draft.organizationName ?? ''}
                    onChange={(e) => handleFieldChange('organizationName', e.target.value || null)}
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
                <Mail className="h-10 w-10 text-muted-foreground mb-3 mx-auto" aria-hidden="true" />
                <p className="text-base font-black tracking-tight">{t`Send it yourself`}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Trans>Opens your email client with the completed request. Recommended when you represent a legally established association.</Trans>
                </p>
                {!draft.isNgo && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    <Trans>Available for legally established associations.</Trans>
                  </p>
                )}
                {draft.isNgo && !hasOrganizationName && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                    <Trans>Add the association name to use this option.</Trans>
                  </p>
                )}
                {draft.isNgo && (
                  <div className="space-y-2 mt-4 text-left">
                    <Label htmlFor="ngo-sender-email" className="text-sm font-bold text-foreground">
                      <Trans>Association email</Trans>
                    </Label>
                    <Input
                      id="ngo-sender-email"
                      type="email"
                      name="ngoSenderEmail"
                      autoComplete="email"
                      spellCheck={false}
                      className="rounded-xl h-12 text-base"
                      placeholder="asociatie@example.ro"
                      value={draft.ngoSenderEmail ?? ''}
                      onChange={(e) => handleFieldChange('ngoSenderEmail', e.target.value || null)}
                    />
                    {draft.ngoSenderEmail && !hasValidNgoSenderEmail && (
                      <p className="text-xs text-destructive">
                        <Trans>The association email address is not valid.</Trans>
                      </p>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  disabled={!canUseAssociationSendFlow || isPreparingSelfSend}
                  onClick={() => {
                    void handleOpenEmail()
                  }}
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-4"
                >
                  {isPreparingSelfSend
                    ? t`Preparing email...`
                    : isAwaitingSelfSendConfirmation
                      ? t`Open email again`
                      : t`Open email`}
                </Button>
                {prepareSelfSendError && (
                  <p className="text-xs text-destructive mt-3">
                    {prepareSelfSendError}
                  </p>
                )}
                {isAwaitingSelfSendConfirmation && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <Trans>After the message opens and you send it from your email client, confirm below.</Trans>
                    </p>
                    <Button
                      disabled={isSubmitting}
                      onClick={() => { void handleConfirmSelfSend() }}
                      className="rounded-[22px] h-11 w-full font-black"
                    >
                      {isSubmitting ? t`Submitting...` : t`I sent the email`}
                    </Button>
                  </div>
                )}
              </div>

              {/* Card B - Request platform */}
              <div className="rounded-[24px] border-2 border-border/40 p-6 text-center transition-all hover:border-border/80 hover:shadow-sm">
                <Send className="h-10 w-10 text-muted-foreground mb-3 mx-auto" aria-hidden="true" />
                <p className="text-base font-black tracking-tight">{t`Ask us to send it`}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Trans>We will record the request and send it through the platform.</Trans>
                </p>
                <Button
                  disabled={!hasValidEmail || isSubmitting}
                  onClick={() => { void handleRequestPlatform() }}
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-4"
                >
                  {isSubmitting ? t`Submitting...` : t`Request submission`}
                </Button>
              </div>
            </div>

            {submitError && (
              <p className="text-sm text-destructive font-medium">
                {submitError}
              </p>
            )}

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
