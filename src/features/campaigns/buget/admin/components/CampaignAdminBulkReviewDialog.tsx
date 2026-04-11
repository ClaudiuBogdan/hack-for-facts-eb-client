import { type ClipboardEvent, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ClipboardPaste,
  Copy,
  Loader2,
} from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  buildCampaignAdminSelectionKey,
  getCampaignAdminReviewStatusLabel,
} from '@/features/campaigns/buget/admin/constants'
import { getCampaignAdminPrimaryValue } from '@/features/campaigns/buget/admin/utils/payload-summary'
import type {
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
} from '@/features/campaigns/buget/admin/types'
import type { CampaignAdminBulkReviewClipboardIssue } from '@/features/campaigns/buget/admin/utils/bulk-review-clipboard'

type CampaignAdminBulkReviewDialogProps = {
  readonly open: boolean
  readonly items: readonly CampaignAdminUserInteractionListItem[]
  readonly stagedDraftsByKey: Readonly<Record<string, CampaignAdminStagedReviewDraft>>
  readonly isBusy: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onCopySelected: () => Promise<void> | void
  readonly onImportText: (text: string) => Promise<{
    importedCount: number
    skippedCount: number
    issues: readonly CampaignAdminBulkReviewClipboardIssue[]
  }> | {
    importedCount: number
    skippedCount: number
    issues: readonly CampaignAdminBulkReviewClipboardIssue[]
  }
  readonly onClearStagedDrafts: () => void
  readonly onSendSelected: () => Promise<void> | void
}

function getSelectionKey(item: CampaignAdminUserInteractionListItem): string {
  return buildCampaignAdminSelectionKey(item.userId, item.recordKey)
}

function getDecisionBadgeVariant(decision: CampaignAdminStagedReviewDraft['status']) {
  return decision === 'approved' ? 'success' : 'destructive'
}

export function CampaignAdminBulkReviewDialog({
  open,
  items,
  stagedDraftsByKey,
  isBusy,
  onOpenChange,
  onCopySelected,
  onImportText,
  onClearStagedDrafts,
  onSendSelected,
}: CampaignAdminBulkReviewDialogProps) {
  const [pastedText, setPastedText] = useState('')
  const [importIssues, setImportIssues] = useState<readonly CampaignAdminBulkReviewClipboardIssue[]>([])
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    if (!open) {
      return
    }

    setPastedText('')
    setImportIssues([])
  }, [open, items])

  const stagedItems = useMemo(
    () => items.filter((item) => stagedDraftsByKey[getSelectionKey(item)] !== undefined),
    [items, stagedDraftsByKey]
  )
  const stagedItemCount = stagedItems.length
  const previewItems = items.slice(0, 5)
  const validStagedItemCount = useMemo(
    () =>
      items.filter((item) => {
        const stagedDraft = stagedDraftsByKey[getSelectionKey(item)]

        return (
          stagedDraft !== undefined
          && (stagedDraft.status === 'approved' || stagedDraft.status === 'rejected')
          && stagedDraft.feedbackText.trim().length > 0
        )
      }).length,
    [items, stagedDraftsByKey]
  )
  const canSendSelected = items.length > 0 && validStagedItemCount === items.length

  const handleImportText = async (rawText: string) => {
    setPastedText(rawText)

    if (rawText.trim() === '') {
      setImportIssues([])
      return
    }

    setIsImporting(true)

    try {
      const result = await onImportText(rawText)
      setImportIssues(result.issues)
    } finally {
      setIsImporting(false)
    }
  }

  const handleImport = async () => {
    await handleImportText(pastedText)
  }

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardText = event.clipboardData.getData('text/plain')
    if (clipboardText.trim() === '') {
      return
    }

    event.preventDefault()
    void handleImportText(clipboardText)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium tracking-tight">
            {t`Edit selected interactions`}
          </DialogTitle>
          <DialogDescription>
            {t`Copy the selected rows into a spreadsheet, review the links and submitted values there, then paste the edited decision columns back here. Sending reviews happens from the selection bar after every selected row has a valid staged state.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              {items.length === 1
                ? t`1 item selected`
                : t`${items.length} items selected`}
            </AlertTitle>
            <AlertDescription className="space-y-3">
              <p className="text-sm">
                {stagedItemCount > 0
                  ? t`${stagedItemCount} rows already have staged spreadsheet decisions.`
                  : t`No staged spreadsheet decisions yet.`}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void onCopySelected()
                  }}
                  disabled={isBusy || isImporting || items.length === 0}
                  className="gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  {t`Copy selected rows`}
                </Button>
                {stagedItemCount > 0 ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onClearStagedDrafts}
                    disabled={isBusy || isImporting}
                  >
                    {t`Clear staged rows`}
                  </Button>
                ) : null}
              </div>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="campaign-admin-bulk-paste">{t`Paste edited spreadsheet rows`}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleImport()
                }}
                disabled={isBusy || isImporting || pastedText.trim() === ''}
                className="gap-1.5"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    {t`Importing…`}
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                    {t`Import pasted rows`}
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="campaign-admin-bulk-paste"
              name="bulkReviewPaste"
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              onPaste={handlePaste}
              placeholder={t`Paste spreadsheet rows here…`}
              className="min-h-[160px] resize-none font-mono text-sm"
              disabled={isBusy || isImporting}
              autoComplete="off"
            />
          </div>

          {importIssues.length > 0 ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t`Import issues`}</AlertTitle>
              <AlertDescription>
                <ul className="space-y-1 text-xs">
                  {importIssues.slice(0, 8).map((issue) => (
                    <li key={`${issue.rowNumber}-${issue.message}`}>
                      {t`Row`} {issue.rowNumber}: {issue.message}
                    </li>
                  ))}
                  {importIssues.length > 8 ? (
                    <li>{t`${importIssues.length - 8} more issues`}</li>
                  ) : null}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>{t`Selected rows preview`}</Label>
              <Badge variant="outline">
                {stagedItemCount === 0
                  ? t`No staged rows`
                  : t`${stagedItemCount} staged`}
              </Badge>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border/60 bg-background/60">
              {previewItems.map((item) => {
                const stagedDraft = stagedDraftsByKey[getSelectionKey(item)]

                return (
                  <div
                    key={getSelectionKey(item)}
                    className="space-y-2 border-b border-border/60 px-3 py-3 last:border-b-0"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-sm font-medium text-foreground">
                          {getCampaignAdminPrimaryValue(item) ?? item.recordKey}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.recordKey}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {stagedDraft ? (
                          <>
                            <Badge variant={getDecisionBadgeVariant(stagedDraft.status)}>
                              {getCampaignAdminReviewStatusLabel(stagedDraft.status)}
                            </Badge>
                            <Badge variant="outline">{t`Spreadsheet draft`}</Badge>
                          </>
                        ) : (
                          <Badge variant="outline">{t`No staged decision`}</Badge>
                        )}
                      </div>
                    </div>
                    {stagedDraft?.feedbackText.trim().length ? (
                      <p className="text-sm text-muted-foreground">{stagedDraft.feedbackText}</p>
                    ) : stagedDraft ? (
                      <p className="text-sm text-muted-foreground">{t`Missing review note`}</p>
                    ) : null}
                  </div>
                )
              })}
            </div>
            {items.length > previewItems.length ? (
              <p className="text-xs text-muted-foreground">
                {t`Additional selected rows follow the same import and submit rules.`}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          {canSendSelected ? (
            <Button
              type="button"
              onClick={() => {
                void onSendSelected()
              }}
              disabled={isBusy || isImporting}
            >
              {items.length === 1 ? t`Send review` : t`Send reviews`}
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isBusy || isImporting}
          >
            {t`Close`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
