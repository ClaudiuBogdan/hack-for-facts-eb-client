import { useEffect, useMemo, useState } from "react";
import { t } from "@lingui/core/macro";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCampaignAdminNotificationTriggerExecutionStatusLabel } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminNotificationTriggerDescriptor,
  CampaignAdminNotificationTriggerExecutionBody,
  CampaignAdminNotificationTriggerExecutionResponse,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminNotificationTriggerDialogProps = {
  readonly open: boolean;
  readonly trigger: CampaignAdminNotificationTriggerDescriptor | null;
  readonly isPending: boolean;
  readonly result: CampaignAdminNotificationTriggerExecutionResponse | null;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (
    body: CampaignAdminNotificationTriggerExecutionBody,
  ) => Promise<void> | void;
};

type FieldErrors = Record<string, string>;

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
    .replace(/\bCui\b/g, "CUI")
    .replace(/\bUrl\b/g, "URL");
}

function getInputType(fieldType: string): "text" | "number" {
  return fieldType.toLowerCase().includes("number") ? "number" : "text";
}

function parseFieldValue(
  fieldType: string,
  rawValue: string,
): string | number | boolean {
  const normalizedType = fieldType.toLowerCase();

  if (normalizedType.includes("number")) {
    return Number(rawValue);
  }

  if (normalizedType.includes("boolean")) {
    return rawValue === "true";
  }

  return rawValue;
}

function buildInitialValues(
  trigger: CampaignAdminNotificationTriggerDescriptor | null,
): Record<string, string> {
  if (trigger === null) {
    return {};
  }

  return Object.fromEntries(
    trigger.inputFields.map((field) => [field.name, ""]),
  );
}

function validateTriggerValues(
  trigger: CampaignAdminNotificationTriggerDescriptor | null,
  values: Record<string, string>,
): FieldErrors {
  if (trigger === null) {
    return {};
  }

  return Object.fromEntries(
    trigger.inputFields.flatMap((field) => {
      const value = values[field.name]?.trim() ?? "";
      if (field.required && value.length === 0) {
        return [[field.name, t`This field is required.`]];
      }

      if (field.type.toLowerCase().includes("number") && value.length > 0) {
        const parsedValue = Number(value);
        if (Number.isNaN(parsedValue)) {
          return [[field.name, t`Enter a valid number.`]];
        }
      }

      return [];
    }),
  );
}

function buildTriggerExecutionBody(
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

export function CampaignAdminNotificationTriggerDialog({
  open,
  trigger,
  isPending,
  result,
  onOpenChange,
  onSubmit,
}: CampaignAdminNotificationTriggerDialogProps) {
  const [values, setValues] = useState<Record<string, string>>(
    buildInitialValues(trigger),
  );
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    setValues(buildInitialValues(trigger));
    setFieldErrors({});
  }, [trigger, open]);

  const resultCounts = useMemo(
    () =>
      result === null
        ? []
        : [
            {
              label: t`Created`,
              value: result.result.createdOutboxIds.length,
            },
            {
              label: t`Reused`,
              value: result.result.reusedOutboxIds.length,
            },
            {
              label: t`Queued`,
              value: result.result.queuedOutboxIds.length,
            },
            {
              label: t`Failed`,
              value: result.result.enqueueFailedOutboxIds.length,
            },
          ],
    [result],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextFieldErrors = validateTriggerValues(trigger, values);
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0 || trigger === null) {
      return;
    }

    const body = buildTriggerExecutionBody(trigger, values);

    await onSubmit(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl overflow-hidden">
        <DialogHeader className="text-left">
          <DialogTitle>
            {trigger?.description ?? t`Execute notification trigger`}
          </DialogTitle>
          <DialogDescription className="break-words">
            {trigger === null
              ? t`Select a trigger to execute it manually.`
              : t`Template ${trigger.templateId} · ${formatTargetKind(trigger.targetKind)}`}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {trigger ? (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {t`Trigger`}
                  </p>
                  <p
                    className="mt-1 break-all font-mono text-xs leading-5 text-foreground sm:text-sm"
                    title={trigger.triggerId}
                  >
                    {trigger.triggerId}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {t`Template`}
                  </p>
                  <p
                    className="mt-1 break-all font-mono text-xs leading-5 text-foreground sm:text-sm"
                    title={trigger.templateId}
                  >
                    {trigger.templateId}
                  </p>
                </div>
                <div className="min-w-0 rounded-2xl border border-border/70 bg-background/40 p-3">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {t`Target`}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {formatTargetKind(trigger.targetKind)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {trigger.inputFields.length === 0 ? (
                  <div className="rounded-2xl border border-border/70 bg-background/40 p-4 text-sm text-muted-foreground">
                    {t`This trigger does not require additional input.`}
                  </div>
                ) : (
                  trigger.inputFields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={`trigger-field-${field.name}`}>
                        {formatFieldLabel(field.name)}
                      </Label>
                      {field.type.toLowerCase().includes("boolean") ? (
                        <Select
                          value={values[field.name] || "__unset__"}
                          onValueChange={(value) => {
                            setValues((currentValues) => ({
                              ...currentValues,
                              [field.name]: value === "__unset__" ? "" : value,
                            }));
                            setFieldErrors((currentErrors) => {
                              const { [field.name]: _removed, ...rest } =
                                currentErrors;
                              void _removed;
                              return rest;
                            });
                          }}
                        >
                          <SelectTrigger id={`trigger-field-${field.name}`}>
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
                          id={`trigger-field-${field.name}`}
                          value={values[field.name] ?? ""}
                          type={getInputType(field.type)}
                          onChange={(event) => {
                            const value = event.currentTarget.value;
                            setValues((currentValues) => ({
                              ...currentValues,
                              [field.name]: value,
                            }));
                            setFieldErrors((currentErrors) => {
                              const { [field.name]: _removed, ...rest } =
                                currentErrors;
                              void _removed;
                              return rest;
                            });
                          }}
                        />
                      )}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="rounded-full">
                          {field.type}
                        </Badge>
                        {field.required ? (
                          <span>{t`Required`}</span>
                        ) : (
                          <span>{t`Optional`}</span>
                        )}
                      </div>
                      {fieldErrors[field.name] ? (
                        <p className="text-sm text-destructive">
                          {fieldErrors[field.name]}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}

          {result ? (
            <div className="space-y-3 rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="rounded-full">
                  {getCampaignAdminNotificationTriggerExecutionStatusLabel(
                    result.result.status,
                  )}
                </Badge>
                {result.result.reason ? (
                  <span className="text-sm text-muted-foreground">
                    {result.result.reason}
                  </span>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-4">
                {resultCounts.map((resultCount) => (
                  <div
                    key={resultCount.label}
                    className="rounded-2xl border border-border/70 bg-card p-3"
                  >
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {resultCount.label}
                    </p>
                    <p className="mt-1 text-lg font-semibold text-foreground tabular-nums">
                      {resultCount.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter>
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
              {isPending ? t`Executing…` : t`Execute trigger`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
