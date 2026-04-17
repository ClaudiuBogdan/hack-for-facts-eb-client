import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getCampaignAdminInstitutionThreadResponseStatusLabel, getCampaignAdminInstitutionThreadStateLabel } from "@/features/campaigns/buget/admin/constants";
import { CampaignAdminInstitutionThreadAudienceSummary } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadAudienceSummary";
import { CampaignAdminInstitutionThreadResponseForm } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadResponseForm";
import type {
  CampaignAdminAppendInstitutionThreadResponseBody,
  CampaignAdminAppendInstitutionThreadResponseResult,
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadDetail,
  CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadSheetProps = {
  readonly open: boolean;
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminInstitutionThreadsSearch;
  readonly threadId: string | null;
  readonly thread: CampaignAdminInstitutionThreadDetail | null;
  readonly isLoading: boolean;
  readonly errorMessage?: string | null;
  readonly submitErrorMessage?: string | null;
  readonly isSubmitting: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmitResponse: (
    body: CampaignAdminAppendInstitutionThreadResponseBody,
  ) =>
    | Promise<CampaignAdminAppendInstitutionThreadResponseResult | void>
    | CampaignAdminAppendInstitutionThreadResponseResult
    | void;
};

const PREVIEW_LIMIT = 3;

function formatDateTime(value: string | null): string {
  if (value === null) {
    return t`Unavailable`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return t`Unavailable`;
  }

  return parsedDate.toLocaleString();
}

function renderPlainText(value: string | null): string {
  if (value === null || value.trim().length === 0) {
    return t`Unavailable`;
  }

  return value;
}

function PreviewItem({
  title,
  meta,
  children,
}: {
  readonly title: string;
  readonly meta: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{meta}</p>
      </div>
      <div className="mt-2 text-sm text-foreground">{children}</div>
    </div>
  );
}

export function CampaignAdminInstitutionThreadSheet({
  open,
  campaignKey,
  search,
  threadId,
  thread,
  isLoading,
  errorMessage,
  submitErrorMessage,
  isSubmitting,
  onOpenChange,
  onSubmitResponse,
}: CampaignAdminInstitutionThreadSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader className="space-y-2 border-b border-border/60 pb-4">
          <SheetTitle>{thread?.institutionEmail ?? t`Institution thread`}</SheetTitle>
          <SheetDescription>
            {thread
              ? t`Review the latest correspondence and record a manual institution response.`
              : t`Load a thread to inspect recent correspondence.`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          ) : errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>{t`Failed to load institution thread`}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : thread === null ? (
            <Alert>
              <AlertTitle>{t`No thread selected`}</AlertTitle>
              <AlertDescription>
                {t`Select a thread from the list to open the operator sheet.`}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {getCampaignAdminInstitutionThreadStateLabel(thread.threadState)}
                  </Badge>
                  <Badge variant="outline">
                    {getCampaignAdminInstitutionThreadResponseStatusLabel(
                      thread.currentResponseStatus,
                    )}
                  </Badge>
                </div>
                <dl className="grid gap-3 rounded-xl border border-border/60 bg-background/60 p-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      {t`Entity`}
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {thread.entityName?.trim() || thread.entityCui}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      {t`Entity CUI`}
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">{thread.entityCui}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      {t`Subject`}
                    </dt>
                    <dd className="mt-1 break-words text-sm text-foreground">
                      {thread.subject}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">
                      {t`Updated`}
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {formatDateTime(thread.updatedAt)}
                    </dd>
                  </div>
                </dl>
                <CampaignAdminInstitutionThreadAudienceSummary
                  audience={thread.notificationAudience}
                  title={t`Notification reach`}
                  showDefinitions
                />
                {threadId ? (
                  <div className="flex justify-end">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/admin/campaigns/$campaignKey/institution-threads/$threadId"
                        params={{ campaignKey, threadId }}
                        search={search as never}
                      >
                        {t`Open full detail`}
                      </Link>
                    </Button>
                  </div>
                ) : null}
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t`Recent response events`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t`The full timeline remains on the detail page.`}
                  </p>
                </div>
                {thread.responseEvents.length === 0 ? (
                  <Alert>
                    <AlertTitle>{t`No response events yet`}</AlertTitle>
                    <AlertDescription>
                      {t`This thread does not have a manual response history yet.`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {thread.responseEvents
                      .slice(-PREVIEW_LIMIT)
                      .map((event) => (
                        <PreviewItem
                          key={event.id}
                          title={getCampaignAdminInstitutionThreadResponseStatusLabel(
                            event.responseStatus,
                          )}
                          meta={formatDateTime(event.responseDate)}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {event.messageContent}
                          </p>
                        </PreviewItem>
                      ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t`Recent correspondence`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t`Correspondence is rendered as plain text only.`}
                  </p>
                </div>
                {thread.correspondence.length === 0 ? (
                  <Alert>
                    <AlertTitle>{t`No correspondence available`}</AlertTitle>
                    <AlertDescription>
                      {t`The thread detail endpoint did not return correspondence entries.`}
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {thread.correspondence
                      .slice(-PREVIEW_LIMIT)
                      .map((entry) => (
                        <PreviewItem
                          key={entry.id}
                          title={entry.subject}
                          meta={formatDateTime(entry.occurredAt)}
                        >
                          <p className="text-xs text-muted-foreground">
                            {entry.direction} · {entry.source} · {entry.fromAddress}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap break-words">
                            {renderPlainText(entry.textBody)}
                          </p>
                        </PreviewItem>
                      ))}
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">
                    {t`Record institution response`}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t`Use the append-only admin response workflow. The resulting thread state always comes from the server.`}
                  </p>
                </div>
                <CampaignAdminInstitutionThreadResponseForm
                  thread={thread}
                  isPending={isSubmitting}
                  errorMessage={submitErrorMessage}
                  onSubmit={onSubmitResponse}
                />
              </section>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
