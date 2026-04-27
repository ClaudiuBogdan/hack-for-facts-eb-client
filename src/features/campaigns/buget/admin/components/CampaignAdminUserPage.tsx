import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Ban,
  Bell,
  Check,
  ClipboardList,
  Copy,
  LockKeyhole,
  Mail,
  MoreHorizontal,
  Plus,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CompactStat } from "@/features/campaigns/buget/admin/components/CompactStat";
import { CampaignAdminNotificationsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsTable";
import { CampaignAdminReviewSheet } from "@/features/campaigns/buget/admin/components/CampaignAdminReviewSheet";
import { CampaignAdminSendValidationDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminSendValidationDialog";
import { CampaignAdminTemplatePreviewDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminTemplatePreviewDialog";
import { CampaignAdminUserInteractionsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsTable";
import { CampaignAdminUserPageFilters } from "@/features/campaigns/buget/admin/components/CampaignAdminUserPageFilters";
import {
  DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
  buildCampaignAdminSelectionKey,
  getCampaignAdminCampaignLabel,
} from "@/features/campaigns/buget/admin/constants";
import { useCampaignAdminNotificationsAuditQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import {
  useCampaignAdminInteractionMetaQuery,
  useCampaignAdminUserPageItemsQuery,
  useSubmitCampaignAdminReviewsMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions";
import {
  useCampaignAdminInteractionSelection,
  type CampaignAdminToggleUserInteractionSelectionInput,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-interaction-selection";
import {
  normalizeCampaignAdminNotificationsSearch,
  normalizeCampaignAdminQueueSearch,
  normalizeCampaignAdminUserPageSearch,
  normalizeCampaignAdminUsersSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminReviewDecision,
  CampaignAdminSortOrder,
  CampaignAdminStagedReviewDraft,
  CampaignAdminUserInteractionListItem,
  CampaignAdminUserInteractionsSortKey,
  CampaignAdminUserPageSearch,
} from "@/features/campaigns/buget/admin/types";
import {
  looksLikeCampaignAdminBulkReviewClipboardText,
  parseCampaignAdminBulkReviewClipboardText,
  serializeCampaignAdminBulkReviewRowsToClipboardTsv,
} from "@/features/campaigns/buget/admin/utils/bulk-review-clipboard";
import {
  filterAndSortCampaignAdminUserInteractionItems,
} from "@/features/campaigns/buget/admin/utils/filter-campaign-admin-user-interactions";
import { formatCampaignAdminUserIdPreview } from "@/features/campaigns/buget/admin/utils/format-user-id-preview";
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
import {
  readCampaignAdminStagedReviewDraftsFromSessionStorage,
  writeCampaignAdminStagedReviewDraftsToSessionStorage,
} from "@/features/campaigns/buget/admin/utils/staged-review-session-storage";
import {
  campaignAdminEntityHubTabsListClassName,
  campaignAdminEntityHubTabsTriggerClassName,
} from "@/features/campaigns/buget/admin/components/campaign-admin-entity-hub-tabs-styles";
import { cn } from "@/lib/utils";

const USER_NOTIFICATION_PREVIEW_LIMIT = 10;

type CampaignAdminUserPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly userId: string;
  readonly search: CampaignAdminUserPageSearch;
  readonly onSearchChange: (
    search: CampaignAdminUserPageSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

export function CampaignAdminUserPage({
  campaignKey,
  userId,
  search,
  onSearchChange,
}: CampaignAdminUserPageProps) {
  const normalizedSearch = normalizeCampaignAdminUserPageSearch(search);
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [isSendValidationOpen, setIsSendValidationOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isClearStagedConfirmOpen, setIsClearStagedConfirmOpen] =
    useState(false);
  const [userIdCopied, setUserIdCopied] = useState(false);
  const userIdCopyResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    return () => {
      if (userIdCopyResetTimeoutRef.current !== null) {
        clearTimeout(userIdCopyResetTimeoutRef.current);
      }
    };
  }, []);

  const {
    selectedKeys,
    clearSelection,
    updateSelection,
    toggleSelection,
    selectItem,
    removeSelectionKey,
    pruneSelection,
  } = useCampaignAdminInteractionSelection();
  const [stagedReviewDraftsByKey, setStagedReviewDraftsByKey] = useState<
    Record<string, CampaignAdminStagedReviewDraft>
  >(() =>
    readCampaignAdminStagedReviewDraftsFromSessionStorage(campaignKey, userId),
  );

  const interactionsQuery = useCampaignAdminUserPageItemsQuery({
    campaignKey,
    userId,
    enabled: isLoaded && isSignedIn,
  });
  const metaQuery = useCampaignAdminInteractionMetaQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn,
  });
  const notificationsQuery = useCampaignAdminNotificationsAuditQuery({
    campaignKey,
    filters: {
      userId,
      entityCui: normalizedSearch.entityCui,
      sortBy: "createdAt",
      sortOrder: "desc",
    },
    cursor: null,
    limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
    enabled: isLoaded && isSignedIn,
  });
  const submitReviewsMutation =
    useSubmitCampaignAdminReviewsMutation(campaignKey);

  const allItems = useMemo(() => interactionsQuery.data ?? [], [interactionsQuery.data]);
  const allUserNotificationItems = useMemo(
    () =>
      (notificationsQuery.data?.items ?? []).filter(
        (item) =>
          "userId" in item.projection && item.projection.userId === userId,
      ),
    [notificationsQuery.data?.items, userId],
  );
  const userNotificationItems = useMemo(
    () =>
      allUserNotificationItems.slice(0, USER_NOTIFICATION_PREVIEW_LIMIT),
    [allUserNotificationItems],
  );
  const items = useMemo(
    () =>
      filterAndSortCampaignAdminUserInteractionItems({
        items: allItems,
        search: normalizedSearch,
      }),
    [allItems, normalizedSearch],
  );
  const itemsBySelectionKey = useMemo(
    () =>
      new Map(
        allItems.map((item) => [
          buildCampaignAdminSelectionKey(item.userId, item.recordKey),
          item,
        ]),
      ),
    [allItems],
  );
  const activeSelectionKey = normalizedSearch.reviewSelectionKey ?? null;
  const activeItem =
    activeSelectionKey === null
      ? null
      : (itemsBySelectionKey.get(activeSelectionKey) ?? null);
  const activeStagedDraft =
    activeSelectionKey === null
      ? null
      : (stagedReviewDraftsByKey[activeSelectionKey] ?? null);
  const selectedItems = useMemo(
    () =>
      Array.from(selectedKeys)
        .map((selectionKey) => itemsBySelectionKey.get(selectionKey) ?? null)
        .filter((item): item is CampaignAdminUserInteractionListItem => item !== null),
    [itemsBySelectionKey, selectedKeys],
  );
  const selectedVisibleCount = useMemo(
    () =>
      items.filter((item) =>
        selectedKeys.has(buildCampaignAdminSelectionKey(item.userId, item.recordKey)),
      ).length,
    [items, selectedKeys],
  );
  const selectedHiddenCount = Math.max(0, selectedItems.length - selectedVisibleCount);
  const bulkReviewItems = selectedItems.length > 0 ? selectedItems : items;
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
  const selectedStagedDraftCount = selectedStagedDrafts.length;
  const selectedNotifyingDraftCount = countCampaignAdminNotifyingDrafts(
    selectedStagedDrafts,
  );

  const summary = useMemo(() => {
    const pending = allItems.filter((item) => item.reviewStatus === "pending").length;
    const approved = allItems.filter(
      (item) => item.reviewStatus === "approved",
    ).length;
    const rejected = allItems.filter(
      (item) => item.reviewStatus === "rejected",
    ).length;
    const flagged = allItems.filter((item) => item.riskFlags.length > 0).length;

    return {
      total: allItems.length,
      pending,
      approved,
      rejected,
      flagged,
    };
  }, [allItems]);
  const queueLinkSearch = useMemo(
    () => normalizeCampaignAdminQueueSearch({ userId }),
    [userId],
  );
  const filteredQueueLinkSearch = useMemo(
    () =>
      normalizeCampaignAdminQueueSearch({
        userId,
        ...normalizedSearch,
        reviewSelectionKey: undefined,
      }),
    [userId, normalizedSearch],
  );
  const notificationsLinkSearch = useMemo(
    () =>
      normalizeCampaignAdminNotificationsSearch({
        tab: "audit",
        userId,
        sortBy: "createdAt",
        sortOrder: "desc",
        limit: DEFAULT_CAMPAIGN_ADMIN_PAGE_LIMIT,
        entityCui: normalizedSearch.entityCui,
      }),
    [userId, normalizedSearch.entityCui],
  );
  const userIdPreview = formatCampaignAdminUserIdPreview(userId, {
    maxLength: 20,
    prefixLength: 12,
    suffixLength: 6,
  });
  const selectedNotificationTemplate = useMemo(() => {
    if (activeTemplateId === null) {
      return null;
    }

    const matchingItem =
      allUserNotificationItems.find(
        (item) => item.templateId === activeTemplateId,
      ) ?? null;

    return {
      templateId: activeTemplateId,
      name:
        matchingItem?.templateName?.trim() ||
        matchingItem?.templateId ||
        activeTemplateId,
      version: matchingItem?.templateVersion ?? "preview",
      description: "",
      requiredFields: [],
    };
  }, [activeTemplateId, allUserNotificationItems]);

  useEffect(() => {
    writeCampaignAdminStagedReviewDraftsToSessionStorage(
      campaignKey,
      stagedReviewDraftsByKey,
      userId,
    );
  }, [campaignKey, stagedReviewDraftsByKey, userId]);

  useEffect(() => {
    if (interactionsQuery.data === undefined) {
      return;
    }

    const liveSelectionKeys = new Set(itemsBySelectionKey.keys());
    pruneSelection(liveSelectionKeys);

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const nextEntries = Object.entries(currentDraftsByKey).filter(
        ([selectionKey]) => liveSelectionKeys.has(selectionKey),
      );

      if (nextEntries.length === Object.keys(currentDraftsByKey).length) {
        return currentDraftsByKey;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [interactionsQuery.data, itemsBySelectionKey, pruneSelection]);

  const handleSearchStateChange = (
    nextSearch: CampaignAdminUserPageSearch,
    options?: { readonly replace?: boolean },
  ) => {
    onSearchChange(normalizeCampaignAdminUserPageSearch(nextSearch), options);
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

  const handleSortChange = (
    sortBy: CampaignAdminUserInteractionsSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => {
    handleSearchStateChange(
      {
        ...normalizedSearch,
        sortBy,
        sortOrder,
        reviewSelectionKey: undefined,
      },
      { replace: true },
    );
  };

  const handleToggleSelection = (
    input: CampaignAdminToggleUserInteractionSelectionInput,
  ) => {
    toggleSelection(input);
  };

  const handleAddToSelection = (item: CampaignAdminUserInteractionListItem) => {
    selectItem(item);
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const visiblePendingSelectionKeys = items
      .filter(isCampaignAdminPendingReview)
      .map((item) => buildCampaignAdminSelectionKey(item.userId, item.recordKey));

    updateSelection((currentKeys) => {
      const nextKeys = new Set(currentKeys);
      visiblePendingSelectionKeys.forEach((selectionKey) => {
        if (checked) {
          nextKeys.add(selectionKey);
        } else {
          nextKeys.delete(selectionKey);
        }
      });
      return nextKeys;
    });
  };

  const handleMutationError = (error: unknown) => {
    if (error && typeof error === "object" && "status" in error) {
      const status = (error as { status?: unknown }).status;
      if (status === 404 || status === 409) {
        toast.error(
          t`The interaction changed before this review was saved. Reloaded data may differ from your staged state.`,
        );
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
    const selectionKey = buildCampaignAdminSelectionKey(item.userId, item.recordKey);

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const nextDraft = createCampaignAdminStageReviewDraft({
        item,
        currentDraft: currentDraftsByKey[selectionKey],
        status,
      });
      const currentDraft = currentDraftsByKey[selectionKey];

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
    const selectionKey = buildCampaignAdminSelectionKey(item.userId, item.recordKey);

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const currentDraft = currentDraftsByKey[selectionKey];

      if (currentDraft === undefined || currentDraft.feedbackText === feedbackText) {
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
    const selectionKey = buildCampaignAdminSelectionKey(item.userId, item.recordKey);

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
    const selectionKey = buildCampaignAdminSelectionKey(item.userId, item.recordKey);

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
      toast.error(
        t`Selected rows changed before send. Review the staged data and try again.`,
      );
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

  const handleCopyRows = async () => {
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
      const serializedRows = serializeCampaignAdminBulkReviewRowsToClipboardTsv({
        items: bulkReviewItems,
        stagedDraftsByKey: stagedReviewDraftsByKey,
        baseUrl: typeof window === "undefined" ? undefined : window.location.origin,
      });
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
      const nextDraftsByKey = { ...currentDraftsByKey };
      let didChange = false;

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
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={t`User workspace`}
        description={t`Inspect and review all campaign interactions submitted by a single user.`}
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

  if (interactionsQuery.error?.status === 401) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={t`User workspace`}
        description={t`Inspect and review all campaign interactions submitted by a single user.`}
      >
        <Card className="max-w-xl rounded-3xl border-border/70 bg-card/80 shadow-none">
          <CardHeader>
            <CardTitle>{t`Session expired`}</CardTitle>
            <CardDescription>
              {t`Refresh your authentication session, then try loading the user workspace again.`}
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

  if (interactionsQuery.error?.status === 403) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={t`User workspace`}
        description={t`Inspect and review all campaign interactions submitted by a single user.`}
      >
        <EmptyState
          icon={<LockKeyhole className="h-6 w-6" />}
          title={t`You do not have access to this user workspace`}
          description={t`The server denied access to the current campaign-admin permission boundary.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  if (interactionsQuery.error?.status === 404) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={t`User workspace`}
        description={t`Inspect and review all campaign interactions submitted by a single user.`}
      >
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t`User workspace unavailable`}
          description={t`This campaign admin queue is either not enabled on the current server or the campaign key is not supported.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  const handleCopyUserId = async () => {
    if (typeof navigator === "undefined" || navigator.clipboard?.writeText === undefined) {
      return;
    }

    try {
      await navigator.clipboard.writeText(userId);
      setUserIdCopied(true);
      if (userIdCopyResetTimeoutRef.current !== null) {
        clearTimeout(userIdCopyResetTimeoutRef.current);
      }
      userIdCopyResetTimeoutRef.current = setTimeout(() => {
        setUserIdCopied(false);
        userIdCopyResetTimeoutRef.current = null;
      }, 2000);
    } catch {
      setUserIdCopied(false);
    }
  };

  const handleRefreshWorkspace = () => {
    void interactionsQuery.refetch();
    void notificationsQuery.refetch();
    void metaQuery.refetch();
  };

  const isWorkspaceRefreshing =
    interactionsQuery.isFetching ||
    notificationsQuery.isFetching ||
    metaQuery.isFetching;

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={t`User workspace`}
      description={t`Batch review, filters, and notifications for one campaign user.`}
      details={(
        <div className="w-full -mt-1">
          <div
            className="flex flex-wrap items-center gap-x-3 gap-y-2"
            aria-label={t`Campaign user identifier`}
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t`User ID`}
            </span>
            <button
              type="button"
              onClick={handleCopyUserId}
              className={cn(
                "inline-flex max-w-full min-w-0 items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-xs text-foreground ring-offset-background transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:max-w-[min(100%,min(28rem,90vw))]",
                userIdCopied
                  ? "border-emerald-500/50 bg-emerald-500/10 hover:bg-emerald-500/15"
                  : "border-border/60 bg-muted/30 hover:bg-muted",
              )}
              title={t`Click to copy full user ID`}
              aria-label={
                userIdCopied
                  ? t`User ID copied`
                  : t`Copy user ID: ${userId}`
              }
            >
              {userIdCopied ? (
                <Check
                  className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-500"
                  aria-hidden="true"
                />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className="truncate">{userId}</span>
            </button>
          </div>
        </div>
      )}
      eyebrow={(
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
              <BreadcrumbLink asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/users"
                  params={{ campaignKey }}
                  search={normalizeCampaignAdminUsersSearch({}) as never}
                >
                  {t`Users`}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{userIdPreview}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      )}
      actions={(
        <>
          <Button asChild type="button" variant="outline" size="sm" className="gap-2">
            <Link
              to="/admin/campaigns/$campaignKey/users"
              params={{ campaignKey }}
              search={normalizeCampaignAdminUsersSearch({}) as never}
            >
              <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t`Go to users`}
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-2">
                <MoreHorizontal className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t`Actions`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/notifications"
                  params={{ campaignKey }}
                  search={notificationsLinkSearch as never}
                >
                  {t`Go to notifications`}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  to="/admin/campaigns/$campaignKey/user-interactions"
                  params={{ campaignKey }}
                  search={queueLinkSearch as never}
                >
                  {t`Go to interactions queue`}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  handleRefreshWorkspace();
                }}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isWorkspaceRefreshing && "animate-spin",
                  )}
                  aria-hidden="true"
                />
                {t`Refresh`}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    >
      {metaQuery.error && metaQuery.data === undefined ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t`Failed to load interaction metadata`}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              {t`Interaction labels are using local fallbacks right now. The user workspace still works.`}
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
              {t`Retry metadata`}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {interactionsQuery.error &&
      interactionsQuery.error.status !== 401 &&
      interactionsQuery.error.status !== 403 &&
      interactionsQuery.error.status !== 404 ? (
        <Alert variant="destructive" aria-live="polite">
          <Ban className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t`Failed to load the user workspace`}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{interactionsQuery.error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void interactionsQuery.refetch();
              }}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {t`Retry`}
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {/* Stats bar - moved from header details to content area */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-4" aria-label={t`User interactions summary`}>
        {interactionsQuery.isLoading ? (
          <>
            <CompactStat label={t`Total`} value={0} isLoading />
            <CompactStat label={t`Pending`} value={0} isLoading />
            <CompactStat label={t`Approved`} value={0} isLoading />
            <CompactStat label={t`Risk`} value={0} isLoading />
            <CompactStat label={t`Rejected`} value={0} isLoading />
          </>
        ) : (
          <>
            <CompactStat label={t`Total`} value={summary.total} />
            {summary.pending > 0 ? (
              <CompactStat
                label={t`Pending`}
                value={summary.pending}
                className="text-amber-600 dark:text-amber-400"
              />
            ) : (
              <CompactStat label={t`Pending`} value={summary.pending} />
            )}
            <CompactStat label={t`Approved`} value={summary.approved} />
            {summary.flagged > 0 ? (
              <CompactStat
                label={t`Risk`}
                value={summary.flagged}
                className="text-rose-600 dark:text-rose-400"
              />
            ) : (
              <CompactStat label={t`Risk`} value={summary.flagged} />
            )}
            <CompactStat label={t`Rejected`} value={summary.rejected} />
          </>
        )}
      </div>

      <Tabs
        value={normalizedSearch.workspaceTab ?? "interactions"}
        onValueChange={(value) => {
          handleSearchStateChange(
            {
              ...normalizedSearch,
              workspaceTab: value as "interactions" | "notifications",
            },
            { replace: true },
          );
        }}
        className="space-y-4"
      >
        <TabsList
          className={campaignAdminEntityHubTabsListClassName}
          aria-label={t`User workspace sections`}
        >
          <TabsTrigger
            value="interactions"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <ClipboardList className="size-4 shrink-0" aria-hidden="true" />
            {t`User interactions`}
          </TabsTrigger>
          <TabsTrigger
            value="notifications"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <Bell className="size-4 shrink-0" aria-hidden="true" />
            {t`User notifications`}
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="interactions"
          className="mt-0 space-y-4 pt-4 focus-visible:outline-none"
        >
        <section className="scroll-mt-24" aria-labelledby="user-interactions-section-title">
        <Card className="border-border/70 bg-card/80 shadow-none">
          <CardHeader className="gap-3 border-b border-border/60">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle id="user-interactions-section-title">{t`User interactions`}</CardTitle>
                <CardDescription>
                  {t`Inspect submitted records, filter the workspace, and stage review decisions for this user.`}
                </CardDescription>
              </div>
              <div className="lg:shrink-0">
                <Button asChild type="button" variant="outline" size="sm" className="gap-2">
                  <Link
                    to="/admin/campaigns/$campaignKey/user-interactions"
                    params={{ campaignKey }}
                    search={filteredQueueLinkSearch as never}
                  >
                    <ClipboardList className="h-4 w-4" aria-hidden="true" />
                    {t`View full queue with filters`}
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-4">
            {interactionsQuery.isLoading ? (
              <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-border/50 bg-muted/10">
                <LoadingSpinner />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                title={
                  allItems.length === 0
                    ? t`No user interactions yet`
                    : t`No interactions match the current filters`
                }
                description={
                  allItems.length === 0
                    ? t`This user has not submitted any campaign interactions through the current admin projection.`
                    : t`Adjust the filters to inspect a broader slice of this user’s activity.`
                }
                className="rounded-2xl border border-border/50 bg-muted/20 p-10"
              />
            ) : (
              <>
                <CampaignAdminUserInteractionsTable
                  campaignKey={campaignKey}
                  flushChrome
                  items={items}
                  stagedDraftsByKey={stagedReviewDraftsByKey}
                  selectedKeys={selectedKeys}
                  isLoading={interactionsQuery.isFetching || submitReviewsMutation.isPending}
                  header={({ actions, trailingActions }) => (
                    <CampaignAdminUserPageFilters
                      embedded
                      actions={actions}
                      trailingActions={trailingActions}
                      availableInteractionTypes={metaQuery.data?.availableInteractionTypes ?? []}
                      search={normalizedSearch}
                      isLoading={interactionsQuery.isLoading || interactionsQuery.isFetching}
                      onApply={(nextSearch) => handleSearchStateChange(nextSearch)}
                      onReset={(nextSearch) => handleSearchStateChange(nextSearch)}
                      onRefresh={() => {
                        void interactionsQuery.refetch();
                      }}
                    />
                  )}
                  tablePreferencesKey={`campaign-admin-user-page:${campaignKey}:${userId}`}
                  defaultVisibleColumnIds={[
                    "association",
                    "updated",
                    "riskFlags",
                    "message",
                    "interaction",
                    "value",
                    "reviewState",
                    "reviewNote",
                  ]}
                  sortBy={normalizedSearch.sortBy}
                  sortOrder={normalizedSearch.sortOrder}
                  renderItemActions={(item) => {
                    const selectionKey = buildCampaignAdminSelectionKey(
                      item.userId,
                      item.recordKey,
                    );
                    const isSelected = selectedKeys.has(selectionKey);

                    return (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddToSelection(item)}
                        disabled={isSelected || !isCampaignAdminPendingReview(item)}
                        className="rounded-full px-3"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                        {isSelected ? t`Added` : t`Add`}
                      </Button>
                    );
                  }}
                  onCopyRows={handleCopyRows}
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

                {selectedItems.length > 0 ? (
                  <div className="border-t border-border/50 bg-muted/20 px-4 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {t`Batch review`}
                        </p>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
                          <span>
                            {selectedItems.length === 1
                              ? t`1 row selected`
                              : t`${selectedItems.length} rows selected`}
                          </span>
                          {selectedHiddenCount > 0 ? (
                            <span>
                              {selectedHiddenCount === 1
                                ? t`1 selected row is hidden by the current filters`
                                : t`${selectedHiddenCount} selected rows are hidden by the current filters`}
                            </span>
                          ) : null}
                          {selectedSendValidationIssues.length > 0 ? (
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => setIsClearStagedConfirmOpen(true)}
                          disabled={selectedItems.length === 0}
                        >
                          {t`Clear staged`}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={clearSelection}
                        >
                          {t`Clear selection`}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="rounded-full"
                          onClick={() => {
                            if (canSendSelectedReviews) {
                              setIsSendConfirmOpen(true);
                              return;
                            }

                            setIsSendValidationOpen(true);
                          }}
                        >
                          {t`Submit selected`}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </CardContent>
        </Card>
        </section>
        </TabsContent>

        <TabsContent
          value="notifications"
          className="mt-0 space-y-4 pt-4 focus-visible:outline-none"
        >
        <section className="scroll-mt-24" aria-labelledby="user-notifications-section-title">
        <Card className="border-border/70 bg-card/80 shadow-none">
          <CardHeader className="gap-3 border-b border-border/60">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="space-y-1">
                <CardTitle id="user-notifications-section-title">{t`User notifications`}</CardTitle>
                <CardDescription>
                  {t`Inspect the most recent notification audit entries tied to this user and jump to the full notifications view when you need the broader log.`}
                </CardDescription>
              </div>
              <div className="lg:shrink-0">
                <Button asChild type="button" variant="outline" size="sm" className="gap-2">
                  <Link
                    to="/admin/campaigns/$campaignKey/notifications"
                    params={{ campaignKey }}
                    search={notificationsLinkSearch as never}
                  >
                    <Mail className="h-4 w-4" aria-hidden="true" />
                    {t`View full notifications`}
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            {notificationsQuery.error?.status === 403 ? (
              <EmptyState
                icon={<LockKeyhole className="h-6 w-6" />}
                title={t`Notifications unavailable in this workspace`}
                description={t`The user workspace is available, but the server denied access to the campaign notifications admin boundary.`}
                className="rounded-2xl border border-border/50 bg-muted/20"
              />
            ) : notificationsQuery.error?.status === 404 ? (
              <EmptyState
                icon={<SearchX className="h-6 w-6" />}
                title={t`Notifications unavailable`}
                description={t`This campaign notifications admin surface is either not enabled on the current server or the campaign key is not supported.`}
                className="rounded-2xl border border-border/50 bg-muted/20"
              />
            ) : notificationsQuery.error ? (
              <Alert variant="destructive" aria-live="polite">
                <Ban className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t`Failed to load notifications`}</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{notificationsQuery.error.message}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      void notificationsQuery.refetch();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t`Retry`}
                  </Button>
                </AlertDescription>
              </Alert>
            ) : notificationsQuery.isLoading && notificationsQuery.data === undefined ? (
              <div className="flex min-h-[18rem] items-center justify-center rounded-2xl border border-border/50 bg-muted/10">
                <LoadingSpinner />
              </div>
            ) : userNotificationItems.length === 0 ? (
              <EmptyState
                title={t`No notifications recorded yet`}
                description={t`No campaign notification audit entries were recorded for this user in the current admin projection.`}
                className="rounded-2xl border border-border/50 bg-muted/20 p-10"
              />
            ) : (
              <CampaignAdminNotificationsTable
                campaignKey={campaignKey}
                flushChrome
                items={userNotificationItems}
                onClearFilters={() => {
                  void navigate({
                    to: "/admin/campaigns/$campaignKey/notifications",
                    params: { campaignKey },
                    search: notificationsLinkSearch as never,
                  });
                }}
                onPreviewTemplate={(templateId) => {
                  setActiveTemplateId(templateId);
                }}
              />
            )}
          </CardContent>
        </Card>
        </section>
        </TabsContent>
      </Tabs>

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
                ? t`This will save the staged review for the selected row and apply its notification setting.`
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
              {selectedItems.length === 1
                ? t`Clear staged data for 1 row?`
                : t`Clear staged data for ${selectedItems.length} rows?`}
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

      {selectedNotificationTemplate ? (
        <CampaignAdminTemplatePreviewDialog
          campaignKey={campaignKey}
          open={activeTemplateId !== null}
          template={selectedNotificationTemplate}
          onOpenChange={(open) => {
            if (!open) {
              setActiveTemplateId(null);
            }
          }}
        />
      ) : null}
    </AdminCampaignLayout>
  );
}
