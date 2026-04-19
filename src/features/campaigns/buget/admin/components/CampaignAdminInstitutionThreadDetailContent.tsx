import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  Inbox,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  User,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { CampaignAdminInstitutionThreadAudienceSummary } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadAudienceSummary";
import { CampaignAdminInstitutionThreadResponseForm } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadResponseForm";
import {
  getCampaignAdminInstitutionThreadResponseStatusLabel,
  getCampaignAdminInstitutionThreadStateLabel,
} from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminAppendInstitutionThreadResponseBody,
  CampaignAdminAppendInstitutionThreadResponseResult,
  CampaignAdminInstitutionThreadCorrespondenceEntry,
  CampaignAdminInstitutionThreadDetail,
  CampaignAdminInstitutionThreadResponseEvent,
  CampaignAdminInstitutionThreadResponseStatus,
  CampaignAdminInstitutionThreadState,
} from "@/features/campaigns/buget/admin/types";

type TimelineItem = {
  readonly id: string;
  readonly kind: "correspondence" | "response_event";
  readonly occurredAt: string;
  readonly correspondence?: CampaignAdminInstitutionThreadCorrespondenceEntry;
  readonly responseEvent?: CampaignAdminInstitutionThreadResponseEvent;
};

type CampaignAdminInstitutionThreadDetailContentProps = {
  readonly detail: CampaignAdminInstitutionThreadDetail;
  readonly isSubmitting: boolean;
  readonly submitErrorMessage?: string | null;
  readonly onSubmitResponse: (
    body: CampaignAdminAppendInstitutionThreadResponseBody,
  ) =>
    | Promise<CampaignAdminAppendInstitutionThreadResponseResult | void>
    | CampaignAdminAppendInstitutionThreadResponseResult
    | void;
  readonly headerAction?: ReactNode;
};

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

function formatDateShort(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getThreadStateBadgeClassName(
  threadState: CampaignAdminInstitutionThreadState,
): string {
  switch (threadState) {
    case "started":
      return "border-sky-300 bg-sky-100 text-sky-950";
    case "pending":
      return "border-amber-300 bg-amber-100 text-amber-950";
    case "resolved":
      return "border-emerald-300 bg-emerald-100 text-emerald-950";
    default:
      return "";
  }
}

function getResponseStatusBadgeClassName(
  responseStatus: CampaignAdminInstitutionThreadResponseStatus | null,
): string {
  switch (responseStatus) {
    case "registration_number_received":
      return "border-sky-300 bg-sky-100 text-sky-950";
    case "request_confirmed":
      return "border-emerald-300 bg-emerald-100 text-emerald-950";
    case "request_denied":
      return "border-rose-300 bg-rose-100 text-rose-950";
    case null:
      return "border-slate-300 bg-slate-100 text-slate-900";
    default:
      return "";
  }
}

function getDirectionBadge(
  direction: "outbound" | "inbound",
): { label: string; className: string; icon: typeof ArrowUp } {
  if (direction === "inbound") {
    return {
      label: t`Inbound`,
      className: "border-blue-300 bg-blue-100 text-blue-950",
      icon: ArrowDown,
    };
  }

  return {
    label: t`Outbound`,
    className: "border-violet-300 bg-violet-100 text-violet-950",
    icon: ArrowUp,
  };
}

function buildTimeline(
  detail: CampaignAdminInstitutionThreadDetail,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  for (const entry of detail.correspondence) {
    items.push({
      id: `corr-${entry.id}`,
      kind: "correspondence",
      occurredAt: entry.occurredAt,
      correspondence: entry,
    });
  }

  for (const event of detail.responseEvents) {
    items.push({
      id: `resp-${event.id}`,
      kind: "response_event",
      occurredAt: event.createdAt,
      responseEvent: event,
    });
  }

  items.sort(
    (left, right) =>
      new Date(left.occurredAt).getTime() - new Date(right.occurredAt).getTime(),
  );

  return items;
}

function SidebarMetadata({
  detail,
}: {
  readonly detail: CampaignAdminInstitutionThreadDetail;
}) {
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const entityDisplay = detail.entityName?.trim() || detail.entityCui;
  const fieldLabelClass =
    "text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground";

  const hasScheduleFields =
    detail.contestationDeadlineAt !== null || detail.budgetPublicationDate !== null;

  return (
    <aside className="border-t border-border/60 pt-4">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1">
          <p className={fieldLabelClass}>{t`Entity`}</p>
          <p className="text-base font-semibold leading-snug text-foreground">
            {entityDisplay}
          </p>
          <p className="font-mono text-xs text-muted-foreground">
            {detail.entityCui}
          </p>
        </div>

        <div className="space-y-1">
          <p className={fieldLabelClass}>{t`Institution email`}</p>
          <p className="break-all font-mono text-sm text-foreground">
            {detail.institutionEmail}
          </p>
        </div>
      </div>

      <Collapsible
        open={moreDetailsOpen}
        onOpenChange={setMoreDetailsOpen}
        className="mt-4"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-md py-2 text-left text-sm font-medium text-muted-foreground underline-offset-4 transition-colors hover:bg-transparent hover:font-bold hover:text-foreground hover:underline"
          >
            {moreDetailsOpen ? t`Show less` : t`More details`}
            {moreDetailsOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 opacity-70" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 opacity-70" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-5 border-t border-border/50 pt-4">
            <div className="space-y-3">
              <p className={fieldLabelClass}>{t`Activity`}</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <p className={fieldLabelClass}>{t`Created`}</p>
                  <p className="text-sm text-foreground">
                    {formatDateTime(detail.createdAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className={fieldLabelClass}>{t`Updated`}</p>
                  <p className="text-sm text-foreground">
                    {formatDateTime(detail.updatedAt)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className={fieldLabelClass}>{t`Latest response`}</p>
                  <p className="text-sm text-foreground">
                    {formatDateTime(detail.latestResponseAt)}
                  </p>
                </div>
              </div>
            </div>

            {detail.requesterOrganizationName ? (
              <div className="space-y-1 border-t border-border/40 pt-5">
                <p className={fieldLabelClass}>{t`Requester organization`}</p>
                <p className="text-sm text-foreground">
                  {detail.requesterOrganizationName}
                </p>
              </div>
            ) : null}

            {hasScheduleFields ? (
              <div className="space-y-3 border-t border-border/40 pt-5">
                <p className={fieldLabelClass}>{t`Schedule`}</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {detail.contestationDeadlineAt ? (
                    <div className="space-y-1">
                      <p className={fieldLabelClass}>{t`Contestation deadline`}</p>
                      <p className="text-sm text-foreground">
                        {formatDateTime(detail.contestationDeadlineAt)}
                      </p>
                    </div>
                  ) : null}
                  {detail.budgetPublicationDate ? (
                    <div className="space-y-1">
                      <p className={fieldLabelClass}>{t`Budget publication`}</p>
                      <p className="text-sm text-foreground">
                        {detail.budgetPublicationDate}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {detail.ownerUserId ? (
              <div className="space-y-1 border-t border-border/40 pt-5">
                <p className={fieldLabelClass}>{t`Owner user`}</p>
                <p className="break-all font-mono text-xs text-foreground">
                  {detail.ownerUserId}
                </p>
              </div>
            ) : null}

            {detail.consentCapturedAt ? (
              <div className="space-y-1 border-t border-border/40 pt-5">
                <p className={fieldLabelClass}>{t`Consent recorded`}</p>
                <p className="text-sm text-foreground">
                  {formatDateTime(detail.consentCapturedAt)}
                </p>
              </div>
            ) : null}

            <div className="border-t border-border/40 pt-5">
              <CampaignAdminInstitutionThreadAudienceSummary
                audience={detail.notificationAudience}
                variant="detailed"
                title={t`Notification reach`}
                showDefinitions
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </aside>
  );
}

function TimelineCorrespondenceNode({
  entry,
}: {
  readonly entry: CampaignAdminInstitutionThreadCorrespondenceEntry;
}) {
  const { label, className, icon: DirectionIcon } = getDirectionBadge(
    entry.direction,
  );

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
        </div>
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={className}>
            <DirectionIcon className="mr-1 h-3 w-3" />
            {label}
          </Badge>
          <span className="text-xs text-muted-foreground">{entry.source}</span>
          <span className="text-xs text-muted-foreground">
            {formatDateShort(entry.occurredAt)}
          </span>
        </div>
        <p className="mt-1.5 text-sm font-medium text-foreground">
          {entry.subject}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {t`From`} {entry.fromAddress}
        </p>
        {entry.textBody ? (
          <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 p-3">
            <p className="whitespace-pre-wrap break-words text-sm text-foreground">
              {entry.textBody}
            </p>
          </div>
        ) : null}
        {entry.attachments.length > 0 ? (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">
              <Paperclip className="mr-1 inline h-3 w-3" />
              {entry.attachments.length === 1
                ? t`1 attachment`
                : t`${entry.attachments.length} attachments`}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entry.attachments.map((attachment) => (
                <span
                  key={attachment.id}
                  className="inline-flex items-center gap-1 rounded-md border border-border/60 px-2 py-1 text-xs text-muted-foreground"
                >
                  <FileText className="h-3 w-3" />
                  {attachment.filename}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TimelineResponseEventNode({
  event,
}: {
  readonly event: CampaignAdminInstitutionThreadResponseEvent;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-primary/10">
          <Pencil className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="w-px flex-1 bg-border" />
      </div>
      <div className="min-w-0 flex-1 pb-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={getResponseStatusBadgeClassName(event.responseStatus)}
          >
            {getCampaignAdminInstitutionThreadResponseStatusLabel(
              event.responseStatus,
            )}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDateShort(event.responseDate)}
          </span>
          <span className="text-xs text-muted-foreground">
            <User className="mr-0.5 inline h-3 w-3" />
            {event.actorUserId}
          </span>
        </div>
        <div className="mt-2 rounded-lg border border-border/60 bg-muted/30 p-3">
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">
            {event.messageContent}
          </p>
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {t`Recorded`} {formatDateShort(event.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ThreadTimeline({
  items,
}: {
  readonly items: readonly TimelineItem[];
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Inbox className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-muted-foreground">
          {t`No timeline events`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground/70">
          {t`Correspondence and response events will appear here in chronological order.`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {items.map((item) => {
        if (item.kind === "correspondence" && item.correspondence) {
          return (
            <TimelineCorrespondenceNode
              key={item.id}
              entry={item.correspondence}
            />
          );
        }

        if (item.kind === "response_event" && item.responseEvent) {
          return (
            <TimelineResponseEventNode
              key={item.id}
              event={item.responseEvent}
            />
          );
        }

        return null;
      })}
    </div>
  );
}

export function CampaignAdminInstitutionThreadDetailContent({
  detail,
  isSubmitting,
  submitErrorMessage = null,
  onSubmitResponse,
  headerAction,
}: CampaignAdminInstitutionThreadDetailContentProps) {
  const [isFormOpen, setIsFormOpen] = useState(true);
  const timelineItems = useMemo(() => buildTimeline(detail), [detail]);
  const isFormDisabled = detail.threadState === "resolved";

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border border-border/70 bg-card/80 p-5 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={getThreadStateBadgeClassName(detail.threadState)}
              >
                <Clock className="mr-1 h-3 w-3" />
                {getCampaignAdminInstitutionThreadStateLabel(detail.threadState)}
              </Badge>
              <Badge
                variant="outline"
                className={getResponseStatusBadgeClassName(
                  detail.currentResponseStatus,
                )}
              >
                {getCampaignAdminInstitutionThreadResponseStatusLabel(
                  detail.currentResponseStatus,
                )}
              </Badge>
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-foreground">
                {detail.subject}
              </h2>
            </div>
          </div>
          {headerAction ? <div className="lg:shrink-0">{headerAction}</div> : null}
        </div>

        <SidebarMetadata detail={detail} />
      </section>

      <section className="space-y-4 rounded-xl border border-border/70 bg-card/80 p-5 shadow-none">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{t`Timeline`}</h3>
          <span className="text-xs text-muted-foreground">
            {timelineItems.length === 1
              ? t`1 event`
              : t`${timelineItems.length} events`}
          </span>
        </div>
        <ThreadTimeline items={timelineItems} />
      </section>

      <section className="space-y-3 rounded-xl border border-border/70 bg-card/80 p-5 shadow-none">
        <Collapsible open={isFormOpen} onOpenChange={setIsFormOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-left transition-colors hover:bg-muted/50"
            >
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {isFormDisabled
                  ? t`Thread resolved — no further responses`
                  : t`Record institution response`}
              </span>
              <span className="ml-auto text-muted-foreground">
                {isFormOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 rounded-lg border border-border/60 bg-muted/20 p-4">
              <CampaignAdminInstitutionThreadResponseForm
                thread={detail}
                isPending={isSubmitting}
                errorMessage={submitErrorMessage}
                submitLabel={t`Record response`}
                onSubmit={onSubmitResponse}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </section>
    </div>
  );
}
