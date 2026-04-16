import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  Ban,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  FileText,
  Inbox,
  LockKeyhole,
  Mail,
  MessageSquare,
  Paperclip,
  Pencil,
  RefreshCw,
  Send,
  User,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminInstitutionThreadResponseForm } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadResponseForm";
import {
  getCampaignAdminCampaignLabel,
  getCampaignAdminInstitutionThreadResponseStatusLabel,
  getCampaignAdminInstitutionThreadStateLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  useAppendCampaignAdminInstitutionThreadResponseMutation,
  useCampaignAdminInstitutionThreadDetailQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadCorrespondenceEntry,
  CampaignAdminInstitutionThreadDetail,
  CampaignAdminInstitutionThreadResponseEvent,
  CampaignAdminInstitutionThreadResponseStatus,
  CampaignAdminInstitutionThreadsSearch,
  CampaignAdminInstitutionThreadState,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadDetailPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly threadId: string;
  readonly search: CampaignAdminInstitutionThreadsSearch;
};

type TimelineItem = {
  readonly id: string;
  readonly kind: "correspondence" | "response_event";
  readonly occurredAt: string;
  readonly correspondence?: CampaignAdminInstitutionThreadCorrespondenceEntry;
  readonly responseEvent?: CampaignAdminInstitutionThreadResponseEvent;
};

function formatDateTime(value: string | null): string {
  if (value === null) {
    return "—";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
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

function truncateId(value: string, maxLen = 10): string {
  if (value.length <= maxLen) return value;
  return `${value.slice(0, maxLen)}…`;
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
): { label: string; className: string; icon: typeof Send } {
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
      // Preserve append order for backfilled responses by sorting on record time.
      occurredAt: event.createdAt,
      responseEvent: event,
    });
  }

  items.sort(
    (a, b) =>
      new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );

  return items;
}

function SidebarMetadata({
  detail,
}: {
  readonly detail: CampaignAdminInstitutionThreadDetail;
}) {
  const entityDisplay = detail.entityName?.trim() || detail.entityCui;

  return (
    <aside className="space-y-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t`Entity`}
        </p>
        <p className="text-sm font-semibold text-foreground">{entityDisplay}</p>
        <p className="font-mono text-xs text-muted-foreground">
          {detail.entityCui}
        </p>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {t`Institution email`}
        </p>
        <p className="font-mono text-xs text-foreground">
          {detail.institutionEmail}
        </p>
      </div>

      {detail.ownerUserId ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t`Owner user`}
          </p>
          <p className="font-mono text-xs text-foreground">
            {detail.ownerUserId}
          </p>
        </div>
      ) : null}

      {detail.requesterOrganizationName ? (
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {t`Requester organization`}
          </p>
          <p className="text-sm text-foreground">
            {detail.requesterOrganizationName}
          </p>
        </div>
      ) : null}

      <div className="h-px bg-border/60" />

      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{t`Updated`}</p>
        <p className="text-xs text-foreground">
          {formatDateTime(detail.updatedAt)}
        </p>
      </div>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{t`Created`}</p>
        <p className="text-xs text-foreground">
          {formatDateTime(detail.createdAt)}
        </p>
      </div>
      <div className="space-y-0.5">
        <p className="text-xs text-muted-foreground">{t`Latest response`}</p>
        <p className="text-xs text-foreground">
          {formatDateTime(detail.latestResponseAt)}
        </p>
      </div>
      {detail.contestationDeadlineAt ? (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {t`Contestation deadline`}
          </p>
          <p className="text-xs text-foreground">
            {formatDateTime(detail.contestationDeadlineAt)}
          </p>
        </div>
      ) : null}
      {detail.budgetPublicationDate ? (
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">
            {t`Budget publication`}
          </p>
          <p className="text-xs text-foreground">
            {detail.budgetPublicationDate}
          </p>
        </div>
      ) : null}
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
  const DirectionIconRef = DirectionIcon;

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
            <DirectionIconRef className="mr-1 h-3 w-3" />
            {label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {entry.source}
          </span>
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

function stripSelectedThreadId(
  search: CampaignAdminInstitutionThreadsSearch,
): CampaignAdminInstitutionThreadsSearch {
  return {
    ...search,
    selectedThreadId: undefined,
  };
}

function CopyableThreadId({ threadId }: { readonly threadId: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(threadId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      void 0;
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="font-mono">{truncateId(threadId)}</span>
            <Copy className="h-3 w-3" />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          {copied ? t`Copied!` : t`Copy thread ID`}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function CampaignAdminInstitutionThreadDetailPage({
  campaignKey,
  threadId,
  search,
}: CampaignAdminInstitutionThreadDetailPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const detailQuery = useCampaignAdminInstitutionThreadDetailQuery({
    campaignKey,
    threadId,
    enabled: isLoaded && isSignedIn,
  });
  const appendResponseMutation =
    useAppendCampaignAdminInstitutionThreadResponseMutation(
      campaignKey,
      threadId,
    );
  const backSearch = stripSelectedThreadId(search);

  const timelineItems = useMemo(() => {
    if (!detailQuery.data) return [];
    return buildTimeline(detailQuery.data);
  }, [detailQuery.data]);

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={t`Institution Thread`}
      description={t`Inspect full correspondence history and append manual institution response events.`}
    >
      <div className="space-y-6">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/admin/campaigns/$campaignKey"
                  params={{ campaignKey }}
                >
                  {getCampaignAdminCampaignLabel(campaignKey)}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/institution-threads"
                  params={{ campaignKey }}
                  search={backSearch as never}
                >
                  {t`Institution threads`}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                <CopyableThreadId threadId={threadId} />
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {!isLoaded ? (
          <div className="flex min-h-40 items-center justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : !isSignedIn ? (
          <Alert>
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t`Sign in required`}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{t`You need an authenticated admin session to access institution threads.`}</p>
              <AuthSignInButton>
                <Button type="button">{t`Sign in`}</Button>
              </AuthSignInButton>
            </AlertDescription>
          </Alert>
        ) : detailQuery.isLoading ? (
          <div className="flex min-h-40 items-center justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : detailQuery.error ? (
          <Alert variant="destructive">
            <Ban className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{t`Failed to load institution thread`}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{detailQuery.error.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void detailQuery.refetch()}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t`Retry`}
              </Button>
            </AlertDescription>
          </Alert>
        ) : detailQuery.data ? (
          <DetailContent
            detail={detailQuery.data}
            timelineItems={timelineItems}
            isFormOpen={isFormOpen}
            onFormOpenChange={setIsFormOpen}
            appendResponseMutation={appendResponseMutation}
          />
        ) : null}
      </div>
    </AdminCampaignLayout>
  );
}

function DetailContent({
  detail,
  timelineItems,
  isFormOpen,
  onFormOpenChange,
  appendResponseMutation,
}: {
  readonly detail: CampaignAdminInstitutionThreadDetail;
  readonly timelineItems: readonly TimelineItem[];
  readonly isFormOpen: boolean;
  readonly onFormOpenChange: (open: boolean) => void;
  readonly appendResponseMutation: ReturnType<
    typeof useAppendCampaignAdminInstitutionThreadResponseMutation
  >;
}) {
  const isFormDisabled = detail.threadState === "resolved";

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-card shadow-sm">
        <div className="border-b border-border/60 px-6 py-4">
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
          <h1 className="mt-2 text-lg font-semibold text-foreground">
            {detail.subject}
          </h1>
        </div>

        <div className="px-6 py-5">
          <SidebarMetadata detail={detail} />
        </div>

        <div className="border-t border-border/60" />

        <div className="px-6 py-5 space-y-6">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground">
                  {t`Timeline`}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {timelineItems.length === 1
                    ? t`1 event`
                    : t`${timelineItems.length} events`}
                </span>
              </div>
              <ThreadTimeline items={timelineItems} />
            </div>

            <Collapsible open={isFormOpen} onOpenChange={onFormOpenChange}>
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
                    isPending={appendResponseMutation.isPending}
                    errorMessage={
                      appendResponseMutation.error?.message ?? null
                    }
                    submitLabel={t`Record response`}
                    onSubmit={async (body) => {
                      await appendResponseMutation.mutateAsync(body);
                    }}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
      </div>
    </div>
  );
}
