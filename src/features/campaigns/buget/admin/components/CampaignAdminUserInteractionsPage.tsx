import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useAuth, AuthSignInButton } from "@/lib/auth";
import { EmptyState } from "@/components/ui/empty-state";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import { CampaignAdminReviewSheet } from "@/features/campaigns/buget/admin/components/CampaignAdminReviewSheet";
import {
  CampaignAdminSendValidationDialog,
} from "@/features/campaigns/buget/admin/components/CampaignAdminSendValidationDialog";
import { CampaignAdminUserInteractionsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsTable";
import { CampaignAdminUserInteractionsToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsToolbar";
import {
  buildCampaignAdminSelectionKey,
  getCampaignAdminCampaignLabel,
  getCampaignAdminPhaseLabel,
  getCampaignAdminReviewStatusLabel,
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
  createCampaignAdminStageReviewDraft,
  getCampaignAdminSelectedSendValidationIssues,
  getCampaignAdminSendValidationMessage,
  isCampaignAdminEditablePasteTarget,
  isCampaignAdminPendingReview,
} from "@/features/campaigns/buget/admin/utils/review-workspace";

type CampaignAdminUserInteractionsPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminQueueSearch;
  readonly onSearchChange: (
    search: CampaignAdminQueueSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

function InlineStat({
  label,
  value,
  dimmed = false,
}: {
  readonly label: string;
  readonly value: number;
  readonly dimmed?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-baseline gap-1 text-sm tabular-nums ${dimmed ? "text-muted-foreground/60" : "text-foreground"}`}
      role="group"
      aria-label={`${label}: ${value}`}
    >
      <span className={`text-xs font-medium ${dimmed ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className="font-semibold">{value}</span>
    </span>
  );
}

function SummaryBreakdown({
  label,
  items,
}: {
  readonly label: string;
  readonly items: ReadonlyArray<{
    readonly label: string;
    readonly value: number;
  }>;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
        {label}
      </span>
      {items.map((item) => (
        <span
          key={`${label}:${item.label}`}
          className="whitespace-nowrap text-sm text-muted-foreground"
        >
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>{" "}
          {item.label}
        </span>
      ))}
    </div>
  );
}

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
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isSendValidationOpen, setIsSendValidationOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isClearStagedConfirmOpen, setIsClearStagedConfirmOpen] =
    useState(false);
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
  const metaStats = metaQuery.data?.stats ?? EMPTY_CAMPAIGN_ADMIN_META_STATS;
  const shouldShowMetaSummary = metaQuery.data !== undefined;
  const threadInProgressCount =
    metaStats.threadPhaseCounts.sending +
    metaStats.threadPhaseCounts.awaiting_reply;
  const threadResolvedCount =
    metaStats.threadPhaseCounts.resolved_positive +
    metaStats.threadPhaseCounts.resolved_negative +
    metaStats.threadPhaseCounts.closed_no_response;
  const reviewBreakdownItems = [
    {
      label: getCampaignAdminReviewStatusLabel("pending"),
      value: metaStats.reviewStatusCounts.pending,
    },
    {
      label: getCampaignAdminReviewStatusLabel("approved"),
      value: metaStats.reviewStatusCounts.approved,
    },
    {
      label: getCampaignAdminReviewStatusLabel("rejected"),
      value: metaStats.reviewStatusCounts.rejected,
    },
    {
      label: getCampaignAdminReviewStatusLabel(null),
      value: metaStats.reviewStatusCounts.notReviewed,
    },
  ];
  const phaseBreakdownItems = [
    {
      label: getCampaignAdminPhaseLabel("idle"),
      value: metaStats.phaseCounts.idle,
    },
    {
      label: getCampaignAdminPhaseLabel("draft"),
      value: metaStats.phaseCounts.draft,
    },
    {
      label: getCampaignAdminPhaseLabel("pending"),
      value: metaStats.phaseCounts.pending,
    },
    {
      label: getCampaignAdminPhaseLabel("resolved"),
      value: metaStats.phaseCounts.resolved,
    },
    {
      label: getCampaignAdminPhaseLabel("failed"),
      value: metaStats.phaseCounts.failed,
    },
  ];
  const threadBreakdownItems = [
    {
      label: t`With thread`,
      value: metaStats.withInstitutionThread,
    },
    {
      label: t`In progress`,
      value: threadInProgressCount,
    },
    {
      label: t`Reply received`,
      value: metaStats.threadPhaseCounts.reply_received_unreviewed,
    },
    {
      label: t`Follow-up`,
      value: metaStats.threadPhaseCounts.manual_follow_up_needed,
    },
    {
      label: t`Resolved`,
      value: threadResolvedCount,
    },
    {
      label: t`Failed`,
      value: metaStats.threadPhaseCounts.failed,
    },
    {
      label: t`No thread`,
      value: metaStats.threadPhaseCounts.none,
    },
  ];
  const selectedStagedDraftCount = selectedItems.filter(
    (item) =>
      stagedReviewDraftsByKey[
        buildCampaignAdminSelectionKey(item.userId, item.recordKey)
      ] !== undefined,
  ).length;
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
    setSelectedKeys(new Set());
    setIsSendValidationOpen(false);
    setIsSendConfirmOpen(false);
    setIsClearStagedConfirmOpen(false);
    setPaginationStateSignature(paginationStateSignatureFromSearch);
  }, [paginationStateSignature, paginationStateSignatureFromSearch]);

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
    setSelectedKeys(new Set());
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
    setSelectedKeys(new Set());
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
      setSelectedKeys(new Set());
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
    setSelectedKeys(new Set());
    setIsSendValidationOpen(false);
    setIsSendConfirmOpen(false);
    setIsClearStagedConfirmOpen(false);
    handleSearchStateChange(nextQueueSearch);
  };

  const handleToggleSelection = (
    item: CampaignAdminUserInteractionListItem,
    checked: boolean,
  ) => {
    if (!isCampaignAdminPendingReview(item)) {
      return;
    }

    const selectionKey = buildCampaignAdminSelectionKey(
      item.userId,
      item.recordKey,
    );
    setSelectedKeys((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      if (checked) {
        nextKeys.add(selectionKey);
      } else {
        nextKeys.delete(selectionKey);
      }
      return nextKeys;
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    if (!checked) {
      setSelectedKeys(new Set());
      return;
    }

    setSelectedKeys(
      new Set(
        items
          .filter(isCampaignAdminPendingReview)
          .map((item) =>
            buildCampaignAdminSelectionKey(item.userId, item.recordKey),
          ),
      ),
    );
  };

  const handleMutationError = (error: unknown) => {
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status?: unknown }).status;
      if (status === 404 || status === 409) {
        toast.error(
          t`The queue changed before this review was saved. The current page was refreshed.`,
        );
        setSelectedKeys(new Set());
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
          nextDraft.approvalRiskAcknowledged
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

    try {
      const selectionKey = buildCampaignAdminSelectionKey(
        input.item.userId,
        input.item.recordKey,
      );

      await submitReviewsMutation.mutateAsync({
        items: [buildCampaignAdminSubmitReviewItem(input)],
      });

      clearStagedReviewDraft(selectionKey);
      setSelectedKeys((currentKeys) => {
        if (!currentKeys.has(selectionKey)) {
          return currentKeys;
        }

        const nextKeys = new Set(currentKeys);
        nextKeys.delete(selectionKey);
        return nextKeys;
      });
      closeReviewSidebar({ replace: true });
      toast.success(
        input.draft.status === "approved"
          ? t`Review approved.`
          : t`Review rejected.`,
      );
    } catch (error) {
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
              <span>{t`Ready to send selected reviews.`}</span>
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
            onClick={() => setSelectedKeys(new Set())}
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
            {t`Send selected`}
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

    try {
      const submittedSelectionKeys = new Set<string>();
      const submitItems = selectedItems.flatMap((item) => {
        const selectionKey = buildCampaignAdminSelectionKey(
          item.userId,
          item.recordKey,
        );
        const stagedDraft = stagedReviewDraftsByKey[selectionKey];

        if (stagedDraft === undefined) {
          return [];
        }

        submittedSelectionKeys.add(selectionKey);
        return [
          buildCampaignAdminSubmitReviewItem({
            item,
            draft: stagedDraft,
          }),
        ];
      });

      if (submitItems.length !== selectedItems.length) {
        setIsSendConfirmOpen(false);
        setIsSendValidationOpen(true);
        toast.error(t`Selected rows changed before send. Review the staged data and try again.`);
        return;
      }

      await submitReviewsMutation.mutateAsync({
        items: submitItems,
      });

      setStagedReviewDraftsByKey((currentDraftsByKey) => {
        const nextDraftsByKey = { ...currentDraftsByKey };
        submittedSelectionKeys.forEach((selectionKey) => {
          delete nextDraftsByKey[selectionKey];
        });
        return nextDraftsByKey;
      });
      setSelectedKeys(new Set());
      setIsSendValidationOpen(false);
      setIsSendConfirmOpen(false);
      if (
        activeSelectionKey !== null &&
        submittedSelectionKeys.has(activeSelectionKey)
      ) {
        closeReviewSidebar({ replace: true });
      }
      toast.success(
        selectedItems.length === 1
          ? t`Sent 1 review.`
          : t`Sent ${selectedItems.length} reviews.`,
      );
    } catch (error) {
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
          nextDraftsByKey[
            buildCampaignAdminSelectionKey(draft.userId, draft.recordKey)
          ] = draft;
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
      details={(
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <InlineStat
              label={t`Pending`}
              value={metaStats.reviewStatusCounts.pending}
              dimmed={metaStats.reviewStatusCounts.pending === 0}
            />
            <InlineStat
              label={t`Warnings`}
              value={metaStats.riskFlagged}
              dimmed={metaStats.riskFlagged === 0}
            />
            <InlineStat
              label={t`Total`}
              value={metaStats.total}
              dimmed={metaStats.total === 0}
            />
          </div>
          <span className="hidden h-4 w-px bg-border/60 md:block" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            {t`Page ${currentPageIndex}`}
          </span>
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
        <Collapsible open={isStatsExpanded} onOpenChange={setIsStatsExpanded}>
          <div
            role="region"
            aria-label={t`Campaign queue summary`}
            className="flex flex-col gap-3 border-b border-border/60 pb-4"
          >
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <SummaryBreakdown label={t`Review`} items={reviewBreakdownItems} />
            </div>
            <CollapsibleContent>
              <div className="flex flex-wrap gap-x-6 gap-y-3 pt-1">
                <SummaryBreakdown label={t`Phase`} items={phaseBreakdownItems} />
                <SummaryBreakdown label={t`Threads`} items={threadBreakdownItems} />
              </div>
            </CollapsibleContent>
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${isStatsExpanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
                {isStatsExpanded ? t`Show less` : t`Show phase & thread breakdown`}
              </button>
            </CollapsibleTrigger>
          </div>
        </Collapsible>
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
              sortBy={normalizedSearch.sortBy}
              sortOrder={normalizedSearch.sortOrder}
              onCopyRows={handleCopySelectedRows}
              onSortChange={handleSortChange}
              onToggleSelectAll={handleToggleSelectAll}
              onToggleSelection={handleToggleSelection}
              onOpenItem={(item) =>
                openReviewSidebar(
                  buildCampaignAdminSelectionKey(item.userId, item.recordKey),
                )
              }
            />

            {items.length > 0 ? (
              <CampaignAdminCursorPager
                pageIndex={currentPageIndex}
                pageSize={normalizedSearch.limit}
                itemCount={items.length}
                canPrevious={canPreviousPage}
                canNext={queueQuery.data?.page.hasMore ?? false}
                isLoading={queueQuery.isFetching}
                onPrevious={handlePreviousPage}
                onNext={handleNextPage}
              />
            ) : null}

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
        onOpenChange={(open) => {
          if (!open) {
            closeReviewSidebar();
          }
        }}
        onDecisionChange={stageReviewDecision}
        onFeedbackTextChange={stageReviewFeedbackText}
        onApprovalRiskAcknowledgedChange={stageReviewApprovalRiskAcknowledged}
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
                ? t`Send 1 review?`
                : t`Send ${selectedItems.length} reviews?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedItems.length === 1
                ? t`This will submit the staged review for the selected row.`
                : t`This will submit the staged reviews for the selected rows.`}
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
              {submitReviewsMutation.isPending ? t`Sending…` : t`Send selected`}
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
    <div
      role="status"
      aria-label={t`Loading campaign queue summary`}
      className="overflow-hidden rounded-3xl border border-border/70 bg-card/80"
    >
      <div className="grid divide-y divide-border/60 md:grid-cols-3 md:divide-x md:divide-y-0">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-col gap-1 px-5 py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-9 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-2 border-t border-border/60 px-5 py-3 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="space-y-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-14" />
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-10" />
              <Skeleton className="h-4 w-12" />
            </div>
          </div>
        ))}
      </div>
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

      <div className="flex flex-col gap-3 rounded-3xl border border-border/70 bg-card/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-16" />
          <div className="flex gap-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
