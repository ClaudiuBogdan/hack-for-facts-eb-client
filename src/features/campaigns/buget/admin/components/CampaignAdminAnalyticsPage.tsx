import { t } from "@lingui/core/macro";
import { Link } from "@tanstack/react-router";
import { LockKeyhole, RefreshCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminStatsOverviewPanel } from "@/features/campaigns/buget/admin/components/CampaignAdminStatsOverviewPanel";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import {
  useCampaignAdminStatsInteractionsByTypeQuery,
  useCampaignAdminStatsOverviewQuery,
  useCampaignAdminStatsTopEntitiesQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-stats";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";

type CampaignAdminAnalyticsPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
};

const DEFAULT_TOP_ENTITIES_LIMIT = 10;

export function CampaignAdminAnalyticsPage({
  campaignKey,
}: CampaignAdminAnalyticsPageProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const isAnalyticsEnabled = isLoaded && isSignedIn;
  const statsQuery = useCampaignAdminStatsOverviewQuery({
    campaignKey,
    enabled: isAnalyticsEnabled,
  });
  const interactionsByTypeQuery = useCampaignAdminStatsInteractionsByTypeQuery({
    campaignKey,
    enabled: isAnalyticsEnabled,
  });
  const topEntitiesByInteractionsQuery = useCampaignAdminStatsTopEntitiesQuery({
    campaignKey,
    sortBy: "interactionCount",
    limit: DEFAULT_TOP_ENTITIES_LIMIT,
    enabled: isAnalyticsEnabled,
  });
  const topEntitiesByUsersQuery = useCampaignAdminStatsTopEntitiesQuery({
    campaignKey,
    sortBy: "userCount",
    limit: DEFAULT_TOP_ENTITIES_LIMIT,
    enabled: isAnalyticsEnabled,
  });
  const topEntitiesByPendingReviewsQuery =
    useCampaignAdminStatsTopEntitiesQuery({
      campaignKey,
      sortBy: "pendingReviewCount",
      limit: DEFAULT_TOP_ENTITIES_LIMIT,
      enabled: isAnalyticsEnabled,
    });
  const campaignLabel = getCampaignAdminCampaignLabel(campaignKey);
  const pageTitle = t`Campaign analytics`;
  const pageDescription = t`Review ranked interaction and entity analytics for ${campaignLabel} using the dedicated campaign stats endpoints.`;

  const headerEyebrow = (
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
          <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  const allQueries = [
    statsQuery,
    interactionsByTypeQuery,
    topEntitiesByInteractionsQuery,
    topEntitiesByUsersQuery,
    topEntitiesByPendingReviewsQuery,
  ];
  const pageBoundaryError = allQueries
    .map((query) => query.error)
    .find(
      (error) =>
        error?.status === 401 || error?.status === 403 || error?.status === 404,
    );

  const handleRefresh = () => {
    void Promise.allSettled([
      statsQuery.refetch(),
      interactionsByTypeQuery.refetch(),
      topEntitiesByInteractionsQuery.refetch(),
      topEntitiesByUsersQuery.refetch(),
      topEntitiesByPendingReviewsQuery.refetch(),
    ]);
  };

  if (
    !isLoaded ||
    (isSignedIn && statsQuery.isLoading && statsQuery.data === undefined)
  ) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <div className="flex min-h-40 items-center justify-center py-6">
          <LoadingSpinner text={t`Loading analytics`} />
        </div>
      </AdminCampaignLayout>
    );
  }

  if (!isSignedIn) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <Card className="max-w-xl rounded-3xl border-border/70 bg-card/80 shadow-none">
          <CardHeader>
            <CardTitle>{t`Sign in required`}</CardTitle>
            <CardDescription>
              {t`You need an authenticated session before the server can evaluate your campaign analytics permission.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button>{t`Sign in`}</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </AdminCampaignLayout>
    );
  }

  if (pageBoundaryError?.status === 401) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <Card className="max-w-xl rounded-3xl border-border/70 bg-card/80 shadow-none">
          <CardHeader>
            <CardTitle>{t`Session expired`}</CardTitle>
            <CardDescription>
              {t`Refresh your authentication session, then try loading analytics again.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSignInButton>
              <Button>{t`Sign in again`}</Button>
            </AuthSignInButton>
          </CardContent>
        </Card>
      </AdminCampaignLayout>
    );
  }

  if (pageBoundaryError?.status === 403) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<LockKeyhole className="h-6 w-6" />}
          title={t`You do not have access to analytics`}
          description={t`The server denied access to the current campaign analytics permission boundary.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  if (pageBoundaryError?.status === 404) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t`Campaign analytics unavailable`}
          description={t`This campaign analytics surface is either not enabled on the current server or the campaign key is not supported.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  if (statsQuery.error) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <Card className="max-w-xl rounded-3xl border-border/70 bg-card/80 shadow-none">
          <CardHeader>
            <CardTitle>{t`Failed to load analytics`}</CardTitle>
            <CardDescription>{statsQuery.error.message}</CardDescription>
          </CardHeader>
        </Card>
      </AdminCampaignLayout>
    );
  }

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={pageTitle}
      description={pageDescription}
      eyebrow={headerEyebrow}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefresh}
          disabled={allQueries.some((query) => query.isFetching)}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t`Refresh`}
        </Button>
      }
    >
      {statsQuery.data ? (
        <CampaignAdminStatsOverviewPanel
          campaignKey={campaignKey}
          overview={statsQuery.data}
          interactionsByType={interactionsByTypeQuery.data}
          isInteractionsByTypeLoading={interactionsByTypeQuery.isLoading}
          interactionsByTypeErrorMessage={
            interactionsByTypeQuery.error?.status &&
            interactionsByTypeQuery.error.status !== 401 &&
            interactionsByTypeQuery.error.status !== 403 &&
            interactionsByTypeQuery.error.status !== 404
              ? interactionsByTypeQuery.error.message
              : undefined
          }
          topEntitiesBySort={{
            interactionCount: topEntitiesByInteractionsQuery.data,
            userCount: topEntitiesByUsersQuery.data,
            pendingReviewCount: topEntitiesByPendingReviewsQuery.data,
          }}
          topEntitiesLoadingBySort={{
            interactionCount: topEntitiesByInteractionsQuery.isLoading,
            userCount: topEntitiesByUsersQuery.isLoading,
            pendingReviewCount: topEntitiesByPendingReviewsQuery.isLoading,
          }}
          topEntitiesErrorMessages={{
            interactionCount:
              topEntitiesByInteractionsQuery.error?.status &&
              topEntitiesByInteractionsQuery.error.status !== 401 &&
              topEntitiesByInteractionsQuery.error.status !== 403 &&
              topEntitiesByInteractionsQuery.error.status !== 404
                ? topEntitiesByInteractionsQuery.error.message
                : undefined,
            userCount:
              topEntitiesByUsersQuery.error?.status &&
              topEntitiesByUsersQuery.error.status !== 401 &&
              topEntitiesByUsersQuery.error.status !== 403 &&
              topEntitiesByUsersQuery.error.status !== 404
                ? topEntitiesByUsersQuery.error.message
                : undefined,
            pendingReviewCount:
              topEntitiesByPendingReviewsQuery.error?.status &&
              topEntitiesByPendingReviewsQuery.error.status !== 401 &&
              topEntitiesByPendingReviewsQuery.error.status !== 403 &&
              topEntitiesByPendingReviewsQuery.error.status !== 404
                ? topEntitiesByPendingReviewsQuery.error.message
                : undefined,
          }}
        />
      ) : null}
    </AdminCampaignLayout>
  );
}
