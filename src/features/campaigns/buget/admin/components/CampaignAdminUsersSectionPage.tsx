import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
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
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import {
  CAMPAIGN_ADMIN_USERS_SORTABLE_COLUMNS,
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  getCampaignAdminCampaignLabel,
  getCampaignAdminInteractionTypeLabel,
  getCampaignAdminUsersSortLabel,
} from "@/features/campaigns/buget/admin/constants";
import { useCampaignAdminUsersQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-users";
import { normalizeCampaignAdminUsersSearch } from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminSortOrder,
  CampaignAdminUserListItem,
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

function createCampaignAdminUserPageRouteSearch() {
  return {
    query: undefined,
    reviewStatus: undefined,
    interactionId: undefined,
    lessonId: undefined,
    entityCui: undefined,
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
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  };
}

function formatDateTime(value: string): string {
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return t`Unavailable`;
  }

  return parsedDate.toLocaleString();
}

function createPaginationStateSignature(search: CampaignAdminUsersSearch): string {
  return JSON.stringify(search);
}

function getLatestEntityPreview(item: CampaignAdminUserListItem): string {
  const latestEntityName = item.latestEntityName?.trim();
  if (latestEntityName && item.latestEntityCui) {
    return `${latestEntityName} · ${item.latestEntityCui}`;
  }

  if (latestEntityName) {
    return latestEntityName;
  }

  if (item.latestEntityCui) {
    return item.latestEntityCui;
  }

  return t`No entity`;
}

function SortableHeaderButton({
  sortKey,
  sortBy,
  sortOrder,
  onSortChange,
  children,
}: {
  readonly sortKey: CampaignAdminUsersSortKey;
  readonly sortBy?: CampaignAdminUsersSortKey;
  readonly sortOrder?: CampaignAdminSortOrder;
  readonly onSortChange: (
    sortBy: CampaignAdminUsersSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => void;
  readonly children: ReactNode;
}) {
  const columnConfig = CAMPAIGN_ADMIN_USERS_SORTABLE_COLUMNS[sortKey];
  const sortLabel = getCampaignAdminUsersSortLabel(sortKey);
  const isActive = sortBy === sortKey && sortOrder !== undefined;

  const handleClick = () => {
    const nextSortOrder =
      isActive && sortOrder === "asc"
        ? "desc"
        : isActive && sortOrder === "desc"
          ? "asc"
          : columnConfig.defaultOrder;

    onSortChange(sortKey, nextSortOrder);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center gap-1 text-left text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      aria-label={t`${sortLabel} sort`}
    >
      <span className="flex min-w-0 items-center gap-1">{children}</span>
      {isActive ? (
        sortOrder === "asc" ? (
          <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        )
      ) : (
        <ArrowUpDown
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70"
          aria-hidden="true"
        />
      )}
    </button>
  );
}

function UserDirectoryRow({
  campaignKey,
  item,
}: {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly item: CampaignAdminUserListItem;
}) {
  const latestEntityPreview = getLatestEntityPreview(item);

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-1.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/users/$userId"
                  params={{ campaignKey, userId: item.userId }}
                  search={createCampaignAdminUserPageRouteSearch()}
                  className="block max-w-[20rem] break-all font-mono text-xs text-foreground hover:underline"
                >
                  {item.userId}
                </Link>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs break-all">
                {item.userId}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <CopyButton
            onCopy={() => {
              void navigator.clipboard.writeText(item.userId);
            }}
            className="h-6 w-6 p-1 opacity-0 transition-opacity group-hover:opacity-100"
          />
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {formatDateTime(item.latestUpdatedAt)}
      </TableCell>
      <TableCell className="tabular-nums text-sm">
        {item.interactionCount}
      </TableCell>
      <TableCell className="text-sm">
        {item.pendingReviewCount > 0 ? (
          <Badge variant="warning" className="tabular-nums">
            {item.pendingReviewCount}
          </Badge>
        ) : (
          <span className="tabular-nums text-muted-foreground">
            {item.pendingReviewCount}
          </span>
        )}
      </TableCell>
      <TableCell className="min-w-0 text-sm">
        <p className="truncate text-foreground">
          {getCampaignAdminInteractionTypeLabel(item.latestInteractionId)}
        </p>
        <p
          className="truncate text-xs text-muted-foreground"
          title={latestEntityPreview}
        >
          {latestEntityPreview}
        </p>
      </TableCell>
      <TableCell className="w-10 text-right">
        <Link
          to="/admin/campaigns/$campaignKey/users/$userId"
          params={{ campaignKey, userId: item.userId }}
          search={createCampaignAdminUserPageRouteSearch()}
          aria-label={t`Open user ${item.userId}`}
        >
          <ArrowRight
            className="ml-auto h-4 w-4 text-muted-foreground transition-colors hover:text-foreground"
            aria-hidden="true"
          />
        </Link>
      </TableCell>
    </TableRow>
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
              search={createCampaignAdminQueueRouteSearch()}
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <SortableHeaderButton
                    sortKey="userId"
                    sortBy={usersQuery.data?.page.sortBy ?? normalizedSearch.sortBy}
                    sortOrder={
                      usersQuery.data?.page.sortOrder ?? normalizedSearch.sortOrder
                    }
                    onSortChange={handleSortChange}
                  >
                    {t`User ID`}
                  </SortableHeaderButton>
                </TableHead>
                <TableHead>
                  <SortableHeaderButton
                    sortKey="latestUpdatedAt"
                    sortBy={usersQuery.data?.page.sortBy ?? normalizedSearch.sortBy}
                    sortOrder={
                      usersQuery.data?.page.sortOrder ?? normalizedSearch.sortOrder
                    }
                    onSortChange={handleSortChange}
                  >
                    {t`Last Updated`}
                  </SortableHeaderButton>
                </TableHead>
                <TableHead>
                  <SortableHeaderButton
                    sortKey="interactionCount"
                    sortBy={usersQuery.data?.page.sortBy ?? normalizedSearch.sortBy}
                    sortOrder={
                      usersQuery.data?.page.sortOrder ?? normalizedSearch.sortOrder
                    }
                    onSortChange={handleSortChange}
                  >
                    {t`Interactions`}
                  </SortableHeaderButton>
                </TableHead>
                <TableHead>
                  <SortableHeaderButton
                    sortKey="pendingReviewCount"
                    sortBy={usersQuery.data?.page.sortBy ?? normalizedSearch.sortBy}
                    sortOrder={
                      usersQuery.data?.page.sortOrder ?? normalizedSearch.sortOrder
                    }
                    onSortChange={handleSortChange}
                  >
                    {t`Pending Reviews`}
                  </SortableHeaderButton>
                </TableHead>
                <TableHead>{t`Latest Interaction`}</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <UserDirectoryRow
                  key={item.userId}
                  campaignKey={campaignKey}
                  item={item}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </AdminCampaignLayout>
  );
}
