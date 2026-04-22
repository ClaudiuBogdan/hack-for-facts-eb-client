import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  campaignAdminStatsTopEntitiesSortByValues,
  type CampaignAdminStatsInteractionsByTypeResponse,
  type CampaignAdminStatsOverview,
  type CampaignAdminStatsTopEntitiesResponse,
  type CampaignAdminStatsTopEntitiesSortBy,
} from "@/features/campaigns/buget/admin/types";
import { AnalyticsSectionHeader } from "./AnalyticsSectionHeader";
import { CampaignAdminStatsMetricCard } from "./CampaignAdminStatsMetricCard";

type CampaignAdminStatsOverviewPanelProps = {
  readonly campaignKey: string;
  readonly overview: CampaignAdminStatsOverview;
  readonly interactionsByType?: CampaignAdminStatsInteractionsByTypeResponse;
  readonly isInteractionsByTypeLoading: boolean;
  readonly interactionsByTypeErrorMessage?: string;
  readonly topEntitiesBySort: Partial<
    Record<CampaignAdminStatsTopEntitiesSortBy, CampaignAdminStatsTopEntitiesResponse>
  >;
  readonly topEntitiesLoadingBySort: Readonly<
    Record<CampaignAdminStatsTopEntitiesSortBy, boolean>
  >;
  readonly topEntitiesErrorMessages: Partial<
    Record<CampaignAdminStatsTopEntitiesSortBy, string>
  >;
  readonly className?: string;
};

type DistributionItem = {
  readonly label: string;
  readonly value: number;
  readonly description?: string;
  readonly href?: string;
};

const TOP_ENTITIES_SORT_LABELS: Readonly<
  Record<CampaignAdminStatsTopEntitiesSortBy, string>
> = {
  interactionCount: t`Top by interactions`,
  userCount: t`Top by users`,
  pendingReviewCount: t`Top by pending reviews`,
};

function createCampaignAdminUsersRouteSearch(input?: {
  readonly entityCui?: string;
}) {
  return {
    query: undefined,
    entityCui: input?.entityCui,
    sortBy: undefined,
    sortOrder: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: 50,
  };
}

function createCampaignAdminQueueRouteSearch(input?: {
  readonly interactionId?: string;
  readonly entityCui?: string;
  readonly reviewStatus?: "pending" | "approved" | "rejected";
  readonly reviewStatusMode?: "all";
}) {
  return {
    phase: undefined,
    reviewStatusMode: input?.reviewStatusMode,
    reviewStatus: input?.reviewStatus,
    interactionId: input?.interactionId,
    lessonId: undefined,
    entityCui: input?.entityCui,
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
    sortBy: undefined,
    sortOrder: undefined,
    reviewSelectionKey: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: 50,
  };
}

function createCampaignAdminEntitiesRouteSearch() {
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
    limit: 50,
    configEntityCui: undefined,
    configBudgetPublicationDate: undefined,
    configHasBudgetPublicationDate: undefined,
    configOfficialBudgetUrl: undefined,
    configHasOfficialBudgetUrl: undefined,
    configHasPublicDebate: undefined,
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

function createCampaignAdminNotificationsRouteSearch(input?: {
  readonly status?: string;
}) {
  return {
    tab: "audit" as const,
    notificationType: undefined,
    templateId: undefined,
    userId: undefined,
    status: input?.status,
    eventType: undefined,
    entityCui: undefined,
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
    limit: 50,
  };
}

function buildCampaignAdminHref(
  pathname: string,
  search?: Record<string, string | number | boolean | undefined>,
) {
  if (search === undefined) {
    return pathname;
  }

  const query = new URLSearchParams(
    Object.entries(search)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, String(value)]),
  ).toString();

  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

function sortDistributionItems(
  items: readonly DistributionItem[],
): readonly DistributionItem[] {
  return [...items].sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }

    return left.label.localeCompare(right.label);
  });
}

type AnalyticsSectionProps = {
  readonly title: string;
  readonly description: string;
  readonly actionHref?: string;
  readonly actionLabel?: string;
  readonly children: ReactNode;
};

function AnalyticsSection({
  title,
  description,
  actionHref,
  actionLabel,
  children,
}: AnalyticsSectionProps) {
  return (
    <section className="space-y-3" aria-label={title}>
      <AnalyticsSectionHeader
        title={title}
        description={description}
        actionHref={actionHref}
        actionLabel={actionLabel}
      />
      {children}
    </section>
  );
}

function SectionMessage({
  message,
}: {
  readonly message: string;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border/70 bg-card/80 px-4 py-3 text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function DistributionList({
  items,
  onNavigate,
}: {
  readonly items: readonly DistributionItem[];
  readonly onNavigate: (href: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2"
        >
          {item.href ? (
            <button
              type="button"
              onClick={() => {
                onNavigate(item.href!);
              }}
              className="flex w-full items-start justify-between gap-3 text-left hover:text-primary"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {item.value}
              </span>
            </button>
          ) : (
            <div className="flex w-full items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                {item.description ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {item.description}
                  </p>
                ) : null}
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {item.value}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function renderInteractionLabel(input: {
  readonly label: string | null;
  readonly interactionId: string;
}) {
  if (input.label !== null) {
    return (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{input.label}</p>
        <p className="truncate text-xs text-muted-foreground">
          {input.interactionId}
        </p>
      </div>
    );
  }

  return (
    <p className="break-all font-medium text-foreground">{input.interactionId}</p>
  );
}

function InteractionsByTypeTable({
  campaignKey,
  data,
}: {
  readonly campaignKey: string;
  readonly data: CampaignAdminStatsInteractionsByTypeResponse;
}) {
  const maxTotal = Math.max(...data.items.map((item) => item.total), 1);

  return (
    <Table
      containerClassName="rounded-xl border border-border/60 bg-card/80"
      className="min-w-[760px]"
    >
      <TableHeader>
        <TableRow>
          <TableHead>{t`Interaction element`}</TableHead>
          <TableHead className="w-32">{t`Total`}</TableHead>
          <TableHead className="w-24">{t`Pending`}</TableHead>
          <TableHead className="w-24">{t`Approved`}</TableHead>
          <TableHead className="w-24">{t`Rejected`}</TableHead>
          <TableHead className="w-28">{t`Not reviewed`}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((item) => (
          <TableRow key={item.interactionId}>
            <TableCell>
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  interactionId: item.interactionId,
                })}
                className="block hover:text-primary"
              >
                {renderInteractionLabel(item)}
              </Link>
            </TableCell>
            <TableCell>
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  interactionId: item.interactionId,
                })}
                className="block hover:text-primary"
              >
                <div className="space-y-1">
                  <p className="font-semibold tabular-nums text-foreground">
                    {item.total}
                  </p>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary/70"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round((item.total / maxTotal) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  interactionId: item.interactionId,
                  reviewStatus: "pending",
                })}
                className="font-medium hover:text-primary"
              >
                {item.pending}
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  interactionId: item.interactionId,
                  reviewStatus: "approved",
                })}
                className="font-medium hover:text-primary"
              >
                {item.approved}
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  interactionId: item.interactionId,
                  reviewStatus: "rejected",
                })}
                className="font-medium hover:text-primary"
              >
                {item.rejected}
              </Link>
            </TableCell>
            <TableCell className="tabular-nums">
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  interactionId: item.interactionId,
                  reviewStatusMode: "all",
                })}
                className="font-medium hover:text-primary"
              >
                {item.notReviewed}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function renderEntityLabel(input: {
  readonly entityName: string | null;
  readonly entityCui: string;
}) {
  if (input.entityName !== null) {
    return (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground">{input.entityName}</p>
        <p className="truncate text-xs text-muted-foreground">
          {input.entityCui}
        </p>
      </div>
    );
  }

  return <p className="font-medium text-foreground">{input.entityCui}</p>;
}

function TopEntitiesTable({
  campaignKey,
  data,
}: {
  readonly campaignKey: string;
  readonly data: CampaignAdminStatsTopEntitiesResponse;
}) {
  return (
    <Table
      containerClassName="rounded-xl border border-border/60 bg-card/80"
      className="min-w-[760px]"
    >
      <TableHeader>
        <TableRow>
          <TableHead>{t`Entity`}</TableHead>
          <TableHead
            className={cn(
              "w-32",
              data.sortBy === "interactionCount" ? "text-foreground" : undefined,
            )}
          >
            {t`Interactions`}
          </TableHead>
          <TableHead
            className={cn(
              "w-24",
              data.sortBy === "userCount" ? "text-foreground" : undefined,
            )}
          >
            {t`Users`}
          </TableHead>
          <TableHead
            className={cn(
              "w-36",
              data.sortBy === "pendingReviewCount" ? "text-foreground" : undefined,
            )}
          >
            {t`Pending reviews`}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.items.map((item) => (
          <TableRow key={item.entityCui}>
            <TableCell>
              <Link
                to="/admin/campaigns/$campaignKey/entities/$entityCui"
                params={{ campaignKey, entityCui: item.entityCui }}
                search={createCampaignAdminEntitiesRouteSearch()}
                className="block hover:text-primary"
              >
                {renderEntityLabel(item)}
              </Link>
            </TableCell>
            <TableCell
              className={cn(
                "tabular-nums",
                data.sortBy === "interactionCount"
                  ? "font-semibold text-foreground"
                  : undefined,
              )}
            >
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  entityCui: item.entityCui,
                })}
                className="hover:text-primary"
              >
                {item.interactionCount}
              </Link>
            </TableCell>
            <TableCell
              className={cn(
                "tabular-nums",
                data.sortBy === "userCount"
                  ? "font-semibold text-foreground"
                  : undefined,
              )}
            >
              <Link
                to="/admin/campaigns/$campaignKey/users"
                params={{ campaignKey }}
                search={createCampaignAdminUsersRouteSearch({
                  entityCui: item.entityCui,
                })}
                className="hover:text-primary"
              >
                {item.userCount}
              </Link>
            </TableCell>
            <TableCell
              className={cn(
                "tabular-nums",
                data.sortBy === "pendingReviewCount"
                  ? "font-semibold text-foreground"
                  : undefined,
              )}
            >
              <Link
                to="/admin/campaigns/$campaignKey/user-interactions"
                params={{ campaignKey }}
                search={createCampaignAdminQueueRouteSearch({
                  entityCui: item.entityCui,
                  reviewStatus: "pending",
                })}
                className="hover:text-primary"
              >
                {item.pendingReviewCount}
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CampaignAdminStatsOverviewPanel({
  campaignKey,
  overview,
  interactionsByType,
  isInteractionsByTypeLoading,
  interactionsByTypeErrorMessage,
  topEntitiesBySort,
  topEntitiesLoadingBySort,
  topEntitiesErrorMessages,
  className,
}: CampaignAdminStatsOverviewPanelProps) {
  const navigate = useNavigate({
    from: "/admin/campaigns/$campaignKey/analytics",
  });
  const [topEntitiesSortBy, setTopEntitiesSortBy] =
    useState<CampaignAdminStatsTopEntitiesSortBy>("interactionCount");

  const summaryMetrics = [
    {
      label: t`Users in scope`,
      value: overview.users.totalUsers,
      description: t`Current users visible inside campaign admin.`,
    },
    {
      label: t`Total interactions`,
      value: overview.interactions.totalInteractions,
      description: t`Current interaction records returned by the campaign workspace.`,
    },
    {
      label: t`Tracked entities`,
      value: overview.entities.totalEntities,
      description: t`Entities currently represented in campaign admin state.`,
    },
    {
      label: t`Pending reviews`,
      value: overview.interactions.reviewStatusCounts.pending,
      description: t`Interaction records still waiting on admin review.`,
    },
    {
      label: t`Delivered`,
      value: overview.notifications.deliveredCount,
      description: t`Notifications confirmed as delivered.`,
    },
    {
      label: t`Clicked`,
      value: overview.notifications.clickedCount,
      description: t`Delivered notifications with at least one click event.`,
    },
  ] as const;

  const reviewStatusDistribution = sortDistributionItems([
    {
      label: t`Pending`,
      value: overview.interactions.reviewStatusCounts.pending,
      description: t`Still waiting on admin review.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/user-interactions`,
        createCampaignAdminQueueRouteSearch({
          reviewStatus: "pending",
        }),
      ),
    },
    {
      label: t`Approved`,
      value: overview.interactions.reviewStatusCounts.approved,
      description: t`Already approved by admins.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/user-interactions`,
        createCampaignAdminQueueRouteSearch({
          reviewStatus: "approved",
        }),
      ),
    },
    {
      label: t`Rejected`,
      value: overview.interactions.reviewStatusCounts.rejected,
      description: t`Already rejected by admins.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/user-interactions`,
        createCampaignAdminQueueRouteSearch({
          reviewStatus: "rejected",
        }),
      ),
    },
    {
      label: t`Not reviewed`,
      value: overview.interactions.reviewStatusCounts.notReviewed,
      description: t`Visible but not yet reviewable.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/user-interactions`,
        createCampaignAdminQueueRouteSearch({
          reviewStatusMode: "all",
        }),
      ),
    },
  ]);

  const notificationDistribution = sortDistributionItems([
    {
      label: t`Delivered`,
      value: overview.notifications.deliveredCount,
      description: t`Notifications confirmed as delivered.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/notifications`,
        createCampaignAdminNotificationsRouteSearch({
          status: "delivered",
        }),
      ),
    },
    {
      label: t`Opened`,
      value: overview.notifications.openedCount,
      description: t`Delivered notifications with an open event.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/notifications`,
        createCampaignAdminNotificationsRouteSearch(),
      ),
    },
    {
      label: t`Clicked`,
      value: overview.notifications.clickedCount,
      description: t`Delivered notifications with a click event.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/notifications`,
        createCampaignAdminNotificationsRouteSearch(),
      ),
    },
    {
      label: t`Pending delivery`,
      value: overview.notifications.pendingDeliveryCount,
      description: t`Notifications still waiting to be delivered.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/notifications`,
        createCampaignAdminNotificationsRouteSearch({
          status: "pending",
        }),
      ),
    },
    {
      label: t`Failed`,
      value: overview.notifications.failedDeliveryCount,
      description: t`Notifications that failed delivery.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/notifications`,
        createCampaignAdminNotificationsRouteSearch(),
      ),
    },
    {
      label: t`Suppressed`,
      value: overview.notifications.suppressedCount,
      description: t`Notifications suppressed before delivery.`,
      href: buildCampaignAdminHref(
        `/admin/campaigns/${campaignKey}/notifications`,
        createCampaignAdminNotificationsRouteSearch({
          status: "suppressed",
        }),
      ),
    },
  ]);

  const selectedTopEntities = topEntitiesBySort[topEntitiesSortBy];
  const selectedTopEntitiesErrorMessage =
    topEntitiesErrorMessages[topEntitiesSortBy];
  const isSelectedTopEntitiesLoading = topEntitiesLoadingBySort[topEntitiesSortBy];
  const handleDistributionNavigate = (href: string) => {
    void navigate({ href });
  };

  return (
    <div className={cn("space-y-8", className)}>
      <AnalyticsSection
        title={t`Current totals`}
        description={t`A compact snapshot of campaign scale, review load, and notification reach.`}
        actionHref={`/admin/campaigns/${campaignKey}/users`}
        actionLabel={t`Users`}
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Link
            to="/admin/campaigns/$campaignKey/users"
            params={{ campaignKey }}
            search={createCampaignAdminUsersRouteSearch()}
            className="block"
          >
            <CampaignAdminStatsMetricCard {...summaryMetrics[0]} />
          </Link>
          <Link
            to="/admin/campaigns/$campaignKey/user-interactions"
            params={{ campaignKey }}
            search={createCampaignAdminQueueRouteSearch()}
            className="block"
          >
            <CampaignAdminStatsMetricCard {...summaryMetrics[1]} />
          </Link>
          <Link
            to="/admin/campaigns/$campaignKey/entities"
            params={{ campaignKey }}
            search={createCampaignAdminEntitiesRouteSearch()}
            className="block"
          >
            <CampaignAdminStatsMetricCard {...summaryMetrics[2]} />
          </Link>
          <Link
            to="/admin/campaigns/$campaignKey/user-interactions"
            params={{ campaignKey }}
            search={createCampaignAdminQueueRouteSearch({
              reviewStatus: "pending",
            })}
            className="block"
          >
            <CampaignAdminStatsMetricCard {...summaryMetrics[3]} />
          </Link>
          <Link
            to="/admin/campaigns/$campaignKey/notifications"
            params={{ campaignKey }}
            search={createCampaignAdminNotificationsRouteSearch({
              status: "delivered",
            })}
            className="block"
          >
            <CampaignAdminStatsMetricCard {...summaryMetrics[4]} />
          </Link>
          <Link
            to="/admin/campaigns/$campaignKey/notifications"
            params={{ campaignKey }}
            search={createCampaignAdminNotificationsRouteSearch()}
            className="block"
          >
            <CampaignAdminStatsMetricCard {...summaryMetrics[5]} />
          </Link>
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title={t`Top interaction elements`}
        description={t`Use the dedicated ranked stats route to see which interaction elements drive the most activity and where review load is concentrated.`}
        actionHref={`/admin/campaigns/${campaignKey}/user-interactions`}
        actionLabel={t`Interactions`}
      >
        {isInteractionsByTypeLoading && interactionsByType === undefined ? (
          <SectionMessage
            message={t`Loading ranked interaction analytics…`}
          />
        ) : interactionsByTypeErrorMessage ? (
          <SectionMessage message={interactionsByTypeErrorMessage} />
        ) : interactionsByType && interactionsByType.items.length > 0 ? (
          <InteractionsByTypeTable
            campaignKey={campaignKey}
            data={interactionsByType}
          />
        ) : (
          <SectionMessage
            message={t`No ranked interaction analytics are available for this campaign yet.`}
          />
        )}
      </AnalyticsSection>

      <AnalyticsSection
        title={t`Top entities`}
        description={t`Rank entities by interactions, users, or pending reviews without reusing the operational entity endpoints.`}
        actionHref={`/admin/campaigns/${campaignKey}/entities`}
        actionLabel={t`Entities`}
      >
        <div className="space-y-3"
        >
          <div className="inline-flex flex-wrap gap-2 rounded-lg bg-muted/70 p-1">
            {campaignAdminStatsTopEntitiesSortByValues.map((sortBy) => (
              <button
                key={sortBy}
                type="button"
                onClick={() => setTopEntitiesSortBy(sortBy)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  topEntitiesSortBy === sortBy
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
                aria-pressed={topEntitiesSortBy === sortBy}
              >
                {TOP_ENTITIES_SORT_LABELS[sortBy]}
              </button>
            ))}
          </div>

          {isSelectedTopEntitiesLoading && selectedTopEntities === undefined ? (
            <SectionMessage message={t`Loading ranked entity analytics…`} />
          ) : selectedTopEntitiesErrorMessage ? (
            <SectionMessage message={selectedTopEntitiesErrorMessage} />
          ) : selectedTopEntities && selectedTopEntities.items.length > 0 ? (
            <TopEntitiesTable
              campaignKey={campaignKey}
              data={selectedTopEntities}
            />
          ) : (
            <SectionMessage
              message={t`No ranked entity analytics are available for this campaign yet.`}
            />
          )}
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title={t`Operational distributions`}
        description={t`These aggregates remain useful for understanding current review pressure and notification outcomes at a glance.`}
        actionHref={`/admin/campaigns/${campaignKey}/user-interactions`}
        actionLabel={t`Review queue`}
      >
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t`Review status`}
            </h3>
            <DistributionList
              items={reviewStatusDistribution}
              onNavigate={handleDistributionNavigate}
            />
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              {t`Notification funnel`}
            </h3>
            <DistributionList
              items={notificationDistribution}
              onNavigate={handleDistributionNavigate}
            />
          </div>
        </div>
      </AnalyticsSection>

      <AnalyticsSection
        title={t`Coverage`}
        description={t`These capability flags clarify which analytics dimensions exist today and which are still unavailable.`}
        actionHref={`/admin/campaigns/${campaignKey}/notifications`}
        actionLabel={t`Notifications`}
      >
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={
              overview.coverage.hasClientTelemetry ? "success" : "outline"
            }
            className="rounded-full px-3 py-1"
          >
            {overview.coverage.hasClientTelemetry
              ? t`Client telemetry available`
              : t`Client telemetry not available yet`}
          </Badge>
          <Badge
            variant={
              overview.coverage.hasNotificationAttribution
                ? "success"
                : "outline"
            }
            className="rounded-full px-3 py-1"
          >
            {overview.coverage.hasNotificationAttribution
              ? t`Notification attribution available`
              : t`Notification attribution not available yet`}
          </Badge>
        </div>
      </AnalyticsSection>
    </div>
  );
}
