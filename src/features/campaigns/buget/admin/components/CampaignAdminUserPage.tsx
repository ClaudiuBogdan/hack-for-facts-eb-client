import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  ClipboardList,
  LockKeyhole,
  Plus,
  RefreshCw,
  SearchX,
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
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminReviewSheet } from "@/features/campaigns/buget/admin/components/CampaignAdminReviewSheet";
import { CampaignAdminSendValidationDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminSendValidationDialog";
import { CampaignAdminUserInteractionsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminUserInteractionsTable";
import { CampaignAdminUserPageFilters } from "@/features/campaigns/buget/admin/components/CampaignAdminUserPageFilters";
import {
  buildCampaignAdminSelectionKey,
  getCampaignAdminCampaignLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  useCampaignAdminInteractionMetaQuery,
  useCampaignAdminUserPageItemsQuery,
  useSubmitCampaignAdminReviewsMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-user-interactions";
import { normalizeCampaignAdminUserPageSearch } from "@/features/campaigns/buget/admin/schemas/search-schema";
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
  createCampaignAdminStageReviewDraft,
  getCampaignAdminSelectedSendValidationIssues,
  getCampaignAdminSendValidationMessage,
  isCampaignAdminEditablePasteTarget,
  isCampaignAdminPendingReview,
} from "@/features/campaigns/buget/admin/utils/review-workspace";
import {
  readCampaignAdminStagedReviewDraftsFromSessionStorage,
  writeCampaignAdminStagedReviewDraftsToSessionStorage,
} from "@/features/campaigns/buget/admin/utils/staged-review-session-storage";

type CampaignAdminUserPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly userId: string;
  readonly search: CampaignAdminUserPageSearch;
  readonly onSearchChange: (
    search: CampaignAdminUserPageSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

function formatDateTime(value: string | null): string {
  if (value === null) {
    return t`Unavailable`;
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return t`Unavailable`;
  }

  return parsedDate.toLocaleString();
}

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
    >
      <span className={`text-xs font-medium ${dimmed ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
        {label}
      </span>
      <span className={`font-semibold ${dimmed ? "" : ""}`}>{value}</span>
    </span>
  );
}

export function CampaignAdminUserPage({
  campaignKey,
  userId,
  search,
  onSearchChange,
}: CampaignAdminUserPageProps) {
  const normalizedSearch = normalizeCampaignAdminUserPageSearch(search);
  const { isLoaded, isSignedIn } = useAuth();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [isSendValidationOpen, setIsSendValidationOpen] = useState(false);
  const [isSendConfirmOpen, setIsSendConfirmOpen] = useState(false);
  const [isClearStagedConfirmOpen, setIsClearStagedConfirmOpen] =
    useState(false);
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
  const submitReviewsMutation =
    useSubmitCampaignAdminReviewsMutation(campaignKey);

  const allItems = interactionsQuery.data ?? [];
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

  const summary = useMemo(() => {
    const pending = allItems.filter((item) => item.reviewStatus === "pending").length;
    const approved = allItems.filter(
      (item) => item.reviewStatus === "approved",
    ).length;
    const rejected = allItems.filter(
      (item) => item.reviewStatus === "rejected",
    ).length;
    const flagged = allItems.filter((item) => item.riskFlags.length > 0).length;
    const latestUpdatedAt =
      [...allItems]
        .map((item) => item.updatedAt)
        .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;

    return {
      total: allItems.length,
      pending,
      approved,
      rejected,
      flagged,
      latestUpdatedAt,
    };
  }, [allItems]);
  const queueHref = `/admin/campaigns/${campaignKey}/user-interactions?userId=${encodeURIComponent(userId)}`;
  const userIdPreview = formatCampaignAdminUserIdPreview(userId, {
    maxLength: 20,
    prefixLength: 12,
    suffixLength: 6,
  });

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

    setSelectedKeys((currentKeys) => {
      const nextKeys = new Set(
        Array.from(currentKeys).filter((selectionKey) =>
          liveSelectionKeys.has(selectionKey),
        ),
      );

      return nextKeys.size === currentKeys.size ? currentKeys : nextKeys;
    });

    setStagedReviewDraftsByKey((currentDraftsByKey) => {
      const nextEntries = Object.entries(currentDraftsByKey).filter(
        ([selectionKey]) => liveSelectionKeys.has(selectionKey),
      );

      if (nextEntries.length === Object.keys(currentDraftsByKey).length) {
        return currentDraftsByKey;
      }

      return Object.fromEntries(nextEntries);
    });
  }, [interactionsQuery.data, itemsBySelectionKey]);

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
    item: CampaignAdminUserInteractionListItem,
    checked: boolean,
  ) => {
    if (!isCampaignAdminPendingReview(item)) {
      return;
    }

    const selectionKey = buildCampaignAdminSelectionKey(item.userId, item.recordKey);
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

  const handleAddToSelection = (item: CampaignAdminUserInteractionListItem) => {
    if (!isCampaignAdminPendingReview(item)) {
      return;
    }

    const selectionKey = buildCampaignAdminSelectionKey(item.userId, item.recordKey);
    setSelectedKeys((currentKeys) => {
      if (currentKeys.has(selectionKey)) {
        return currentKeys;
      }

      return new Set([...currentKeys, selectionKey]);
    });
  };

  const handleToggleSelectAll = (checked: boolean) => {
    const visiblePendingSelectionKeys = items
      .filter(isCampaignAdminPendingReview)
      .map((item) => buildCampaignAdminSelectionKey(item.userId, item.recordKey));

    setSelectedKeys((currentKeys) => {
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
        return [buildCampaignAdminSubmitReviewItem({ item, draft: stagedDraft })];
      });

      if (submitItems.length !== selectedItems.length) {
        setIsSendConfirmOpen(false);
        setIsSendValidationOpen(true);
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
  }, [bulkReviewItems, handleImportBulkReviewText]);

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

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={t`User workspace`}
      description={t`Review one user’s campaign activity with batch selection and the existing operator review workflow.`}
      eyebrow={(
        <Breadcrumb className="py-0">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href={`/admin/campaigns/${campaignKey}`}>{getCampaignAdminCampaignLabel(campaignKey)}</a>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <a href={`/admin/campaigns/${campaignKey}/users`}>{t`Users`}</a>
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
        <Button asChild type="button" variant="outline" size="sm" className="gap-2">
          <a href={queueHref}>
            <ClipboardList className="h-4 w-4" aria-hidden="true" />
            {t`Open interactions queue`}
          </a>
        </Button>
      )}
      details={(
        <>
          <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 font-mono text-xs text-muted-foreground">
            {userIdPreview}
          </span>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <InlineStat label={t`Total`} value={summary.total} />
            <InlineStat label={t`Approved`} value={summary.approved} dimmed={summary.approved === 0} />
            <InlineStat label={t`Risk`} value={summary.flagged} dimmed={summary.flagged === 0} />
            <InlineStat label={t`Pending`} value={summary.pending} dimmed={summary.pending === 0} />
            <InlineStat label={t`Rejected`} value={summary.rejected} dimmed={summary.rejected === 0} />
          </div>
          <span className="hidden h-4 w-px bg-border/60 md:block" aria-hidden="true" />
          <span className="text-xs text-muted-foreground">
            {summary.latestUpdatedAt
              ? t`Last activity ${formatDateTime(summary.latestUpdatedAt)}`
              : t`No interactions yet`}
          </span>
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

      <section className="space-y-4" aria-labelledby="user-interactions-section-title">
        <div className="space-y-1">
          <h2
            id="user-interactions-section-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {t`User interactions`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t`Inspect submitted records, filter the workspace, and stage review decisions for this user.`}
          </p>
        </div>

        {interactionsQuery.isLoading ? (
          <div className="flex min-h-[18rem] items-center justify-center rounded-3xl border border-border/70 bg-card/80">
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
            className="rounded-3xl border border-border/70 bg-card/80 p-10"
          />
        ) : (
          <div className="space-y-4">
            <CampaignAdminUserInteractionsTable
              campaignKey={campaignKey}
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
              onOpenItem={(item) =>
                openReviewSidebar(
                  buildCampaignAdminSelectionKey(item.userId, item.recordKey),
                )
              }
            />

            {selectedItems.length > 0 ? (
              <div className="rounded-3xl border border-border/70 bg-card/80 px-4 py-4">
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
                        <span>{t`Ready to send selected reviews.`}</span>
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
                      onClick={() => setSelectedKeys(new Set())}
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
                      {t`Send selected`}
                    </Button>
                  </div>
                </div>
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
    </AdminCampaignLayout>
  );
}
