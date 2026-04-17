import { type FormEvent, useEffect, useMemo, useState } from "react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CampaignAdminInstitutionThreadAudienceSummary } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadAudienceSummary";
import {
  getCampaignAdminInstitutionThreadNotificationExecutionReasonLabel,
  getCampaignAdminInstitutionThreadNotificationExecutionStatusLabel,
  getCampaignAdminInstitutionThreadResponseStatusLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  campaignAdminInstitutionThreadResponseStatusValues,
  type CampaignAdminAppendInstitutionThreadResponseBody,
  type CampaignAdminAppendInstitutionThreadResponseResult,
  type CampaignAdminInstitutionThreadDetail,
  type CampaignAdminInstitutionThreadNotificationExecution,
  type CampaignAdminInstitutionThreadResponseStatus,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadResponseFormProps = {
  readonly thread: CampaignAdminInstitutionThreadDetail;
  readonly isPending: boolean;
  readonly errorMessage?: string | null;
  readonly submitLabel?: string;
  readonly onSubmit: (
    body: CampaignAdminAppendInstitutionThreadResponseBody,
  ) =>
    | Promise<CampaignAdminAppendInstitutionThreadResponseResult | void>
    | CampaignAdminAppendInstitutionThreadResponseResult
    | void;
};

function toDateTimeLocalInputValue(value: string | undefined): string {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

export function CampaignAdminInstitutionThreadResponseForm({
  thread,
  isPending,
  errorMessage,
  submitLabel,
  onSubmit,
}: CampaignAdminInstitutionThreadResponseFormProps) {
  const [responseDateInput, setResponseDateInput] = useState<string>(() =>
    toDateTimeLocalInputValue(thread.latestResponseAt ?? thread.updatedAt),
  );
  const [responseStatus, setResponseStatus] =
    useState<CampaignAdminInstitutionThreadResponseStatus>(
      thread.currentResponseStatus ?? "registration_number_received",
    );
  const [messageContent, setMessageContent] = useState("");
  const [sendNotification, setSendNotification] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  const [lastNotificationExecution, setLastNotificationExecution] =
    useState<CampaignAdminInstitutionThreadNotificationExecution | null>(null);
  const [lastRequestedNotification, setLastRequestedNotification] =
    useState(false);

  useEffect(() => {
    setResponseDateInput(
      toDateTimeLocalInputValue(thread.latestResponseAt ?? thread.updatedAt),
    );
    setResponseStatus(
      thread.currentResponseStatus ?? "registration_number_received",
    );
    setMessageContent("");
    setSendNotification(false);
    setClientError(null);
  }, [thread.id, thread.latestResponseAt, thread.updatedAt, thread.currentResponseStatus]);

  useEffect(() => {
    setLastNotificationExecution(null);
    setLastRequestedNotification(false);
  }, [thread.id]);

  const resolvedSubmitLabel = submitLabel ?? t`Record response`;
  const effectiveErrorMessage = clientError ?? errorMessage ?? null;

  const isDisabled = thread.threadState === "resolved" || isPending;
  const helperCopy = useMemo(
    () =>
      thread.threadState === "resolved"
        ? t`Resolved threads cannot accept another manual response event.`
        : t`The response will be appended with the latest thread version for conflict protection.`,
    [thread.threadState],
  );

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedMessage = messageContent.trim();
    if (trimmedMessage.length === 0) {
      setClientError(t`Message content is required.`);
      return;
    }

    const parsedResponseDate = new Date(responseDateInput);
    if (Number.isNaN(parsedResponseDate.getTime())) {
      setClientError(t`Response date is required.`);
      return;
    }

    setClientError(null);
    setLastNotificationExecution(null);
    setLastRequestedNotification(false);

    try {
      const result = await onSubmit({
        expectedUpdatedAt: thread.updatedAt,
        responseDate: parsedResponseDate.toISOString(),
        messageContent: trimmedMessage,
        responseStatus,
        ...(sendNotification ? { sendNotification: true } : {}),
      });
      setLastRequestedNotification(sendNotification);
      setLastNotificationExecution(result?.notificationExecution ?? null);
    } catch (error) {
      setClientError(
        error instanceof Error
          ? error.message
          : t`Unable to record the institution response.`,
      );
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {effectiveErrorMessage ? (
        <Alert variant="destructive">
          <AlertTitle>{t`Unable to record response`}</AlertTitle>
          <AlertDescription>{effectiveErrorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor={`response-date-${thread.id}`}>{t`Response date`}</Label>
        <Input
          id={`response-date-${thread.id}`}
          type="datetime-local"
          value={responseDateInput}
          onChange={(event) => setResponseDateInput(event.target.value)}
          disabled={isDisabled}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`response-status-${thread.id}`}>{t`Response status`}</Label>
        <Select
          value={responseStatus}
          onValueChange={(value) =>
            setResponseStatus(value as CampaignAdminInstitutionThreadResponseStatus)
          }
          disabled={isDisabled}
        >
          <SelectTrigger id={`response-status-${thread.id}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {campaignAdminInstitutionThreadResponseStatusValues.map((value) => (
              <SelectItem key={value} value={value}>
                {getCampaignAdminInstitutionThreadResponseStatusLabel(value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`response-message-${thread.id}`}>{t`Message content`}</Label>
        <Textarea
          id={`response-message-${thread.id}`}
          value={messageContent}
          onChange={(event) => setMessageContent(event.target.value)}
          disabled={isDisabled}
          rows={4}
          className="whitespace-pre-wrap"
        />
      </div>

      <div className="space-y-3">
        <Label>{t`Notification delivery`}</Label>
        <label className="flex items-start gap-3 rounded-xl border border-border/70 bg-background/60 px-4 py-3 text-sm text-foreground">
          <Checkbox
            checked={sendNotification}
            onCheckedChange={(checked) => {
              setSendNotification(Boolean(checked));
            }}
            disabled={isDisabled}
            aria-label={t`Notify requester and subscribers now`}
          />
          <span className="space-y-1">
            <span className="block font-medium">
              {t`Notify requester and subscribers now`}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t`Leave this unchecked to record the response without sending notifications.`}
            </span>
          </span>
        </label>
        <CampaignAdminInstitutionThreadAudienceSummary
          audience={thread.notificationAudience}
          variant="compact"
          className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3"
        />
      </div>

      {lastRequestedNotification ? (
        <NotificationExecutionPanel execution={lastNotificationExecution} />
      ) : null}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isDisabled}>
          {isPending ? t`Saving…` : resolvedSubmitLabel}
        </Button>
        <p className="text-xs text-muted-foreground">{helperCopy}</p>
      </div>
    </form>
  );
}

function NotificationExecutionPanel({
  execution,
}: {
  readonly execution: CampaignAdminInstitutionThreadNotificationExecution | null;
}) {
  if (execution === null) {
    return (
      <Alert>
        <AlertTitle>{t`Response recorded`}</AlertTitle>
        <AlertDescription>
          {t`Notification sending was requested, but the server did not return an execution summary.`}
        </AlertDescription>
      </Alert>
    );
  }

  const reasonLabel =
    getCampaignAdminInstitutionThreadNotificationExecutionReasonLabel(
      execution.reason,
    );
  const statusClassName =
    execution.status === "queued"
      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
      : execution.status === "partial"
        ? "border-amber-300 bg-amber-100 text-amber-950"
        : "border-slate-300 bg-slate-100 text-slate-900";

  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className={statusClassName}>
          {getCampaignAdminInstitutionThreadNotificationExecutionStatusLabel(
            execution.status,
          )}
        </Badge>
        <p className="text-sm font-medium text-foreground">
          {execution.status === "queued"
            ? t`Response saved and notifications queued.`
            : execution.status === "partial"
              ? t`Response saved with partial notification queueing.`
              : t`Response saved without sending notifications.`}
        </p>
      </div>

      {reasonLabel ? (
        <p className="text-sm text-muted-foreground">{reasonLabel}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <ExecutionStatCard
          label={t`Requester eligible`}
          value={execution.eligibleRequesterCount}
          meta={t`${execution.requesterCount} subscribed`}
        />
        <ExecutionStatCard
          label={t`Subscriber eligible`}
          value={execution.eligibleSubscriberCount}
          meta={t`${execution.subscriberCount} subscribed`}
        />
        <ExecutionStatCard
          label={t`Queued`}
          value={execution.queuedOutboxIds.length}
        />
        <ExecutionStatCard
          label={t`Reused`}
          value={execution.reusedOutboxIds.length}
        />
        <ExecutionStatCard
          label={t`Failed`}
          value={execution.enqueueFailedOutboxIds.length}
          tone="destructive"
        />
      </div>
    </div>
  );
}

function ExecutionStatCard({
  label,
  value,
  meta,
  tone = "default",
}: {
  readonly label: string;
  readonly value: number;
  readonly meta?: string;
  readonly tone?: "default" | "destructive";
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${
          tone === "destructive" ? "text-destructive" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {meta ? <p className="text-xs text-muted-foreground">{meta}</p> : null}
    </div>
  );
}
