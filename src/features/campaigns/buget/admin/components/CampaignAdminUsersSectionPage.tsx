import {
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
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
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminUsersTable } from "@/features/campaigns/buget/admin/components/CampaignAdminUsersTable";
import {
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  getCampaignAdminCampaignLabel,
} from "@/features/campaigns/buget/admin/constants";
import { useCampaignAdminUsersQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-users";
import { normalizeCampaignAdminUsersSearch } from "@/features/campaigns/buget/admin/schemas/search-schema";
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

  const items = usersQuery.data?.items ?? [];
  const hasMore = usersQuery.data?.page.hasMore ?? false;

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
      details={(
        <>
          <div className="relative w-full max-w-md grow">
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
            <span className="text-xs text-muted-foreground">
              {t`${items.length} users`}
            </span>
            {normalizedSearch.entityCui !== undefined ? (
              <>
                <span
                  className="hidden h-4 w-px bg-border/60 md:block"
                  aria-hidden="true"
                />
                <Badge variant="outline" className="font-mono text-[11px]">
                  {t`Entity ${normalizedSearch.entityCui}`}
                </Badge>
              </>
            ) : null}
            <span className="hidden h-4 w-px bg-border/60 md:block" aria-hidden="true" />
            <span className="text-xs text-muted-foreground">
              {t`Page ${currentPageIndex}`}
            </span>
          </div>
        </>
      )}
    >

      <section>
        <div className="flex justify-end py-1">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={!canPreviousPage || usersQuery.isLoading || usersQuery.isFetching}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              {t`Previous`}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasMore || usersQuery.isLoading || usersQuery.isFetching}
              className="gap-2"
            >
              {t`Next`}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

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
          <div className="flex min-h-40 items-center justify-center py-6">
            <LoadingSpinner />
          </div>
        ) : items.length === 0 ? (
          <div className="py-6">
            <p className="text-sm font-medium text-foreground">
              {normalizedSearch.query !== undefined
                ? t`No users match this search`
                : t`No users yet`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {normalizedSearch.query !== undefined
                ? t`Try adjusting the search query.`
                : t`Users will appear here after the campaign records interaction activity.`}
            </p>
          </div>
        ) : (
          <CampaignAdminUsersTable
            campaignKey={campaignKey}
            entityCui={normalizedSearch.entityCui}
            items={items}
            sortBy={usersQuery.data?.page.sortBy ?? normalizedSearch.sortBy}
            sortOrder={usersQuery.data?.page.sortOrder ?? normalizedSearch.sortOrder}
            onSortChange={handleSortChange}
          />
        )}
      </section>
    </AdminCampaignLayout>
  );
}
