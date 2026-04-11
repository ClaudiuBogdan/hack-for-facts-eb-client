import { AlertTriangle } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type CampaignAdminSendValidationIssue = {
  readonly selectionKey: string
  readonly primaryValue: string
  readonly recordKey: string
  readonly message: string
}

type CampaignAdminSendValidationDialogProps = {
  readonly open: boolean
  readonly issues: readonly CampaignAdminSendValidationIssue[]
  readonly selectedCount: number
  readonly onOpenChange: (open: boolean) => void
  readonly onSelectIssue: (selectionKey: string) => void
}

export function CampaignAdminSendValidationDialog({
  open,
  issues,
  selectedCount,
  onOpenChange,
  onSelectIssue,
}: CampaignAdminSendValidationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium tracking-tight">
            {t`Selected rows need fixes`}
          </DialogTitle>
          <DialogDescription>
            {selectedCount === 1
              ? t`The selected row cannot be sent yet. Fix the issue below.`
              : t`Some selected rows cannot be sent yet. Fix the issues below.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>
              {issues.length === 1
                ? t`1 validation issue`
                : t`${issues.length} validation issues`}
            </AlertTitle>
            <AlertDescription>
              {t`Approved rows can send without a note. Rejected rows still need one.`}
            </AlertDescription>
          </Alert>

          <div className="max-h-[24rem] space-y-2 overflow-y-auto rounded-2xl border border-border/60 bg-background/60 p-3">
            {issues.map((issue) => (
              <button
                type="button"
                key={issue.selectionKey}
                className="w-full space-y-1 rounded-xl border border-border/60 bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40"
                onClick={() => onSelectIssue(issue.selectionKey)}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="break-words text-sm font-medium text-foreground">{issue.primaryValue}</p>
                  <span className="shrink-0 text-xs font-medium text-primary">{t`Open row`}</span>
                </div>
                <p className="font-mono text-xs text-muted-foreground">{issue.recordKey}</p>
                <p className="text-sm text-destructive">{issue.message}</p>
              </button>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t`Close`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
