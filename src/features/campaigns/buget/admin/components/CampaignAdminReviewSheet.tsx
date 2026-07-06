import { Link } from '@tanstack/react-router'
import { type ReactNode, useMemo } from 'react'
import { AlertTriangle, CheckCircle2, MessageSquareWarning, ShieldAlert } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminPayloadKindLabel,
  getCampaignAdminPhaseLabel,
  getCampaignAdminReviewStatusLabel,
  getCampaignAdminRiskFlagLabel,
  getCampaignAdminThreadPhaseLabel,
  requiresApprovalConfirmation,
} from '@/features/campaigns/buget/admin/constants'
import { getCampaignAdminPrimaryValue } from '@/features/campaigns/buget/admin/utils/payload-summary'
import { resolveSafeCampaignAdminHref } from '@/features/campaigns/buget/admin/utils/resolve-safe-campaign-admin-href'
import type {
  CampaignAdminReviewDecision,
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'
import { buildEntityDetailsPath } from '@/lib/entity-navigation'
import { cn, getUserLocale } from '@/lib/utils'

type CampaignAdminReviewSheetProps = {
  readonly open: boolean
  readonly item: CampaignAdminUserInteractionListItem | null
  readonly stagedDraft: CampaignAdminStagedReviewDraft | null
  readonly isSubmitting: boolean
  readonly notificationAdminHref?: string | null
  readonly onOpenChange: (open: boolean) => void
  readonly onDecisionChange: (
    item: CampaignAdminUserInteractionListItem,
    status: CampaignAdminReviewDecision
  ) => void
  readonly onFeedbackTextChange: (
    item: CampaignAdminUserInteractionListItem,
    feedbackText: string
  ) => void
  readonly onApprovalRiskAcknowledgedChange: (
    item: CampaignAdminUserInteractionListItem,
    approvalRiskAcknowledged: boolean
  ) => void
  readonly onSendNotificationChange: (
    item: CampaignAdminUserInteractionListItem,
    sendNotification: boolean
  ) => void
  readonly onClearDraft: (item: CampaignAdminUserInteractionListItem) => void
  readonly onSubmitDraft: (input: {
    item: CampaignAdminUserInteractionListItem
    draft: CampaignAdminStagedReviewDraft
  }) => Promise<void> | void
}

function formatDateTime(value: string | null): string {
  if (value === null) {
    return t`Unavailable`
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return t`Unavailable`
  }

  const locale = getUserLocale() === 'en' ? 'en-US' : 'ro-RO'
  return parsedDate.toLocaleString(locale)
}

function ReviewDetailRow({
  label,
  value,
  tone = 'default',
}: {
  readonly label: string
  readonly value: ReactNode
  readonly tone?: 'default' | 'code'
}) {
  return (
    <TableRow className="border-border/60 hover:bg-transparent">
      <TableCell className="w-[40%] border-r border-border/60 bg-muted/20 px-4 py-3 align-top">
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </div>
      </TableCell>
      <TableCell
        className={`px-4 py-3 align-top text-sm text-foreground ${
          tone === 'code' ? 'font-mono break-all' : 'break-words'
        }`}
      >
        {value}
      </TableCell>
    </TableRow>
  )
}

function renderDetailValue(value: string | null): ReactNode {
  return value && value.trim().length > 0 ? value : t`Unavailable`
}

function renderInteractionElementLink(item: CampaignAdminUserInteractionListItem): ReactNode {
  const interactionLabel = getCampaignAdminInteractionTypeLabel(item.interactionId)

  if (item.interactionElementLink === null) {
    return t`Unavailable`
  }

  const href = resolveSafeCampaignAdminHref({
    value: item.interactionElementLink,
  })

  if (href === null) {
    return interactionLabel
  }

  return (
    <a href={href} className="underline-offset-4 hover:underline">
      {interactionLabel}
    </a>
  )
}

function renderEntityLink(item: CampaignAdminUserInteractionListItem): ReactNode {
  if (item.entityCui === null) {
    return t`Unavailable`
  }

  const entityLabel = item.entityName?.trim() || item.entityCui

  return (
    <Link
      to={buildEntityDetailsPath(item.entityCui) as '/'}
      className="underline-offset-4 hover:underline"
    >
      {entityLabel}
    </Link>
  )
}

function getSubmissionPathLabel(value: CampaignAdminUserInteractionListItem['submissionPath']): string {
  switch (value) {
    case 'request_platform':
      return t`Platform send`
    case 'send_yourself':
      return t`Send yourself`
    case 'send_email':
      return t`Send email`
    case 'download_text':
      return t`Download text`
    case null:
      return t`Unavailable`
    default:
      return value
  }
}

function getBudgetStatusLabel(value: 'yes' | 'no' | 'dont_know' | null): string {
  switch (value) {
    case 'yes':
      return t`Yes`
    case 'no':
      return t`No`
    case 'dont_know':
      return t`I don't know`
    case null:
      return t`Unavailable`
    default:
      return value
  }
}

function getBudgetStageLabel(value: 'draft' | 'approved' | null): string {
  switch (value) {
    case 'draft':
      return t`Draft`
    case 'approved':
      return t`Approved`
    case null:
      return t`Unavailable`
    default:
      return value
  }
}

function getPublicationSourceLabel(value: 'website' | 'press' | 'social_media' | 'other'): string {
  switch (value) {
    case 'website':
      return t`City hall website`
    case 'press':
      return t`Local press`
    case 'social_media':
      return t`Social media`
    case 'other':
      return t`Other source`
    default:
      return value
  }
}

function getParticipationAnswerLabel(value: 'yes' | 'no' | 'dont_know' | null): string {
  switch (value) {
    case 'yes':
      return t`Yes`
    case 'no':
      return t`No`
    case 'dont_know':
      return t`I don't know`
    case null:
      return t`Unavailable`
    default:
      return value
  }
}

function getParticipationSpeakLabel(value: 'yes' | 'no' | 'partially' | null): string {
  switch (value) {
    case 'yes':
      return t`Yes`
    case 'no':
      return t`No`
    case 'partially':
      return t`Partially`
    case null:
      return t`Unavailable`
    default:
      return value
  }
}

function buildPayloadSummaryRows(item: CampaignAdminUserInteractionListItem): Array<{
  label: string
  value: ReactNode
  tone?: 'default' | 'code'
}> {
  switch (item.payloadSummary?.kind) {
    case 'public_debate_request':
      return [
        {
          label: t`Institution email`,
          value: renderDetailValue(item.payloadSummary.institutionEmail),
          tone: 'code',
        },
        {
          label: t`Organization`,
          value: renderDetailValue(item.payloadSummary.organizationName),
        },
        {
          label: t`Submission path`,
          value: getSubmissionPathLabel(item.payloadSummary.submissionPath),
        },
        {
          label: t`NGO sender`,
          value:
            item.payloadSummary.isNgo === null
              ? t`Unavailable`
              : item.payloadSummary.isNgo
                ? t`Yes`
                : t`No`,
        },
      ]
    case 'website_url':
      return [
        {
          label: t`Website URL`,
          value: renderDetailValue(item.payloadSummary.websiteUrl),
          tone: 'code',
        },
      ]
    case 'budget_document':
      return [
        {
          label: t`Document URL`,
          value: renderDetailValue(item.payloadSummary.documentUrl),
          tone: 'code',
        },
        {
          label: t`Document types`,
          value:
            item.payloadSummary.documentTypes.length > 0
              ? item.payloadSummary.documentTypes.join(', ')
              : t`Unavailable`,
        },
      ]
    case 'budget_publication_date':
      return [
        {
          label: t`Publication date`,
          value: renderDetailValue(item.payloadSummary.publicationDate),
        },
        {
          label: t`Sources`,
          value:
            item.payloadSummary.sources.length === 0
              ? t`Unavailable`
              : (
                <div className="space-y-1">
                  {item.payloadSummary.sources.map((source) => (
                    <div key={`${source.type}-${source.url ?? 'none'}`}>
                      {getPublicationSourceLabel(source.type)}: {source.url ?? t`No link`}
                    </div>
                  ))}
                </div>
              ),
        },
      ]
    case 'budget_status':
      return [
        {
          label: t`Published`,
          value: getBudgetStatusLabel(item.payloadSummary.isPublished),
        },
        {
          label: t`Budget stage`,
          value: getBudgetStageLabel(item.payloadSummary.budgetStage),
        },
      ]
    case 'city_hall_contact':
      return [
        {
          label: t`Email`,
          value: renderDetailValue(item.payloadSummary.email),
          tone: 'code',
        },
        {
          label: t`Phone`,
          value: renderDetailValue(item.payloadSummary.phone),
        },
      ]
    case 'participation_report':
      return [
        {
          label: t`Debate took place`,
          value: getParticipationAnswerLabel(item.payloadSummary.debateTookPlace),
        },
        {
          label: t`Approximate attendees`,
          value:
            item.payloadSummary.approximateAttendees === null
              ? t`Unavailable`
              : String(item.payloadSummary.approximateAttendees),
        },
        {
          label: t`Citizens allowed to speak`,
          value: getParticipationSpeakLabel(item.payloadSummary.citizensAllowedToSpeak),
        },
        {
          label: t`Contributions recorded`,
          value: getParticipationAnswerLabel(item.payloadSummary.citizenInputsRecorded),
        },
        {
          label: t`Observations`,
          value: renderDetailValue(item.payloadSummary.observations),
        },
      ]
    case 'contestation':
      return [
        {
          label: t`Contested item`,
          value: renderDetailValue(item.payloadSummary.contestedItem),
        },
        {
          label: t`Reasoning`,
          value: renderDetailValue(item.payloadSummary.reasoning),
        },
        {
          label: t`Impact`,
          value: renderDetailValue(item.payloadSummary.impact),
        },
        {
          label: t`Proposed change`,
          value: renderDetailValue(item.payloadSummary.proposedChange),
        },
        {
          label: t`Sender`,
          value: renderDetailValue(item.payloadSummary.senderName),
        },
        {
          label: t`Delivery path`,
          value: getSubmissionPathLabel(item.payloadSummary.submissionPath),
        },
        {
          label: t`Institution email`,
          value: renderDetailValue(item.payloadSummary.institutionEmail),
          tone: 'code',
        },
      ]
    default:
      return [
        {
          label: t`Primary value`,
          value: renderDetailValue(getCampaignAdminPrimaryValue(item)),
        },
      ]
  }
}

function ReviewDetailSection({
  title,
  rows,
}: {
  readonly title: string
  readonly rows: ReadonlyArray<{
    label: string
    value: ReactNode
    tone?: 'default' | 'code'
  }>
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/70">
        <Table>
          <TableBody>
            {rows.map((row) => (
              <ReviewDetailRow
                key={row.label}
                label={row.label}
                value={row.value}
                tone={row.tone}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}

export function CampaignAdminReviewSheet({
  open,
  item,
  stagedDraft,
  isSubmitting,
  notificationAdminHref = null,
  onOpenChange,
  onDecisionChange,
  onFeedbackTextChange,
  onApprovalRiskAcknowledgedChange,
  onSendNotificationChange,
  onClearDraft,
  onSubmitDraft,
}: CampaignAdminReviewSheetProps) {
  const requiresRiskConfirmation = useMemo(
    () => (item ? requiresApprovalConfirmation(item.riskFlags) : false),
    [item]
  )

  const isPendingReview = item?.reviewStatus === 'pending'
  const feedbackText = isPendingReview ? stagedDraft?.feedbackText ?? '' : item?.feedbackText ?? ''
  const selectedDecision = isPendingReview ? stagedDraft?.status ?? null : null
  const approvalRiskAcknowledged = stagedDraft?.approvalRiskAcknowledged === true
  const trimmedFeedback = feedbackText.trim()
  const canSubmitDraft =
    item !== null &&
    isPendingReview &&
    stagedDraft !== null &&
    (
      stagedDraft.status === 'approved'
      || trimmedFeedback.length > 0
    ) &&
    (
      !requiresRiskConfirmation
      || stagedDraft.status !== 'approved'
      || approvalRiskAcknowledged
    ) &&
    !isSubmitting
  const submissionRows = useMemo(
    () =>
      item === null
        ? []
        : [
            ...buildPayloadSummaryRows(item),
            {
              label: t`Entity`,
              value: renderEntityLink(item),
            },
            {
              label: t`Entity CUI`,
              value: renderDetailValue(item.entityCui),
              tone: 'code' as const,
            },
            {
              label: t`Payload kind`,
              value: getCampaignAdminPayloadKindLabel(item.payloadKind),
            },
            {
              label: t`Interaction element`,
              value: renderInteractionElementLink(item),
            },
            {
              label: t`Lesson ID`,
              value: renderDetailValue(item.lessonId),
              tone: 'code' as const,
            },
            {
              label: t`Record key`,
              value: renderDetailValue(item.recordKey),
              tone: 'code' as const,
            },
            {
              label: t`User ID`,
              value: renderDetailValue(item.userId),
              tone: 'code' as const,
            },
            {
              label: t`Submitted at`,
              value: formatDateTime(item.submittedAt),
            },
          ],
    [item]
  )
  const reviewRows = useMemo(
    () =>
      item === null
        ? []
        : [
            {
              label: t`Updated at`,
              value: formatDateTime(item.updatedAt),
            },
            {
              label: t`Reviewed at`,
              value: formatDateTime(item.reviewedAt),
            },
            {
              label: t`Reviewed by`,
              value: renderDetailValue(item.reviewedByUserId),
              tone: 'code' as const,
            },
            {
              label: t`Thread ID`,
              value: renderDetailValue(item.threadId),
              tone: 'code' as const,
            },
            {
              label: t`Last email`,
              value: formatDateTime(item.lastEmailAt),
            },
            {
              label: t`Last reply`,
              value: formatDateTime(item.lastReplyAt),
            },
            {
              label: t`Next action`,
              value: formatDateTime(item.nextActionAt),
            },
            {
              label: t`Audit counters`,
              value: t`${item.submittedEventCount} submitted / ${item.evaluatedEventCount} evaluated`,
            },
          ],
    [item]
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeLabel={t`Close`}
        className="w-full overflow-y-auto border-l border-border/70 bg-background px-0 sm:max-w-3xl"
      >
        {item === null ? null : (
          <>
            <SheetHeader className="space-y-4 border-b border-border/60 px-6 pb-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={
                    item.reviewStatus === 'rejected'
                      ? 'destructive'
                      : item.reviewStatus === 'approved'
                        ? 'success'
                        : 'secondary'
                  }
                >
                  {getCampaignAdminReviewStatusLabel(item.reviewStatus)}
                </Badge>
                <Badge variant="outline">{getCampaignAdminPhaseLabel(item.phase)}</Badge>
                <Badge variant="outline">{getCampaignAdminThreadPhaseLabel(item.threadPhase)}</Badge>
              </div>
              <div className="space-y-2">
                <SheetTitle className="text-lg font-medium tracking-tight">
                  {getCampaignAdminPrimaryValue(item) ?? t`Unavailable`}
                </SheetTitle>
                <SheetDescription className="space-y-1">
                  <span className="block">
                    {getCampaignAdminInteractionTypeLabel(item.interactionId)}
                  </span>
                </SheetDescription>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span>{item.entityName ?? item.entityCui ?? t`Unavailable`}</span>
                  <span className="font-mono">{item.entityCui ?? t`Unavailable`}</span>
                  <span>{item.organizationName ?? t`Unavailable`}</span>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-6 px-6 py-6">
              {item.riskFlags.length > 0 ? (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>{t`Operator warnings`}</AlertTitle>
                  <AlertDescription className="flex flex-wrap gap-2">
                    {item.riskFlags.map((riskFlag) => (
                      <Badge key={riskFlag} variant="warning" className="text-[11px]">
                        {getCampaignAdminRiskFlagLabel(riskFlag)}
                      </Badge>
                    ))}
                  </AlertDescription>
                </Alert>
              ) : null}

              <ReviewDetailSection
                title={t`Submission summary`}
                rows={submissionRows}
              />

              <ReviewDetailSection
                title={t`Review and thread state`}
                rows={reviewRows}
              />

              {isPendingReview ? (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t`Staged decision`}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t`Choose approved or rejected.`}
                    </p>
                  </div>
                  <RadioGroup
                    value={selectedDecision ?? ''}
                    onValueChange={(value) => {
                      if (
                        item === null
                        || (value !== 'approved' && value !== 'rejected')
                      ) {
                        return
                      }

                      onDecisionChange(item, value)
                    }}
                    className="grid gap-3 sm:grid-cols-2"
                  >
                    <label
                      htmlFor="campaign-admin-review-decision-approved"
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border bg-background px-4 py-3 text-sm transition-all',
                        selectedDecision === 'approved'
                          ? 'border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-200/80'
                          : 'border-border/70 text-foreground hover:border-foreground/15 hover:bg-muted/30'
                      )}
                    >
                      <RadioGroupItem
                        id="campaign-admin-review-decision-approved"
                        value="approved"
                        disabled={isSubmitting}
                        className={cn(
                          selectedDecision === 'approved'
                            ? 'border-emerald-600 text-emerald-600'
                            : 'border-muted-foreground/40 text-muted-foreground'
                        )}
                      />
                      <span className="space-y-1">
                        <span
                          className={cn(
                            'block font-medium',
                            selectedDecision === 'approved' ? 'text-emerald-900' : 'text-foreground'
                          )}
                        >
                          {t`Approved`}
                        </span>
                        <span
                          className={cn(
                            'block text-xs',
                            selectedDecision === 'approved'
                              ? 'text-emerald-800/90'
                              : 'text-muted-foreground'
                          )}
                        >
                          {t`A review note is optional for approved rows.`}
                        </span>
                      </span>
                    </label>
                    <label
                      htmlFor="campaign-admin-review-decision-rejected"
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border bg-background px-4 py-3 text-sm transition-all',
                        selectedDecision === 'rejected'
                          ? 'border-red-500 bg-red-50 shadow-sm ring-2 ring-red-200/80'
                          : 'border-border/70 text-foreground hover:border-foreground/15 hover:bg-muted/30'
                      )}
                    >
                      <RadioGroupItem
                        id="campaign-admin-review-decision-rejected"
                        value="rejected"
                        disabled={isSubmitting}
                        className={cn(
                          selectedDecision === 'rejected'
                            ? 'border-red-600 text-red-600'
                            : 'border-muted-foreground/40 text-muted-foreground'
                        )}
                      />
                      <span className="space-y-1">
                        <span
                          className={cn(
                            'block font-medium',
                            selectedDecision === 'rejected' ? 'text-red-900' : 'text-foreground'
                          )}
                        >
                          {t`Rejected`}
                        </span>
                        <span
                          className={cn(
                            'block text-xs',
                            selectedDecision === 'rejected'
                              ? 'text-red-800/90'
                              : 'text-muted-foreground'
                          )}
                        >
                          {t`Rejected rows require a review note before saving.`}
                        </span>
                      </span>
                    </label>
                  </RadioGroup>
                </section>
              ) : null}

              <section className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="campaign-admin-review-feedback">{t`Review note`}</Label>
                  <p className="text-xs text-muted-foreground">
                    {!isPendingReview
                      ? t`This interaction is no longer pending. The saved review note is shown below.`
                      : stagedDraft === null
                        ? t`Choose approved or rejected to start editing the staged review note.`
                        : stagedDraft.status === 'rejected'
                          ? t`Rejected rows need a review note before saving.`
                          : t`Approved rows can be saved with or without a review note.`}
                  </p>
                </div>
                <Textarea
                  id="campaign-admin-review-feedback"
                  name="reviewFeedback"
                  value={feedbackText}
                  onChange={(event) => {
                    if (item === null) {
                      return
                    }

                    onFeedbackTextChange(item, event.target.value)
                  }}
                  placeholder={
                    stagedDraft === null && isPendingReview
                      ? t`Choose approved or rejected to start a staged review…`
                      : t`Add operator context for this review…`
                  }
                  disabled={!isPendingReview || stagedDraft === null || isSubmitting}
                  className="min-h-[140px]"
                  autoComplete="off"
                />
              </section>

              {isPendingReview && stagedDraft !== null ? (
                <section className="space-y-3">
                  <div className="space-y-1">
                    <Label>{t`Notification`}</Label>
                    <p className="text-xs text-muted-foreground">
                      {t`Review submission always saves the decision. Notification side effects only run when you opt in.`}
                    </p>
                  </div>
                  <label className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background px-4 py-3 text-sm text-foreground">
                    <Checkbox
                      checked={stagedDraft.sendNotification === true}
                      onCheckedChange={(checked) => {
                        if (item === null) {
                          return
                        }

                        onSendNotificationChange(item, Boolean(checked))
                      }}
                      aria-label={t`Send notification after saving review`}
                      disabled={isSubmitting}
                    />
                    <span className="space-y-1">
                      <span className="block font-medium">
                        {t`Send notification after saving`}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {stagedDraft.sendNotification === true
                          ? t`This review will save and then allow notification-capable side effects.`
                          : t`This review will save without notification side effects.`}
                      </span>
                    </span>
                  </label>
                  {notificationAdminHref ? (
                    <p className="text-xs text-muted-foreground">
                      <a href={notificationAdminHref} className="underline-offset-4 hover:underline">
                        {t`Open notifications admin for this review`}
                      </a>
                    </p>
                  ) : null}
                </section>
              ) : null}

              {requiresRiskConfirmation && isPendingReview ? (
                <Alert>
                  <MessageSquareWarning className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>{t`Approval requires explicit confirmation`}</AlertTitle>
                  <AlertDescription className="space-y-3">
                    <p>
                      {t`This item carries an institution-email risk flag. Approving it may trigger additional server follow-up when notification side effects are enabled.`}
                    </p>
                    <label className="flex items-start gap-3 text-sm text-foreground">
                      <Checkbox
                        checked={approvalRiskAcknowledged}
                        onCheckedChange={(checked) => {
                          if (item === null) {
                            return
                          }

                          onApprovalRiskAcknowledgedChange(item, Boolean(checked))
                        }}
                        aria-label={t`Confirm approval warning`}
                        disabled={stagedDraft?.status !== 'approved' || isSubmitting}
                      />
                      <span>{t`I understand the risk and want to continue with approval.`}</span>
                    </label>
                  </AlertDescription>
                </Alert>
              ) : null}

              {!isPendingReview ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>{t`Read-only review`}</AlertTitle>
                  <AlertDescription>
                    {t`This interaction is no longer pending. You can inspect the saved review state, but you cannot submit another decision from this screen.`}
                  </AlertDescription>
                </Alert>
              ) : null}
            </div>

            <SheetFooter className="gap-2 border-t border-border/60 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {t`Close`}
              </Button>
              {item !== null && isPendingReview && stagedDraft !== null ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onClearDraft(item)}
                  disabled={isSubmitting}
                >
                  {t`Clear staged`}
                </Button>
              ) : null}
              {isPendingReview ? (
                <Button
                  type="button"
                  variant={stagedDraft?.status === 'rejected' ? 'destructive' : 'default'}
                  onClick={() => {
                    if (item === null || stagedDraft === null) {
                      return
                    }

                    void onSubmitDraft({
                      item,
                      draft: stagedDraft,
                    })
                  }}
                  disabled={!canSubmitDraft}
                >
                  {stagedDraft?.status === 'rejected' ? (
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  )}
                  {isSubmitting
                    ? t`Saving…`
                    : stagedDraft?.sendNotification === true
                      ? t`Save review & notify`
                      : t`Save review`}
                </Button>
              ) : null}
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
