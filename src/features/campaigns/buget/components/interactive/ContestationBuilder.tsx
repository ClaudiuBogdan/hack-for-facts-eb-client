import { useCallback, useEffect, useMemo, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Mail, Download, Clock, Eye, FilePenLine } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCustomInteraction } from '@/features/learning/hooks/interactions/use-custom-interaction'
import {
  CONTESTATION_BUILDER_INTERACTION,
  DEBATE_REQUEST_INTERACTION,
  PRIMARIE_CONTACT_INFO_INTERACTION,
} from '../../civic-interaction-definitions'
import { useCampaignProgress } from '../../hooks/use-campaign-progress'
import { useCampaignChallengeForm } from './use-campaign-challenge-form'
import { buildContestationMailto, buildContestationEmailBody } from './mailto-utils'
import type {
  ContestationBuilderValue,
  DebateRequestFormValue,
  PrimarieContactInfoValue,
  CampaignInteractiveElementProps,
} from './types'

const CURRENT_YEAR = 2026
const MAX_CHARS = 2000

const EMPTY_VALUE: ContestationBuilderValue = {
  contestedItem: '',
  reasoning: '',
  impact: '',
  proposedChange: '',
  senderName: null,
  submissionPath: null,
  primariaEmail: null,
  submittedAt: null,
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

type CharCounterProps = {
  readonly current: number
  readonly max: number
}

function CharCounter({ current, max }: CharCounterProps) {
  const isNearLimit = current > max * 0.9
  const isOverLimit = current > max
  return (
    <span
      className={`text-xs tabular-nums ${
        isOverLimit
          ? 'text-destructive'
          : isNearLimit
            ? 'text-amber-600 dark:text-amber-400'
            : 'text-muted-foreground'
      }`}
    >
      {current}/{max}
    </span>
  )
}

type Step = 1 | 2 | 3 | 4

/**
 * Guided contestation builder with a 4-step wizard flow, preview, and dual output.
 *
 * Steps:
 * 1. "Ce contestezi?" - identify the budget item
 * 2. "De ce?" - present arguments
 * 3. "Impact și propunere" - impact + proposed change
 * 4. "Previzualizare și trimitere" - email, preview, send/download
 *
 * Validation flow:
 * - Submissions go to pending_review (amber state) because the contestation
 *   content needs quality review before being counted as a valid civic action.
 * - Backend reference: the record key is campaign:budget-contestation::entity:{cui}.
 *   A review process should verify the contestation is substantive and well-structured.
 *   For 'send_email' submissions, the backend can track delivery via the
 *   InstitutionEmailThreads table (request_type: 'contestation').
 *   Transition to 'completed' once the review confirms quality.
 */
export function ContestationBuilder({ ownerChallengeSlug }: CampaignInteractiveElementProps) {
  const form = useCampaignChallengeForm<ContestationBuilderValue>({
    ownerChallengeSlug,
    interactionId: CONTESTATION_BUILDER_INTERACTION.interactionId,
    completionAction: 'pending_review',
  })

  const { progress } = useCampaignProgress()
  const entityCui = progress.selectedEntityCui ?? undefined

  // Read debate request record for email pre-fill
  const debateRequest = useCustomInteraction<DebateRequestFormValue>({
    lessonId: DEBATE_REQUEST_INTERACTION.ownerChallengeSlug,
    interactionId: DEBATE_REQUEST_INTERACTION.interactionId,
    scopePolicy: 'entity',
    entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
  })

  // Read PrimarieContactInfo interaction for email pre-fill
  const contactInfo = useCustomInteraction<PrimarieContactInfoValue>({
    lessonId: PRIMARIE_CONTACT_INFO_INTERACTION.ownerChallengeSlug,
    interactionId: PRIMARIE_CONTACT_INFO_INTERACTION.interactionId,
    scopePolicy: 'entity',
    entityCui,
    kind: 'custom',
    completionRule: { type: 'resolved' },
  })

  // Priority: debate-request email > contact-info email > manual input
  const prefillEmail = debateRequest.savedValue?.primariaEmail ?? contactInfo.savedValue?.email ?? null
  const prefillSenderName = debateRequest.savedValue?.organizationName ?? null

  const [step, setStep] = useState<Step>(1)
  const [draft, setDraft] = useState<ContestationBuilderValue>(() => {
    if (form.savedValue) return { ...EMPTY_VALUE, ...form.savedValue }
    return {
      ...EMPTY_VALUE,
      primariaEmail: prefillEmail,
      senderName: prefillSenderName,
    }
  })
  const [isAwaitingEmailConfirmation, setIsAwaitingEmailConfirmation] = useState(false)

  useEffect(() => {
    if (form.savedValue) return

    const nextPrimariaEmail = prefillEmail && !draft.primariaEmail ? prefillEmail : null
    const nextSenderName = prefillSenderName && !draft.senderName ? prefillSenderName : null

    if (!nextPrimariaEmail && !nextSenderName) return

    setDraft((prev) => {
      const next = {
        ...prev,
        ...(nextPrimariaEmail ? { primariaEmail: nextPrimariaEmail } : {}),
        ...(nextSenderName ? { senderName: nextSenderName } : {}),
      }
      void form.saveDraft(next)
      return next
    })
  }, [prefillEmail, prefillSenderName, draft.primariaEmail, draft.senderName, form, form.savedValue])

  const updateField = useCallback(<K extends keyof ContestationBuilderValue>(
    field: K,
    value: ContestationBuilderValue[K],
  ) => {
    setIsAwaitingEmailConfirmation(false)
    setDraft((prev) => {
      const next = { ...prev, [field]: value }
      void form.saveDraft(next)
      return next
    })
  }, [form])

  const handleOpenEmail = useCallback(() => {
    const senderName = draft.senderName?.trim()
    if (!draft.primariaEmail || !senderName) return

    const mailtoUrl = buildContestationMailto({
      primariaEmail: draft.primariaEmail,
      contestedItem: draft.contestedItem,
      reasoning: draft.reasoning,
      impact: draft.impact,
      proposedChange: draft.proposedChange,
      senderName,
      year: CURRENT_YEAR,
    })

    window.open(mailtoUrl, '_blank')
    setIsAwaitingEmailConfirmation(true)
  }, [draft])

  const handleConfirmEmailSend = useCallback(() => {
    void form.submit({
      ...draft,
      submissionPath: 'send_email',
      submittedAt: new Date().toISOString(),
    })
  }, [draft, form])

  const handleDownloadText = useCallback(() => {
    const senderName = draft.senderName?.trim()
    if (!senderName) return

    const text = buildContestationEmailBody({
      contestedItem: draft.contestedItem,
      reasoning: draft.reasoning,
      impact: draft.impact,
      proposedChange: draft.proposedChange,
      senderName,
    })

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contestatie-buget-${CURRENT_YEAR}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    void form.submit({
      ...draft,
      submissionPath: 'download_text',
      submittedAt: new Date().toISOString(),
    })
  }, [draft, form])

  const handleTryAgain = useCallback(() => {
    setStep(1)
    setIsAwaitingEmailConfirmation(false)
    void form.reset()
  }, [form])

  const previewBody = useMemo(() => {
    const senderName = draft.senderName?.trim()
    if (!senderName) return null

    return buildContestationEmailBody({
      contestedItem: draft.contestedItem,
      reasoning: draft.reasoning,
      impact: draft.impact,
      proposedChange: draft.proposedChange,
      senderName,
    })
  }, [draft.contestedItem, draft.reasoning, draft.impact, draft.proposedChange, draft.senderName])

  if (!form.entityCui) {
    return null
  }

  const hasRequiredFields =
    draft.contestedItem.trim().length > 0 &&
    draft.reasoning.trim().length > 0 &&
    draft.impact.trim().length > 0 &&
    draft.proposedChange.trim().length > 0

  const hasSenderIdentity = Boolean(draft.senderName?.trim())
  const hasEmailForSend = draft.primariaEmail !== null && isValidEmail(draft.primariaEmail)

  if (form.isSubmitted) {
    const isPending = form.submittedVariant === 'pending_review'
    const isRejected = form.submittedVariant === 'rejected'
    const submittedPath = form.savedValue?.submissionPath
    return (
      <div className={`relative rounded-[28px] border shadow-sm p-6 md:p-8 ${
        isPending
          ? 'border-amber-200/60 bg-gradient-to-br from-amber-50/40 via-background to-amber-50/20 dark:border-amber-800/40 dark:from-amber-950/20 dark:via-background dark:to-amber-950/10'
          : isRejected
            ? 'border-red-200/60 bg-gradient-to-br from-red-50/50 via-background to-red-50/20 dark:border-red-800/40 dark:from-red-950/20 dark:via-background dark:to-red-950/10'
            : 'border-emerald-200/60 bg-gradient-to-br from-emerald-50/50 via-background to-emerald-50/30 dark:border-emerald-800/40 dark:from-emerald-950/20 dark:via-background dark:to-emerald-950/10'
      }`}>
        <Clock className={`absolute top-4 right-4 h-16 w-16 pointer-events-none ${
          isPending
            ? 'text-amber-500/[0.08]'
            : isRejected
              ? 'text-red-500/[0.08]'
              : 'text-emerald-500/[0.08]'
        }`} />

        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-black tracking-tight text-foreground">
            {t`Local budget contestation`}
          </h3>
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1">
            {submittedPath === 'send_email' ? t`Sent via email` : t`Downloaded`}
          </span>
        </div>

        <p className="mt-3 text-sm text-muted-foreground font-medium leading-relaxed">
          {t`Your contestation has been recorded.`}
        </p>

        {isPending && (
          <p className="mt-2 text-xs text-amber-600/80 dark:text-amber-400/80">
            {t`Your information has been recorded and is being reviewed.`}
          </p>
        )}

        {isRejected && (
          <p className="mt-2 text-xs text-red-600/80 dark:text-red-400/80">
            {form.reviewFeedbackText?.trim() || t`Review feedback is available. Please update your submission.`}
          </p>
        )}

        {form.submittedVariant === 'completed' && (
          <p className="mt-2 text-xs text-emerald-600/80 dark:text-emerald-400/80">
            {t`Your submission has been reviewed and accepted.`}
          </p>
        )}

        {isRejected && (
          <div className="mt-5">
            <Button
              onClick={handleTryAgain}
              className="w-full rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
            >
              {t`Try again`}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-[28px] border border-border/50 shadow-sm p-6 md:p-8 relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/[0.03]">
      <FilePenLine className="absolute top-4 right-4 h-20 w-20 rotate-6 opacity-[0.06] pointer-events-none" />

      <div className="space-y-1.5 mb-6">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
          <Trans>CONTESTATION</Trans>
        </span>
        <h3 className="text-lg font-black tracking-tight text-foreground">
          {t`Draft a contestation`}
        </h3>
        <p className="text-sm text-muted-foreground font-medium leading-relaxed">
          <Trans>Write an argued contestation based on the analyzed data from the local budget.</Trans>
        </p>
      </div>

      <div className="space-y-6">
        {/* Step indicator */}
        <div className="flex items-center gap-3">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= step ? 'bg-primary' : 'bg-muted/40'
            )} />
          ))}
        </div>

        {/* Step 1 - Ce contestezi? */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contested-item" className="text-sm font-bold text-foreground">
                <Trans>What are you contesting?</Trans>
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <Trans>Identify the specific budget line or category. For example: &quot;Personnel expenses - Chapter 65 Education&quot;</Trans>
              </p>
              <Textarea
                id="contested-item"
                placeholder={t`The budget line, category, or allocation you are contesting...`}
                className="rounded-xl text-base min-h-[100px]"
                maxLength={MAX_CHARS}
                value={draft.contestedItem}
                onChange={(e) => updateField('contestedItem', e.target.value)}
              />
              <div className="flex justify-end">
                <CharCounter current={draft.contestedItem.length} max={MAX_CHARS} />
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                disabled={draft.contestedItem.trim().length === 0}
                onClick={() => setStep(2)}
                className="rounded-[22px] h-11 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
              >
                {t`Continue`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 2 - De ce? */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reasoning" className="text-sm font-bold text-foreground">
                <Trans>Why?</Trans>
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <Trans>Present concrete arguments: comparisons with the previous year, with other localities, or with the real needs of the community.</Trans>
              </p>
              <Textarea
                id="reasoning"
                placeholder={t`Present the arguments and evidence supporting the contestation...`}
                className="rounded-xl text-base min-h-[100px]"
                maxLength={MAX_CHARS}
                value={draft.reasoning}
                onChange={(e) => updateField('reasoning', e.target.value)}
              />
              <div className="flex justify-end">
                <CharCounter current={draft.reasoning.length} max={MAX_CHARS} />
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(1)}
                className="rounded-[22px] h-11 font-bold text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/40"
              >
                {t`Back`}
              </Button>
              <Button
                disabled={draft.reasoning.trim().length === 0}
                onClick={() => setStep(3)}
                className="rounded-[22px] h-11 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
              >
                {t`Continue`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 - Impact și propunere */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Impact section */}
            <div className="space-y-2">
              <Label htmlFor="impact" className="text-sm font-bold text-foreground">
                <Trans>What is the impact?</Trans>
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <Trans>How does this allocation affect the community? Think of concrete services: schools, roads, green spaces.</Trans>
              </p>
              <Textarea
                id="impact"
                placeholder={t`Describe the impact on the community...`}
                className="rounded-xl text-base min-h-[100px]"
                maxLength={MAX_CHARS}
                value={draft.impact}
                onChange={(e) => updateField('impact', e.target.value)}
              />
              <div className="flex justify-end">
                <CharCounter current={draft.impact.length} max={MAX_CHARS} />
              </div>
            </div>

            {/* Thin separator */}
            <div className="border-t border-border/30" />

            {/* Proposed change section */}
            <div className="space-y-2">
              <Label htmlFor="proposed-change" className="text-sm font-bold text-foreground">
                <Trans>What change do you propose?</Trans>
              </Label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                <Trans>Propose a specific and realistic change. For example: &quot;Redistribute 500,000 lei from personnel expenses to school infrastructure investments.&quot;</Trans>
              </p>
              <Textarea
                id="proposed-change"
                placeholder={t`Describe the specific change you propose...`}
                className="rounded-xl text-base min-h-[100px]"
                maxLength={MAX_CHARS}
                value={draft.proposedChange}
                onChange={(e) => updateField('proposedChange', e.target.value)}
              />
              <div className="flex justify-end">
                <CharCounter current={draft.proposedChange.length} max={MAX_CHARS} />
              </div>
            </div>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={() => setStep(2)}
                className="rounded-[22px] h-11 font-bold text-muted-foreground hover:text-foreground border border-border/60 hover:bg-muted/40"
              >
                {t`Back`}
              </Button>
              <Button
                disabled={draft.impact.trim().length === 0 || draft.proposedChange.trim().length === 0}
                onClick={() => setStep(4)}
                className="rounded-[22px] h-11 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform"
              >
                {t`Continue`}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 - Previzualizare și trimitere */}
        {step === 4 && (
          <div className="space-y-4">
            {/* Sender field */}
            <div className="space-y-2">
              <Label htmlFor="contestation-sender" className="text-sm font-bold text-foreground">
                <Trans>Your name or organization</Trans>
              </Label>
              <Input
                id="contestation-sender"
                type="text"
                placeholder={t`Your full name or organization`}
                className="rounded-xl h-12 text-base"
                value={draft.senderName ?? ''}
                onChange={(e) => updateField('senderName', e.target.value || null)}
              />
              {!hasSenderIdentity && (
                <p className="text-xs text-muted-foreground">
                  <Trans>The generated contestation needs a sender identity.</Trans>
                </p>
              )}
              {prefillSenderName && !form.savedValue?.senderName && (
                <p className="text-xs text-muted-foreground">
                  <Trans>Pre-filled from the debate request challenge.</Trans>
                </p>
              )}
            </div>

            {/* Email field */}
            <div className="space-y-2">
              <Label htmlFor="contestation-email" className="text-sm font-bold text-foreground">
                <Trans>City hall email</Trans>
              </Label>
              <Input
                id="contestation-email"
                type="email"
                placeholder="primaria@example.ro"
                className="rounded-xl h-12 text-base"
                value={draft.primariaEmail ?? ''}
                onChange={(e) => updateField('primariaEmail', e.target.value || null)}
              />
              {prefillEmail && !form.savedValue?.primariaEmail && (
                <p className="text-xs text-muted-foreground">
                  <Trans>Pre-filled from the debate request challenge.</Trans>
                </p>
              )}
            </div>

            {/* Preview section */}
            {hasRequiredFields && previewBody && (
              <div className="rounded-[24px] border border-border/40 bg-muted/[0.08] p-5">
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    <Trans>Preview</Trans>
                  </span>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-sm font-black tracking-tight text-foreground">
                      {t`Contestation preview`}
                    </h4>
                  </div>
                </div>
                <div className="mt-3 space-y-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {previewBody.split('\n\n').map((paragraph, idx) => (
                    <p key={idx}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Two side-by-side action cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-[24px] border-2 border-border/40 p-6 text-center transition-all hover:border-border/80 hover:shadow-sm">
                <Mail className="h-10 w-10 text-muted-foreground mb-3 mx-auto" />
                <p className="text-base font-black tracking-tight">{t`Send via email`}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Trans>Opens your email client with the completed contestation.</Trans>
                </p>
                <Button
                  variant="outline"
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-4"
                  disabled={!hasRequiredFields || !hasSenderIdentity || !hasEmailForSend}
                  onClick={handleOpenEmail}
                >
                  {isAwaitingEmailConfirmation ? t`Open email again` : t`Open email`}
                </Button>
                {isAwaitingEmailConfirmation && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <Trans>After the message opens and you send it from your email client, confirm below.</Trans>
                    </p>
                    <Button
                      onClick={handleConfirmEmailSend}
                      className="rounded-[22px] h-11 w-full font-black"
                    >
                      {t`I sent the email`}
                    </Button>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border-2 border-border/40 p-6 text-center transition-all hover:border-border/80 hover:shadow-sm">
                <Download className="h-10 w-10 text-muted-foreground mb-3 mx-auto" />
                <p className="text-base font-black tracking-tight">{t`Download as text`}</p>
                <p className="text-xs text-muted-foreground mt-1.5">
                  <Trans>Download the formatted contestation as a text file.</Trans>
                </p>
                <Button
                  className="rounded-[22px] h-11 w-full font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 mt-4"
                  disabled={!hasRequiredFields || !hasSenderIdentity}
                  onClick={handleDownloadText}
                >
                  {t`Download`}
                </Button>
              </div>
            </div>

            <div className="flex justify-start">
              <Button
                variant="outline"
                onClick={() => setStep(3)}
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
