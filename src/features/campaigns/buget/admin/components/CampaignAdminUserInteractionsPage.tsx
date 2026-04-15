import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  LockKeyhole,
  RefreshCw,
  SearchX,
  Users,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth, AuthSignInButton } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import { InteractionsSummaryPanel } from "@/features/campaigns/buget/admin/components/InteractionsSummaryPanel";
import { CampaignAdminReviewSheet } from "@/features/campaigns/buget/admin/components/CampaignAdminReviewSheet";
import {
  CampaignAdminSendValidationDialog,
} from "@/features/campaigns/buget/admin/components/CampaignAdminSendValidationDialog";
import { CampaignAdminUserInteractionsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsTable";
import { CampaignAdminUserInteractionsToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsToolbar";
import {
  buildCampaignAdminSelectionKey,
  getCampaignAdminCampaignLabel,
  isCampaignAdminUserInteractionsLocalSortKey,
} from "@/features/campaigns/buget/admin/constants";
import {
  getCampaignAdminQueueFilters,
  normalizeCampaignAdminQueueSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import {
  useCampaignAdminInteractionMetaQuery,
  useCampaignAdminQueueQuery,
  useSubmitCampaignAdminReviewsMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions";
import {
  useCampaignAdminInteractionSelection,
  type CampaignAdminToggleUserInteractionSelectionInput,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-interaction-selection";
import {
  EMPTY_CAMPAIGN_ADMIN_META_STATS,
  type CampaignAdminCampaignKey,
  type CampaignAdminQueueSearch,
  type CampaignAdminReviewDecision,
  type CampaignAdminSortOrder,
  type CampaignAdminStagedReviewDraft,
  type CampaignAdminUserInteractionListItem,
  type CampaignAdminUserInteractionsSortKey,
} from "@/features/campaigns/buget/admin/types";
import {
  looksLikeCampaignAdminBulkReviewClipboardText,
  parseCampaignAdminBulkReviewClipboardText,
  serializeCampaignAdminBulkReviewRowsToClipboardTsv,
} from "@/features/campaigns/buget/admin/utils/bulk-review-clipboard";
import {
  readCampaignAdminStagedReviewDraftsFromSessionStorage,
  writeCampaignAdminStagedReviewDraftsToSessionStorage,
} from "@/features/campaigns/buget/admin/utils/staged-review-session-storage";
import {
  buildCampaignAdminSubmitReviewItem,
  buildCampaignAdminSubmitReviewBatches,
  countCampaignAdminNotifyingDrafts,
  createCampaignAdminStageReviewDraft,
  getCampaignAdminSelectedSendValidationIssues,
  getCampaignAdminSendValidationMessage,
  isCampaignAdminEditablePasteTarget,
  isCampaignAdminPendingReview,
  toggleCampaignAdminStageReviewDraftNotification,
} from "@/features/campaigns/buget/admin/utils/review-workspace";
import {
  buildCampaignAdminNotificationsTriggerHref,
  wasCampaignAdminReviewSavedDespiteError,
} from "@/features/campaigns/buget/admin/utils/review-notification-helpers";

type CampaignAdminUserInteractionsPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminQueueSearch;
  readonly onSearchChange: (
    search: CampaignAdminQueueSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

function createPaginationStateSignature(search: CampaignAdminQueueSearch): string {
  const {
    reviewSelectionKey: _reviewSelectionKey,
    ...searchWithoutReviewSelection
  } = search;

  return JSON.stringify(searchWithoutReviewSelection);
}

export function CampaignAdminUserInteractionsPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminUserInteractionsPageProps) {
  const pageTitle = t`Interactions queue`;
  const pageDescription = t`Review campaign interactions with the existing operator workflow and durable reviewer attribution.`;
  const normalizedSearch = normalizeCampaignAdminQueueSearch(search);
  const queueFilters = useMemo(
    () => getCampaignAdminQueueFilters(normalizedSearch),
    [normalizedSearch],
  );
  const paginationStateSignatureFromSearch = useMemo(
    () => createPaginationStateSignature(normalizedSearch),
    [normalizedSearch],
  );
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>(
    [],
  );
  const [paginationStateSignature, setPaginationStateSignature] = useState(
    paginationStateSignatureFromSearch,
  );
  const [localSort, setLocalSort] = useState<{
    readonly sortBy: CampaignAdminUserInteractionsSortKey;
    readonly sortOrder: CampaignAdminSortOrder;
  } | null>(() =>
    normalizedSearch.sortBy !== undefined &&
    normalizedSearch.sortOrder !== undefined &&
    isCampaignAdminUserInteractionsLocalSortKey(normalizedSearch.sortBy)
      ? {
          sortBy: normalizedSearch.sortBy,
          sortOrder: normalizedSearch.sortOrder,
        }
      : null,
  );
  const [isSendValidationOpen, setIsSendValidationOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isClearStagedConfirmOpen, setIsClearStagedConfirmOpen] =
    useState(false);
  const {
    selectedKeys,
    clearSelection,
    replaceSelection,
    toggleSelection,
    removeSelectionKey,
  } = useCampaignAdminInteractionSelection();
  const [stagedReviewDraftsByKey, setStagedReviewDraftsByKey] = useState<
    Record<string, CampaignAdminStagedReviewDraft>
  >(() => readCampaignAdminStagedReviewDraftsFromSessionStorage(campaignKey));
  const currentPageIndex = normalizedSearch.pageIndex ?? 1;
  const canPreviousPage =
    previousCursors.length > 0 ||
    (previousCursors.length === 0 &&
      normalizedSearch.cursor !== undefined &&
      currentPageIndex === 2);

  const queueQuery = useCampaignAdminQueueQuery({
    campaignKey,
    filters: queueFilters,
    cursor: normalizedSearch.cursor ?? null,
    limit: normalizedSearch.limit,
    enabled: isLoaded && isSignedIn,
  });
  const metaQuery = useCampaignAdminInteractionMetaQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn,
  });
  const submitReviewsMutation =
    useSubmitCampaignAdminReviewsMutation(campaignKey);
  const effectiveSortBy = localSort?.sortBy ?? normalizedSearch.sortBy;
  const effectiveSortOrder = localSort?.sortOrder ?? normalizedSearch.sortOrder;

  useEffect(() => {
    if (
      normalizedSearch.sortBy !== undefined &&
      normalizedSearch.sortOrder !== undefined &&
      isCampaignAdminUserInteractionsLocalSortKey(normalizedSearch.sortBy)
    ) {
      const localSortBy = normalizedSearch.sortBy;
      const localSortOrder = normalizedSearch.sortOrder;

      setLocalSort((currentLocalSort) =>
        currentLocalSort?.sortBy === localSortBy &&
        currentLocalSort?.sortOrder === localSortOrder
          ? currentLocalSort
          : {
              sortBy: localSortBy,
              sortOrder: localSortOrder,
            },
      );
      return;
    }

    setLocalSort((currentLocalSort) =>
      currentLocalSort === null ? currentLocalSort : null,
    );
  }, [normalizedSearch.sortBy, normalizedSearch.sortOrder]);

  const items = queueQuery.data?.items ?? [];
  const activeSelectionKey = normalizedSearch.reviewSelectionKey ?? null;
  const selectedItems = items.filter((item) =>
    selectedKeys.has(
      buildCampaignAdminSelectionKey(item.userId, item.recordKey),
    ),
  );
  const bulkReviewItems = selectedItems.length > 0 ? selectedItems : items;
  const activeItem =
    items.find(
      (item) =>
        buildCampaignAdminSelectionKey(item.userId, item.recordKey) ===
        activeSelectionKey,
    ) ?? null;
  const activeStagedDraft =
    activeSelectionKey === null
      ? null
      : (stagedReviewDraftsByKey[activeSelectionKey] ?? null);

  const selectedSendValidationIssues = useMemo(
    () =>
      getCampaignAdminSelectedSendValidationIssues({
        items: selectedItems,
        stagedReviewDraftsByKey,
        buildSelectionKey: buildCampaignAdminSelectionKey,
      }),
    [selectedItems, stagedReviewDraftsByKey],
  );
  const selectedStagedDrafts = useMemo(
    () =>
      selectedItems.flatMap((item) => {
        const stagedDraft =
          stagedReviewDraftsByKey[
            buildCampaignAdminSelectionKey(item.userId, item.recordKey)
          ];

        return stagedDraft ? [stagedDraft] : [];
      }),
    [selectedItems, stagedReviewDraftsByKey],
  );
  const metaStats = metaQuery.data?.stats ?? EMPTY_CAMPAIGN_ADMIN_META_STATS;
  const shouldShowMetaSummary = metaQuery.data !== undefined;
  const selectedStagedDraftCount = selectedStagedDrafts.length;
  const selectedNotifyingDraftCount = countCampaignAdminNotifyingDrafts(
    selectedStagedDrafts,
  );
  const usersHref = `/admin/campaigns/${campaignKey}/users`;
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
    writeCampaignAdminStagedReviewDraftsToSessionStorage(
      campaignKey,
      stagedReviewDraftsByKey,
    );
  }, [campaignKey, stagedReviewDraftsByKey]);
  useEffect(() => {
    if (paginationStateSignature === paginationStateSignatureFromSearch) {
      return;
    }

    setPreviousCursors([]);
    clearSelection();
    setIsSendValidationOpen(false);
    setIsSendConfirmOpen(false);
    setIsClearStagedConfirmOpen(false);
    setPaginationStateSignature(paginationStateSignatureFromSearch);
  }, [
    clearSelection,
    paginationStateSignature,
    paginationStateSignatureFromSearch,
  ]);

  const handleSearchStateChange = (
    nextSearch: CampaignAdminQueueSearch,
    options?: { readonly replace?: boolean },
  ) => {
    onSearchChange(normalizeCampaignAdminQueueSearch(nextSearch), options);
  };

  const closeReviewSidebar = (options?: { readonly replace?: boolean }) => {
    if (normalizedSearch.reviewSelectionKey === undefined) {
      return;
    }

    handleSearchStateChange(
      {
        ...normalizedSearch,
        reviewSelectionKey: undefined,
      },
      options,
    );
  };

  const openReviewSidebar = (
    selectionKey: string,
    options?: { readonly replace?: boolean },
  ) => {
    handleSearchStateChange(
      {
        ...normalizedSearch,
        reviewSelectionKey: selectionKey,
      },
      options,
    );
  };

  const resetLocalPagingState = (nextSearch: CampaignAdminQueueSearch) => {
    setPreviousCursors([]);
    setPaginationStateSignature(createPaginationStateSignature(nextSearch));
    clearSelection();
    setIsSendValidationOpen(false);
    setIsSendConfirmOpen(false);
    setIsClearStagedConfirmOpen(false);
  };

  const handleSearchChange = (nextSearch: CampaignAdminQueueSearch) => {
    const nextQueueSearch = normalizeCampaignAdminQueueSearch({
      ...nextSearch,
      cursor: undefined,
      pageIndex: undefined,
      reviewSelectionKey: undefined,
    });
    resetLocalPagingState(nextQueueSearch);
    handleSearchStateChange(nextQueueSearch);
  };

  const handleSortChange = (
    sortBy: CampaignAdminUserInteractionsSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => {
    if (isCampaignAdminUserInteractionsLocalSortKey(sortBy)) {
      setLocalSort({ sortBy, sortOrder });
      return;
    }

    setLocalSort(null);
    const nextQueueSearch = normalizeCampaignAdminQueueSearch({
      ...normalizedSearch,
      sortBy,
      sortOrder,
      cursor: undefined,
      pageIndex: undefined,
      reviewSelectionKey: undefined,
    });
    resetLocalPagingState(nextQueueSearch);
    handleSearchStateChange(nextQueueSearch, { replace: true });
  };

  const handleNextPage = () => {
    const nextCursor = queueQuery.data?.page.nextCursor;
    if (nextCursor === undefined || nextCursor === null) {
      return;
    }

    const nextQueueSearch = normalizeCampaignAdminQueueSearch({
      ...normalizedSearch,
      cursor: nextCursor,
      pageIndex: currentPageIndex + 1,
      reviewSelectionKey: undefined,
    });

    setPreviousCursors((currentCursors) => [
      ...currentCursors,
      normalizedSearch.cursor ?? null,
    ]);
    setPaginationStateSignature(createPaginationStateSignature(nextQueueSearch));
    clearSelection();
    setIsSendValidationOpen(false);
    setIsSendConfirmOpen(false);
    setIsClearStagedConfirmOpen(false);
    handleSearchStateChange(nextQueueSearch);
  };

  const handlePreviousPage = () => {
    if (previousCursors.length === 0) {
      if (normalizedSearch.cursor === undefined || currentPageIndex !== 2) {
        return;
      }

      const nextQueueSearch = normalizeCampaignAdminQueueSearch({
        ...normalizedSearch,
        cursor: undefined,
        pageIndex: undefined,
        reviewSelectionKey: undefined,
      });
      setPaginationStateSignature(createPaginationStateSignature(nextQueueSearch));
      clearSelection();
      setIsSendValidationOpen(false);
      setIsSendConfirmOpen(false);
      setIsClearStagedConfirmOpen(false);
      handleSearchStateChange(nextQueueSearch);
      return;
    }

    const nextPreviousCursors = [...previousCursors];
    const previousCursor = nextPreviousCursors.pop() ?? null;
    const nextPageIndex = Math.max(1, currentPageIndex - 1);
    const nextQueueSearch = normalizeCampaignAdminQueueSearch({
      ...normalizedSearch,
      cursor: previousCursor ?? undefined,
      pageIndex: nextPageIndex === 1 ? undefined : nextPageIndex,
      reviewSelectionKey: undefined,
    });

    setPreviousCursors(nextPreviousCursors);
    setPaginationStateSignature(createPaginationStateSignature(nextQueueSearch));
    clearSelection();
    setIsSendValidationOpen(false);
    setIsSendConfirmOpen(false);
    setIsClearStagedConfirmOpen(false);
    handleSearchStateChange(nextQueueSearch);
  };

  const handleToggleSelection = (
    input: CampaignAdminToggleUserInteractionSelectionInput,
  ) => {
    toggleSelection(input);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!checked) {
      clearSelection();
      return;
    }

    replaceSelection(
      items
        .filter(isCampaignAdminPendingReview)
        .map((item) => buildCampaignAdminSelectionKey(item.userId, item.recordKey)),
    );
  };

  const handleMutationError = (error: unknown) => {
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status?: unknown }).status;
      if (status === 404 || status === 409) {
        toast.error(
          t`The queue changed before this review was saved. The current page was refreshed.`,
        );
        clearSelection();
        setIsSendValidationOpen(false);
        setIsSendConfirmOpen(false);
        setIsClearStagedConfirmOpen(false);
        closeReviewSidebar({ replace: true });
        return;
      }
    }

    if (error instanceof Error) {
      toast.error(error.message);
      return;
    }

    toast.error(t`Failed to save the review.`);
  };

  const clearStagedReviewDraft = (selectionKey: string) => {
    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      if (currentDraftsByKey[selectionKey] === undefined) {
        return currentDraftsByKey;
      }

      const nextDraftsByKey = { ...currentDraftsByKey };
      delete nextDraftsByKey[selectionKey];
      return nextDraftsByKey;
    });
  };

  const stageReviewDecision = (
    item: CampaignAdminUserInteractionListItem,
    status: CampaignAdminReviewDecision,
  ) => {
    const selectionKey = buildCampaignAdminSelectionKey(
      item.userId,
      item.recordKey,
    );

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const currentDraft = currentDraftsByKey[selectionKey];
      const nextDraft = createCampaignAdminStageReviewDraft({
        item,
        currentDraft,
        status,
      });

      if (
        currentDraft?.status === nextDraft.status &&
        currentDraft.feedbackText === nextDraft.feedbackText &&
        currentDraft.approvalRiskAcknowledged ===
          nextDraft.approvalRiskAcknowledged &&
        currentDraft.sendNotification === nextDraft.sendNotification
      ) {
        return currentDraftsByKey;
      }

      return {
        ...currentDraftsByKey,
        [selectionKey]: nextDraft,
      };
    });
  };

  const stageReviewFeedbackText = (
    item: CampaignAdminUserInteractionListItem,
    feedbackText: string,
  ) => {
    const selectionKey = buildCampaignAdminSelectionKey(
      item.userId,
      item.recordKey,
    );

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const currentDraft = currentDraftsByKey[selectionKey];

      if (
        currentDraft === undefined ||
        currentDraft.feedbackText === feedbackText
      ) {
        return currentDraftsByKey;
      }

      return {
        ...currentDraftsByKey,
        [selectionKey]: {
          ...currentDraft,
          feedbackText,
        },
      };
    });
  };

  const stageReviewApprovalRiskAcknowledged = (
    item: CampaignAdminUserInteractionListItem,
    approvalRiskAcknowledged: boolean,
  ) => {
    const selectionKey = buildCampaignAdminSelectionKey(
      item.userId,
      item.recordKey,
    );

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const currentDraft = currentDraftsByKey[selectionKey];

      if (
        currentDraft === undefined ||
        currentDraft.status !== "approved" ||
        currentDraft.approvalRiskAcknowledged === approvalRiskAcknowledged
      ) {
        return currentDraftsByKey;
      }

      return {
        ...currentDraftsByKey,
        [selectionKey]: {
          ...currentDraft,
          approvalRiskAcknowledged,
        },
      };
    });
  };

  const stageReviewSendNotification = (
    item: CampaignAdminUserInteractionListItem,
    sendNotification: boolean,
  ) => {
    const selectionKey = buildCampaignAdminSelectionKey(
      item.userId,
      item.recordKey,
    );

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const nextDraft = toggleCampaignAdminStageReviewDraftNotification({
        item,
        currentDraft: currentDraftsByKey[selectionKey],
        sendNotification,
      });

      if (nextDraft === null) {
        return currentDraftsByKey;
      }

      const currentDraft = currentDraftsByKey[selectionKey];
      if (currentDraft?.sendNotification === nextDraft.sendNotification) {
        return currentDraftsByKey;
      }

      return {
        ...currentDraftsByKey,
        [selectionKey]: nextDraft,
      };
    });
  };

  const submitStagedReview = async (input: {
    item: CampaignAdminUserInteractionListItem;
    draft: CampaignAdminStagedReviewDraft;
  }) => {
    const validationMessage = getCampaignAdminSendValidationMessage({
      item: input.item,
      stagedDraft: input.draft,
    });

    if (validationMessage !== null) {
      toast.error(validationMessage);
      return;
    }

    const selectionKey = buildCampaignAdminSelectionKey(
      input.item.userId,
      input.item.recordKey,
    );

    try {
      await submitReviewsMutation.mutateAsync({
        items: [buildCampaignAdminSubmitReviewItem(input)],
        send_notification: input.draft.sendNotification === true,
      });

      clearStagedReviewDraft(selectionKey);
      removeSelectionKey(selectionKey);
      closeReviewSidebar({ replace: true });
      toast.success(
        input.draft.sendNotification === true
          ? input.draft.status === "approved"
            ? t`Review approved and notification requested.`
            : t`Review rejected and notification requested.`
          : input.draft.status === "approved"
            ? t`Review approved.`
            : t`Review rejected.`,
      );
    } catch (error) {
      if (wasCampaignAdminReviewSavedDespiteError(error)) {
        clearStagedReviewDraft(selectionKey);
        removeSelectionKey(selectionKey);
        closeReviewSidebar({ replace: true });
      }
      handleMutationError(error);
    }
  };

  const canSendSelectedReviews =
    selectedItems.length > 0 && selectedSendValidationIssues.length === 0;

  const handleSendSelectedButtonClick = () => {
    if (canSendSelectedReviews) {
      setIsSendConfirmOpen(true);
      return;
    }

    setIsSendValidationOpen(true);
  };

  const bulkReviewFooter =
    selectedItems.length > 0 ? (
      <div
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        aria-live="polite"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {t`Bulk review`}
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedItems.length === 1
              ? t`1 row selected`
              : t`${selectedItems.length} rows selected`}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {selectedStagedDraftCount > 0 ? (
              <span>
                {selectedStagedDraftCount === 1
                  ? t`1 row staged`
                  : t`${selectedStagedDraftCount} rows staged`}
              </span>
            ) : null}
            {!canSendSelectedReviews ? (
              <span>
                {selectedSendValidationIssues.length === 1
                  ? t`1 row still needs review data`
                  : t`${selectedSendValidationIssues.length} rows still need review data`}
              </span>
            ) : (
              <span>
                {selectedNotifyingDraftCount > 0
                  ? selectedNotifyingDraftCount === selectedStagedDraftCount
                    ? t`Ready to submit: all staged rows will notify.`
                    : t`Ready to submit: ${selectedNotifyingDraftCount} notify, ${selectedStagedDraftCount - selectedNotifyingDraftCount} save only.`
                  : t`Ready to submit selected reviews without notifications.`}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {selectedStagedDraftCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsClearStagedConfirmOpen(true)}
              className="rounded-full"
            >
              {t`Clear staged`}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearSelection}
            className="rounded-full"
          >
            {t`Clear selection`}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSendSelectedButtonClick}
            className="gap-1.5 rounded-full"
          >
            {t`Submit selected`}
          </Button>
        </div>
      </div>
    ) : null;

  const handleSendSelectedReviews = async () => {
    if (!canSendSelectedReviews) {
      return;
    }

    const latestValidationIssues = getCampaignAdminSelectedSendValidationIssues({
      items: selectedItems,
      stagedReviewDraftsByKey,
      buildSelectionKey: buildCampaignAdminSelectionKey,
    });

    if (latestValidationIssues.length > 0) {
      setIsSendConfirmOpen(false);
      setIsSendValidationOpen(true);
      toast.error(t`Selected rows changed before send. Review the staged data and try again.`);
      return;
    }

    const submittedSelectionKeys = new Set<string>();
    let submittedBatchCount = 0;

    try {
      const batches = buildCampaignAdminSubmitReviewBatches({
        items: selectedItems,
        stagedReviewDraftsByKey,
        buildSelectionKey: buildCampaignAdminSelectionKey,
      });

      const submitItemCount = batches.reduce(
        (count, batch) => count + batch.body.items.length,
        0,
      );

      if (submitItemCount !== selectedItems.length) {
        setIsSendConfirmOpen(false);
        setIsSendValidationOpen(true);
        toast.error(t`Selected rows changed before send. Review the staged data and try again.`);
        return;
      }

      for (const batch of batches) {
        try {
          await submitReviewsMutation.mutateAsync(batch.body);
          batch.selectionKeys.forEach((selectionKey) => {
            submittedSelectionKeys.add(selectionKey);
          });
          submittedBatchCount += batch.body.items.length;
        } catch (error) {
          if (wasCampaignAdminReviewSavedDespiteError(error)) {
            batch.selectionKeys.forEach((selectionKey) => {
              submittedSelectionKeys.add(selectionKey);
            });
            submittedBatchCount += batch.body.items.length;
          }

          throw error;
        }
      }

      setStagedReviewDraftsByKey((currentDraftsByKey) => {
        const nextDraftsByKey = { ...currentDraftsByKey };
        submittedSelectionKeys.forEach((selectionKey) => {
          delete nextDraftsByKey[selectionKey];
        });
        return nextDraftsByKey;
      });
      clearSelection();
      setIsSendValidationOpen(false);
      setIsSendConfirmOpen(false);
      if (
        activeSelectionKey !== null &&
        submittedSelectionKeys.has(activeSelectionKey)
      ) {
        closeReviewSidebar({ replace: true });
      }
      toast.success(
        selectedNotifyingDraftCount > 0
          ? selectedItems.length === 1
            ? t`Submitted 1 review with notification intent.`
            : t`Submitted ${submittedBatchCount} reviews with ${selectedNotifyingDraftCount} set to notify.`
          : selectedItems.length === 1
            ? t`Submitted 1 review.`
            : t`Submitted ${submittedBatchCount} reviews.`,
      );
    } catch (error) {
      setIsSendConfirmOpen(false);
      if (submittedSelectionKeys.size > 0) {
        setStagedReviewDraftsByKey((currentDraftsByKey) => {
          const nextDraftsByKey = { ...currentDraftsByKey };
          submittedSelectionKeys.forEach((selectionKey) => {
            delete nextDraftsByKey[selectionKey];
          });
          return nextDraftsByKey;
        });
        submittedSelectionKeys.forEach((selectionKey) => {
          removeSelectionKey(selectionKey);
        });
        if (
          activeSelectionKey !== null &&
          submittedSelectionKeys.has(activeSelectionKey)
        ) {
          closeReviewSidebar({ replace: true });
        }
        toast.error(
          submittedBatchCount === 1
            ? t`Saved 1 review before the remaining batch failed.`
            : t`Saved ${submittedBatchCount} reviews before the remaining batch failed.`,
        );
        return;
      }
      handleMutationError(error);
    }
  };

  const handleCopySelectedRows = async () => {
    if (bulkReviewItems.length === 0) {
      toast.error(t`No review rows are available to copy.`);
      return;
    }

    if (
      typeof navigator === "undefined" ||
      navigator.clipboard?.writeText === undefined
    ) {
      toast.error(t`Clipboard copy is not available in this browser.`);
      return;
    }

    try {
      const serializedRows = serializeCampaignAdminBulkReviewRowsToClipboardTsv(
        {
          items: bulkReviewItems,
          stagedDraftsByKey: stagedReviewDraftsByKey,
          baseUrl:
            typeof window === "undefined" ? undefined : window.location.origin,
        },
      );
      await navigator.clipboard.writeText(serializedRows);
      toast.success(
        bulkReviewItems.length === 1
          ? t`Copied 1 review row to the clipboard.`
          : t`Copied ${bulkReviewItems.length} review rows to the clipboard.`,
      );
    } catch {
      toast.error(t`Failed to copy the review rows.`);
    }
  };

  const handleImportBulkReviewText = useEffectEvent((rawText: string) => {
    const result = parseCampaignAdminBulkReviewClipboardText({
      rawText,
      items: bulkReviewItems,
    });

    if (result.drafts.length > 0) {
      setStagedReviewDraftsByKey((currentDraftsByKey) => {
        const nextDraftsByKey = { ...currentDraftsByKey };

        result.drafts.forEach((draft) => {
          const selectionKey = buildCampaignAdminSelectionKey(
            draft.userId,
            draft.recordKey,
          );
          const currentDraft = nextDraftsByKey[selectionKey];

          nextDraftsByKey[selectionKey] = {
            ...draft,
            sendNotification:
              draft.sendNotification ?? currentDraft?.sendNotification ?? false,
          };
        });

        return nextDraftsByKey;
      });

      toast.success(
        result.drafts.length === 1
          ? t`Imported staged review values for 1 row.`
          : t`Imported staged review values for ${result.drafts.length} rows.`,
      );
    } else if (result.issues.length > 0) {
      toast.error(t`No staged review values were imported.`);
    }

    return result;
  });

  useEffect(() => {
    if (bulkReviewItems.length === 0) {
      return;
    }

    const handleWindowPaste = (event: ClipboardEvent) => {
      if (isCampaignAdminEditablePasteTarget(event.target)) {
        return;
      }

      const clipboardText = event.clipboardData?.getData("text/plain") ?? "";
      if (!looksLikeCampaignAdminBulkReviewClipboardText(clipboardText)) {
        return;
      }

      event.preventDefault();
      handleImportBulkReviewText(clipboardText);
    };

    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [bulkReviewItems]);

  const handleClearSelectedStagedDrafts = () => {
    if (selectedItems.length === 0) {
      return;
    }

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      let didChange = false;
      const nextDraftsByKey = { ...currentDraftsByKey };

      selectedItems.forEach((item) => {
        const selectionKey = buildCampaignAdminSelectionKey(
          item.userId,
          item.recordKey,
        );
        if (nextDraftsByKey[selectionKey] !== undefined) {
          didChange = true;
          delete nextDraftsByKey[selectionKey];
        }
      });

      return didChange ? nextDraftsByKey : currentDraftsByKey;
    });
    setIsClearStagedConfirmOpen(false);
  };

  if (!isLoaded) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <CampaignAdminSummarySkeleton />
        <CampaignAdminToolbarSkeleton />
        <CampaignAdminTableSkeleton />
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

  if (queueQuery.error?.status === 401) {
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
              {t`Refresh your authentication session, then try loading the queue again.`}
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

  if (queueQuery.error?.status === 403) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<LockKeyhole className="h-6 w-6" />}
          title={t`You do not have access to this queue`}
          description={t`The server denied access to the current campaign-admin permission boundary.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  if (queueQuery.error?.status === 404) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t`Campaign queue unavailable`}
          description={t`This campaign admin queue is either not enabled on the current server or the campaign key is not supported by the current admin review surface.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={pageTitle}
      description={pageDescription}
      eyebrow={headerEyebrow}
      actions={(
        <>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              void queueQuery.refetch();
            }}
            disabled={queueQuery.isLoading || queueQuery.isFetching}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t`Refresh`}
          </Button>
          <Button asChild type="button" variant="outline" size="sm" className="gap-2">
            <a href={usersHref}>
              <Users className="h-4 w-4" aria-hidden="true" />
              {t`Open users`}
            </a>
          </Button>
        </>
      )}
    >
      {metaQuery.error && metaQuery.data === undefined ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t`Failed to load the queue summary`}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {t`Queue totals and warning counts are unavailable right now. The review table is still current.`}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void metaQuery.refetch();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t`Retry summary`}
            </Button>
          </AlertDescription>
        </Alert>
      ) : shouldShowMetaSummary ? (
        <section className="space-y-4" aria-label={t`Campaign queue summary`}>
          <InteractionsSummaryPanel
            stats={metaStats}
            isExpanded={isStatsExpanded}
            onExpandedChange={setIsStatsExpanded}
          />
        </section>
      ) : (
        <CampaignAdminSummarySkeleton />
      )}

      {queueQuery.error &&
      queueQuery.error.status !== 401 &&
      queueQuery.error.status !== 403 &&
      queueQuery.error.status !== 404 ? (
        <Alert variant="destructive" aria-live="polite">
          <Ban className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t`Failed to load the review queue`}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{queueQuery.error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void queueQuery.refetch();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t`Retry`}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4" aria-labelledby="review-queue-section-title">
        <div className="space-y-1">
          <h2
            id="review-queue-section-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {t`Review queue`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t`Filter the campaign-wide queue, stage decisions, and keep the existing review workflow moving.`}
          </p>
        </div>

        {queueQuery.isLoading ? (
          <CampaignAdminTableSkeleton />
        ) : (
          <div className="space-y-4">
            {items.length === 0 ? (
              <CampaignAdminUserInteractionsToolbar
                embedded
                availableInteractionTypes={
                  metaQuery.data?.availableInteractionTypes ?? []
                }
                search={normalizedSearch}
                isLoading={queueQuery.isLoading || queueQuery.isFetching}
                onApply={handleSearchChange}
                onReset={handleSearchChange}
                onRefresh={() => {
                  void queueQuery.refetch();
                }}
              />
            ) : null}

            <CampaignAdminUserInteractionsTable
              campaignKey={campaignKey}
              items={items}
              stagedDraftsByKey={stagedReviewDraftsByKey}
              selectedKeys={selectedKeys}
              isLoading={queueQuery.isFetching || submitReviewsMutation.isPending}
              header={
                items.length > 0
                  ? ({ actions, trailingActions }) => (
                      <CampaignAdminUserInteractionsToolbar
                        embedded
                        actions={actions}
                        trailingActions={trailingActions}
                        availableInteractionTypes={
                          metaQuery.data?.availableInteractionTypes ?? []
                        }
                        search={normalizedSearch}
                        isLoading={queueQuery.isLoading || queueQuery.isFetching}
                        onApply={handleSearchChange}
                        onReset={handleSearchChange}
                        onRefresh={() => {
                          void queueQuery.refetch();
                        }}
                      />
                    )
                  : undefined
              }
              footer={
                items.length > 0 ? (
                  <CampaignAdminCursorPager
                    pageIndex={currentPageIndex}
                    pageSize={normalizedSearch.limit}
                    itemCount={items.length}
                    totalCount={queueQuery.data?.page.totalCount}
                    canPrevious={canPreviousPage}
                    canNext={queueQuery.data?.page.hasMore ?? false}
                    isLoading={queueQuery.isFetching}
                    onPrevious={handlePreviousPage}
                    onNext={handleNextPage}
                    variant="connected"
                  />
                ) : null
              }
              sortBy={effectiveSortBy}
              sortOrder={effectiveSortOrder}
              onCopyRows={handleCopySelectedRows}
              onSortChange={handleSortChange}
              onToggleSelectAll={handleToggleSelectAll}
              onToggleSelection={handleToggleSelection}
              onToggleSendNotification={stageReviewSendNotification}
              onOpenItem={(item) =>
                openReviewSidebar(
                  buildCampaignAdminSelectionKey(item.userId, item.recordKey),
                )
              }
            />

            {bulkReviewFooter ? (
              <div className="rounded-3xl border border-border/70 bg-card/80 px-4 py-4 shadow-none">
                {bulkReviewFooter}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <CampaignAdminReviewSheet
        open={activeItem !== null}
        item={activeItem}
        stagedDraft={activeStagedDraft}
        isSubmitting={submitReviewsMutation.isPending}
        notificationAdminHref={
          activeItem
            ? buildCampaignAdminNotificationsTriggerHref({
                campaignKey,
                item: activeItem,
              })
            : null
        }
        onOpenChange={(open) => {
          if (!open) {
            closeReviewSidebar();
          }
        }}
        onDecisionChange={stageReviewDecision}
        onFeedbackTextChange={stageReviewFeedbackText}
        onApprovalRiskAcknowledgedChange={stageReviewApprovalRiskAcknowledged}
        onSendNotificationChange={stageReviewSendNotification}
        onClearDraft={(item) =>
          clearStagedReviewDraft(
            buildCampaignAdminSelectionKey(item.userId, item.recordKey),
          )
        }
        onSubmitDraft={({ item, draft }) => submitStagedReview({ item, draft })}
      />

      <CampaignAdminSendValidationDialog
        open={isSendValidationOpen}
        issues={selectedSendValidationIssues}
        selectedCount={selectedItems.length}
        onOpenChange={setIsSendValidationOpen}
        onSelectIssue={(selectionKey) => {
          setIsSendValidationOpen(false);
          openReviewSidebar(selectionKey);
        }}
      />

      <AlertDialog open={isSendConfirmOpen} onOpenChange={setIsSendConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedItems.length === 1
                ? t`Submit 1 review?`
                : t`Submit ${selectedItems.length} reviews?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedItems.length === 1
                ? t`This will save the staged review for the selected row and apply each row's notification setting.`
                : t`This will save the staged reviews for the selected rows and preserve mixed notification settings.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitReviewsMutation.isPending}>
              {t`Cancel`}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleSendSelectedReviews();
              }}
              disabled={submitReviewsMutation.isPending}
            >
              {submitReviewsMutation.isPending ? t`Submitting…` : t`Submit selected`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isClearStagedConfirmOpen}
        onOpenChange={setIsClearStagedConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStagedDraftCount === 1
                ? t`Clear staged data for 1 row?`
                : t`Clear staged data for ${selectedStagedDraftCount} rows?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t`This removes the staged review decision and note for the currently selected rows.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearSelectedStagedDrafts}>
              {t`Clear staged`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminCampaignLayout>
  );
}

function CampaignAdminSummarySkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-baseline gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-12" />
        </div>
      ))}
      <Skeleton className="h-3 w-28" />
    </div>
  );
}

function CampaignAdminToolbarSkeleton() {
  return (
    <div
      role="status"
      aria-label={t`Loading queue filters`}
      className="rounded-3xl border border-border/70 bg-card/80 p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-80" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="h-10 w-20 rounded-xl" />
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-12">
          <div className="space-y-2 xl:col-span-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2 xl:col-span-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2 xl:col-span-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="space-y-2 xl:col-span-4">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignAdminTableSkeleton() {
  const skeletonRowCount = 6;
  const skeletonColumns = 8;

  return (
    <div
      role="status"
      aria-label={t`Loading review queue`}
      className="space-y-4"
    >
      <div className="hidden overflow-hidden rounded-3xl border border-border/70 bg-card/80 lg:block">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-20 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="min-w-[1080px]">
          <div className="flex gap-0 border-b border-border/60 px-3">
            <Skeleton className="h-8 w-12" />
            {Array.from({ length: skeletonColumns }).map((_, i) => (
              <Skeleton key={i} className="h-8 flex-1" />
            ))}
            <Skeleton className="h-8 w-20" />
          </div>
          {Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center gap-0 border-b border-border/60 px-3 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-4 rounded-sm" />
              {Array.from({ length: skeletonColumns }).map((_, colIdx) => (
                <Skeleton
                  key={colIdx}
                  className="h-4 flex-1"
                  style={{ maxWidth: `${60 + ((colIdx * 17) % 40)}%` }}
                />
              ))}
              <Skeleton className="h-8 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 lg:hidden">
        {Array.from({ length: 3 }).map((_, idx) => (
          <div
            key={idx}
            className="rounded-3xl border border-border/70 bg-card/80 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <Skeleton className="h-4 w-4 rounded-sm" />
            </div>
            <div className="mt-4 space-y-2">
              {Array.from({ length: 5 }).map((_, rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Connected footer skeleton */}
      <div className="border-t border-border/60 bg-muted/30 px-4 py-3">
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
  );
}
