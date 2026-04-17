import { useEffect, useMemo, useState } from "react";
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
import { Card } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import { CampaignAdminInstitutionThreadSheet } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadSheet";
import { CampaignAdminInstitutionThreadsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsTable";
import { CampaignAdminInstitutionThreadsToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsToolbar";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import {
  useAppendCampaignAdminInstitutionThreadResponseMutation,
  useCampaignAdminInstitutionThreadDetailQuery,
  useCampaignAdminInstitutionThreadsListQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads";
import {
  createCampaignAdminInstitutionThreadsPaginationSignature,
  createEmptyCampaignAdminInstitutionThreadsSearch,
  getCampaignAdminInstitutionThreadsFilters,
  getCampaignAdminInstitutionThreadsSearchConflictCode,
  normalizeCampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadsPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminInstitutionThreadsSearch;
  readonly onSearchChange: (
    search: CampaignAdminInstitutionThreadsSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

function TableSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Card className="border-border/70 bg-card/80 p-4 shadow-none">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </Card>
    </div>
  );
}

function getConflictMessage(
  code: ReturnType<typeof getCampaignAdminInstitutionThreadsSearchConflictCode>,
): string | null {
  switch (code) {
    case "closed_started":
      return t`Closed threads cannot be filtered together with the started thread state.`;
    case "closed_pending":
      return t`Closed threads cannot be filtered together with the pending thread state.`;
    case "open_resolved":
      return t`Open threads cannot be filtered together with the resolved thread state.`;
    default:
      return null;
  }
}

export function CampaignAdminInstitutionThreadsPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminInstitutionThreadsPageProps) {
  const normalizedSearch = normalizeCampaignAdminInstitutionThreadsSearch(search);
  const filters = useMemo(
    () => getCampaignAdminInstitutionThreadsFilters(normalizedSearch),
    [normalizedSearch],
  );
  const paginationStateSignatureFromSearch = useMemo(
    () =>
      createCampaignAdminInstitutionThreadsPaginationSignature(normalizedSearch),
    [normalizedSearch],
  );
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>(
    [],
  );
  const [paginationStateSignature, setPaginationStateSignature] = useState(
    paginationStateSignatureFromSearch,
  );
  const { isLoaded, isSignedIn } = useAuth();
  const conflictCode =
    getCampaignAdminInstitutionThreadsSearchConflictCode(normalizedSearch);
  const conflictMessage = getConflictMessage(conflictCode);
  const isQueryEnabled = isLoaded && isSignedIn && conflictCode === null;
  const currentPageIndex = normalizedSearch.pageIndex ?? 1;

  const listQuery = useCampaignAdminInstitutionThreadsListQuery({
    campaignKey,
    filters,
    cursor: normalizedSearch.cursor ?? null,
    limit: normalizedSearch.limit,
    enabled: isQueryEnabled,
  });
  const selectedThreadId = normalizedSearch.selectedThreadId ?? null;
  const detailQuery = useCampaignAdminInstitutionThreadDetailQuery({
    campaignKey,
    threadId: selectedThreadId ?? "",
    enabled: isQueryEnabled && selectedThreadId !== null,
  });
  const appendResponseMutation =
    useAppendCampaignAdminInstitutionThreadResponseMutation(
      campaignKey,
      selectedThreadId ?? "",
    );
  const {
    error: appendResponseError,
    isPending: isAppendResponsePending,
    mutateAsync: appendResponse,
    reset: resetAppendResponseMutation,
  } = appendResponseMutation;

  const items = listQuery.data?.items ?? [];
  const canPreviousPage =
    previousCursors.length > 0 ||
    (previousCursors.length === 0 &&
      normalizedSearch.cursor !== undefined &&
      currentPageIndex === 2);

  useEffect(() => {
    if (paginationStateSignature === paginationStateSignatureFromSearch) {
      return;
    }

    setPreviousCursors([]);
    setPaginationStateSignature(paginationStateSignatureFromSearch);
  }, [paginationStateSignature, paginationStateSignatureFromSearch]);

  useEffect(() => {
    resetAppendResponseMutation();
  }, [resetAppendResponseMutation, selectedThreadId]);

  const handleSearchStateChange = (
    nextSearch: CampaignAdminInstitutionThreadsSearch,
    options?: { readonly replace?: boolean },
  ) => {
    onSearchChange(normalizeCampaignAdminInstitutionThreadsSearch(nextSearch), options);
  };

  const resetLocalPagingState = (nextSearch: CampaignAdminInstitutionThreadsSearch) => {
    setPreviousCursors([]);
    setPaginationStateSignature(
      createCampaignAdminInstitutionThreadsPaginationSignature(nextSearch),
    );
  };

  const handleFiltersChange = (
    nextSearch: CampaignAdminInstitutionThreadsSearch,
    options?: { readonly replace?: boolean },
  ) => {
    const normalizedNextSearch = normalizeCampaignAdminInstitutionThreadsSearch({
      ...nextSearch,
      selectedThreadId: undefined,
      cursor: undefined,
      pageIndex: undefined,
    });
    resetLocalPagingState(normalizedNextSearch);
    handleSearchStateChange(normalizedNextSearch, options);
  };

  const handleNextPage = () => {
    const nextCursor = listQuery.data?.page.nextCursor;
    if (nextCursor === undefined || nextCursor === null) {
      return;
    }

    const nextSearch = normalizeCampaignAdminInstitutionThreadsSearch({
      ...normalizedSearch,
      cursor: nextCursor,
      pageIndex: currentPageIndex + 1,
    });

    setPreviousCursors((currentCursors) => [
      ...currentCursors,
      normalizedSearch.cursor ?? null,
    ]);
    setPaginationStateSignature(
      createCampaignAdminInstitutionThreadsPaginationSignature(nextSearch),
    );
    handleSearchStateChange(nextSearch);
  };

  const handlePreviousPage = () => {
    if (previousCursors.length === 0) {
      if (normalizedSearch.cursor === undefined || currentPageIndex !== 2) {
        return;
      }

      const nextSearch = normalizeCampaignAdminInstitutionThreadsSearch({
        ...normalizedSearch,
        cursor: undefined,
        pageIndex: undefined,
      });
      setPaginationStateSignature(
        createCampaignAdminInstitutionThreadsPaginationSignature(nextSearch),
      );
      handleSearchStateChange(nextSearch);
      return;
    }

    const nextPreviousCursors = [...previousCursors];
    const previousCursor = nextPreviousCursors.pop() ?? null;
    const nextPageIndex = Math.max(1, currentPageIndex - 1);
    const nextSearch = normalizeCampaignAdminInstitutionThreadsSearch({
      ...normalizedSearch,
      cursor: previousCursor ?? undefined,
      pageIndex: nextPageIndex === 1 ? undefined : nextPageIndex,
    });
    setPreviousCursors(nextPreviousCursors);
    setPaginationStateSignature(
      createCampaignAdminInstitutionThreadsPaginationSignature(nextSearch),
    );
    handleSearchStateChange(nextSearch);
  };

  const handleRefresh = () => {
    if (conflictCode !== null) {
      return;
    }

    void Promise.allSettled([
      listQuery.refetch(),
      selectedThreadId ? detailQuery.refetch() : Promise.resolve(),
    ]);
  };

  const clearSelectedThread = () => {
    handleSearchStateChange(
      {
        ...normalizedSearch,
        selectedThreadId: undefined,
      },
    );
  };

  useEffect(() => {
    if (
      selectedThreadId === null ||
      detailQuery.isLoading ||
      detailQuery.isFetching ||
      detailQuery.error?.status !== 404
    ) {
      return;
    }

    onSearchChange(
      normalizeCampaignAdminInstitutionThreadsSearch({
        ...normalizedSearch,
        selectedThreadId: undefined,
      }),
      { replace: true },
    );
  }, [
    detailQuery.error?.status,
    detailQuery.isFetching,
    detailQuery.isLoading,
    normalizedSearch,
    onSearchChange,
    selectedThreadId,
  ]);

  const openSelectedThread = (threadId: string) => {
    if (normalizedSearch.selectedThreadId === threadId) {
      return;
    }

    handleSearchStateChange({
      ...normalizedSearch,
      selectedThreadId: threadId,
    });
  };

  const stripSelectedThreadSearch = {
    ...normalizedSearch,
    selectedThreadId: undefined,
  };

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={t`Institution Threads`}
      description={t`Inspect institution email threads, filter the operational queue, and record manual institution response events.`}
    >
      <div className="space-y-6">
        <Breadcrumb>
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
              <BreadcrumbPage>{t`Institution threads`}</BreadcrumbPage>
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
              <p>
                {t`You need an authenticated admin session to access institution threads.`}
              </p>
              <AuthSignInButton>
                <Button type="button">{t`Sign in`}</Button>
              </AuthSignInButton>
            </AlertDescription>
          </Alert>
        ) : (
          <section className="space-y-4">
            {conflictMessage ? (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t`Invalid filter combination`}</AlertTitle>
                <AlertDescription>{conflictMessage}</AlertDescription>
              </Alert>
            ) : null}

            {listQuery.error?.status === 403 ? (
              <Alert variant="destructive">
                <LockKeyhole className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t`Access denied`}</AlertTitle>
                <AlertDescription>{listQuery.error.message}</AlertDescription>
              </Alert>
            ) : listQuery.error?.status === 404 ? (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t`Institution threads unavailable`}</AlertTitle>
                <AlertDescription>{listQuery.error.message}</AlertDescription>
              </Alert>
            ) : null}

            {listQuery.error &&
            listQuery.error.status !== 403 &&
            listQuery.error.status !== 404 ? (
              <Alert variant="destructive">
                <Ban className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t`Failed to load institution threads`}</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{listQuery.error.message}</p>
                  <Button type="button" variant="outline" size="sm" onClick={handleRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t`Retry`}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : null}

            {listQuery.isLoading ? (
              <TableSkeleton />
            ) : items.length === 0 ? (
              <div className="space-y-4">
                <CampaignAdminInstitutionThreadsToolbar
                  embedded
                  search={normalizedSearch}
                  isLoading={listQuery.isLoading || listQuery.isFetching}
                  onApply={handleFiltersChange}
                  onReset={handleFiltersChange}
                  onRefresh={handleRefresh}
                />
                <EmptyState
                  icon={<SearchX className="h-5 w-5" aria-hidden="true" />}
                  title={t`No institution threads matched these filters`}
                  description={t`Adjust the current filters or clear them to load more thread rows.`}
                />
                <div className="flex justify-center">
                  <Button type="button" variant="outline" onClick={() =>
                    handleFiltersChange(
                      createEmptyCampaignAdminInstitutionThreadsSearch({
                        currentSearch: normalizedSearch,
                      }),
                    )
                  }>
                    {t`Clear filters`}
                  </Button>
                </div>
              </div>
            ) : (
              <CampaignAdminInstitutionThreadsTable
                campaignKey={campaignKey}
                items={items}
                search={stripSelectedThreadSearch}
                selectedThreadId={selectedThreadId}
                onOpenThread={openSelectedThread}
                onClearFilters={() =>
                  handleFiltersChange(
                    createEmptyCampaignAdminInstitutionThreadsSearch({
                      currentSearch: normalizedSearch,
                    }),
                  )
                }
                header={
                  <CampaignAdminInstitutionThreadsToolbar
                    embedded
                    search={normalizedSearch}
                    isLoading={listQuery.isLoading || listQuery.isFetching}
                    onApply={handleFiltersChange}
                    onReset={handleFiltersChange}
                    onRefresh={handleRefresh}
                  />
                }
                footer={
                  <CampaignAdminCursorPager
                    pageIndex={currentPageIndex}
                    pageSize={normalizedSearch.limit}
                    itemCount={items.length}
                    totalCount={listQuery.data?.page.totalCount}
                    canPrevious={canPreviousPage}
                    canNext={listQuery.data?.page.hasMore ?? false}
                    isLoading={listQuery.isFetching}
                    onPrevious={handlePreviousPage}
                    onNext={handleNextPage}
                    variant="connected"
                  />
                }
              />
            )}
          </section>
        )}
      </div>

      <CampaignAdminInstitutionThreadSheet
        open={selectedThreadId !== null}
        campaignKey={campaignKey}
        search={stripSelectedThreadSearch}
        threadId={selectedThreadId}
        thread={detailQuery.data ?? null}
        isLoading={detailQuery.isLoading || detailQuery.isFetching}
        errorMessage={detailQuery.error?.message ?? null}
        submitErrorMessage={appendResponseError?.message ?? null}
        isSubmitting={isAppendResponsePending}
        onOpenChange={(open) => {
          if (!open) {
            clearSelectedThread();
          }
        }}
        onSubmitResponse={async (body) => {
          return appendResponse(body);
        }}
      />
    </AdminCampaignLayout>
  );
}
