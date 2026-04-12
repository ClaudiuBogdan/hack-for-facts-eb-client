import { useCallback, useEffect, useMemo, useState } from "react";
import { Ban, LockKeyhole, RefreshCw, SearchX } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Skeleton } from "@/components/ui/skeleton";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import { CampaignAdminEntitiesTable } from "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesTable";
import { CampaignAdminEntitiesToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesToolbar";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import {
  useCampaignAdminEntitiesMetaQuery,
  useCampaignAdminEntitiesQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entities";
import {
  createCampaignAdminEntitiesPaginationSignature,
  createEmptyCampaignAdminEntitiesSearch,
  getCampaignAdminEntitiesFilters,
  normalizeCampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import {
  campaignAdminEntityNotificationTypeValues,
  campaignAdminNotificationStatusValues,
} from "@/features/campaigns/buget/admin/types";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminEntitiesPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminEntitiesSearch;
  readonly onSearchChange: (
    search: CampaignAdminEntitiesSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

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
  description,
}: {
  readonly label: string;
  readonly value: number;
  readonly description: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function EntitiesSummarySkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-none"
        >
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-8 w-20" />
          <Skeleton className="mt-2 h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

function EntitiesTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-none">
        <div className="grid gap-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/80 shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CampaignAdminEntitiesPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminEntitiesPageProps) {
  const pageTitle = t`Entities`;
  const pageDescription = t`Review entity-level campaign state across users, interaction review pressure, and notification delivery activity.`;
  const normalizedSearch = normalizeCampaignAdminEntitiesSearch(search);
  const filters = useMemo(
    () => getCampaignAdminEntitiesFilters(normalizedSearch),
    [normalizedSearch],
  );
  const paginationStateSignatureFromSearch = useMemo(
    () => createCampaignAdminEntitiesPaginationSignature(normalizedSearch),
    [normalizedSearch],
  );
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>(
    [],
  );
  const [paginationStateSignature, setPaginationStateSignature] = useState(
    paginationStateSignatureFromSearch,
  );
  const { isLoaded, isSignedIn } = useAuth();

  const entitiesQuery = useCampaignAdminEntitiesQuery({
    campaignKey,
    filters,
    cursor: normalizedSearch.cursor ?? null,
    limit: normalizedSearch.limit,
    enabled: isLoaded && isSignedIn,
  });
  const metaQuery = useCampaignAdminEntitiesMetaQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn,
  });

  const items = entitiesQuery.data?.items ?? [];
  const currentPageIndex = normalizedSearch.pageIndex ?? 1;
  const canPreviousPage =
    previousCursors.length > 0 ||
    (previousCursors.length === 0 &&
      normalizedSearch.cursor !== undefined &&
      currentPageIndex === 2);

  const headerEyebrow = (
    <Breadcrumb className="py-0">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <a href={`/admin/campaigns/${campaignKey}`}>
              {getCampaignAdminCampaignLabel(campaignKey)}
            </a>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  useEffect(() => {
    if (paginationStateSignature === paginationStateSignatureFromSearch) {
      return;
    }

    setPreviousCursors([]);
    setPaginationStateSignature(paginationStateSignatureFromSearch);
  }, [paginationStateSignature, paginationStateSignatureFromSearch]);

  const handleSearchStateChange = useCallback((
    nextSearch: CampaignAdminEntitiesSearch,
    options?: { readonly replace?: boolean },
  ) => {
    onSearchChange(normalizeCampaignAdminEntitiesSearch(nextSearch), options);
  }, [onSearchChange]);

  const resetLocalPagingState = (
    nextSearch: CampaignAdminEntitiesSearch,
  ) => {
    setPreviousCursors([]);
    setPaginationStateSignature(
      createCampaignAdminEntitiesPaginationSignature(nextSearch),
    );
  };

  const handleEntitiesSearchChange = (
    nextSearch: CampaignAdminEntitiesSearch,
    options?: { readonly replace?: boolean },
  ) => {
    const normalizedNextSearch = normalizeCampaignAdminEntitiesSearch({
      ...nextSearch,
      cursor: undefined,
      pageIndex: undefined,
    });
    resetLocalPagingState(normalizedNextSearch);
    handleSearchStateChange(normalizedNextSearch, options);
  };

  const handleSortChange = (
    sortBy: CampaignAdminEntitiesSearch["sortBy"],
    sortOrder: CampaignAdminEntitiesSearch["sortOrder"],
  ) => {
    if (sortBy === undefined || sortOrder === undefined) {
      return;
    }

    const nextSearch = normalizeCampaignAdminEntitiesSearch({
      ...normalizedSearch,
      sortBy,
      sortOrder,
      cursor: undefined,
      pageIndex: undefined,
    });
    resetLocalPagingState(nextSearch);
    handleSearchStateChange(nextSearch, { replace: true });
  };

  const handleNextPage = () => {
    const nextCursor = entitiesQuery.data?.page.nextCursor;
    if (nextCursor === undefined || nextCursor === null) {
      return;
    }

    const nextSearch = normalizeCampaignAdminEntitiesSearch({
      ...normalizedSearch,
      cursor: nextCursor,
      pageIndex: currentPageIndex + 1,
    });

    setPreviousCursors((currentCursors) => [
      ...currentCursors,
      normalizedSearch.cursor ?? null,
    ]);
    setPaginationStateSignature(
      createCampaignAdminEntitiesPaginationSignature(nextSearch),
    );
    handleSearchStateChange(nextSearch);
  };

  const handlePreviousPage = () => {
    if (previousCursors.length === 0) {
      if (normalizedSearch.cursor === undefined || currentPageIndex !== 2) {
        return;
      }

      const nextSearch = normalizeCampaignAdminEntitiesSearch({
        ...normalizedSearch,
        cursor: undefined,
        pageIndex: undefined,
      });
      setPaginationStateSignature(
        createCampaignAdminEntitiesPaginationSignature(nextSearch),
      );
      handleSearchStateChange(nextSearch);
      return;
    }

    const nextPreviousCursors = [...previousCursors];
    const previousCursor = nextPreviousCursors.pop() ?? null;
    const nextPageIndex = Math.max(1, currentPageIndex - 1);
    const nextSearch = normalizeCampaignAdminEntitiesSearch({
      ...normalizedSearch,
      cursor: previousCursor ?? undefined,
      pageIndex: nextPageIndex === 1 ? undefined : nextPageIndex,
    });
    setPreviousCursors(nextPreviousCursors);
    setPaginationStateSignature(
      createCampaignAdminEntitiesPaginationSignature(nextSearch),
    );
    handleSearchStateChange(nextSearch);
  };

  const handleRefresh = () => {
    void Promise.allSettled([entitiesQuery.refetch(), metaQuery.refetch()]);
  };

  useEffect(() => {
    const shouldRecoverStaleCursor =
      entitiesQuery.error?.status === 400 &&
      (normalizedSearch.cursor !== undefined ||
        normalizedSearch.pageIndex !== undefined);

    if (!shouldRecoverStaleCursor) {
      return;
    }

    const nextSearch = normalizeCampaignAdminEntitiesSearch({
      ...normalizedSearch,
      cursor: undefined,
      pageIndex: undefined,
    });

    setPreviousCursors([]);
    setPaginationStateSignature(
      createCampaignAdminEntitiesPaginationSignature(nextSearch),
    );
    onSearchChange(nextSearch, { replace: true });
  }, [
    entitiesQuery.error?.status,
    normalizedSearch.cursor,
    normalizedSearch.pageIndex,
    normalizedSearch,
    onSearchChange,
  ]);

  if (!isLoaded) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <div className="space-y-4">
          <EntitiesSummarySkeleton />
          <EntitiesTableSkeleton />
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
              {t`You need an authenticated session before the server can evaluate your campaign-admin permission.`}
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

  if (entitiesQuery.error?.status === 401) {
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
              {t`Refresh your authentication session, then try loading entities again.`}
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

  if (entitiesQuery.error?.status === 403) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<LockKeyhole className="h-6 w-6" />}
          title={t`You do not have access to entities`}
          description={t`The server denied access to the current campaign entities admin permission boundary.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  if (entitiesQuery.error?.status === 404) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t`Campaign entities unavailable`}
          description={t`This campaign entities admin surface is either not enabled on the current server or the campaign key is not supported.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  const meta = metaQuery.data;

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
          disabled={
            entitiesQuery.isLoading ||
            entitiesQuery.isFetching ||
            metaQuery.isLoading ||
            metaQuery.isFetching
          }
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t`Refresh`}
        </Button>
      }
      details={
        <>
          <InlineStat label={t`Visible`} value={items.length} />
          <span className="text-xs text-muted-foreground">
            {t`Page ${currentPageIndex}`}
          </span>
        </>
      }
    >
      <section className="space-y-4" aria-labelledby="entities-summary-title">
        <div className="space-y-1">
          <h2
            id="entities-summary-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {t`Entity summary`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t`Use the entity view to find where review load, subscriptions, and notification failures are concentrated.`}
          </p>
        </div>

        {metaQuery.isLoading && meta === undefined ? (
          <EntitiesSummarySkeleton />
        ) : meta ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard
              label={t`Total entities`}
              value={meta.totalEntities}
              description={t`Distinct campaign entities available in this admin view.`}
            />
            <SummaryCard
              label={t`Pending reviews`}
              value={meta.entitiesWithPendingReviews}
              description={t`Entities that currently surface review work.`}
            />
            <SummaryCard
              label={t`Subscribers`}
              value={meta.entitiesWithSubscribers}
              description={t`Entities with notification subscribers.`}
            />
            <SummaryCard
              label={t`Notification activity`}
              value={meta.entitiesWithNotificationActivity}
              description={t`Entities with queued or sent notification activity.`}
            />
            <SummaryCard
              label={t`Failed notifications`}
              value={meta.entitiesWithFailedNotifications}
              description={t`Entities with any recent failed notification signal.`}
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
            {t`Summary data is unavailable right now. You can still use the entity table below.`}
          </div>
        )}
      </section>

      {entitiesQuery.error &&
      entitiesQuery.error.status !== 401 &&
      entitiesQuery.error.status !== 403 &&
      entitiesQuery.error.status !== 404 ? (
        <Alert variant="destructive" aria-live="polite">
          <Ban className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t`Failed to load entities`}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{entitiesQuery.error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t`Retry`}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4" aria-labelledby="entities-table-title">
        <div className="space-y-1">
          <h2
            id="entities-table-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {t`Entity overview`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t`Filter by entity name, review pressure, and notification signals, then jump directly into the existing admin workflows for that entity.`}
          </p>
        </div>

        {entitiesQuery.isLoading && entitiesQuery.data === undefined ? (
          <EntitiesTableSkeleton />
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <CampaignAdminEntitiesToolbar
                embedded
                search={normalizedSearch}
                isLoading={entitiesQuery.isLoading || entitiesQuery.isFetching}
                interactionTypeOptions={meta?.availableInteractionTypes ?? []}
                latestNotificationTypeOptions={[
                  ...campaignAdminEntityNotificationTypeValues,
                ]}
                latestNotificationStatusOptions={[
                  ...campaignAdminNotificationStatusValues,
                ]}
                onApply={handleEntitiesSearchChange}
                onReset={handleEntitiesSearchChange}
                onRefresh={handleRefresh}
              />
            ) : null}

            <CampaignAdminEntitiesTable
              campaignKey={campaignKey}
              items={items}
              sortBy={normalizedSearch.sortBy}
              sortOrder={normalizedSearch.sortOrder}
              onSortChange={handleSortChange}
              header={
                items.length > 0
                  ? ({ actions, trailingActions }) => (
                      <CampaignAdminEntitiesToolbar
                        embedded
                        actions={actions}
                        trailingActions={trailingActions}
                        search={normalizedSearch}
                        isLoading={
                          entitiesQuery.isLoading || entitiesQuery.isFetching
                        }
                        interactionTypeOptions={
                          meta?.availableInteractionTypes ?? []
                        }
                        latestNotificationTypeOptions={[
                          ...campaignAdminEntityNotificationTypeValues,
                        ]}
                        latestNotificationStatusOptions={[
                          ...campaignAdminNotificationStatusValues,
                        ]}
                        onApply={handleEntitiesSearchChange}
                        onReset={handleEntitiesSearchChange}
                        onRefresh={handleRefresh}
                      />
                    )
                  : undefined
              }
              onClearFilters={() => {
                handleEntitiesSearchChange(
                  createEmptyCampaignAdminEntitiesSearch({
                    currentSearch: normalizedSearch,
                  }),
                );
              }}
            />

            {items.length > 0 ? (
              <CampaignAdminCursorPager
                pageIndex={currentPageIndex}
                pageSize={normalizedSearch.limit}
                itemCount={items.length}
                canPrevious={canPreviousPage}
                canNext={entitiesQuery.data?.page.hasMore ?? false}
                isLoading={entitiesQuery.isFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            ) : null}
          </div>
        )}
      </section>
    </AdminCampaignLayout>
  );
}
