import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  Mail,
  Users,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import { useCampaignAdminEntitiesMetaQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entities";
import {
  useCampaignAdminNotificationsMetaQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import { useCampaignAdminStatsOverviewQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-stats";
import { useCampaignAdminInteractionMetaQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions";
import { useCampaignAdminUsersMetaQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-users";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesMetaResponse,
  CampaignAdminNotificationsMetaResponse,
  CampaignAdminStatsOverview,
  CampaignAdminUsersMetaResponse,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminHubPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
};

function createCampaignAdminUsersRouteSearch() {
  return {
    query: undefined,
    entityCui: undefined,
    sortBy: undefined,
    sortOrder: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: 50,
  };
}

function createCampaignAdminQueueRouteSearch() {
  return {
    phase: undefined,
    reviewStatusMode: undefined,
    reviewStatus: "pending" as const,
    interactionId: undefined,
    lessonId: undefined,
    entityCui: undefined,
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

function createCampaignAdminNotificationsRouteSearch() {
  return {
    tab: "audit" as const,
    notificationType: undefined,
    templateId: undefined,
    userId: undefined,
    status: undefined,
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

function createCampaignAdminEntitiesRouteSearch() {
  return {
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
  };
}

function UsersHubCardSummary({
  meta,
  totalInteractions,
  isLoading,
}: {
  readonly meta?: CampaignAdminUsersMetaResponse;
  readonly totalInteractions: number;
  readonly isLoading: boolean;
}) {
  if (meta === undefined) {
    return (
      <p className="mt-0.5 text-sm text-muted-foreground">
        {isLoading
          ? t`Loading…`
          : t`Browse ${totalInteractions} interactions across all users`}
      </p>
    );
  }

  return (
    <div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t`${meta.totalUsers} users · ${meta.usersWithPendingReviews} need review`}
      </p>
    </div>
  );
}

function EntitiesHubCardSummary({
  meta,
}: {
  readonly meta?: CampaignAdminEntitiesMetaResponse;
}) {
  if (meta === undefined) {
    return (
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t`View entity-level campaign state across users, interactions, and delivery activity`}
      </p>
    );
  }

  return (
    <div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t`${meta.totalEntities} tracked · ${meta.entitiesWithPendingReviews} pending`}
      </p>
      {meta.entitiesWithFailedNotifications > 0 ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {t`${meta.entitiesWithFailedNotifications} delivery issues`}
        </p>
      ) : null}
    </div>
  );
}

function NotificationsHubCardSummary({
  meta,
}: {
  readonly meta?: CampaignAdminNotificationsMetaResponse;
}) {
  if (meta === undefined) {
    return (
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t`Audit campaign notification activity, preview matches, and send notifications`}
      </p>
    );
  }

  return (
    <div>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {t`${meta.pendingDeliveryCount} pending delivery · ${meta.replyReceivedCount} replies`}
      </p>
      {meta.failedDeliveryCount > 0 ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">
          {t`${meta.failedDeliveryCount} failed deliveries`}
        </p>
      ) : null}
    </div>
  );
}

function AnalyticsFeaturedBlock({
  campaignKey,
  overview,
  isLoading,
}: {
  readonly campaignKey: string;
  readonly overview?: CampaignAdminStatsOverview;
  readonly isLoading: boolean;
}) {
  if (overview === undefined) {
    return (
      <Link
        to="/admin/campaigns/$campaignKey/analytics"
        params={{ campaignKey }}
        className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-border hover:bg-muted/20"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <BarChart3 className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {isLoading ? t`Loading campaign analytics…` : t`Campaign analytics`}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {t`View campaign totals and current distributions across users, interactions, entities, and notifications`}
          </p>
        </div>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </Link>
    );
  }

  return (
    <Link
      to="/admin/campaigns/$campaignKey/analytics"
      params={{ campaignKey }}
      className="group flex items-center gap-4 rounded-xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-border hover:bg-muted/20"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <BarChart3 className="h-5 w-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {t`Campaign analytics`}
        </p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {t`${overview.entities.totalEntities} entities · ${overview.notifications.deliveredCount} delivered · ${overview.notifications.openedCount} opened · ${overview.users.usersWithPendingReviews} users need review`}
        </p>
      </div>
      <ArrowRight
        className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}

export function CampaignAdminHubPage({
  campaignKey,
}: CampaignAdminHubPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const isHubQueriesEnabled = isLoaded && isSignedIn;
  const metaQuery = useCampaignAdminInteractionMetaQuery({
    campaignKey,
    enabled: isHubQueriesEnabled,
  });
  const usersMetaQuery = useCampaignAdminUsersMetaQuery({
    campaignKey,
    enabled: isHubQueriesEnabled,
  });
  const entitiesMetaQuery = useCampaignAdminEntitiesMetaQuery({
    campaignKey,
    enabled: isHubQueriesEnabled,
  });
  const notificationsMetaQuery = useCampaignAdminNotificationsMetaQuery({
    campaignKey,
    enabled: isHubQueriesEnabled,
  });
  const statsOverviewQuery = useCampaignAdminStatsOverviewQuery({
    campaignKey,
    enabled: isHubQueriesEnabled,
  });

  const stats = metaQuery.data?.stats;
  const pendingCount = stats?.reviewStatusCounts.pending ?? 0;
  const totalInteractions = stats?.total ?? 0;
  const approvedCount = stats?.reviewStatusCounts.approved ?? 0;
  const rejectedCount = stats?.reviewStatusCounts.rejected ?? 0;
  const riskFlaggedCount = stats?.riskFlagged ?? 0;
  const usersMeta = usersMetaQuery.data;
  const entitiesMeta = entitiesMetaQuery.data;
  const notificationsMeta = notificationsMetaQuery.data;

  const campaignLabel = getCampaignAdminCampaignLabel(campaignKey);

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={t`Campaign Admin: ${campaignLabel}`}
      description={t`Overview of the ${campaignLabel} campaign workspace. Inspect user activity, review pending interactions, or manage campaign notifications.`}
    >
      {!isLoaded ? (
        <div className="flex min-h-40 items-center justify-center py-6">
          <LoadingSpinner />
        </div>
      ) : !isSignedIn ? (
        <div className="py-6">
          <p className="text-sm font-medium text-foreground">
            {t`Sign in required`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t`You need an authenticated admin session to access the campaign workspace.`}
          </p>
          <AuthSignInButton>
            <button className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
              {t`Sign in`}
            </button>
          </AuthSignInButton>
        </div>
      ) : metaQuery.error ? (
        <div className="py-6">
          <p className="text-sm font-medium text-foreground">
            {t`Failed to load campaign data`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {metaQuery.error.message}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t`Interactions`}
              </span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {totalInteractions}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t`Pending`}
              </span>
              <span className="text-lg font-semibold tabular-nums text-amber-600 dark:text-amber-400">
                {pendingCount}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t`Approved`}
              </span>
              <span className="text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {approvedCount}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                {t`Rejected`}
              </span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {rejectedCount}
              </span>
            </div>
            {riskFlaggedCount > 0 ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  {t`Flagged`}
                </span>
                <span className="text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                  {riskFlaggedCount}
                </span>
              </div>
            ) : null}
          </div>

          <AnalyticsFeaturedBlock
            campaignKey={campaignKey}
            overview={statsOverviewQuery.data}
            isLoading={statsOverviewQuery.isLoading}
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Link
              to="/admin/campaigns/$campaignKey/users"
              params={{ campaignKey }}
              search={createCampaignAdminUsersRouteSearch()}
              className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-border hover:bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Users className="h-5 w-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t`Users`}
                </p>
                <UsersHubCardSummary
                  meta={usersMeta}
                  totalInteractions={totalInteractions}
                  isLoading={metaQuery.isLoading}
                />
              </div>
            </Link>

            <Link
              to="/admin/campaigns/$campaignKey/entities"
              params={{ campaignKey }}
              search={createCampaignAdminEntitiesRouteSearch()}
              className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-border hover:bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Building2 className="h-5 w-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t`Entities`}
                </p>
                <EntitiesHubCardSummary meta={entitiesMeta} />
              </div>
            </Link>

            <Link
              to="/admin/campaigns/$campaignKey/user-interactions"
              params={{ campaignKey }}
              search={createCampaignAdminQueueRouteSearch()}
              className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-border hover:bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <ClipboardList className="h-5 w-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t`Interactions Queue`}
                </p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {metaQuery.isLoading
                    ? t`Loading…`
                    : t`${pendingCount} pending · ${approvedCount} approved · ${rejectedCount} rejected`}
                </p>
              </div>
              {riskFlaggedCount > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  {t`${riskFlaggedCount} flagged for review`}
                </p>
              )}
            </Link>

            <Link
              to="/admin/campaigns/$campaignKey/notifications"
              params={{ campaignKey }}
              search={createCampaignAdminNotificationsRouteSearch()}
              className="group flex flex-col gap-3 rounded-xl border border-border/70 bg-card/80 p-5 transition-colors hover:border-border hover:bg-muted/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <Mail className="h-5 w-5" aria-hidden="true" />
                </div>
                <ArrowRight
                  className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {t`Notifications`}
                </p>
                <NotificationsHubCardSummary meta={notificationsMeta} />
              </div>
            </Link>
          </div>
        </div>
      )}
    </AdminCampaignLayout>
  );
}
