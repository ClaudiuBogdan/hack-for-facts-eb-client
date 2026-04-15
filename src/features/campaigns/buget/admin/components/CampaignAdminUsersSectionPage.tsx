import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  ClipboardList,
  LockKeyhole,
  RefreshCw,
  Search,
  SearchX,
} from "lucide-react";
import { t } from "@lingui/core/macro";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import { CampaignAdminUsersTable } from "@/features/campaigns/buget/admin/components/CampaignAdminUsersTable";
import { CompactStat } from "@/features/campaigns/buget/admin/components/CompactStat";
import {
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  getCampaignAdminCampaignLabel,
} from "@/features/campaigns/buget/admin/constants";
import { useCampaignAdminUsersQuery, useCampaignAdminUsersMetaQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-users";
import {
  hasActiveCampaignAdminUsersFilters,
  normalizeCampaignAdminUsersSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminSortOrder,
  CampaignAdminUsersSearch,
  CampaignAdminUsersSortKey,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminUsersSectionPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminUsersSearch;
  readonly onSearchChange: (
    search: CampaignAdminUsersSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

function createCampaignAdminQueueRouteSearch(entityCui?: string) {
  return {
    phase: undefined,
    reviewStatusMode: undefined,
    reviewStatus: "pending" as const,
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
    sortBy: undefined,
    sortOrder: undefined,
    reviewSelectionKey: undefined,
    cursor: undefined,
    pageIndex: undefined,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function createPaginationStateSignature(search: CampaignAdminUsersSearch): string {
  return JSON.stringify(search);
}

function UsersSummarySkeleton() {
  return (
    <>
      <div className="flex items-baseline gap-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-12" />
      </div>
      <div className="flex items-baseline gap-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-12" />
      </div>
    </>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full max-w-md rounded-lg" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-none">
        <div className="border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-20" />
        </div>

        <div className="divide-y divide-border/60">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-none" />
          ))}
        </div>

        <div className="border-t border-border/60 bg-background/40 px-4 py-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-20" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CampaignAdminUsersSectionPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminUsersSectionPageProps) {
  const normalizedSearch = normalizeCampaignAdminUsersSearch(search);
  const paginationStateSignatureFromSearch = useMemo(
    () => createPaginationStateSignature(normalizedSearch),
    [normalizedSearch],
  );
  const { isLoaded, isSignedIn } = useAuth();
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>(
    [],
  );
  const [paginationStateSignature, setPaginationStateSignature] = useState(
    paginationStateSignatureFromSearch,
  );
  const [searchDraft, setSearchDraft] = useState(normalizedSearch.query ?? "");
  const currentPageIndex = normalizedSearch.pageIndex ?? 1;
  const canPreviousPage =
    previousCursors.length > 0 ||
    (previousCursors.length === 0 &&
      normalizedSearch.cursor !== undefined &&
      currentPageIndex === 2);

  const usersQuery = useCampaignAdminUsersQuery({
    campaignKey,
    search: {
      query: normalizedSearch.query,
      entityCui: normalizedSearch.entityCui,
      sortBy: normalizedSearch.sortBy,
      sortOrder: normalizedSearch.sortOrder,
      cursor: normalizedSearch.cursor,
      limit: normalizedSearch.limit,
    },
    enabled: isLoaded && isSignedIn,
  });

  const usersMetaQuery = useCampaignAdminUsersMetaQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn,
  });

  const items = usersQuery.data?.items ?? [];
  const hasMore = usersQuery.data?.page.hasMore ?? false;
  const meta = usersMetaQuery.data;
  const totalCount = usersQuery.data?.page.totalCount ?? 0;
  const hasActiveFilters =
    usersQuery.data !== undefined &&
    hasActiveCampaignAdminUsersFilters(normalizedSearch);
  const isFilteredEmpty = items.length === 0 && hasActiveFilters;
  const isTrulyEmptyDataset =
    items.length === 0 && !hasActiveFilters && totalCount === 0;
  const isEmptyPage =
    items.length === 0 && !isFilteredEmpty && !isTrulyEmptyDataset;

  useEffect(() => {
    setSearchDraft(normalizedSearch.query ?? "");
  }, [normalizedSearch.query]);

  useEffect(() => {
    if (paginationStateSignature === paginationStateSignatureFromSearch) {
      return;
    }

    setPreviousCursors([]);
    setPaginationStateSignature(paginationStateSignatureFromSearch);
  }, [paginationStateSignature, paginationStateSignatureFromSearch]);

  const handleSearchStateChange = (
    nextSearch: CampaignAdminUsersSearch,
    options?: { readonly replace?: boolean },
  ) => {
    startTransition(() => {
      onSearchChange(normalizeCampaignAdminUsersSearch(nextSearch), options);
    });
  };

  const resetLocalPagingState = (nextSearch: CampaignAdminUsersSearch) => {
    setPreviousCursors([]);
    setPaginationStateSignature(createPaginationStateSignature(nextSearch));
  };

  const handleQueryChange = (nextQueryValue: string) => {
    setSearchDraft(nextQueryValue);

    const trimmedQuery = nextQueryValue.trim();
    const nextSearch = normalizeCampaignAdminUsersSearch({
      ...normalizedSearch,
      query: trimmedQuery.length > 0 ? trimmedQuery : undefined,
      cursor: undefined,
      pageIndex: undefined,
    });

    resetLocalPagingState(nextSearch);
    handleSearchStateChange(nextSearch, { replace: true });
  };

  const handleSortChange = (
    sortBy: CampaignAdminUsersSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => {
    const nextSearch = normalizeCampaignAdminUsersSearch({
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
    const nextCursor = usersQuery.data?.page.nextCursor;
    if (nextCursor === undefined || nextCursor === null) {
      return;
    }

    const nextSearch = normalizeCampaignAdminUsersSearch({
      ...normalizedSearch,
      cursor: nextCursor,
      pageIndex: currentPageIndex + 1,
    });

    setPreviousCursors((currentCursors) => [
      ...currentCursors,
      normalizedSearch.cursor ?? null,
    ]);
    setPaginationStateSignature(createPaginationStateSignature(nextSearch));
    handleSearchStateChange(nextSearch);
  };

  const handlePreviousPage = () => {
    if (previousCursors.length === 0) {
      if (normalizedSearch.cursor === undefined || currentPageIndex !== 2) {
        return;
      }

      const nextSearch = normalizeCampaignAdminUsersSearch({
        ...normalizedSearch,
        cursor: undefined,
        pageIndex: undefined,
      });

      setPaginationStateSignature(createPaginationStateSignature(nextSearch));
      handleSearchStateChange(nextSearch);
      return;
    }

    const nextPreviousCursors = [...previousCursors];
    const previousCursor = nextPreviousCursors.pop() ?? null;
    const nextPageIndex = Math.max(1, currentPageIndex - 1);
    const nextSearch = normalizeCampaignAdminUsersSearch({
      ...normalizedSearch,
      cursor: previousCursor ?? undefined,
      pageIndex: nextPageIndex === 1 ? undefined : nextPageIndex,
    });

    setPreviousCursors(nextPreviousCursors);
    setPaginationStateSignature(createPaginationStateSignature(nextSearch));
    handleSearchStateChange(nextSearch);
  };

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={t`Users`}
      description={t`Browse and manage user workspaces. Inspect individual campaign interactions and continue review work.`}
      eyebrow={(
        <Breadcrumb className="py-0">
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
              <BreadcrumbPage>{t`Users`}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      actions={(
        <>
          <Button variant="outline" size="sm" className="gap-2" asChild>
            <Link
              to="/admin/campaigns/$campaignKey/user-interactions"
              params={{ campaignKey }}
              search={createCampaignAdminQueueRouteSearch(
                normalizedSearch.entityCui,
              )}
            >
              <ClipboardList className="h-4 w-4" aria-hidden="true" />
              {t`Open interactions queue`}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void usersQuery.refetch();
            }}
            disabled={usersQuery.isLoading || usersQuery.isFetching}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t`Refresh`}
          </Button>
        </>
      )}
    >
      {/* Stats bar - at the top, above search */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-4" aria-label={t`Users summary`}>
        {!isLoaded || (usersMetaQuery.isLoading && meta === undefined) ? (
          <UsersSummarySkeleton />
        ) : meta ? (
          <>
            <CompactStat label={t`Total users`} value={meta.totalUsers} />
            {meta.usersWithPendingReviews > 0 ? (
              <CompactStat
                label={t`Pending reviews`}
                value={meta.usersWithPendingReviews}
                className="text-amber-600 dark:text-amber-400"
              />
            ) : (
              <CompactStat label={t`Pending reviews`} value={meta.usersWithPendingReviews} />
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">
            {t`Summary unavailable`}
          </span>
        )}
      </div>

      <section className="space-y-4">

        {!isLoaded ? (
          <UsersTableSkeleton />
        ) : !isSignedIn ? (
          <div className="py-6">
            <p className="text-sm font-medium text-foreground">
              {t`Sign in required`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t`You need an authenticated admin session to inspect user workspaces.`}
            </p>
            <AuthSignInButton>
              <Button className="mt-4">{t`Sign in again`}</Button>
            </AuthSignInButton>
          </div>
        ) : usersQuery.error?.status === 403 ? (
          <div className="py-6">
            <div className="flex items-start gap-3">
              <LockKeyhole
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t`You do not have access to this users directory`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t`The server denied access to the current campaign-admin permission boundary.`}
                </p>
              </div>
            </div>
          </div>
        ) : usersQuery.error?.status === 404 ? (
          <div className="py-6">
            <div className="flex items-start gap-3">
              <SearchX
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t`Campaign users unavailable`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t`This campaign users directory is not available on the current server or the campaign key is unsupported.`}
                </p>
              </div>
            </div>
          </div>
        ) : usersQuery.error ? (
          <div className="py-6">
            <p className="text-sm font-medium text-foreground">
              {t`Failed to load users`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {usersQuery.error.message}
            </p>
          </div>
        ) : usersQuery.isLoading ? (
          <UsersTableSkeleton />
        ) : isTrulyEmptyDataset ? (
          <div className="py-6">
            <p className="text-sm font-medium text-foreground">
              {t`No users yet`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {t`Users will appear here after the campaign records interaction activity.`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full max-w-md">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  value={searchDraft}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  placeholder={t`Search by User ID`}
                  aria-label={t`Search users`}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                {normalizedSearch.entityCui !== undefined ? (
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {t`Entity ${normalizedSearch.entityCui}`}
                  </Badge>
                ) : null}
              </div>
            </div>

            {isFilteredEmpty ? (
              <div className="py-6">
                <p className="text-sm font-medium text-foreground">
                  {t`No users matched the current filters`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t`Try broadening the current search or clear the current filters.`}
                </p>
              </div>
            ) : isEmptyPage ? (
              <div className="space-y-4 py-6">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t`No users are available on this page.`}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t`Try going back a page or refresh the directory.`}
                  </p>
                </div>
                <CampaignAdminCursorPager
                  pageIndex={currentPageIndex}
                  pageSize={normalizedSearch.limit}
                  itemCount={items.length}
                  totalCount={totalCount}
                  canPrevious={canPreviousPage}
                  canNext={hasMore}
                  isLoading={usersQuery.isFetching}
                  onPrevious={handlePreviousPage}
                  onNext={handleNextPage}
                />
              </div>
            ) : (
              <CampaignAdminUsersTable
                campaignKey={campaignKey}
                entityCui={normalizedSearch.entityCui}
                items={items}
                sortBy={usersQuery.data?.page.sortBy ?? normalizedSearch.sortBy}
                sortOrder={usersQuery.data?.page.sortOrder ?? normalizedSearch.sortOrder}
                onSortChange={handleSortChange}
                footer={
                  <CampaignAdminCursorPager
                    variant="connected"
                    pageIndex={currentPageIndex}
                    pageSize={normalizedSearch.limit}
                    itemCount={items.length}
                    totalCount={usersQuery.data?.page.totalCount}
                    canPrevious={canPreviousPage}
                    canNext={hasMore}
                    isLoading={usersQuery.isFetching}
                    onPrevious={handlePreviousPage}
                    onNext={handleNextPage}
                  />
                }
              />
            )}
          </>
        )}
      </section>
    </AdminCampaignLayout>
  );
}
