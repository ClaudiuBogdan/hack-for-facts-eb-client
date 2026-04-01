import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { toast } from 'sonner'
import { Copy, Check, ExternalLink, Loader2, Mail, Send } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { useEntityLabel } from '@/hooks/filters/useFilterLabels'
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
import {
  buildMailtoUrl,
  buildPublicDebateEmailBody,
  buildPublicDebateEmailSubject,
  PLATFORM_CC_EMAILS,
} from './mailto-utils'
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
  preparedSubject: null,
  threadKey: null,
  submissionPath: null,
  submittedAt: null,
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type Step = 1 | 2 | 3

function applyDraftFieldChange<K extends keyof DebateRequestFormValue>(
  current: DebateRequestFormValue,
  field: K,
  value: DebateRequestFormValue[K],
): DebateRequestFormValue {
  const baseNext = {
    ...current,
    [field]: value,
  } as DebateRequestFormValue

  if (field === 'isNgo' && value === false) {
    return {
      ...baseNext,
      organizationName: null,
      ngoSenderEmail: null,
      threadKey: null,
      preparedSubject: null,
    }
  }

  return {
    ...baseNext,
    threadKey: null,
    preparedSubject: null,
  }
}

function CopyFieldButton({ text }: { readonly text: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  return (
    <button
      type="button"
      className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          toast.success(t`Copied to clipboard`)
        })
      }}
      aria-label={t`Copy`}
    >
      {copied
        ? <Check className="h-3.5 w-3.5 text-green-500" strokeWidth={2.5} />
        : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

function EmailPreviewPanel({
  to,
  cc,
  subject,
  body,
  onOpenEmailClient,
  onConfirmSent,
  isSubmitting,
}: {
  readonly to: string
  readonly cc: readonly string[]
  readonly subject: string
  readonly body: string
  readonly onOpenEmailClient: () => void
  readonly onConfirmSent: () => void
  readonly isSubmitting: boolean
}) {
  const fullEmailText = [
    `${t`To`}: ${to}`,
    cc.length > 0 ? `CC: ${cc.join(', ')}` : null,
    `${t`Subject`}: ${subject}`,
    '',
    body,
  ].filter((line) => line !== null).join('\n')

  return (
    <div className="space-y-4">
      <div className="rounded-[20px] border border-border/40 bg-muted/[0.06] p-5 space-y-4 text-left">
        <div className="space-y-1">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <Trans>Preview</Trans>
          </span>
          <h4 className="text-sm font-black tracking-tight text-foreground">
            {t`Prepared email`}
          </h4>
        </div>

        {/* Fields */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold text-muted-foreground w-14 shrink-0">{t`To`}</span>
            <span className="flex-1 min-w-0 break-all text-foreground">{to}</span>
          </div>
          {cc.length > 0 && (
            <div className="flex items-baseline gap-2 text-sm">
              <span className="font-semibold text-muted-foreground w-14 shrink-0">CC</span>
              <span className="flex-1 min-w-0 break-all text-foreground">{cc.join(', ')}</span>
            </div>
          )}
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold text-muted-foreground w-14 shrink-0">{t`Subject`}</span>
            <span className="flex-1 min-w-0 text-foreground">{subject}</span>
          </div>
        </div>

        {/* Body */}
        <div className="group/body rounded-xl border border-border/30 bg-background p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">{t`Message`}</span>
            <div className="opacity-0 group-hover/body:opacity-100 transition-opacity">
              <CopyFieldButton text={fullEmailText} />
            </div>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
            {body.split('\n\n').map((paragraph, idx) => (
              <p key={idx}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Action */}
        <Button
          variant="outline"
          onClick={onOpenEmailClient}
          className="rounded-[18px] h-10 w-full font-bold text-sm"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          {t`Open email client`}
        </Button>
      </div>

      <div className="rounded-xl bg-primary/[0.04] border border-primary/10 px-4 py-3 space-y-2">
        <p className="text-xs font-bold text-foreground">
          <Trans>Before confirming, make sure you:</Trans>
        </p>
        <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
          <li><Trans>Send the email from your association's email address</Trans></li>
          <li>
            <Trans>Keep <span className="font-semibold text-foreground">{cc.join(', ')}</span> in CC so we can track the request</Trans>
          </li>
        </ol>
      </div>

      <Button
        disabled={isSubmitting}
        onClick={onConfirmSent}
        className="rounded-[22px] h-11 w-full font-black"
      >
        {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
        {isSubmitting ? t`Submitting...` : t`I sent the email`}
      </Button>
    </div>
  )
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
 *   2. For 'send_yourself' submissions: submit the exact subject used for the
 *      email so the backend can correlate it with the captured CC email.
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
  const [showEmailPreview, setShowEmailPreview] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const draftRef = useRef(draft)

  const persistDraft = useCallback((next: DebateRequestFormValue) => {
    draftRef.current = next
    setDraft(next)
    void form.saveDraft(next)
  }, [form])

  // Pre-fill primariaEmail from PrimarieContactInfo when available
  useEffect(() => {
    if (prefilled) return
    const prefilledEmail = contactInfo.savedValue?.email
    if (prefilledEmail && !draftRef.current.primariaEmail) {
      setPrefilled(true)
      persistDraft({
        ...draftRef.current,
        primariaEmail: prefilledEmail,
      })
    }
  }, [contactInfo.savedValue?.email, persistDraft, prefilled])

  const handleFieldChange = useCallback(<K extends keyof DebateRequestFormValue>(
    field: K,
    value: DebateRequestFormValue[K],
  ) => {
    setShowEmailPreview(false)
    setSubmitError(null)
    persistDraft(applyDraftFieldChange(draftRef.current, field, value))
  }, [persistDraft])

  const hasValidEmail = isValidEmail(draft.primariaEmail)
  const hasOrganizationName = Boolean(draft.organizationName?.trim())
  const hasValidNgoSenderEmail = draft.ngoSenderEmail !== null && isValidEmail(draft.ngoSenderEmail)
  const canUseAssociationSendFlow =
    hasValidEmail
    && draft.isNgo
    && hasOrganizationName
    && hasValidNgoSenderEmail

  const entityIds = useMemo(() => [entityCui], [entityCui])
  const entityLabelStore = useEntityLabel(entityIds)
  const rawCityName = entityLabelStore.map(entityCui)
  const cityName = rawCityName.startsWith('id::') ? entityCui : rawCityName

  const currentYear = new Date().getFullYear()
  const orgName = draft.organizationName?.trim() || ''
  const emailSubject = buildPublicDebateEmailSubject({ cityName, year: currentYear })
  const emailBody = useMemo(
    () => buildPublicDebateEmailBody({ organizationName: orgName || 'NUMELE ASOCIATIEI', cityName, year: currentYear }),
    [orgName, cityName, currentYear],
  )
  const emailCc = PLATFORM_CC_EMAILS

  const handleShowPreview = useCallback(() => {
    if (!canUseAssociationSendFlow) return
    setShowEmailPreview(true)
  }, [canUseAssociationSendFlow])

  const handleOpenEmailClient = useCallback(() => {
    const mailtoUrl = buildMailtoUrl({
      to: draft.primariaEmail,
      cc: emailCc.join(','),
      subject: emailSubject,
      body: emailBody,
    })
    window.open(mailtoUrl, '_blank')
  }, [draft.primariaEmail, emailBody, emailCc, emailSubject])

  const handleConfirmSelfSend = useCallback(async () => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const submittedValue: DebateRequestFormValue = {
        ...draft,
        ngoSenderEmail: draft.isNgo ? draft.ngoSenderEmail?.trim() || null : null,
        preparedSubject: emailSubject,
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
  }, [draft, emailSubject, form])

  const handleRequestPlatform = useCallback(async () => {
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const submittedValue: DebateRequestFormValue = {
        ...draft,
        ngoSenderEmail: null,
        preparedSubject: null,
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
    setShowEmailPreview(false)
    setSubmitError(null)
    void form.reset()
  }, [form])

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
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (hasValidEmail) setStep(2)
            }}
            className="space-y-4"
          >
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
                <p className="text-xs text-destructive" role="alert">
                  <Trans>The email address is not valid.</Trans>
                </p>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="rounded-[22px] h-11 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
              >
                {t`Continue`}
              </Button>
            </div>
          </form>
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

            {/* Email preview (shown after clicking "Prepare email") */}
            {showEmailPreview && (
              <EmailPreviewPanel
                to={draft.primariaEmail}
                cc={emailCc}
                subject={emailSubject}
                body={emailBody}
                onOpenEmailClient={handleOpenEmailClient}
                onConfirmSent={() => { void handleConfirmSelfSend() }}
                isSubmitting={isSubmitting}
              />
            )}

            {/* Path selection cards (hidden when preview is visible) */}
            {!showEmailPreview && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card A - Send yourself */}
              <div className={cn(
                'flex flex-col rounded-[24px] border-2 border-border/40 p-6 text-center transition-opacity',
                !draft.isNgo && 'opacity-50 cursor-not-allowed'
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
                      <p className="text-xs text-destructive" role="alert">
                        <Trans>The association email address is not valid.</Trans>
                      </p>
                    )}
                  </div>
                )}
                <Button
                  variant="outline"
                  disabled={!canUseAssociationSendFlow}
                  onClick={handleShowPreview}
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-4"
                >
                  {t`Prepare email`}
                </Button>
              </div>

              {/* Card B - Request platform */}
              <div className="flex flex-col rounded-[24px] border-2 border-border/40 p-6 text-center">
                <Send className="h-10 w-10 text-muted-foreground mb-3 mx-auto" aria-hidden="true" />
                <p className="text-base font-black tracking-tight">{t`Ask us to send it`}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Trans>We will record the request and send it through the platform.</Trans>
                </p>
                <Button
                  disabled={isSubmitting}
                  onClick={() => { void handleRequestPlatform() }}
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-auto"
                >
                  {isSubmitting && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {isSubmitting ? t`Submitting...` : t`Request submission`}
                </Button>
              </div>
            </div>
            )}

            {submitError && (
              <p className="text-sm text-destructive font-medium" role="alert">
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
