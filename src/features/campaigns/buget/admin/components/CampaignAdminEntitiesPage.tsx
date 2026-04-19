import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Ban,
  ChevronDown,
  LayoutGrid,
  LockKeyhole,
  RefreshCw,
  SearchX,
  Settings2,
} from "lucide-react";
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
import { CampaignAdminEntityConfigPasteDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigPasteDialog";
import {
  CampaignAdminEntityConfigSheet,
} from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigSheet";
import { CampaignAdminEntityConfigTable } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigTable";
import { CampaignAdminEntityConfigToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminEntityConfigToolbar";
import { CampaignAdminEntitiesTable } from "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesTable";
import { CampaignAdminEntitiesToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminEntitiesToolbar";
import { CompactStat } from "@/features/campaigns/buget/admin/components/CompactStat";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import { downloadCampaignAdminEntityConfigCsv } from "@/features/campaigns/buget/admin/api/campaign-admin-entity-config";
import {
  useCampaignAdminEntitiesMetaQuery,
  useCampaignAdminEntitiesQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-entities";
import {
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
  mergeCampaignAdminEntityConfigSearchIntoEntitiesSearch,
  normalizeCampaignAdminEntitiesSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import {
  campaignAdminEntityNotificationTypeValues,
  campaignAdminNotificationStatusValues,
} from "@/features/campaigns/buget/admin/types";
import { cn } from "@/lib/utils";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminEntitiesSearch,
  CampaignAdminUpdateEntityConfigBody,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminEntitiesPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminEntitiesSearch;
  readonly onSearchChange: (
    search: CampaignAdminEntitiesSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

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

const campaignAdminEntitiesGithubTabTriggerClassName = cn(
  "relative -mb-px gap-2 rounded-none border-0 border-b-2 border-transparent bg-transparent px-4 py-2.5 text-sm font-normal shadow-none",
  "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
  "focus-visible:ring-offset-0",
  "data-[state=active]:border-orange-500 data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-none",
  "dark:data-[state=active]:border-orange-400",
);

export function CampaignAdminEntitiesPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminEntitiesPageProps) {
  const pageTitle = t`Entities`;
  const pageDescription = t`Review entity-level campaign state across users, interaction review pressure, and notification delivery activity.`;
  const normalizedSearch = normalizeCampaignAdminEntitiesSearch(search);
  const activeTab = normalizedSearch.tab ?? "overview";
  const filters = useMemo(
    () => getCampaignAdminEntitiesFilters(normalizedSearch),
    [normalizedSearch],
  );
  const configSearch = useMemo(
    () => getCampaignAdminEntityConfigSearchFromEntitiesSearch(normalizedSearch),
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
  const [isPasteDialogOpen, setIsPasteDialogOpen] = useState(false);
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

  const items = entitiesQuery.data?.items ?? [];
  const configItems = entityConfigQuery.data?.items ?? [];
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

  const handleSubmitEntityConfig = useCallback(
    async (body: CampaignAdminUpdateEntityConfigBody) => {
      if (selectedEntityCui === null) {
        return;
      }

      await updateEntityConfigMutation.mutateAsync(body);
      toast.success(t`Entity config saved.`);
    },
    [selectedEntityCui, updateEntityConfigMutation],
  );

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
            tab: nextTab as "overview" | "config",
            ...(nextTab === "overview"
              ? { selectedEntityCui: undefined }
              : undefined),
          });
        }}
        className="-mt-2 space-y-4"
      >
        <TabsList
          className={cn(
            "flex h-auto w-full items-end justify-start gap-1 rounded-none border-b border-border bg-transparent p-0",
            "text-muted-foreground",
          )}
        >
          <TabsTrigger
            value="overview"
            className={campaignAdminEntitiesGithubTabTriggerClassName}
          >
            <LayoutGrid className="size-4 shrink-0" aria-hidden="true" />
            {t`Overview`}
          </TabsTrigger>
          <TabsTrigger
            value="config"
            className={campaignAdminEntitiesGithubTabTriggerClassName}
          >
            <Settings2 className="size-4 shrink-0" aria-hidden="true" />
            {t`Config`}
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

        <TabsContent value="config" className="mt-0 space-y-4 pt-4">
          <section className="space-y-1">
            <h2 className="text-base font-semibold tracking-tight text-foreground">
              {t`Campaign entity config`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t`The table shows configured rows only. CSV export includes all entities, including unconfigured ones, and spreadsheet paste updates only the pasted rows.`}
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
                header={
                  ({ actions, trailingActions: _trailingActions }) => (
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
                      onOpenPasteDialog={() => setIsPasteDialogOpen(true)}
                      onExportCsv={handleExportEntityConfigCsv}
                    />
                  )
                }
                sortBy={configSearch.sortBy}
                sortOrder={configSearch.sortOrder}
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

      <CampaignAdminEntityConfigPasteDialog
        open={isPasteDialogOpen}
        campaignKey={campaignKey}
        onOpenChange={setIsPasteDialogOpen}
        onApplied={handleRefresh}
      />
    </AdminCampaignLayout>
  );
}
