import { type ClipboardEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ClipboardPaste, Loader2 } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getCampaignAdminEntityConfig,
  updateCampaignAdminEntityConfig,
} from "@/features/campaigns/buget/admin/api/campaign-admin-entity-config";
import { campaignAdminEntityConfigKeys } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entity-config";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";
import type {
  CampaignAdminEntityConfigClipboardParseResult,
  CampaignAdminEntityConfigClipboardRow,
} from "@/features/campaigns/buget/admin/utils/entity-config-clipboard";
import { parseCampaignAdminEntityConfigClipboard } from "@/features/campaigns/buget/admin/utils/entity-config-clipboard";

type ApplyResult = {
  readonly entityCui: string;
  readonly status: "success" | "conflict" | "error";
  readonly message: string;
};

type CampaignAdminEntityConfigPasteDialogProps = {
  readonly open: boolean;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly onOpenChange: (open: boolean) => void;
  readonly onApplied?: () => void;
};

export function CampaignAdminEntityConfigPasteDialog({
  open,
  campaignKey,
  onOpenChange,
  onApplied,
}: CampaignAdminEntityConfigPasteDialogProps) {
  const queryClient = useQueryClient();
  const [pastedText, setPastedText] = useState("");
  const [preview, setPreview] = useState<CampaignAdminEntityConfigClipboardParseResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyResults, setApplyResults] = useState<readonly ApplyResult[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setPastedText("");
    setPreview(null);
    setApplyResults([]);
    setIsImporting(false);
    setIsApplying(false);
  }, [open]);

  const issues = preview?.issues ?? [];
  const previewRows = preview?.rows ?? [];
  const canApply = previewRows.length > 0 && issues.length === 0 && !isApplying;
  const successCount = useMemo(
    () => applyResults.filter((result) => result.status === "success").length,
    [applyResults],
  );
  const shouldPreserveExistingPublicDebate = preview?.hasPublicDebateColumns === false;

  const handleImportText = async (rawText: string) => {
    setPastedText(rawText);

    if (rawText.trim() === "") {
      setPreview(null);
      return;
    }

    setIsImporting(true);

    try {
      setPreview(parseCampaignAdminEntityConfigClipboard(rawText));
      setApplyResults([]);
    } finally {
      setIsImporting(false);
    }
  };

  const handlePaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardText = event.clipboardData.getData("text/plain");
    if (clipboardText.trim() === "") {
      return;
    }

    event.preventDefault();
    void handleImportText(clipboardText);
  };

  const resolveEntityConfigDetail = async (
    row: CampaignAdminEntityConfigClipboardRow,
  ): Promise<Awaited<ReturnType<typeof getCampaignAdminEntityConfig>> | null> => {
    if (
      row.expectedUpdatedAt !== undefined &&
      !shouldPreserveExistingPublicDebate
    ) {
      return null;
    }

    return getCampaignAdminEntityConfig({
      campaignKey,
      entityCui: row.entityCui,
    });
  };

  const handleApply = async () => {
    if (!canApply) {
      return;
    }

    setIsApplying(true);
    const nextResults: ApplyResult[] = [];

    try {
      for (const row of previewRows) {
        try {
          const detail = await resolveEntityConfigDetail(row);
          const expectedUpdatedAt = row.expectedUpdatedAt ?? detail?.updatedAt ?? null;
          const values = shouldPreserveExistingPublicDebate
            ? {
                ...row.values,
                public_debate: detail?.values.public_debate ?? null,
              }
            : row.values;

          await updateCampaignAdminEntityConfig({
            campaignKey,
            entityCui: row.entityCui,
            body: {
              expectedUpdatedAt,
              values,
            },
          });

          nextResults.push({
            entityCui: row.entityCui,
            status: "success",
            message: "Saved",
          });
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown error";

          nextResults.push({
            entityCui: row.entityCui,
            status:
              typeof error === "object" &&
              error !== null &&
              "status" in error &&
              (error as { status?: number }).status === 409
                ? "conflict"
                : "error",
            message,
          });
        }
      }
    } finally {
      setApplyResults(nextResults);
      setIsApplying(false);
    }

    await queryClient.invalidateQueries({
      queryKey: campaignAdminEntityConfigKeys.allForCampaign(campaignKey),
    });
    onApplied?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t`Paste entity config spreadsheet rows`}</DialogTitle>
          <DialogDescription>
            {t`Paste TSV or CSV rows from Excel or Sheets. Only the pasted entities will be updated. Missing rows are ignored.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t`Bulk edit workflow`}</AlertTitle>
            <AlertDescription>
              {t`Preview the pasted rows first. If Updated At is missing, the dialog fetches the current entity detail before saving so optimistic concurrency still applies.`}
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="entity-config-paste">{t`Paste rows`}</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  void handleImportText(pastedText);
                }}
                disabled={isImporting || isApplying || pastedText.trim() === ""}
                className="gap-1.5"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                    {t`Parsing…`}
                  </>
                ) : (
                  <>
                    <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
                    {t`Preview pasted rows`}
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="entity-config-paste"
              name="entityConfigPaste"
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              onPaste={handlePaste}
              placeholder={t`Paste spreadsheet rows here…`}
              className="min-h-[160px] resize-none font-mono text-sm"
              disabled={isImporting || isApplying}
              autoComplete="off"
            />
          </div>

          {issues.length > 0 ? (
            <Alert variant="destructive">
              <AlertTitle>{t`Import issues`}</AlertTitle>
              <AlertDescription>
                <ul className="space-y-1 text-xs">
                  {issues.map((issue) => (
                    <li key={`${issue.rowNumber}-${issue.message}`}>
                      {t`Row`} {issue.rowNumber}: {issue.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}

          {preview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {t`${preview.importedCount} rows ready`}
                </Badge>
                {preview.skippedCount > 0 ? (
                  <Badge variant="outline">{t`${preview.skippedCount} skipped`}</Badge>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-2xl border border-border/60">
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_auto] gap-3 border-b border-border/60 bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground">
                  <span>{t`Entity CUI`}</span>
                  <span>{t`Budget publication date`}</span>
                  <span>{t`Official budget URL`}</span>
                  <span>{t`Updated At`}</span>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {previewRows.map((row) => (
                    <div
                      key={row.entityCui}
                      className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_auto] gap-3 border-b border-border/40 px-4 py-3 text-sm last:border-b-0"
                    >
                      <span className="font-mono">{row.entityCui}</span>
                      <span>{row.values.budgetPublicationDate ?? "null"}</span>
                      <span className="break-all">{row.values.officialBudgetUrl ?? "null"}</span>
                      <span>{row.expectedUpdatedAt ?? t`Fetch before save`}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {applyResults.length > 0 ? (
            <Alert>
              <AlertTitle>
                {t`${successCount} of ${applyResults.length} rows saved`}
              </AlertTitle>
              <AlertDescription>
                <ul className="space-y-1 text-xs">
                  {applyResults.map((result) => (
                    <li key={`${result.entityCui}-${result.status}`}>
                      {result.entityCui}: {result.status} - {result.message}
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t`Close`}
          </Button>
          <Button type="button" onClick={() => { void handleApply(); }} disabled={!canApply}>
            {isApplying ? t`Applying…` : t`Apply updates`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
