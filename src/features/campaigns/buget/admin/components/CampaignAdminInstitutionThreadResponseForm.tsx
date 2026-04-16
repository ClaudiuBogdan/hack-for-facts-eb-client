import { type FormEvent, useEffect, useMemo, useState } from "react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { getCampaignAdminInstitutionThreadResponseStatusLabel } from "@/features/campaigns/buget/admin/constants";
import {
  campaignAdminInstitutionThreadResponseStatusValues,
  type CampaignAdminAppendInstitutionThreadResponseBody,
  type CampaignAdminInstitutionThreadDetail,
  type CampaignAdminInstitutionThreadResponseStatus,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadResponseFormProps = {
  readonly thread: CampaignAdminInstitutionThreadDetail;
  readonly isPending: boolean;
  readonly errorMessage?: string | null;
  readonly submitLabel?: string;
  readonly onSubmit: (
    body: CampaignAdminAppendInstitutionThreadResponseBody,
  ) => Promise<void> | void;
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
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    setResponseDateInput(
      toDateTimeLocalInputValue(thread.latestResponseAt ?? thread.updatedAt),
    );
    setResponseStatus(
      thread.currentResponseStatus ?? "registration_number_received",
    );
    setMessageContent("");
    setClientError(null);
  }, [thread.id, thread.latestResponseAt, thread.updatedAt, thread.currentResponseStatus]);

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

    try {
      await onSubmit({
        expectedUpdatedAt: thread.updatedAt,
        responseDate: parsedResponseDate.toISOString(),
        messageContent: trimmedMessage,
        responseStatus,
      });
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

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isDisabled}>
          {isPending ? t`Saving…` : resolvedSubmitLabel}
        </Button>
        <p className="text-xs text-muted-foreground">{helperCopy}</p>
      </div>
    </form>
  );
}
