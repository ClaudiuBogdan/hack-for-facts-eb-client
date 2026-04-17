import { useEffect, useMemo, useState } from "react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getCampaignAdminNotificationTriggerExecutionStatusLabel,
} from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminNotificationFieldDescriptor,
  CampaignAdminNotificationTriggerBulkExecutionBody,
  CampaignAdminNotificationTriggerBulkExecutionResponse,
  CampaignAdminNotificationTriggerDescriptor,
  CampaignAdminNotificationTriggerExecutionBody,
  CampaignAdminNotificationTriggerExecutionResponse,
  CampaignAdminNotificationTriggerMode,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminNotificationTriggerDialogProps = {
  readonly open: boolean;
  readonly trigger: CampaignAdminNotificationTriggerDescriptor | null;
  readonly mode?: CampaignAdminNotificationTriggerMode;
  readonly initialSingleBody: CampaignAdminNotificationTriggerExecutionBody;
  readonly initialBulkBody: CampaignAdminNotificationTriggerBulkExecutionBody;
  readonly isSinglePending: boolean;
  readonly isBulkPending: boolean;
  readonly singleResult: CampaignAdminNotificationTriggerExecutionResponse | null;
  readonly bulkResult: CampaignAdminNotificationTriggerBulkExecutionResponse | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onModeChange: (mode: CampaignAdminNotificationTriggerMode) => void;
  readonly onSubmitSingle: (
    body: CampaignAdminNotificationTriggerExecutionBody,
  ) => Promise<void> | void;
  readonly onSubmitBulk: (
    body: CampaignAdminNotificationTriggerBulkExecutionBody,
  ) => Promise<void> | void;
};

type FieldErrors = Record<string, string>;

type BulkDraft = {
  readonly filters: Record<string, string>;
  readonly dryRun: boolean;
  readonly limit: string;
};

function formatTargetKind(targetKind: string): string {
  return targetKind
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatFieldLabel(fieldName: string): string {
  return fieldName
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (value) => value.toUpperCase())
    .replace(/\bId\b/g, "ID")
    .replace(/\bIds\b/g, "IDs")
    .replace(/\bCui\b/g, "CUI")
    .replace(/\bUrl\b/g, "URL");
}

function getInputType(fieldType: string): "text" | "number" {
  const normalizedType = fieldType.toLowerCase();
  return normalizedType.includes("number") || normalizedType.includes("int")
    ? "number"
    : "text";
}

function serializeInitialValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return typeof value === "string" ? value : "";
}

function buildInitialSingleValues(
  trigger: CampaignAdminNotificationTriggerDescriptor | null,
  body: CampaignAdminNotificationTriggerExecutionBody,
): Record<string, string> {
  if (trigger === null) {
    return {};
  }

  return Object.fromEntries(
    trigger.inputFields.map((field) => [
      field.name,
      serializeInitialValue(body[field.name]),
    ]),
  );
}

function buildInitialBulkDraft(
  trigger: CampaignAdminNotificationTriggerDescriptor | null,
  body: CampaignAdminNotificationTriggerBulkExecutionBody,
): BulkDraft {
  const fields = trigger?.capabilities?.bulkInputFields ?? [];
  const supportsDryRun = trigger?.capabilities?.supportsDryRun ?? false;

  return {
    filters: Object.fromEntries(
      fields.map((field) => [
        field.name,
        serializeInitialValue(body.filters[field.name]),
      ]),
    ),
    dryRun: supportsDryRun ? (body.dryRun ?? false) : false,
    limit:
      body.limit !== undefined
        ? String(body.limit)
        : trigger?.capabilities?.defaultLimit !== undefined
          ? String(trigger.capabilities.defaultLimit)
          : "",
  };
}

function parseFieldValue(
  fieldType: string,
  rawValue: string,
): string | number | boolean | readonly string[] {
  const normalizedType = fieldType.toLowerCase();

  if (normalizedType.includes("array")) {
    return rawValue
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0);
  }

  if (normalizedType.includes("number") || normalizedType.includes("int")) {
    return Number(rawValue);
  }

  if (normalizedType.includes("boolean")) {
    return rawValue === "true";
  }

  return rawValue;
}

function validateValues(
  fields: readonly CampaignAdminNotificationFieldDescriptor[],
  values: Record<string, string>,
): FieldErrors {
  return Object.fromEntries(
    fields.flatMap((field) => {
      const value = values[field.name]?.trim() ?? "";
      if (field.required && value.length === 0) {
        return [[field.name, t`This field is required.`]];
      }

      if (
        value.length > 0 &&
        (field.type.toLowerCase().includes("number") ||
          field.type.toLowerCase().includes("int"))
      ) {
        const parsedValue = Number(value);
        if (Number.isNaN(parsedValue)) {
          return [[field.name, t`Enter a valid number.`]];
        }
      }

      return [];
    }),
  );
}

function buildSingleExecutionBody(
  trigger: CampaignAdminNotificationTriggerDescriptor,
  values: Record<string, string>,
): CampaignAdminNotificationTriggerExecutionBody {
  return Object.fromEntries(
    trigger.inputFields.flatMap((field) => {
      const rawValue = values[field.name] ?? "";
      const trimmedValue = rawValue.trim();

      if (!field.required && trimmedValue.length === 0) {
        return [];
      }

      return [[field.name, parseFieldValue(field.type, trimmedValue)]];
    }),
  );
}

function buildBulkExecutionBody(
  trigger: CampaignAdminNotificationTriggerDescriptor,
  draft: BulkDraft,
): CampaignAdminNotificationTriggerBulkExecutionBody {
  const fields = trigger.capabilities?.bulkInputFields ?? [];

  return {
    filters: Object.fromEntries(
      fields.flatMap((field) => {
        const rawValue = draft.filters[field.name] ?? "";
        const trimmedValue = rawValue.trim();

        if (!field.required && trimmedValue.length === 0) {
          return [];
        }

        return [[field.name, parseFieldValue(field.type, trimmedValue)]];
      }),
    ),
    ...(trigger.capabilities?.supportsDryRun ? { dryRun: draft.dryRun } : {}),
    ...(draft.limit.trim().length > 0 ? { limit: Number(draft.limit) } : {}),
  };
}

function TriggerFieldInput({
  field,
  value,
  error,
  onChange,
  idPrefix,
}: {
  readonly field: CampaignAdminNotificationFieldDescriptor;
  readonly value: string;
  readonly error: string | undefined;
  readonly onChange: (value: string) => void;
  readonly idPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`${idPrefix}-${field.name}`}>
        {formatFieldLabel(field.name)}
      </Label>
      {field.type.toLowerCase().includes("boolean") ? (
        <Select
          value={value || "__unset__"}
          onValueChange={(val) => {
            onChange(val === "__unset__" ? "" : val);
          }}
        >
          <SelectTrigger id={`${idPrefix}-${field.name}`}>
            <SelectValue placeholder={t`Choose a value`} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset__">{t`Unset`}</SelectItem>
            <SelectItem value="true">{t`True`}</SelectItem>
            <SelectItem value="false">{t`False`}</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <Input
          id={`${idPrefix}-${field.name}`}
          value={value ?? ""}
          type={getInputType(field.type)}
          onChange={(event) => {
            onChange(event.currentTarget.value);
          }}
        />
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" className="rounded-full">
          {field.type}
        </Badge>
        {field.required ? <span>{t`Required`}</span> : <span>{t`Optional`}</span>}
      </div>
      {error ? (
        <p className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ResultStatCard({
  label,
  value,
  variant = "default",
}: {
  readonly label: string;
  readonly value: number;
  readonly variant?: "default" | "muted" | "destructive";
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-2.5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-0.5 text-base font-semibold tabular-nums ${
          variant === "destructive"
            ? "text-destructive"
            : variant === "muted"
              ? "text-muted-foreground"
              : "text-foreground"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function CampaignAdminNotificationTriggerDialog({
  open,
  trigger,
  mode,
  initialSingleBody,
  initialBulkBody,
  isSinglePending,
  isBulkPending,
  singleResult,
  bulkResult,
  onOpenChange,
  onModeChange,
  onSubmitSingle,
  onSubmitBulk,
}: CampaignAdminNotificationTriggerDialogProps) {
  const supportsSingleExecution =
    trigger?.capabilities?.supportsSingleExecution ?? true;
  const supportsBulkExecution =
    trigger?.capabilities?.supportsBulkExecution ?? false;
  const supportsDryRun = trigger?.capabilities?.supportsDryRun ?? false;
  const bulkFields = trigger?.capabilities?.bulkInputFields ?? [];
  const resolvedMode: CampaignAdminNotificationTriggerMode =
    mode ??
    (supportsSingleExecution
      ? "single"
      : "bulk");

  const [localMode, setLocalMode] =
    useState<CampaignAdminNotificationTriggerMode>(resolvedMode);
  const [singleValues, setSingleValues] = useState<Record<string, string>>(
    buildInitialSingleValues(trigger, initialSingleBody),
  );
  const [bulkDraft, setBulkDraft] = useState<BulkDraft>(
    buildInitialBulkDraft(trigger, initialBulkBody),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    setLocalMode(resolvedMode);
    setSingleValues(buildInitialSingleValues(trigger, initialSingleBody));
    setBulkDraft(buildInitialBulkDraft(trigger, initialBulkBody));
    setFieldErrors({});
    setSubmissionError(null);
  }, [resolvedMode, trigger, initialSingleBody, initialBulkBody, open]);

  const singleResultCounts = useMemo(
    () =>
      singleResult === null
        ? []
        : [
            { label: t`Created`, value: singleResult.result.createdOutboxIds.length },
            { label: t`Reused`, value: singleResult.result.reusedOutboxIds.length },
            { label: t`Queued`, value: singleResult.result.queuedOutboxIds.length },
            {
              label: t`Failed`,
              value: singleResult.result.enqueueFailedOutboxIds.length,
              variant: "destructive" as const,
            },
          ],
    [singleResult],
  );

  const isPending = localMode === "bulk" ? isBulkPending : isSinglePending;

  const handleModeChange = (nextMode: string) => {
    if (nextMode !== "single" && nextMode !== "bulk") {
      return;
    }

    setLocalMode(nextMode);
    onModeChange(nextMode);
    setFieldErrors({});
    setSubmissionError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (trigger === null) {
      return;
    }

    if (localMode === "bulk") {
      const nextFieldErrors = {
        ...validateValues(bulkFields, bulkDraft.filters),
        ...(bulkDraft.limit.trim().length > 0
          ? Number.isNaN(Number(bulkDraft.limit))
            ? { limit: t`Enter a valid number.` }
            : trigger?.capabilities?.maxLimit !== undefined &&
                Number(bulkDraft.limit) > trigger.capabilities.maxLimit
              ? {
                  limit: t`Limit cannot exceed ${trigger.capabilities.maxLimit}.`,
                }
              : {}
          : {}),
      };
      setFieldErrors(nextFieldErrors);

      if (Object.keys(nextFieldErrors).length > 0) {
        return;
      }

      try {
        setSubmissionError(null);
        await onSubmitBulk(buildBulkExecutionBody(trigger, bulkDraft));
      } catch (error) {
        setSubmissionError(
          error instanceof Error
            ? error.message
            : t`Unable to execute this trigger right now.`,
        );
      }
      return;
    }

    const nextFieldErrors = validateValues(trigger.inputFields, singleValues);
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    try {
      setSubmissionError(null);
      await onSubmitSingle(buildSingleExecutionBody(trigger, singleValues));
    } catch (error) {
      setSubmissionError(
        error instanceof Error
          ? error.message
          : t`Unable to execute this trigger right now.`,
      );
    }
  };

  const showModeTabs = supportsSingleExecution && supportsBulkExecution;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,56rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 space-y-1.5 px-6 pt-6 pb-4 text-left">
          <DialogTitle>
            {trigger?.description ?? t`Execute notification trigger`}
          </DialogTitle>
          <DialogDescription className="break-words">
            {trigger === null
              ? t`Open a server-exposed trigger to execute it manually.`
              : t`Template ${trigger.templateId} · ${formatTargetKind(trigger.targetKind)}`}
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
            <div className="space-y-6 pb-1">
              {trigger ? (
                <>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/30 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {t`Trigger`}
                      </p>
                      <p className="mt-1 truncate font-mono text-xs leading-5 text-foreground" title={trigger.triggerId}>
                        {trigger.triggerId}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/30 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {t`Template`}
                      </p>
                      <p className="mt-1 truncate font-mono text-xs leading-5 text-foreground" title={trigger.templateId}>
                        {trigger.templateId}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/30 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {t`Target`}
                      </p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {formatTargetKind(trigger.targetKind)}
                      </p>
                    </div>
                    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/30 p-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {t`Capabilities`}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {supportsSingleExecution ? (
                          <Badge variant="outline" className="text-[11px]">{t`Single`}</Badge>
                        ) : null}
                        {supportsBulkExecution ? (
                          <Badge variant="outline" className="text-[11px]">{t`Bulk`}</Badge>
                        ) : null}
                        {supportsDryRun ? (
                          <Badge variant="outline" className="text-[11px]">{t`Dry-run`}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {showModeTabs ? (
                    <Tabs value={localMode}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger
                          value="single"
                          onClick={() => handleModeChange("single")}
                        >
                          {t`Single`}
                        </TabsTrigger>
                        <TabsTrigger
                          value="bulk"
                          onClick={() => handleModeChange("bulk")}
                        >
                          {t`Bulk`}
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  ) : null}

                  {localMode === "bulk" ? (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <Label>{t`Bulk filters`}</Label>
                        <p className="text-xs text-muted-foreground">
                          {t`These filters are sent to the real bulk trigger endpoint. Leave fields blank to keep the filter broad.`}
                        </p>
                      </div>
                      {bulkFields.length === 0 ? (
                        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                          {t`This trigger does not expose structured bulk filters.`}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {bulkFields.map((field) => (
                            <TriggerFieldInput
                              key={`bulk-${field.name}`}
                              field={field}
                              value={bulkDraft.filters[field.name] ?? ""}
                              error={fieldErrors[field.name]}
                              idPrefix="trigger-bulk-field"
                              onChange={(value) => {
                                setBulkDraft((currentDraft) => ({
                                  ...currentDraft,
                                  filters: {
                                    ...currentDraft.filters,
                                    [field.name]: value,
                                  },
                                }));
                              }}
                            />
                          ))}
                        </div>
                      )}

                      <Separator />

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="trigger-bulk-limit">{t`Limit`}</Label>
                          <Input
                            id="trigger-bulk-limit"
                            type="number"
                            value={bulkDraft.limit}
                            onChange={(event) => {
                              setBulkDraft((currentDraft) => ({
                                ...currentDraft,
                                limit: event.currentTarget.value,
                              }));
                            }}
                            min={
                              trigger.capabilities?.defaultLimit !== undefined ? 1 : undefined
                            }
                            max={trigger.capabilities?.maxLimit}
                          />
                          <p className="text-xs text-muted-foreground">
                            {trigger.capabilities?.defaultLimit !== undefined
                              ? t`Default ${trigger.capabilities.defaultLimit}${
                                  trigger.capabilities.maxLimit
                                    ? ` · max ${trigger.capabilities.maxLimit}`
                                    : ""
                                }`
                              : t`Leave blank to use the server default.`}
                          </p>
                          {fieldErrors.limit ? (
                            <p className="text-sm text-destructive">{fieldErrors.limit}</p>
                          ) : null}
                        </div>
                        <div className="space-y-2">
                          <Label>{t`Execution mode`}</Label>
                          <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/30 px-4 py-3 text-sm text-foreground">
                            <Checkbox
                              checked={bulkDraft.dryRun}
                              onCheckedChange={(checked) => {
                                setBulkDraft((currentDraft) => ({
                                  ...currentDraft,
                                  dryRun: Boolean(checked),
                                }));
                              }}
                              aria-label={t`Run bulk trigger as dry-run`}
                              disabled={!supportsDryRun}
                            />
                            <span className="space-y-1">
                              <span className="block font-medium">
                                {t`Dry-run`}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {supportsDryRun
                                  ? t`Plan the bulk execution without enqueueing notifications.`
                                  : t`This trigger does not support dry-run.`}
                              </span>
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trigger.inputFields.length === 0 ? (
                        <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                          {t`This trigger does not require additional input.`}
                        </div>
                      ) : (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {trigger.inputFields.map((field) => (
                            <TriggerFieldInput
                              key={field.name}
                              field={field}
                              value={singleValues[field.name] ?? ""}
                              error={fieldErrors[field.name]}
                              idPrefix="trigger-field"
                              onChange={(value) => {
                                setSingleValues((currentValues) => ({
                                  ...currentValues,
                                  [field.name]: value,
                                }));
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-4 rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-3/4" />
                </div>
              )}

              {submissionError ? (
                <Alert variant="destructive">
                  <AlertTitle>{t`Trigger execution failed`}</AlertTitle>
                  <AlertDescription>{submissionError}</AlertDescription>
                </Alert>
              ) : null}

              {singleResult ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {getCampaignAdminNotificationTriggerExecutionStatusLabel(
                        singleResult.result.status,
                      )}
                    </Badge>
                    {"familyId" in singleResult.result ? (
                      <Badge variant="outline" className="rounded-full">
                        {singleResult.result.familyId}
                      </Badge>
                    ) : null}
                    {singleResult.result.reason ? (
                      <span className="text-sm text-muted-foreground">
                        {singleResult.result.reason}
                      </span>
                    ) : null}
                    {"delegateTarget" in singleResult.result &&
                    singleResult.result.delegateTarget ? (
                      <span className="text-sm text-muted-foreground">
                        {t`Delegated to ${singleResult.result.delegateTarget}`}
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {singleResultCounts.map((resultCount) => (
                      <ResultStatCard
                        key={resultCount.label}
                        label={resultCount.label}
                        value={resultCount.value}
                        variant={resultCount.variant}
                      />
                    ))}
                  </div>
                </div>
              ) : null}

              {bulkResult ? (
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {bulkResult.result.dryRun ? t`Dry-run` : t`Executed`}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {bulkResult.result.familyId}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {t`Limit ${bulkResult.result.limit} · watermark ${bulkResult.result.watermark}`}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    <ResultStatCard label={t`Candidates`} value={bulkResult.result.candidateCount} />
                    <ResultStatCard label={t`Planned`} value={bulkResult.result.plannedCount} />
                    <ResultStatCard label={t`Eligible`} value={bulkResult.result.eligibleCount} />
                    <ResultStatCard label={t`Queued`} value={bulkResult.result.queuedCount} />
                    <ResultStatCard label={t`Reused`} value={bulkResult.result.reusedCount} />
                    <ResultStatCard label={t`Skipped`} value={bulkResult.result.skippedCount} variant="muted" />
                    <ResultStatCard label={t`Delegated`} value={bulkResult.result.delegatedCount} variant="muted" />
                    <ResultStatCard label={t`Ineligible`} value={bulkResult.result.ineligibleCount} variant="muted" />
                    <ResultStatCard label={t`Not replayable`} value={bulkResult.result.notReplayableCount} variant="muted" />
                    <ResultStatCard label={t`Stale`} value={bulkResult.result.staleCount} variant="muted" />
                    <ResultStatCard label={t`Failed`} value={bulkResult.result.enqueueFailedCount} variant="destructive" />
                  </div>
                  {bulkResult.result.hasMoreCandidates ? (
                    <p className="text-xs text-muted-foreground">
                      {t`More candidates remain beyond this run limit.`}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <Separator />

          <DialogFooter className="shrink-0 gap-2 border-t border-border/70 bg-background px-6 py-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t`Close`}
            </Button>
            <Button type="submit" disabled={isPending || trigger === null}>
              {isPending
                ? localMode === "bulk"
                  ? t`Running…`
                  : t`Executing…`
                : localMode === "bulk"
                  ? bulkDraft.dryRun
                    ? t`Run bulk dry-run`
                    : t`Run bulk`
                  : t`Execute single`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
