import { useMemo, type ReactNode, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  ChevronDown,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminNotificationsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsTable";
import { CampaignAdminEntityConfigEditor } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigSheet";
import { CampaignAdminInstitutionThreadsSection } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsSection";
import { CampaignAdminUsersTable } from "@/features/campaigns/buget/admin/components/CampaignAdminUsersTable";
import {
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  getCampaignAdminCampaignLabel,
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminReviewStatusLabel,
  getCampaignAdminThreadPhaseLabel,
} from "@/features/campaigns/buget/admin/constants";
import { campaignAdminEntitiesKeys } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entities";
import {
  useCampaignAdminEntityConfigDetailQuery,
  useUpdateCampaignAdminEntityConfigMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entity-config";
import { campaignAdminInstitutionThreadsKeys } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads";
import { useCampaignAdminNotificationsAuditQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import { useCampaignAdminQueueQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions";
import { useCampaignAdminUsersQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-users";
import {
  getCampaignAdminInstitutionThreadsSearchFromEntitiesSearch,
  mergeCampaignAdminInstitutionThreadsSearchIntoEntitiesSearch,
  normalizeCampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesListResponse,
  CampaignAdminEntitiesSearch,
  CampaignAdminEntityListItem,
  CampaignAdminNotificationListItem,
  CampaignAdminUpdateEntityConfigBody,
  CampaignAdminUserInteractionListItem,
} from "@/features/campaigns/buget/admin/types";
import { formatCampaignAdminUserIdPreview } from "@/features/campaigns/buget/admin/utils/format-user-id-preview";
import { getCampaignAdminPrimaryValue } from "@/features/campaigns/buget/admin/utils/payload-summary";

const ENTITY_DETAIL_PREVIEW_LIMIT = 10;

const NOTIFICATION_PREVIEW_COLUMNS = [
  "notificationKind",
  "template",
  "user",
  "threadEvent",
  "attempts",
  "safeError",
] as const;

type CampaignAdminEntityDetailPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui: string;
  readonly search: CampaignAdminEntitiesSearch;
  readonly onSearchChange: (
    search: CampaignAdminEntitiesSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

function createEntityUsersRouteSearch(entityCui: string) {
  return {
    query: undefined,
    entityCui,
    sortBy: "latestUpdatedAt" as const,
    sortOrder: "desc" as const,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function createEntityInteractionsRouteSearch(entityCui: string) {
  return {
    phase: undefined,
    reviewStatusMode: undefined,
    reviewStatus: undefined,
    interactionId: undefined,
    lessonId: undefined,
    entityCui,
    scopeType: undefined,
    payloadKind: undefined,
    submissionPath: undefined,
    userId: undefined,
    recordKey: undefined,
    recordKeyPrefix: undefined,
    submittedAtFrom: undefined,
    submittedAtTo: undefined,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    hasInstitutionThread: undefined,
    threadPhase: undefined,
    sortBy: "updatedAt" as const,
    sortOrder: "desc" as const,
    reviewSelectionKey: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function createEntityNotificationsRouteSearch(entityCui: string) {
  return {
    tab: "audit" as const,
    notificationType: undefined,
    templateId: undefined,
    userId: undefined,
    status: undefined,
    eventType: undefined,
    entityCui,
    threadId: undefined,
    source: undefined,
    sortBy: "createdAt" as const,
    sortOrder: "desc" as const,
    runNotificationType: undefined,
    runConditions: undefined,
    previewId: undefined,
    previewCursor: undefined,
    previewPageIndex: undefined,
    previewTrail: undefined,
    previewFilter: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function createEntitiesRouteSearch() {
  return {
    tab: "overview" as const,
    query: undefined,
    interactionId: undefined,
    hasPendingReviews: undefined,
    hasSubscribers: undefined,
    hasNotificationActivity: undefined,
    hasFailedNotifications: undefined,
    latestNotificationType: undefined,
    latestNotificationStatus: undefined,
    sortBy: undefined,
    sortOrder: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
    configEntityCui: undefined,
    configUpdatedAtFrom: undefined,
    configUpdatedAtTo: undefined,
    configSortBy: undefined,
    configSortOrder: undefined,
    configCursor: undefined,
    configPageIndex: undefined,
    configLimit: undefined,
    selectedEntityCui: undefined,
    configCreate: undefined,
    threadsStateGroup: undefined,
    threadsThreadState: undefined,
    threadsResponseStatus: undefined,
    threadsQuery: undefined,
    threadsEntityCui: undefined,
    threadsUpdatedAtFrom: undefined,
    threadsUpdatedAtTo: undefined,
    threadsLatestResponseAtFrom: undefined,
    threadsLatestResponseAtTo: undefined,
    threadsSelectedThreadId: undefined,
    threadsCursor: undefined,
    threadsPageIndex: undefined,
    threadsLimit: undefined,
  };
}

function createCampaignAdminUserPageRouteSearch(entityCui: string) {
  return {
    query: undefined,
    reviewStatus: undefined,
    interactionId: undefined,
    lessonId: undefined,
    entityCui,
    scopeType: undefined,
    payloadKind: undefined,
    submissionPath: undefined,
    recordKey: undefined,
    recordKeyPrefix: undefined,
    submittedAtFrom: undefined,
    submittedAtTo: undefined,
    updatedAtFrom: undefined,
    updatedAtTo: undefined,
    hasInstitutionThread: undefined,
    threadPhase: undefined,
    sortBy: "updatedAt" as const,
    sortOrder: "desc" as const,
    reviewSelectionKey: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

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

function InlineStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <span className="inline-flex items-baseline gap-1 text-sm tabular-nums">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

function SummaryCard({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
    </div>
  );
}

function SectionShell({
  id,
  title,
  description,
  fullPageLink,
  children,
}: {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly fullPageLink: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className="border-border/70 bg-card/80 shadow-none">
        <CardHeader className="gap-3 border-b border-border/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            <div className="lg:shrink-0">{fullPageLink}</div>
          </div>
        </CardHeader>
        <CardContent className="p-4">{children}</CardContent>
      </Card>
    </section>
  );
}

function SectionError({
  title,
  description,
  onRetry,
}: {
  readonly title: string;
  readonly description: string;
  readonly onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <Ban className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={onRetry}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t`Retry`}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ReviewStatusBadge({
  reviewStatus,
}: {
  readonly reviewStatus: CampaignAdminUserInteractionListItem["reviewStatus"];
}) {
  const className =
    reviewStatus === "approved"
      ? "border-emerald-300 bg-emerald-100 text-emerald-950"
      : reviewStatus === "rejected"
        ? "border-rose-300 bg-rose-100 text-rose-950"
        : reviewStatus === "pending"
          ? "border-amber-300 bg-amber-100 text-amber-950"
          : "border-slate-300 bg-slate-100 text-slate-900";

  return (
    <Badge variant="outline" className={className}>
      {getCampaignAdminReviewStatusLabel(reviewStatus)}
    </Badge>
  );
}

function ThreadPhaseBadge({
  threadPhase,
}: {
  readonly threadPhase: CampaignAdminUserInteractionListItem["threadPhase"];
}) {
  const className =
    threadPhase === "failed"
      ? "border-rose-300 bg-rose-100 text-rose-950"
      : threadPhase === null
        ? "border-slate-300 bg-slate-100 text-slate-900"
        : "border-sky-300 bg-sky-100 text-sky-950";

  return (
    <Badge variant="outline" className={className}>
      {getCampaignAdminThreadPhaseLabel(threadPhase)}
    </Badge>
  );
}

function EntityInteractionsPreviewTable({
  campaignKey,
  entityCui,
  items,
}: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly entityCui: string;
  readonly items: readonly CampaignAdminUserInteractionListItem[];
}) {
  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[880px]">
        <TableHeader>
          <TableRow>
            <TableHead>{t`Review status`}</TableHead>
            <TableHead>{t`User`}</TableHead>
            <TableHead>{t`Association`}</TableHead>
            <TableHead>{t`Updated`}</TableHead>
            <TableHead>{t`Message`}</TableHead>
            <TableHead>{t`Interaction`}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={`${item.userId}:${item.recordKey}`}>
              <TableCell>
                <ReviewStatusBadge reviewStatus={item.reviewStatus} />
              </TableCell>
              <TableCell className="max-w-[12rem]">
                <Link
                  to="/admin/campaigns/$campaignKey/users/$userId"
                  params={{ campaignKey, userId: item.userId }}
                  search={createCampaignAdminUserPageRouteSearch(entityCui)}
                  className="font-mono text-xs text-foreground hover:underline"
                  title={item.userId}
                >
                  {formatCampaignAdminUserIdPreview(item.userId)}
                </Link>
                <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                  {item.userId}
                </p>
              </TableCell>
              <TableCell className="max-w-[16rem]">
                {item.organizationName ?? (
                  <span className="text-sm text-muted-foreground">
                    {t`Unavailable`}
                  </span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                {formatDateTime(item.updatedAt)}
              </TableCell>
              <TableCell>
                <ThreadPhaseBadge threadPhase={item.threadPhase} />
              </TableCell>
              <TableCell className="max-w-[20rem]">
                <p className="text-sm font-medium text-foreground">
                  {getCampaignAdminInteractionTypeLabel(item.interactionId)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {getCampaignAdminPrimaryValue(item) ?? t`Unavailable`}
                </p>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function EntityDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Card className="border-border/70 bg-card/80 shadow-none">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-36 rounded-full" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="rounded-2xl border border-border/60 bg-background/40 p-4"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-8 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {Array.from({ length: 3 }).map((_, index) => (
        <Card
          key={index}
          className="border-border/70 bg-card/80 shadow-none"
        >
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="flex min-h-[10rem] items-center justify-center">
              <LoadingSpinner />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function findCachedEntitySummary(
  response: CampaignAdminEntitiesListResponse | undefined,
  entityCui: string,
): CampaignAdminEntityListItem | null {
  if (response === undefined) {
    return null;
  }

  return response.items.find((item) => item.entityCui === entityCui) ?? null;
}

function resolveEntityName({
  entityCui,
  summary,
  interactions,
  notifications,
  users,
}: {
  readonly entityCui: string;
  readonly summary: CampaignAdminEntityListItem | null;
  readonly interactions: readonly CampaignAdminUserInteractionListItem[];
  readonly notifications: readonly CampaignAdminNotificationListItem[];
  readonly users: ReadonlyArray<{
    readonly latestEntityCui: string | null;
    readonly latestEntityName: string | null;
  }>;
}): string | null {
  const candidates = [
    summary?.entityName?.trim() ?? null,
    interactions.find((item) => item.entityName?.trim())?.entityName?.trim() ??
      null,
    notifications.find((item) => item.projection.entityName?.trim())?.projection
      .entityName?.trim() ?? null,
    users.find(
      (item) =>
        item.latestEntityCui === entityCui && item.latestEntityName?.trim(),
    )?.latestEntityName?.trim() ?? null,
  ];

  return candidates.find((candidate) => candidate && candidate.length > 0) ?? null;
}

export function CampaignAdminEntityDetailPage({
  campaignKey,
  entityCui,
  search,
  onSearchChange,
}: CampaignAdminEntityDetailPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const queryClient = useQueryClient();
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(false);
  const normalizedSearch = normalizeCampaignAdminEntitiesSearch(search);
  const activeTab = normalizedSearch.tab ?? "overview";
  const threadsSearch = useMemo(
    () =>
      getCampaignAdminInstitutionThreadsSearchFromEntitiesSearch(
        normalizedSearch,
      ),
    [normalizedSearch],
  );
  const usersQuery = useCampaignAdminUsersQuery({
    campaignKey,
    search: {
      query: undefined,
      entityCui,
      sortBy: "latestUpdatedAt",
      sortOrder: "desc",
      cursor: undefined,
      limit: ENTITY_DETAIL_PREVIEW_LIMIT,
    },
    enabled: isLoaded && isSignedIn,
  });
  const notificationsQuery = useCampaignAdminNotificationsAuditQuery({
    campaignKey,
    filters: {
      entityCui,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    cursor: null,
    limit: ENTITY_DETAIL_PREVIEW_LIMIT,
    enabled: isLoaded && isSignedIn,
  });
  const interactionsQuery = useCampaignAdminQueueQuery({
    campaignKey,
    filters: {
      entityCui,
      sortBy: "updatedAt",
      sortOrder: "desc",
    },
    cursor: null,
    limit: ENTITY_DETAIL_PREVIEW_LIMIT,
    enabled: isLoaded && isSignedIn,
  });
  const entityConfigDetailQuery = useCampaignAdminEntityConfigDetailQuery({
    campaignKey,
    entityCui,
    enabled: isLoaded && isSignedIn,
  });
  const updateEntityConfigMutation = useUpdateCampaignAdminEntityConfigMutation(
    campaignKey,
    entityCui,
  );

  const users = usersQuery.data?.items ?? [];
  const notifications = notificationsQuery.data?.items ?? [];
  const interactions = interactionsQuery.data?.items ?? [];
  const cachedEntitySummary = useMemo(() => {
    const cachedResponses = queryClient.getQueriesData<CampaignAdminEntitiesListResponse>(
      {
        queryKey: campaignAdminEntitiesKeys.entitiesForCampaign(campaignKey),
      },
    );

    for (const [, response] of cachedResponses) {
      const summary = findCachedEntitySummary(response, entityCui);
      if (summary !== null) {
        return summary;
      }
    }

    return null;
  }, [campaignKey, entityCui, queryClient, usersQuery.data, notificationsQuery.data, interactionsQuery.data]);
  const entityName = useMemo(
    () =>
      resolveEntityName({
        entityCui,
        summary: cachedEntitySummary,
        interactions,
        notifications,
        users,
      }),
    [cachedEntitySummary, entityCui, interactions, notifications, users],
  );
  const allSectionQueriesFailed =
    isLoaded &&
    isSignedIn &&
    usersQuery.error != null &&
    notificationsQuery.error != null &&
    interactionsQuery.error != null &&
    usersQuery.data === undefined &&
    notificationsQuery.data === undefined &&
    interactionsQuery.data === undefined;
  const title = entityName ?? entityCui;
  const summaryStats =
    cachedEntitySummary === null
      ? []
      : [
          {
            label: t`Users`,
            value: cachedEntitySummary.userCount,
          },
          {
            label: t`Interactions`,
            value: cachedEntitySummary.interactionCount,
          },
          {
            label: t`Pending reviews`,
            value: cachedEntitySummary.pendingReviewCount,
          },
          {
            label: t`Subscribers`,
            value: cachedEntitySummary.notificationSubscriberCount,
          },
          {
            label: t`Notifications`,
            value: cachedEntitySummary.notificationOutboxCount,
          },
        ];

  const refreshAll = () => {
    void Promise.all([
      usersQuery.refetch(),
      notificationsQuery.refetch(),
      interactionsQuery.refetch(),
      entityConfigDetailQuery.refetch(),
      activeTab === "threads"
        ? queryClient.invalidateQueries({
            queryKey:
              campaignAdminInstitutionThreadsKeys.allForCampaign(campaignKey),
          })
        : Promise.resolve(),
    ]);
  };

  const handleSubmitEntityConfig = async (
    body: CampaignAdminUpdateEntityConfigBody,
  ) => {
    await updateEntityConfigMutation.mutateAsync(body);
  };

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={title}
      description={t`Inspect the users, notifications, and interaction review activity associated with this entity.`}
      eyebrow={(
        <Breadcrumb className="py-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/admin/campaigns/$campaignKey" params={{ campaignKey }}>
                  {getCampaignAdminCampaignLabel(campaignKey)}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/entities"
                  params={{ campaignKey }}
                  search={createEntitiesRouteSearch()}
                >
                  {t`Entities`}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{entityCui}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      actions={(
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onSearchChange({
                ...normalizedSearch,
                tab: "overview",
                selectedEntityCui: undefined,
              })
            }
          >
            {t`Overview`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onSearchChange({
                ...normalizedSearch,
                tab: "threads",
                selectedEntityCui: undefined,
              })
            }
          >
            {t`Threads`}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              onSearchChange({
                ...normalizedSearch,
                tab: "config",
              })
            }
          >
            {t`Config`}
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="#users">{t`Users`}</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="#notifications">{t`Notifications`}</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href="#user-interactions">{t`User interactions`}</a>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={refreshAll}
            disabled={!isLoaded || !isSignedIn}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t`Refresh`}
          </Button>
        </>
      )}
      details={(
        <>
          <Badge variant="outline" className="font-mono">
            {t`CUI ${entityCui}`}
          </Badge>
          {cachedEntitySummary !== null ? (
            <>
              <InlineStat label={t`Users`} value={cachedEntitySummary.userCount} />
              <InlineStat
                label={t`Interactions`}
                value={cachedEntitySummary.interactionCount}
              />
              <InlineStat
                label={t`Pending reviews`}
                value={cachedEntitySummary.pendingReviewCount}
              />
              <InlineStat
                label={t`Notifications`}
                value={cachedEntitySummary.notificationOutboxCount}
              />
            </>
          ) : null}
        </>
      )}
    >
      {!isLoaded ? (
        <EntityDetailSkeleton />
      ) : !isSignedIn ? (
        <Card className="border-border/70 bg-card/80 shadow-none">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <LockKeyhole
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t`Sign in required`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t`You need an authenticated admin session to inspect entity-level campaign activity.`}
                </p>
              </div>
            </div>
            <AuthSignInButton>
              <Button>{t`Sign in again`}</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="border-border/70 bg-card/80 shadow-none">
            <CardHeader className="gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{title}</CardTitle>
                <Badge variant="outline" className="font-mono">
                  {entityCui}
                </Badge>
              </div>
              <CardDescription>
                {entityName
                  ? t`Use the preview sections below to inspect associated users, delivery activity, and review queue signals for this entity.`
                  : t`Use the preview sections below to inspect the campaign activity currently associated with this entity.`}
              </CardDescription>
            </CardHeader>
            {summaryStats.length > 0 ? (
              <CardContent className="space-y-3">
                <Collapsible
                  open={isSummaryExpanded}
                  onOpenChange={setIsSummaryExpanded}
                >
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {summaryStats.slice(0, 2).map((stat) => (
                      <SummaryCard
                        key={stat.label}
                        label={stat.label}
                        value={stat.value}
                      />
                    ))}
                    <CollapsibleContent className="contents">
                      {summaryStats.slice(2).map((stat) => (
                        <SummaryCard
                          key={stat.label}
                          label={stat.label}
                          value={stat.value}
                        />
                      ))}
                    </CollapsibleContent>
                  </div>
                  {summaryStats.length > 2 ? (
                    <CollapsibleTrigger asChild>
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <ChevronDown
                          className={`h-3.5 w-3.5 transition-transform ${isSummaryExpanded ? "rotate-180" : ""}`}
                          aria-hidden="true"
                        />
                        {isSummaryExpanded ? t`Show less` : t`Show more stats`}
                      </button>
                    </CollapsibleTrigger>
                  ) : null}
                </Collapsible>
              </CardContent>
            ) : null}
          </Card>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              onSearchChange({
                ...normalizedSearch,
                tab: value as "overview" | "threads" | "config",
                ...(value !== "config"
                  ? { selectedEntityCui: undefined }
                  : undefined),
              })
            }
            className="space-y-4"
          >
            <TabsList>
              <TabsTrigger value="overview">{t`Overview`}</TabsTrigger>
              <TabsTrigger value="threads">
                <span className="inline-flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" aria-hidden="true" />
                  {t`Threads`}
                </span>
              </TabsTrigger>
              <TabsTrigger value="config">{t`Config`}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {allSectionQueriesFailed ? (
                <SectionError
                  title={t`Failed to load entity detail`}
                  description={t`All entity sections failed to load. Retry the requests or open the filtered full pages below once the admin services recover.`}
                  onRetry={refreshAll}
                />
              ) : null}

              <SectionShell
                id="users"
                title={t`Users associated with this entity`}
                description={t`Preview the users currently returned by the campaign users directory for this entity.`}
                fullPageLink={(
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/admin/campaigns/$campaignKey/users"
                      params={{ campaignKey }}
                      search={createEntityUsersRouteSearch(entityCui)}
                    >
                      {t`View full page`}
                    </Link>
                  </Button>
                )}
              >
                {usersQuery.error ? (
                  <SectionError
                    title={t`Failed to load users`}
                    description={usersQuery.error.message}
                    onRetry={() => {
                      void usersQuery.refetch();
                    }}
                  />
                ) : usersQuery.isLoading && usersQuery.data === undefined ? (
                  <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-border/70 bg-background/30">
                    <LoadingSpinner />
                  </div>
                ) : users.length === 0 ? (
                  <EmptyState
                    title={t`No users found for this entity`}
                    description={t`No users are currently returned for this entity in the campaign users directory.`}
                    className="rounded-3xl border border-border/70 bg-background/30 p-10"
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <CampaignAdminUsersTable
                      campaignKey={campaignKey}
                      entityCui={entityCui}
                      items={users}
                    />
                  </div>
                )}
              </SectionShell>

              <SectionShell
                id="notifications"
                title={t`Notifications related to this entity`}
                description={t`Preview the most recent notification audit entries filtered to this entity.`}
                fullPageLink={(
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/admin/campaigns/$campaignKey/notifications"
                      params={{ campaignKey }}
                      search={createEntityNotificationsRouteSearch(entityCui)}
                    >
                      {t`View full page`}
                    </Link>
                  </Button>
                )}
              >
                {notificationsQuery.error ? (
                  <SectionError
                    title={t`Failed to load notifications`}
                    description={notificationsQuery.error.message}
                    onRetry={() => {
                      void notificationsQuery.refetch();
                    }}
                  />
                ) : notificationsQuery.isLoading &&
                  notificationsQuery.data === undefined ? (
                  <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-border/70 bg-background/30">
                    <LoadingSpinner />
                  </div>
                ) : notifications.length === 0 ? (
                  <EmptyState
                    title={t`No notifications found for this entity`}
                    description={t`No campaign notification audit entries were recorded for this entity in the current admin projection.`}
                    className="rounded-3xl border border-border/70 bg-background/30 p-10"
                  />
                ) : (
                  <CampaignAdminNotificationsTable
                    campaignKey={campaignKey}
                    items={notifications}
                    defaultVisibleColumnIds={NOTIFICATION_PREVIEW_COLUMNS}
                    onClearFilters={() => undefined}
                    onPreviewTemplate={() => undefined}
                  />
                )}
              </SectionShell>

              <SectionShell
                id="user-interactions"
                title={t`User interactions for this entity`}
                description={t`Preview the latest interaction records currently filtered to this entity.`}
                fullPageLink={(
                  <Button asChild variant="outline" size="sm">
                    <Link
                      to="/admin/campaigns/$campaignKey/user-interactions"
                      params={{ campaignKey }}
                      search={createEntityInteractionsRouteSearch(entityCui)}
                    >
                      {t`View full page`}
                    </Link>
                  </Button>
                )}
              >
                {interactionsQuery.error ? (
                  <SectionError
                    title={t`Failed to load interactions`}
                    description={interactionsQuery.error.message}
                    onRetry={() => {
                      void interactionsQuery.refetch();
                    }}
                  />
                ) : interactionsQuery.isLoading &&
                  interactionsQuery.data === undefined ? (
                  <div className="flex min-h-[12rem] items-center justify-center rounded-3xl border border-border/70 bg-background/30">
                    <LoadingSpinner />
                  </div>
                ) : interactions.length === 0 ? (
                  <EmptyState
                    title={t`No interactions found for this entity`}
                    description={t`No interaction records currently match this entity in the campaign review queue.`}
                    className="rounded-3xl border border-border/70 bg-background/30 p-10"
                  />
                ) : (
                  <EntityInteractionsPreviewTable
                    campaignKey={campaignKey}
                    entityCui={entityCui}
                    items={interactions}
                  />
                )}
              </SectionShell>
            </TabsContent>

            <TabsContent value="threads" className="space-y-4">
              <Card className="border-border/70 bg-card/80 shadow-none">
                <CardHeader>
                  <CardTitle>{t`Institution threads for this entity`}</CardTitle>
                  <CardDescription>
                    {t`Review thread activity for this entity without leaving the entity detail workflow. The entity scope is fixed here.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeTab === "threads" ? (
                    <CampaignAdminInstitutionThreadsSection
                      campaignKey={campaignKey}
                      search={threadsSearch}
                      onSearchChange={(nextThreadSearch, options) => {
                        onSearchChange(
                          mergeCampaignAdminInstitutionThreadsSearchIntoEntitiesSearch(
                            normalizedSearch,
                            nextThreadSearch,
                          ),
                          options,
                        );
                      }}
                      showEntityFilter={false}
                      lockedEntityCui={entityCui}
                    />
                  ) : null}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="space-y-4">
              <Card className="border-border/70 bg-card/80 shadow-none">
                <CardHeader>
                  <CardTitle>{t`Entity config`}</CardTitle>
                  <CardDescription>
                    {t`Create or update the campaign entity config for this municipality. The values are saved with optimistic concurrency protection.`}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <CampaignAdminEntityConfigEditor
                    entityCui={entityCui}
                    entity={entityConfigDetailQuery.data ?? null}
                    isLoading={
                      entityConfigDetailQuery.isLoading ||
                      entityConfigDetailQuery.isFetching
                    }
                    errorMessage={entityConfigDetailQuery.error?.message}
                    submitErrorMessage={updateEntityConfigMutation.error?.message}
                    isSubmitting={updateEntityConfigMutation.isPending}
                    onSubmit={handleSubmitEntityConfig}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AdminCampaignLayout>
  );
}
