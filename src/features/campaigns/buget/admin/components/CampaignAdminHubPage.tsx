import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
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
import { useCampaignAdminInteractionMetaQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";

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

export function CampaignAdminHubPage({
  campaignKey,
}: CampaignAdminHubPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const metaQuery = useCampaignAdminInteractionMetaQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn,
  });

  const stats = metaQuery.data?.stats;
  const pendingCount = stats?.reviewStatusCounts.pending ?? 0;
  const totalInteractions = stats?.total ?? 0;
  const approvedCount = stats?.reviewStatusCounts.approved ?? 0;
  const rejectedCount = stats?.reviewStatusCounts.rejected ?? 0;
  const riskFlaggedCount = stats?.riskFlagged ?? 0;

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-sm font-semibold text-foreground">{t`Users`}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {metaQuery.isLoading
                  ? t`Loading\u2026`
                  : t`Browse ${totalInteractions} interactions across all users`}
              </p>
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
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t`View entity-level campaign state across users, interactions, and delivery activity`}
              </p>
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
                  ? t`Loading\u2026`
                  : t`${pendingCount} pending \u00b7 ${approvedCount} approved \u00b7 ${rejectedCount} rejected`}
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
              <p className="mt-0.5 text-sm text-muted-foreground">
                {t`Audit campaign notification activity, run manual triggers, and preview templates`}
              </p>
            </div>
          </Link>
        </div>
      )}
    </AdminCampaignLayout>
  );
}
