import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Ban,
  ChevronDown,
  LayoutGrid,
  LockKeyhole,
  MessageSquare,
  RefreshCw,
  SearchX,
  Settings2,
} from "lucide-react";
import { t } from "@lingui/core/macro";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AuthSignInButton, useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import {
  CampaignAdminEntityConfigSheet,
} from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigSheet";
import { CampaignAdminEntityConfigTable } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigTable";
import { CampaignAdminEntityConfigToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigToolbar";
import { CampaignAdminEntitiesTable } from "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesTable";
import { CampaignAdminEntitiesToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesToolbar";
import { CampaignAdminInstitutionThreadsSection } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsSection";
import {
  campaignAdminEntityHubTabsListClassName,
  campaignAdminEntityHubTabsTriggerClassName,
} from "@/features/campaigns/buget/admin/components/campaign-admin-entity-hub-tabs-styles";
import { CompactStat } from "@/features/campaigns/buget/admin/components/CompactStat";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import {
  downloadCampaignAdminEntityConfigCsv,
  updateCampaignAdminEntityConfig,
} from "@/features/campaigns/buget/admin/api/campaign-admin-entity-config";
import { CampaignAdminEntityConfigSendValidationDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigSendValidationDialog";
import {
  useCampaignAdminEntitiesMetaQuery,
  useCampaignAdminEntitiesQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entities";
import {
  campaignAdminEntityConfigKeys,
  useCampaignAdminEntityConfigDetailQuery,
  useCampaignAdminEntityConfigListQuery,
  useUpdateCampaignAdminEntityConfigMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entity-config";
import { downloadCampaignAdminEntitiesCsv } from "@/features/campaigns/buget/admin/api/campaign-admin-entities";
import {
  createCampaignAdminEntityConfigPaginationSignature,
  createCampaignAdminEntitiesPaginationSignature,
  createEmptyCampaignAdminEntityConfigSearch,
  createEmptyCampaignAdminEntitiesSearch,
  getCampaignAdminEntityConfigExportFilters,
  getCampaignAdminEntityConfigFilters,
  getCampaignAdminEntityConfigSearchFromEntitiesSearch,
  getCampaignAdminEntitiesFilters,
  getCampaignAdminInstitutionThreadsSearchFromEntitiesSearch,
  mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch,
  mergeCampaignAdminInstitutionThreadsSearchIntoEntitiesSearch,
  normalizeCampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import { campaignAdminInstitutionThreadsKeys } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-institution-threads";
import {
  campaignAdminEntityNotificationTypeValues,
  campaignAdminNotificationStatusValues,
} from "@/features/campaigns/buget/admin/types";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntityConfigListItem,
  CampaignAdminEntityListItem,
  CampaignAdminEntitiesSearch,
  CampaignAdminStagedEntityConfigDraft,
  CampaignAdminUpdateEntityConfigBody,
} from "@/features/campaigns/buget/admin/types";
import {
  type CampaignAdminEntityConfigClipboardIssue,
  looksLikeCampaignAdminEntityConfigClipboardText,
  parseCampaignAdminEntityConfigClipboardText,
  serializeCampaignAdminEntityConfigRowsToClipboardTsv,
} from "@/features/campaigns/buget/admin/utils/entity-config-clipboard";
import {
  getCampaignAdminEntityConfigSelectedSendValidationIssues,
} from "@/features/campaigns/buget/admin/utils/entity-config-workspace";
import { isCampaignAdminEditablePasteTarget } from "@/features/campaigns/buget/admin/utils/review-workspace";

type CampaignAdminEntitiesPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminEntitiesSearch;
  readonly onSearchChange: (
    search: CampaignAdminEntitiesSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

const EMPTY_ENTITY_ITEMS: readonly CampaignAdminEntityListItem[] = [];
const EMPTY_ENTITY_CONFIG_ITEMS: readonly CampaignAdminEntityConfigListItem[] = [];

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
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24 rounded-full" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-none" />
          ))}
        </div>
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
    </div>
  );
}

export function CampaignAdminEntitiesPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminEntitiesPageProps) {
  const queryClient = useQueryClient();
  const pageTitle = t`Entities`;
  const pageDescription = t`Review entity-level campaign state across users, interaction review pressure, and notification delivery activity.`;
  const normalizedSearch = normalizeCampaignAdminEntitiesSearch(search);
  const activeTab =
    normalizedSearch.tab === "users" ||
    normalizedSearch.tab === "notifications" ||
    normalizedSearch.tab === "interactions"
      ? "overview"
      : (normalizedSearch.tab ?? "overview");
  const filters = useMemo(
    () => getCampaignAdminEntitiesFilters(normalizedSearch),
    [normalizedSearch],
  );
  const configSearch = useMemo(
    () => getCampaignAdminEntityConfigSearchFromEntitiesSearch(normalizedSearch),
    [normalizedSearch],
  );
  const threadsSearch = useMemo(
    () => getCampaignAdminInstitutionThreadsSearchFromEntitiesSearch(normalizedSearch),
    [normalizedSearch],
  );
  const configFilters = useMemo(
    () => getCampaignAdminEntityConfigFilters(configSearch),
    [configSearch],
  );
  const paginationStateSignatureFromSearch = useMemo(
    () => createCampaignAdminEntitiesPaginationSignature(normalizedSearch),
    [normalizedSearch],
  );
  const configPaginationStateSignatureFromSearch = useMemo(
    () => createCampaignAdminEntityConfigPaginationSignature(configSearch),
    [configSearch],
  );
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>(
    [],
  );
  const [configPreviousCursors, setConfigPreviousCursors] = useState<
    Array<string | null>
  >([]);
  const [paginationStateSignature, setPaginationStateSignature] = useState(
    paginationStateSignatureFromSearch,
  );
  const [configPaginationStateSignature, setConfigPaginationStateSignature] =
    useState(configPaginationStateSignatureFromSearch);
  const [isEntitySummaryExpanded, setIsEntitySummaryExpanded] = useState(false);
  const [selectedConfigEntityCuis, setSelectedConfigEntityCuis] = useState<
    ReadonlySet<string>
  >(new Set());
  const [stagedEntityConfigDraftsByEntityCui, setStagedEntityConfigDraftsByEntityCui] =
    useState<Readonly<Record<string, CampaignAdminStagedEntityConfigDraft>>>({});
  const [entityConfigPasteIssues, setEntityConfigPasteIssues] = useState<
    readonly CampaignAdminEntityConfigClipboardIssue[]
  >([]);
  const [isConfigSendValidationOpen, setIsConfigSendValidationOpen] =
    useState(false);
  const [isConfigSendConfirmOpen, setIsConfigSendConfirmOpen] = useState(false);
  const [isConfigClearStagedConfirmOpen, setIsConfigClearStagedConfirmOpen] =
    useState(false);
  const [isApplyingSelectedEntityConfigs, setIsApplyingSelectedEntityConfigs] =
    useState(false);
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
  const entityConfigQuery = useCampaignAdminEntityConfigListQuery({
    campaignKey,
    filters: configFilters,
    cursor: configSearch.cursor ?? null,
    limit: configSearch.limit,
    enabled: isLoaded && isSignedIn && activeTab === "config",
  });
  const selectedEntityCui = configSearch.selectedEntityCui ?? null;
  const isCreatingEntityConfig = configSearch.createMode === true;
  const entityConfigDetailQuery = useCampaignAdminEntityConfigDetailQuery({
    campaignKey,
    entityCui: selectedEntityCui ?? "",
    enabled:
      isLoaded &&
      isSignedIn &&
      activeTab === "config" &&
      selectedEntityCui !== null,
  });
  const updateEntityConfigMutation = useUpdateCampaignAdminEntityConfigMutation(
    campaignKey,
    selectedEntityCui ?? "",
  );

  const items = entitiesQuery.data?.items ?? EMPTY_ENTITY_ITEMS;
  const configItems = entityConfigQuery.data?.items ?? EMPTY_ENTITY_CONFIG_ITEMS;
  const selectedConfigItems = useMemo(
    () =>
      configItems.filter((item) => selectedConfigEntityCuis.has(item.entityCui)),
    [configItems, selectedConfigEntityCuis],
  );
  const visibleEntityConfigClipboardText = useMemo(
    () =>
      serializeCampaignAdminEntityConfigRowsToClipboardTsv(
        configItems,
        stagedEntityConfigDraftsByEntityCui,
      ),
    [configItems, stagedEntityConfigDraftsByEntityCui],
  );
  const selectedStagedConfigDraftCount = useMemo(
    () =>
      selectedConfigItems.filter(
        (item) => stagedEntityConfigDraftsByEntityCui[item.entityCui] !== undefined,
      ).length,
    [selectedConfigItems, stagedEntityConfigDraftsByEntityCui],
  );
  const selectedConfigSendValidationIssues = useMemo(
    () =>
      getCampaignAdminEntityConfigSelectedSendValidationIssues({
        items: selectedConfigItems,
        stagedDraftsByEntityCui: stagedEntityConfigDraftsByEntityCui,
      }),
    [selectedConfigItems, stagedEntityConfigDraftsByEntityCui],
  );
  const canApplySelectedEntityConfigs =
    selectedConfigItems.length > 0 &&
    selectedConfigSendValidationIssues.length === 0;
  const currentPageIndex = normalizedSearch.pageIndex ?? 1;
  const currentConfigPageIndex = configSearch.pageIndex ?? 1;
  const canPreviousPage =
    previousCursors.length > 0 ||
    (previousCursors.length === 0 &&
      normalizedSearch.cursor !== undefined &&
      currentPageIndex === 2);
  const canPreviousConfigPage =
    configPreviousCursors.length > 0 ||
    (configPreviousCursors.length === 0 &&
      configSearch.cursor !== undefined &&
      currentConfigPageIndex === 2);

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

  useEffect(() => {
    if (
      configPaginationStateSignature === configPaginationStateSignatureFromSearch
    ) {
      return;
    }

    setConfigPreviousCursors([]);
    setConfigPaginationStateSignature(configPaginationStateSignatureFromSearch);
  }, [
    configPaginationStateSignature,
    configPaginationStateSignatureFromSearch,
  ]);

  useEffect(() => {
    if (
      activeTab !== "config" ||
      selectedEntityCui === null ||
      entityConfigDetailQuery.isLoading ||
      entityConfigDetailQuery.isFetching ||
      entityConfigDetailQuery.error?.status !== 404
    ) {
      return;
    }

    onSearchChange(
      mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
        normalizedSearch,
        {
          ...configSearch,
          selectedEntityCui: undefined,
          createMode: false,
        },
      ),
      { replace: true },
    );
  }, [
    activeTab,
    configSearch,
    entityConfigDetailQuery.error?.status,
    entityConfigDetailQuery.isFetching,
    entityConfigDetailQuery.isLoading,
    normalizedSearch,
    onSearchChange,
    selectedEntityCui,
  ]);

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

  const resetConfigPagingState = (nextSearch: CampaignAdminEntitiesSearch) => {
    setConfigPreviousCursors([]);
    setConfigPaginationStateSignature(
      createCampaignAdminEntityConfigPaginationSignature(
        getCampaignAdminEntityConfigSearchFromEntitiesSearch(nextSearch),
      ),
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

  const handleConfigSearchChange = (
    nextConfigSearch: typeof configSearch,
    options?: { readonly replace?: boolean },
  ) => {
    const normalizedNextSearch = mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
      normalizedSearch,
      {
        ...nextConfigSearch,
        cursor: undefined,
        pageIndex: undefined,
      },
    );
    resetConfigPagingState(normalizedNextSearch);
    setEntityConfigPasteIssues([]);
    handleSearchStateChange(normalizedNextSearch, options);
  };

  const handleConfigSheetStateChange = (
    nextConfigSearch: typeof configSearch,
    options?: { readonly replace?: boolean },
  ) => {
    handleSearchStateChange(
      mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
        normalizedSearch,
        nextConfigSearch,
      ),
      options,
    );
  };

  const createEntityThreadsRouteSearch = (
    entityCui: string,
    threadId?: string,
  ) =>
    mergeCampaignAdminInstitutionThreadsSearchIntoEntitiesSearch(
      createEmptyCampaignAdminEntitiesSearch({
        currentSearch: normalizedSearch,
      }),
      {
        ...threadsSearch,
        entityCui,
        selectedThreadId: threadId,
        cursor: undefined,
        pageIndex: undefined,
      },
    );

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

  const handleNextConfigPage = () => {
    const nextCursor = entityConfigQuery.data?.page.nextCursor;
    if (nextCursor === undefined || nextCursor === null) {
      return;
    }

    const nextSearch = mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
      normalizedSearch,
      {
        ...configSearch,
        cursor: nextCursor,
        pageIndex: currentConfigPageIndex + 1,
      },
    );

    setConfigPreviousCursors((currentCursors) => [
      ...currentCursors,
      configSearch.cursor ?? null,
    ]);
    setConfigPaginationStateSignature(
      createCampaignAdminEntityConfigPaginationSignature(
        getCampaignAdminEntityConfigSearchFromEntitiesSearch(nextSearch),
      ),
    );
    setEntityConfigPasteIssues([]);
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

  const handlePreviousConfigPage = () => {
    if (configPreviousCursors.length === 0) {
      if (configSearch.cursor === undefined || currentConfigPageIndex !== 2) {
        return;
      }

      const nextSearch = mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
        normalizedSearch,
        {
          ...configSearch,
          cursor: undefined,
          pageIndex: undefined,
        },
      );
      setConfigPaginationStateSignature(
        createCampaignAdminEntityConfigPaginationSignature(
          getCampaignAdminEntityConfigSearchFromEntitiesSearch(nextSearch),
        ),
      );
      setEntityConfigPasteIssues([]);
      handleSearchStateChange(nextSearch);
      return;
    }

    const nextPreviousCursors = [...configPreviousCursors];
    const previousCursor = nextPreviousCursors.pop() ?? null;
    const nextPageIndex = Math.max(1, currentConfigPageIndex - 1);
    const nextSearch = mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
      normalizedSearch,
      {
        ...configSearch,
        cursor: previousCursor ?? undefined,
        pageIndex: nextPageIndex === 1 ? undefined : nextPageIndex,
      },
    );
    setConfigPreviousCursors(nextPreviousCursors);
    setConfigPaginationStateSignature(
      createCampaignAdminEntityConfigPaginationSignature(
        getCampaignAdminEntityConfigSearchFromEntitiesSearch(nextSearch),
      ),
    );
    setEntityConfigPasteIssues([]);
    handleSearchStateChange(nextSearch);
  };

  const handleRefresh = () => {
    void Promise.allSettled([
      entitiesQuery.refetch(),
      metaQuery.refetch(),
      activeTab === "config" ? entityConfigQuery.refetch() : Promise.resolve(),
      activeTab === "config" && selectedEntityCui
        ? entityConfigDetailQuery.refetch()
        : Promise.resolve(),
      activeTab === "threads"
        ? queryClient.invalidateQueries({
            queryKey:
              campaignAdminInstitutionThreadsKeys.allForCampaign(campaignKey),
          })
        : Promise.resolve(),
    ]);
  };

  const handleCopyRows = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      navigator.clipboard?.writeText === undefined
    ) {
      toast.error(t`Clipboard copy is not available in this browser.`);
      return;
    }

    const lines = [
      [
        "Entity Name",
        "Entity CUI",
        "Users",
        "Interactions",
        "Pending reviews",
        "Subscribers",
        "Outbox notifications",
        "Failed notifications",
        "Latest interaction at",
        "Latest notification at",
        "Latest notification type",
        "Latest notification status",
        "Public page",
      ].join("\t"),
      ...items.map((item) =>
        [
          item.entityName?.trim() || item.entityCui,
          item.entityCui,
          String(item.userCount),
          String(item.interactionCount),
          String(item.pendingReviewCount),
          String(item.notificationSubscriberCount),
          String(item.notificationOutboxCount),
          String(item.failedNotificationCount),
          item.latestInteractionAt ?? "",
          item.latestNotificationAt ?? "",
          item.latestNotificationType ?? "",
          item.latestNotificationStatus ?? "",
          `${window.location.origin}/primarie/${encodeURIComponent(item.entityCui)}`,
        ]
          .map((value) =>
            /^[=+\-@]/.test(value) ? `'${value}` : value.replace(/\r?\n/g, " "),
          )
          .join("\t"),
      ),
    ];

    try {
      await navigator.clipboard.writeText(`${lines.join("\n")}\n`);
      toast.success(
        items.length === 1
          ? t`Copied 1 row to the clipboard.`
          : t`Copied ${items.length} rows to the clipboard.`,
      );
    } catch {
      toast.error(t`Failed to copy the rows.`);
    }
  }, [items]);

  const handleExportCsv = useCallback(async () => {
    try {
      const { blob, filename } = await downloadCampaignAdminEntitiesCsv({
        campaignKey,
        filters,
      });

      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = filename;
      downloadAnchor.click();
      URL.revokeObjectURL(blobUrl);
      toast.success(t`CSV exported`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t`Failed to export CSV.`,
      );
    }
  }, [campaignKey, filters]);

  const handleExportEntityConfigCsv = useCallback(async () => {
    try {
      const { blob, filename } = await downloadCampaignAdminEntityConfigCsv({
        campaignKey,
        filters: getCampaignAdminEntityConfigExportFilters(configSearch),
      });

      const blobUrl = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.href = blobUrl;
      downloadAnchor.download = filename;
      downloadAnchor.click();
      URL.revokeObjectURL(blobUrl);
      toast.success(t`Entity config CSV downloaded.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t`Failed to export CSV.`,
      );
    }
  }, [campaignKey, configSearch]);

  const handleToggleSelectAllConfigRows = useCallback(
    (checked: boolean) => {
      setSelectedConfigEntityCuis((currentSelection) => {
        const nextSelection = new Set(currentSelection);

        if (checked) {
          configItems.forEach((item) => {
            nextSelection.add(item.entityCui);
          });
        } else {
          configItems.forEach((item) => {
            nextSelection.delete(item.entityCui);
          });
        }

        return nextSelection;
      });
    },
    [configItems],
  );

  const handleToggleConfigSelection = useCallback(
    (item: CampaignAdminEntityConfigListItem, checked: boolean) => {
      setSelectedConfigEntityCuis((currentSelection) => {
        const nextSelection = new Set(currentSelection);

        if (checked) {
          nextSelection.add(item.entityCui);
        } else {
          nextSelection.delete(item.entityCui);
        }

        return nextSelection;
      });
    },
    [],
  );

  const clearConfigSelection = useCallback(() => {
    setSelectedConfigEntityCuis(new Set());
  }, []);

  const handleCopyEntityConfigRows = useCallback(async () => {
    if (configItems.length === 0) {
      toast.error(t`No entity config rows are available to copy.`);
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
      await navigator.clipboard.writeText(visibleEntityConfigClipboardText);
      toast.success(
        configItems.length === 1
          ? t`Copied 1 entity config row to the clipboard.`
          : t`Copied ${configItems.length} entity config rows to the clipboard.`,
      );
    } catch {
      toast.error(t`Failed to copy the entity config rows.`);
    }
  }, [configItems.length, visibleEntityConfigClipboardText]);

  const handleImportEntityConfigText = useCallback(
    (rawText: string) => {
      const result = parseCampaignAdminEntityConfigClipboardText({
        rawText,
        items: configItems,
      });
      setEntityConfigPasteIssues(result.issues);

      if (result.drafts.length > 0) {
        setStagedEntityConfigDraftsByEntityCui((currentDrafts) => ({
          ...currentDrafts,
          ...Object.fromEntries(
            result.drafts.map((draft) => [draft.entityCui, draft] as const),
          ),
        }));
        setSelectedConfigEntityCuis((currentSelection) => {
          const nextSelection = new Set(currentSelection);
          result.drafts.forEach((draft) => {
            nextSelection.add(draft.entityCui);
          });
          return nextSelection;
        });
        toast.success(
          result.drafts.length === 1
            ? t`Imported staged entity config values for 1 row.`
            : t`Imported staged entity config values for ${result.drafts.length} rows.`,
        );
        if (result.issues.length > 0) {
          toast.warning(t`Some pasted rows need attention in the table.`);
        }
      } else {
        toast.error(t`No staged entity config values were imported.`);
      }

      return result;
    },
    [configItems],
  );

  const handlePasteEntityConfigRowsFromClipboard = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      navigator.clipboard?.readText === undefined
    ) {
      toast.error(t`Clipboard paste is not available in this browser.`);
      return;
    }

    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!looksLikeCampaignAdminEntityConfigClipboardText(clipboardText)) {
        toast.error(t`Clipboard does not contain entity config spreadsheet rows.`);
        return;
      }

      handleImportEntityConfigText(clipboardText);
    } catch {
      toast.error(t`Failed to read entity config rows from the clipboard.`);
    }
  }, [handleImportEntityConfigText]);

  const handleApplySelectedEntityConfigs = useCallback(async () => {
    if (!canApplySelectedEntityConfigs) {
      return;
    }

    const latestValidationIssues =
      getCampaignAdminEntityConfigSelectedSendValidationIssues({
        items: selectedConfigItems,
        stagedDraftsByEntityCui: stagedEntityConfigDraftsByEntityCui,
      });

    if (latestValidationIssues.length > 0) {
      setIsConfigSendConfirmOpen(false);
      setIsConfigSendValidationOpen(true);
      toast.error(
        t`Selected config rows changed before bulk apply. Review the staged data and try again.`,
      );
      return;
    }

    const appliedEntityCuis = new Set<string>();
    let appliedCount = 0;

    setIsApplyingSelectedEntityConfigs(true);

    try {
      for (const item of selectedConfigItems) {
        const stagedDraft = stagedEntityConfigDraftsByEntityCui[item.entityCui];
        if (stagedDraft === undefined) {
          continue;
        }

        await updateCampaignAdminEntityConfig({
          campaignKey,
          entityCui: item.entityCui,
          body: {
            expectedUpdatedAt: stagedDraft.expectedUpdatedAt,
            values: stagedDraft.values,
          },
        });

        appliedEntityCuis.add(item.entityCui);
        appliedCount += 1;
      }

      setStagedEntityConfigDraftsByEntityCui((currentDrafts) => {
        const nextDrafts = { ...currentDrafts };
        appliedEntityCuis.forEach((entityCui) => {
          delete nextDrafts[entityCui];
        });
        return nextDrafts;
      });
      setSelectedConfigEntityCuis(new Set());
      setIsConfigSendConfirmOpen(false);
      setIsConfigSendValidationOpen(false);
      await queryClient.invalidateQueries({
        queryKey: campaignAdminEntityConfigKeys.allForCampaign(campaignKey),
      });
      toast.success(
        appliedCount === 1
          ? t`Applied 1 entity config update.`
          : t`Applied ${appliedCount} entity config updates.`,
      );
    } catch (error) {
      setIsConfigSendConfirmOpen(false);

      if (appliedEntityCuis.size > 0) {
        setStagedEntityConfigDraftsByEntityCui((currentDrafts) => {
          const nextDrafts = { ...currentDrafts };
          appliedEntityCuis.forEach((entityCui) => {
            delete nextDrafts[entityCui];
          });
          return nextDrafts;
        });
        setSelectedConfigEntityCuis((currentSelection) => {
          const nextSelection = new Set(currentSelection);
          appliedEntityCuis.forEach((entityCui) => {
            nextSelection.delete(entityCui);
          });
          return nextSelection;
        });
        await queryClient.invalidateQueries({
          queryKey: campaignAdminEntityConfigKeys.allForCampaign(campaignKey),
        });
        toast.error(
          appliedCount === 1
            ? t`Applied 1 entity config update before the remaining batch failed.`
            : t`Applied ${appliedCount} entity config updates before the remaining batch failed.`,
        );
      } else {
        toast.error(
          error instanceof Error
            ? error.message
            : t`Unable to apply the selected entity config rows.`,
        );
      }
    } finally {
      setIsApplyingSelectedEntityConfigs(false);
    }
  }, [
    campaignKey,
    canApplySelectedEntityConfigs,
    queryClient,
    selectedConfigItems,
    stagedEntityConfigDraftsByEntityCui,
  ]);

  const handleSubmitEntityConfig = useCallback(
    async (body: CampaignAdminUpdateEntityConfigBody) => {
      if (selectedEntityCui === null) {
        return;
      }

      await updateEntityConfigMutation.mutateAsync(body);
      setStagedEntityConfigDraftsByEntityCui((currentDrafts) => {
        if (currentDrafts[selectedEntityCui] === undefined) {
          return currentDrafts;
        }

        const nextDrafts = { ...currentDrafts };
        delete nextDrafts[selectedEntityCui];
        return nextDrafts;
      });
      toast.success(t`Entity config saved.`);
    },
    [selectedEntityCui, updateEntityConfigMutation],
  );

  const handleApplySelectedEntityConfigButtonClick = useCallback(() => {
    if (canApplySelectedEntityConfigs) {
      setIsConfigSendConfirmOpen(true);
      return;
    }

    setIsConfigSendValidationOpen(true);
  }, [canApplySelectedEntityConfigs]);

  const handleClearSelectedStagedEntityConfigDrafts = useCallback(() => {
    if (selectedConfigItems.length === 0) {
      return;
    }

    setStagedEntityConfigDraftsByEntityCui((currentDrafts) => {
      const nextDrafts = { ...currentDrafts };
      selectedConfigItems.forEach((item) => {
        delete nextDrafts[item.entityCui];
      });
      return nextDrafts;
    });
    setIsConfigClearStagedConfirmOpen(false);
  }, [selectedConfigItems]);

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

  useEffect(() => {
    const shouldRecoverStaleCursor =
      activeTab === "config" &&
      entityConfigQuery.error?.status === 400 &&
      (configSearch.cursor !== undefined || configSearch.pageIndex !== undefined);

    if (!shouldRecoverStaleCursor) {
      return;
    }

    const nextSearch = mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
      normalizedSearch,
      {
        ...configSearch,
        cursor: undefined,
        pageIndex: undefined,
      },
    );

    setConfigPreviousCursors([]);
    setConfigPaginationStateSignature(
      createCampaignAdminEntityConfigPaginationSignature(
        getCampaignAdminEntityConfigSearchFromEntitiesSearch(nextSearch),
      ),
    );
    onSearchChange(nextSearch, { replace: true });
  }, [
    activeTab,
    configSearch,
    entityConfigQuery.error?.status,
    normalizedSearch,
    onSearchChange,
  ]);

  useEffect(() => {
    if (activeTab !== "config") {
      return;
    }

    const handleWindowPaste = (event: ClipboardEvent) => {
      if (isCampaignAdminEditablePasteTarget(event.target)) {
        return;
      }

      const clipboardText = event.clipboardData?.getData("text/plain") ?? "";
      if (!looksLikeCampaignAdminEntityConfigClipboardText(clipboardText)) {
        return;
      }

      event.preventDefault();
      handleImportEntityConfigText(clipboardText);
    };

    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, [activeTab, handleImportEntityConfigText]);

  const bulkEntityConfigFooter =
    selectedConfigItems.length > 0 ? (
      <div
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        aria-live="polite"
      >
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {t`Bulk entity config`}
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedConfigItems.length === 1
              ? t`1 row selected`
              : t`${selectedConfigItems.length} rows selected`}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {selectedStagedConfigDraftCount > 0 ? (
              <span>
                {selectedStagedConfigDraftCount === 1
                  ? t`1 row staged`
                  : t`${selectedStagedConfigDraftCount} rows staged`}
              </span>
            ) : null}
            {!canApplySelectedEntityConfigs ? (
              <span>
                {selectedConfigSendValidationIssues.length === 1
                  ? t`1 row still needs config data`
                  : t`${selectedConfigSendValidationIssues.length} rows still need config data`}
              </span>
            ) : (
              <span>{t`Ready to apply selected config rows.`}</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {selectedStagedConfigDraftCount > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsConfigClearStagedConfirmOpen(true)}
              className="rounded-full"
            >
              {t`Clear staged`}
            </Button>
          ) : null}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={clearConfigSelection}
            className="rounded-full"
          >
            {t`Clear selection`}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleApplySelectedEntityConfigButtonClick}
            className="rounded-full"
            disabled={isApplyingSelectedEntityConfigs}
          >
            {t`Apply selected`}
          </Button>
        </div>
      </div>
    ) : null;

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
      details={
        <div className="w-full -mt-1">
          <section className="space-y-3" aria-label={t`Entities summary`}>
            {metaQuery.isLoading && meta === undefined ? (
              <EntitiesSummarySkeleton />
            ) : meta ? (
              <Collapsible
                open={isEntitySummaryExpanded}
                onOpenChange={setIsEntitySummaryExpanded}
                className="w-full"
              >
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <CompactStat label={t`Total entities`} value={meta.totalEntities} />
                  <CompactStat label={t`Pending reviews`} value={meta.entitiesWithPendingReviews} className="text-amber-600 dark:text-amber-400" />
                  <CompactStat label={t`Subscribers`} value={meta.entitiesWithSubscribers} className="text-emerald-600 dark:text-emerald-400" />
                  <CompactStat label={t`Notification activity`} value={meta.entitiesWithNotificationActivity} className="text-blue-600 dark:text-blue-400" />
                  {meta.entitiesWithFailedNotifications > 0 ? (
                    <CompactStat label={t`Failed notifications`} value={meta.entitiesWithFailedNotifications} className="text-rose-600 dark:text-rose-400" />
                  ) : null}
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="group flex items-baseline gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span className="font-medium uppercase tracking-[0.16em]">
                        {isEntitySummaryExpanded ? t`Show less` : t`Show more stats`}
                      </span>
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${isEntitySummaryExpanded ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent className="mt-4">
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
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 px-4 py-3 text-sm text-muted-foreground">
                {t`Summary data is unavailable right now. You can still use the entity table below.`}
              </div>
            )}
          </section>
        </div>
      }
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

    >
      <Tabs
        value={activeTab}
        onValueChange={(nextTab) => {
          handleSearchStateChange({
            ...normalizedSearch,
            tab: nextTab as "overview" | "threads" | "config",
            ...(nextTab !== "config"
              ? { selectedEntityCui: undefined }
              : undefined),
          });
        }}
        className="-mt-2 space-y-4"
      >
        <TabsList className={campaignAdminEntityHubTabsListClassName}>
          <TabsTrigger
            value="overview"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
            {t`Overview`}
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <Settings2 className="size-4 shrink-0" aria-hidden="true" />
            {t`Config`}
          </TabsTrigger>
          <TabsTrigger
            value="threads"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <MessageSquare className="size-4 shrink-0" aria-hidden="true" />
            {t`Threads`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-4 pt-4">
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
                  onCopyRows={handleCopyRows}
                  onExportCsv={handleExportCsv}
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
                  footer={
                    items.length > 0 ? (
                      <CampaignAdminCursorPager
                        pageIndex={currentPageIndex}
                        pageSize={normalizedSearch.limit}
                        itemCount={items.length}
                        totalCount={entitiesQuery.data?.page.totalCount}
                        canPrevious={canPreviousPage}
                        canNext={entitiesQuery.data?.page.hasMore ?? false}
                        isLoading={entitiesQuery.isFetching}
                        onPrevious={handlePreviousPage}
                        onNext={handleNextPage}
                        variant="connected"
                      />
                    ) : null
                  }
                  onClearFilters={() => {
                    handleEntitiesSearchChange(
                      createEmptyCampaignAdminEntitiesSearch({
                        currentSearch: normalizedSearch,
                      }),
                    );
                  }}
                />
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="threads" className="mt-0 space-y-4 pt-4">
          <section className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {t`Institution threads`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t`Inspect institution correspondence next to the entity admin workflows, or jump into the scoped entity thread surface for a selected row.`}
            </p>
          </section>

          {activeTab === "threads" ? (
            <CampaignAdminInstitutionThreadsSection
              campaignKey={campaignKey}
              search={threadsSearch}
              onSearchChange={(nextThreadSearch, options) => {
                handleSearchStateChange(
                  mergeCampaignAdminInstitutionThreadsSearchIntoEntitiesSearch(
                    normalizedSearch,
                    nextThreadSearch,
                  ),
                  options,
                );
              }}
              detailAction={(item) => (
                <Button asChild variant="outline" size="sm" className="rounded-full">
                  <Link
                    to="/admin/campaigns/$campaignKey/entities/$entityCui"
                    params={{ campaignKey, entityCui: item.entityCui }}
                    search={
                      createEntityThreadsRouteSearch(
                        item.entityCui,
                        item.id,
                      ) as never
                    }
                  >
                    {t`Details`}
                  </Link>
                </Button>
              )}
              drawerHeaderAction={(detail) => (
                <Button asChild variant="outline" size="sm">
                  <Link
                    to="/admin/campaigns/$campaignKey/entities/$entityCui"
                    params={{ campaignKey, entityCui: detail.entityCui }}
                    search={
                      createEntityThreadsRouteSearch(
                        detail.entityCui,
                        detail.id,
                      ) as never
                    }
                  >
                    {t`Entity details`}
                  </Link>
                </Button>
              )}
            />
          ) : null}
        </TabsContent>

        <TabsContent value="config" className="mt-0 space-y-4 pt-4">
          <section className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {t`Campaign entity config`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t`The table includes subscribed entities and any saved config rows. Paste spreadsheet rows directly on this tab to stage visible rows before applying them.`}
            </p>
          </section>

          {entityConfigQuery.error?.status === 401 ? (
            <Card className="max-w-xl rounded-3xl border-border/70 bg-card/80 shadow-none">
              <CardHeader>
                <CardTitle>{t`Session expired`}</CardTitle>
                <CardDescription>
                  {t`Refresh your authentication session, then try loading entity config again.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AuthSignInButton>
                  <Button>{t`Sign in again`}</Button>
                </AuthSignInButton>
              </CardContent>
            </Card>
          ) : entityConfigQuery.error?.status === 403 ? (
            <EmptyState
              icon={<LockKeyhole className="h-6 w-6" />}
              title={t`You do not have access to entity config`}
              description={t`The server denied access to the current campaign entity config admin permission boundary.`}
              className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
            />
          ) : entityConfigQuery.error?.status === 404 ? (
            <EmptyState
              icon={<SearchX className="h-6 w-6" />}
              title={t`Campaign entity config unavailable`}
              description={t`This campaign entity config admin surface is either not enabled on the current server or the campaign key is not supported.`}
              className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
            />
          ) : entityConfigQuery.error ? (
            <Alert variant="destructive" aria-live="polite">
              <Ban className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>{t`Failed to load entity config`}</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>{entityConfigQuery.error.message}</p>
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
          ) : entityConfigQuery.isLoading &&
            entityConfigQuery.data === undefined ? (
            <EntitiesTableSkeleton />
          ) : (
            <div className="space-y-4">
              <CampaignAdminEntityConfigTable
                items={configItems}
                selectedEntityCuis={selectedConfigEntityCuis}
                header={
                  ({ actions }) => (
                    <CampaignAdminEntityConfigToolbar
                      embedded
                      actions={actions}
                      search={configSearch}
                      isLoading={
                        entityConfigQuery.isLoading || entityConfigQuery.isFetching
                      }
                      onApply={handleConfigSearchChange}
                      onReset={handleConfigSearchChange}
                      onRefresh={handleRefresh}
                      onOpenEntity={(entityCui, nextSearch) => {
                        handleConfigSearchChange(
                          {
                            ...nextSearch,
                            selectedEntityCui: entityCui,
                            createMode: false,
                          },
                          { replace: true },
                        );
                      }}
                      onCreateEntity={(entityCui, nextSearch) => {
                        handleSearchStateChange(
                          mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
                            normalizedSearch,
                            {
                              ...configSearch,
                              ...nextSearch,
                              selectedEntityCui:
                                entityCui.length > 0 ? entityCui : undefined,
                              createMode: true,
                            },
                          ),
                          { replace: true },
                        );
                      }}
                      onPasteRows={handlePasteEntityConfigRowsFromClipboard}
                      onCopyRows={handleCopyEntityConfigRows}
                      onExportCsv={handleExportEntityConfigCsv}
                    />
                  )
                }
                sortBy={configSearch.sortBy}
                sortOrder={configSearch.sortOrder}
                stagedDraftsByEntityCui={stagedEntityConfigDraftsByEntityCui}
                pasteIssues={entityConfigPasteIssues}
                copyText={visibleEntityConfigClipboardText}
                onCopyRows={handleCopyEntityConfigRows}
                onSortChange={(sortBy, sortOrder) => {
                  handleConfigSearchChange(
                    {
                      ...configSearch,
                      sortBy,
                      sortOrder,
                    },
                    { replace: true },
                  );
                }}
                onOpenItem={(item) => {
                  handleConfigSheetStateChange(
                    {
                      ...configSearch,
                      selectedEntityCui: item.entityCui,
                    },
                    { replace: true },
                  );
                }}
                onClearFilters={() => {
                  handleConfigSearchChange(
                    createEmptyCampaignAdminEntityConfigSearch({
                      currentSearch: configSearch,
                    }),
                  );
                }}
                onToggleSelectAll={handleToggleSelectAllConfigRows}
                onToggleSelection={handleToggleConfigSelection}
                footer={
                  configItems.length > 0 ? (
                    <CampaignAdminCursorPager
                      pageIndex={currentConfigPageIndex}
                      pageSize={configSearch.limit}
                      itemCount={configItems.length}
                      totalCount={entityConfigQuery.data?.page.totalCount}
                      canPrevious={canPreviousConfigPage}
                      canNext={entityConfigQuery.data?.page.hasMore ?? false}
                      isLoading={entityConfigQuery.isFetching}
                      onPrevious={handlePreviousConfigPage}
                      onNext={handleNextConfigPage}
                      variant="connected"
                    />
                  ) : null
                }
              />
              {bulkEntityConfigFooter ? (
                <div className="rounded-3xl border border-border/70 bg-card/80 px-4 py-4 shadow-none">
                  {bulkEntityConfigFooter}
                </div>
              ) : null}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CampaignAdminEntityConfigSheet
        open={activeTab === "config" && (selectedEntityCui !== null || isCreatingEntityConfig)}
        entityCui={selectedEntityCui}
        entity={entityConfigDetailQuery.data ?? null}
        createMode={isCreatingEntityConfig}
        isLoading={entityConfigDetailQuery.isLoading || entityConfigDetailQuery.isFetching}
        errorMessage={entityConfigDetailQuery.error?.message}
        submitErrorMessage={updateEntityConfigMutation.error?.message}
        isSubmitting={updateEntityConfigMutation.isPending}
        onOpenChange={(open) => {
          if (open) {
            return;
          }

          handleConfigSheetStateChange(
            {
              ...configSearch,
              selectedEntityCui: undefined,
              createMode: false,
            },
            { replace: true },
          );
        }}
        onEntitySelect={(entity) => {
          handleSearchStateChange(
            mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch(
              normalizedSearch,
              {
                ...configSearch,
                selectedEntityCui: entity.cui,
                createMode: true,
              },
            ),
            { replace: true },
          );
        }}
        onSubmit={handleSubmitEntityConfig}
      />

      <CampaignAdminEntityConfigSendValidationDialog
        open={isConfigSendValidationOpen}
        issues={selectedConfigSendValidationIssues}
        selectedCount={selectedConfigItems.length}
        onOpenChange={setIsConfigSendValidationOpen}
        onSelectIssue={(entityCui) => {
          setIsConfigSendValidationOpen(false);
          handleConfigSheetStateChange(
            {
              ...configSearch,
              selectedEntityCui: entityCui,
            },
            { replace: true },
          );
        }}
      />

      <AlertDialog
        open={isConfigSendConfirmOpen}
        onOpenChange={setIsConfigSendConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedConfigItems.length === 1
                ? t`Apply 1 config update?`
                : t`Apply ${selectedConfigItems.length} config updates?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedConfigItems.length === 1
                ? t`This will apply the staged entity config values for the selected row.`
                : t`This will apply the staged entity config values for the selected rows.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApplyingSelectedEntityConfigs}>
              {t`Cancel`}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleApplySelectedEntityConfigs();
              }}
              disabled={isApplyingSelectedEntityConfigs}
            >
              {isApplyingSelectedEntityConfigs ? t`Applying…` : t`Apply selected`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isConfigClearStagedConfirmOpen}
        onOpenChange={setIsConfigClearStagedConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {selectedStagedConfigDraftCount === 1
                ? t`Clear staged data for 1 row?`
                : t`Clear staged data for ${selectedStagedConfigDraftCount} rows?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t`This removes the staged config values for the currently selected rows.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction onClick={handleClearSelectedStagedEntityConfigDrafts}>
              {t`Clear staged`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminCampaignLayout>
  );
}
