import { useCallback, useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  LayoutTemplate,
  LockKeyhole,
  RefreshCw,
  ScrollText,
  SearchX,
  Send,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import {
  campaignAdminEntityHubTabsListClassName,
  campaignAdminEntityHubTabsTriggerClassName,
} from "@/features/campaigns/buget/admin/components/campaign-admin-entity-hub-tabs-styles";
import { CampaignAdminSectionShell } from "@/features/campaigns/buget/admin/components/campaign-admin-section-shell";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import { CampaignAdminNotificationsRunTab } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsRunTab";
import { CampaignAdminNotificationsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsTable";
import { CampaignAdminNotificationTriggersSection } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationTriggersSection";
import { CampaignAdminNotificationsToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsToolbar";
import { CampaignAdminTemplatePreviewDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminTemplatePreviewDialog";
import {
  getCampaignAdminCampaignLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  useCampaignAdminNotificationsAuditQuery,
  useCampaignAdminNotificationTemplatesQuery,
  useCampaignAdminRunnableTemplatesQuery,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import {
  createCampaignAdminNotificationsPaginationSignature,
  createEmptyCampaignAdminNotificationsSearch,
  getCampaignAdminNotificationsAuditFilters,
  normalizeCampaignAdminNotificationsSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationSortKey,
  CampaignAdminNotificationTemplateDescriptor,
  CampaignAdminNotificationsSearch,
  CampaignAdminSortOrder,
} from "@/features/campaigns/buget/admin/types";
import { AuthSignInButton, useAuth } from "@/lib/auth";

type CampaignAdminNotificationsPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminNotificationsSearch;
  readonly onSearchChange: (
    search: CampaignAdminNotificationsSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

function NotificationsTemplatesSkeleton({
  count = 3,
}: {
  readonly count?: number;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 shadow-none">
      <div className="space-y-1 border-b border-border/60 px-4 pb-4 pt-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="divide-y divide-border/50 px-4 py-0">
        {Array.from({ length: count }).map((_, index) => (
          <div
            key={index}
            className="flex items-start justify-between gap-4 py-5"
          >
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-4 max-w-md" />
            </div>
            <Skeleton className="h-9 w-24 shrink-0 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsTableSkeleton() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/80 shadow-none">
      <div className="space-y-1 border-b border-border/60 px-4 pb-4 pt-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="space-y-3 p-4">
        <div className="grid gap-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-24 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <div className="overflow-hidden border-t border-border/50 pt-4">
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-none" />
            ))}
          </div>
        </div>
        <div className="border-t border-border/50 pt-3">
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

function NotificationsTabErrorState({
  status,
  title,
  description,
  onRetry,
}: {
  readonly status: number | undefined;
  readonly title: string;
  readonly description: string;
  readonly onRetry?: () => void;
}) {
  if (status === 401) {
    return (
      <Card className="max-w-xl rounded-3xl border-border/70 bg-card/80 shadow-none">
        <CardHeader>
          <CardTitle>{t`Session expired`}</CardTitle>
          <CardDescription>
            {t`Refresh your authentication session, then try loading notifications again.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthSignInButton>
            <Button>{t`Sign in again`}</Button>
          </AuthSignInButton>
        </CardContent>
      </Card>
    );
  }

  if (status === 403) {
    return (
      <EmptyState
        icon={<LockKeyhole className="h-6 w-6" />}
        title={title}
        description={description}
        className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
      />
    );
  }

  if (status === 404) {
    return (
      <EmptyState
        icon={<SearchX className="h-6 w-6" />}
        title={title}
        description={description}
        className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
      />
    );
  }

  return (
    <Alert variant="destructive" aria-live="polite">
      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{description}</p>
        {onRetry ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={onRetry}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t`Retry`}
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}

function TemplateListRow({
  template,
  onPreview,
}: {
  readonly template: CampaignAdminNotificationTemplateDescriptor;
  readonly onPreview: () => void;
}) {
  const [fieldsOpen, setFieldsOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            {template.name}
          </h3>
          <Badge variant="secondary" className="shrink-0 font-mono text-[11px]">
            {t`v${template.version}`}
          </Badge>
        </div>
        {template.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            {template.description}
          </p>
        ) : null}

        {template.requiredFields.length > 0 ? (
          <Collapsible open={fieldsOpen} onOpenChange={setFieldsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto gap-1 px-0 text-xs text-muted-foreground"
              >
                {fieldsOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {fieldsOpen
                  ? t`Hide fields`
                  : t`${template.requiredFields.length} required field${template.requiredFields.length !== 1 ? "s" : ""}`}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                {template.requiredFields.map((field) => (
                  <span
                    key={`${template.templateId}:${field.name}`}
                    className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/50 px-2 py-0.5 font-mono text-xs text-foreground"
                  >
                    {field.name}
                    <span className="text-muted-foreground">{field.type}</span>
                    {field.required ? (
                      <span className="text-destructive">*</span>
                    ) : null}
                  </span>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full shrink-0 sm:w-auto"
        onClick={onPreview}
      >
        {t`Preview`}
      </Button>
    </div>
  );
}

export function CampaignAdminNotificationsPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminNotificationsPageProps) {
  const pageTitle = t`Notifications`;
  const pageDescription = t`Audit campaign notification activity, preview notification matches, and send notifications.`;
  const normalizedSearch = normalizeCampaignAdminNotificationsSearch(search);
  const auditFilters = useMemo(
    () => getCampaignAdminNotificationsAuditFilters(normalizedSearch),
    [normalizedSearch],
  );
  const paginationStateSignatureFromSearch = useMemo(
    () => createCampaignAdminNotificationsPaginationSignature(normalizedSearch),
    [normalizedSearch],
  );
  const [previousCursors, setPreviousCursors] = useState<Array<string | null>>(
    [],
  );
  const [paginationStateSignature, setPaginationStateSignature] = useState(
    paginationStateSignatureFromSearch,
  );
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const { isLoaded, isSignedIn } = useAuth();

  const auditQuery = useCampaignAdminNotificationsAuditQuery({
    campaignKey,
    filters: auditFilters,
    cursor:
      normalizedSearch.tab === "audit"
        ? (normalizedSearch.cursor ?? null)
        : null,
    limit: normalizedSearch.limit,
    enabled: isLoaded && isSignedIn && normalizedSearch.tab === "audit",
  });
  const runnableTemplatesQuery = useCampaignAdminRunnableTemplatesQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn && normalizedSearch.tab === "run",
  });
  const templatesQuery = useCampaignAdminNotificationTemplatesQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn && normalizedSearch.tab === "templates",
  });

  const auditItems = useMemo(() => auditQuery.data?.items ?? [], [auditQuery.data?.items]);
  const currentPageIndex = normalizedSearch.pageIndex ?? 1;
  const canPreviousPage =
    previousCursors.length > 0 ||
    (previousCursors.length === 0 &&
      normalizedSearch.cursor !== undefined &&
      currentPageIndex === 2);
  const notificationTypeOptions = useMemo(
    () =>
      Array.from(
        new Set(auditItems.map((item) => item.notificationType)),
      ).sort(),
    [auditItems],
  );
  const templateIdOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...auditItems.flatMap((item) =>
            item.templateId ? [item.templateId] : [],
          ),
          ...(templatesQuery.data?.map((template) => template.templateId) ??
            []),
        ]),
      ).sort(),
    [auditItems, templatesQuery.data],
  );
  const selectedTemplate =
    templatesQuery.data?.find(
      (template) => template.templateId === activeTemplateId,
    ) ??
    (activeTemplateId
      ? {
          templateId: activeTemplateId,
          name: activeTemplateId,
          version: "preview",
          description: "",
          requiredFields: [],
        }
      : null);
  const shouldHideAuditErrorBecauseCursorWillRecover =
    auditQuery.error?.status === 400 &&
    (normalizedSearch.cursor !== undefined ||
      normalizedSearch.pageIndex !== undefined);

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

  const handleSearchStateChange = useCallback(
    (
      nextSearch: CampaignAdminNotificationsSearch,
      options?: { readonly replace?: boolean },
    ) => {
      onSearchChange(
        normalizeCampaignAdminNotificationsSearch(nextSearch),
        options,
      );
    },
    [onSearchChange],
  );

  const resetLocalPagingState = (
    nextSearch: CampaignAdminNotificationsSearch,
  ) => {
    setPreviousCursors([]);
    setPaginationStateSignature(
      createCampaignAdminNotificationsPaginationSignature(nextSearch),
    );
  };

  const handleAuditSearchChange = (
    nextSearch: CampaignAdminNotificationsSearch,
    options?: { readonly replace?: boolean },
  ) => {
    const normalizedNextSearch = normalizeCampaignAdminNotificationsSearch({
      ...nextSearch,
      tab: "audit",
      cursor: undefined,
      pageIndex: undefined,
    });
    resetLocalPagingState(normalizedNextSearch);
    handleSearchStateChange(normalizedNextSearch, options);
  };

  const handleAuditSortChange = (
    sortBy: CampaignAdminNotificationSortKey,
    sortOrder: CampaignAdminSortOrder,
  ) => {
    const nextSearch = normalizeCampaignAdminNotificationsSearch({
      ...normalizedSearch,
      tab: "audit",
      sortBy,
      sortOrder,
      cursor: undefined,
      pageIndex: undefined,
    });

    resetLocalPagingState(nextSearch);
    handleSearchStateChange(nextSearch, { replace: true });
  };

  const handleTabChange = (nextTab: string) => {
    const nextSearch = normalizeCampaignAdminNotificationsSearch({
      ...normalizedSearch,
      tab: nextTab,
      cursor: undefined,
      pageIndex: undefined,
    });
    resetLocalPagingState(nextSearch);
    handleSearchStateChange(nextSearch, { replace: true });
  };

  const handleNextPage = () => {
    const nextCursor = auditQuery.data?.page.nextCursor;
    if (nextCursor === undefined || nextCursor === null) {
      return;
    }

    const nextSearch = normalizeCampaignAdminNotificationsSearch({
      ...normalizedSearch,
      cursor: nextCursor,
      pageIndex: currentPageIndex + 1,
    });

    setPreviousCursors((currentCursors) => [
      ...currentCursors,
      normalizedSearch.cursor ?? null,
    ]);
    setPaginationStateSignature(
      createCampaignAdminNotificationsPaginationSignature(nextSearch),
    );
    handleSearchStateChange(nextSearch);
  };

  const handlePreviousPage = () => {
    if (previousCursors.length === 0) {
      if (normalizedSearch.cursor === undefined || currentPageIndex !== 2) {
        return;
      }

      const nextSearch = normalizeCampaignAdminNotificationsSearch({
        ...normalizedSearch,
        cursor: undefined,
        pageIndex: undefined,
      });
      setPaginationStateSignature(
        createCampaignAdminNotificationsPaginationSignature(nextSearch),
      );
      handleSearchStateChange(nextSearch);
      return;
    }

    const nextPreviousCursors = [...previousCursors];
    const previousCursor = nextPreviousCursors.pop() ?? null;
    const nextPageIndex = Math.max(1, currentPageIndex - 1);
    const nextSearch = normalizeCampaignAdminNotificationsSearch({
      ...normalizedSearch,
      cursor: previousCursor ?? undefined,
      pageIndex: nextPageIndex === 1 ? undefined : nextPageIndex,
    });
    setPreviousCursors(nextPreviousCursors);
    setPaginationStateSignature(
      createCampaignAdminNotificationsPaginationSignature(nextSearch),
    );
    handleSearchStateChange(nextSearch);
  };

  const activeQuery =
    normalizedSearch.tab === "audit"
      ? auditQuery
      : normalizedSearch.tab === "run"
        ? runnableTemplatesQuery
        : templatesQuery;

  const handleRefresh = () => {
    void activeQuery.refetch();
  };

  const recoverStaleAuditCursor = useEffectEvent(() => {
    const nextSearch = normalizeCampaignAdminNotificationsSearch({
      ...normalizedSearch,
      cursor: undefined,
      pageIndex: undefined,
    });

    resetLocalPagingState(nextSearch);
    handleSearchStateChange(nextSearch, { replace: true });
  });

  useEffect(() => {
    const shouldRecoverStaleAuditCursor =
      normalizedSearch.tab === "audit" &&
      auditQuery.error?.status === 400 &&
      (normalizedSearch.cursor !== undefined ||
        normalizedSearch.pageIndex !== undefined);

    if (!shouldRecoverStaleAuditCursor) {
      return;
    }

    recoverStaleAuditCursor();
  }, [
    auditQuery.error?.status,
    normalizedSearch.cursor,
    normalizedSearch.pageIndex,
    normalizedSearch.tab,
  ]);

  if (!isLoaded) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <NotificationsTableSkeleton />
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

  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={pageTitle}
      description={pageDescription}
      eyebrow={headerEyebrow}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={handleRefresh}
          disabled={activeQuery.isLoading || activeQuery.isFetching}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t`Refresh`}
        </Button>
      }
    >
      <Tabs
        value={normalizedSearch.tab}
        onValueChange={handleTabChange}
        className="-mt-2 space-y-4"
      >
        <TabsList className={campaignAdminEntityHubTabsListClassName}>
          <TabsTrigger
            value="audit"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <ScrollText className="size-4 shrink-0" aria-hidden="true" />
            {t`Audit`}
          </TabsTrigger>
          <TabsTrigger
            value="run"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <Send className="size-4 shrink-0" aria-hidden="true" />
            {t`Run`}
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className={campaignAdminEntityHubTabsTriggerClassName}
          >
            <LayoutTemplate className="size-4 shrink-0" aria-hidden="true" />
            {t`Templates`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="mt-0 space-y-4 pt-4">
          {auditQuery.error &&
          !shouldHideAuditErrorBecauseCursorWillRecover ? (
            <NotificationsTabErrorState
              status={auditQuery.error.status}
              title={
                auditQuery.error.status === 403
                  ? t`You do not have access to notifications`
                  : auditQuery.error.status === 404
                    ? t`Campaign notifications unavailable`
                    : t`Failed to load notifications`
              }
              description={
                auditQuery.error.status === 403
                  ? t`The server denied access to the current campaign-notifications admin permission boundary.`
                  : auditQuery.error.status === 404
                    ? t`This campaign notifications admin surface is either not enabled on the current server or the campaign key is not supported.`
                    : auditQuery.error.message
              }
              onRetry={() => {
                void auditQuery.refetch();
              }}
            />
          ) : auditQuery.isLoading && auditQuery.data === undefined ? (
            <NotificationsTableSkeleton />
          ) : (
            <CampaignAdminSectionShell
              id="notifications-audit"
              title={t`Audit log`}
              description={t`Inspect durable notification activity without exposing raw provider or recipient data.`}
            >
              <div className="space-y-4">
                {auditItems.length === 0 ? (
                  <CampaignAdminNotificationsToolbar
                    embedded
                    hideRefresh
                    search={normalizedSearch}
                    isLoading={auditQuery.isLoading || auditQuery.isFetching}
                    notificationTypeOptions={notificationTypeOptions}
                    templateIdOptions={templateIdOptions}
                    onApply={handleAuditSearchChange}
                    onReset={handleAuditSearchChange}
                    onRefresh={() => {
                      void auditQuery.refetch();
                    }}
                  />
                ) : null}

                <CampaignAdminNotificationsTable
                  campaignKey={campaignKey}
                  flushChrome
                  items={auditItems}
                  sortBy={normalizedSearch.sortBy}
                  sortOrder={normalizedSearch.sortOrder}
                  onSortChange={handleAuditSortChange}
                  header={
                    auditItems.length > 0
                      ? ({ actions, trailingActions }) => (
                          <CampaignAdminNotificationsToolbar
                            embedded
                            hideRefresh
                            actions={actions}
                            trailingActions={trailingActions}
                            search={normalizedSearch}
                            isLoading={
                              auditQuery.isLoading || auditQuery.isFetching
                            }
                            notificationTypeOptions={notificationTypeOptions}
                            templateIdOptions={templateIdOptions}
                            onApply={handleAuditSearchChange}
                            onReset={handleAuditSearchChange}
                            onRefresh={() => {
                              void auditQuery.refetch();
                            }}
                          />
                        )
                      : undefined
                  }
                  footer={
                    auditItems.length > 0 ? (
                      <CampaignAdminCursorPager
                        variant="connected"
                        pageIndex={currentPageIndex}
                        pageSize={normalizedSearch.limit}
                        itemCount={auditItems.length}
                        totalCount={auditQuery.data?.page.totalCount}
                        canPrevious={canPreviousPage}
                        canNext={auditQuery.data?.page.hasMore ?? false}
                        isLoading={auditQuery.isFetching}
                        onPrevious={handlePreviousPage}
                        onNext={handleNextPage}
                      />
                    ) : null
                  }
                  onClearFilters={() => {
                    handleAuditSearchChange(
                      createEmptyCampaignAdminNotificationsSearch({
                        tab: "audit",
                        currentSearch: normalizedSearch,
                      }),
                    );
                  }}
                  onPreviewTemplate={(templateId) => {
                    setActiveTemplateId(templateId);
                  }}
                />
              </div>
            </CampaignAdminSectionShell>
          )}
        </TabsContent>

        <TabsContent value="run" className="mt-0 space-y-4 pt-4">
          <div className="space-y-6">
            <CampaignAdminNotificationsRunTab
              campaignKey={campaignKey}
              search={normalizedSearch}
              onSearchChange={handleSearchStateChange}
              onPreviewTemplate={(templateId) => {
                setActiveTemplateId(templateId);
              }}
            />
            <CampaignAdminNotificationTriggersSection
              campaignKey={campaignKey}
            />
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-0 space-y-4 pt-4">
          {templatesQuery.error ? (
            <NotificationsTabErrorState
              status={templatesQuery.error.status}
              title={
                templatesQuery.error.status === 403
                  ? t`You do not have access to templates`
                  : templatesQuery.error.status === 404
                    ? t`Preview templates unavailable`
                    : t`Failed to load templates`
              }
              description={
                templatesQuery.error.status === 403
                  ? t`The server denied access to the current campaign notification template previews.`
                  : templatesQuery.error.status === 404
                    ? t`This server does not expose previewable notification templates for the current campaign.`
                    : templatesQuery.error.message
              }
              onRetry={() => {
                void templatesQuery.refetch();
              }}
            />
          ) : templatesQuery.isLoading && templatesQuery.data === undefined ? (
            <NotificationsTemplatesSkeleton />
          ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
            <CampaignAdminSectionShell
              id="notifications-templates"
              title={t`Previewable templates`}
              description={t`Inspect example-driven subject, HTML, and text previews through the authenticated admin boundary.`}
            >
              <div className="divide-y divide-border/50">
                {templatesQuery.data.map((template) => (
                  <TemplateListRow
                    key={template.templateId}
                    template={template}
                    onPreview={() => {
                      setActiveTemplateId(template.templateId);
                    }}
                  />
                ))}
              </div>
            </CampaignAdminSectionShell>
          ) : (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title={t`No templates available`}
              description={t`The server did not expose any previewable notification templates for this campaign.`}
              className="rounded-2xl border border-border/70 bg-card/80"
            />
          )}
        </TabsContent>
      </Tabs>

      <CampaignAdminTemplatePreviewDialog
        campaignKey={campaignKey}
        open={activeTemplateId !== null}
        template={selectedTemplate}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTemplateId(null);
          }
        }}
      />
    </AdminCampaignLayout>
  );
}
