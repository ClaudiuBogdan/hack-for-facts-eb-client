import { useEffect, useEffectEvent, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  LockKeyhole,
  RefreshCw,
  SearchX,
} from "lucide-react";
import { t } from "@lingui/core/macro";
import { toast } from "sonner";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import { CampaignAdminNotificationTriggerDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationTriggerDialog";
import { CampaignAdminNotificationsTable } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsTable";
import { CampaignAdminNotificationsToolbar } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationsToolbar";
import { CampaignAdminTemplatePreviewDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminTemplatePreviewDialog";
import {
  getCampaignAdminCampaignLabel,
  getCampaignAdminNotificationTabLabel,
} from "@/features/campaigns/buget/admin/constants";
import {
  useCampaignAdminNotificationsAuditQuery,
  useCampaignAdminNotificationTemplatesQuery,
  useCampaignAdminNotificationTriggersQuery,
  useExecuteCampaignAdminNotificationTriggerMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import {
  createCampaignAdminNotificationsPaginationSignature,
  createEmptyCampaignAdminNotificationsSearch,
  getCampaignAdminNotificationsAuditFilters,
  normalizeCampaignAdminNotificationsSearch,
} from "@/features/campaigns/buget/admin/schemas/search-schema";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationsSearch,
  CampaignAdminNotificationSortKey,
  CampaignAdminNotificationTriggerExecutionBody,
  CampaignAdminNotificationTriggerExecutionResponse,
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

function InlineStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <span className="inline-flex items-baseline gap-1 text-sm tabular-nums">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}

function NotificationsCardsSkeleton({
  count = 3,
}: {
  readonly count?: number;
}) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="space-y-4 rounded-2xl border border-border/70 bg-card/80 p-5 shadow-none"
        >
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1 space-y-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

function NotificationsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-none">
        <div className="grid gap-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
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
        </div>
      </div>
      <div className="rounded-2xl border border-border/70 bg-card/80 shadow-none">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="space-y-0">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CampaignAdminNotificationsPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminNotificationsPageProps) {
  const pageTitle = t`Notifications`;
  const pageDescription = t`Audit campaign notification activity, execute server-approved triggers, and preview email templates.`;
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
  const [activeTriggerId, setActiveTriggerId] = useState<string | null>(null);
  const [triggerResult, setTriggerResult] =
    useState<CampaignAdminNotificationTriggerExecutionResponse | null>(null);
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
  const triggersQuery = useCampaignAdminNotificationTriggersQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn && normalizedSearch.tab === "triggers",
  });
  const templatesQuery = useCampaignAdminNotificationTemplatesQuery({
    campaignKey,
    enabled: isLoaded && isSignedIn && normalizedSearch.tab === "templates",
  });
  const executeTriggerMutation =
    useExecuteCampaignAdminNotificationTriggerMutation(campaignKey);

  const activeTrigger =
    triggersQuery.data?.find(
      (trigger) => trigger.triggerId === activeTriggerId,
    ) ?? null;
  const auditItems = auditQuery.data?.items ?? [];
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
          ...(triggersQuery.data?.map((trigger) => trigger.templateId) ?? []),
          ...(templatesQuery.data?.map((template) => template.templateId) ??
            []),
        ]),
      ).sort(),
    [auditItems, triggersQuery.data, templatesQuery.data],
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
    setTriggerResult(null);
  }, [activeTriggerId]);

  const activeQuery =
    normalizedSearch.tab === "audit"
      ? auditQuery
      : normalizedSearch.tab === "triggers"
        ? triggersQuery
        : templatesQuery;

  const handleSearchStateChange = (
    nextSearch: CampaignAdminNotificationsSearch,
    options?: { readonly replace?: boolean },
  ) => {
    onSearchChange(
      normalizeCampaignAdminNotificationsSearch(nextSearch),
      options,
    );
  };

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
    recoverStaleAuditCursor,
  ]);

  const handleTriggerSubmit = async (
    body: CampaignAdminNotificationTriggerExecutionBody,
  ) => {
    if (activeTrigger === null) {
      return;
    }

    try {
      const result = await executeTriggerMutation.mutateAsync({
        triggerId: activeTrigger.triggerId,
        body,
      });
      setTriggerResult(result);
      toast.success(
        t`Trigger ${activeTrigger.triggerId} finished with status ${result.result.status}.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t`Campaign notification trigger failed.`;
      toast.error(message);
    }
  };

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

  if (activeQuery.error?.status === 401) {
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
              {t`Refresh your authentication session, then try loading notifications again.`}
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

  if (activeQuery.error?.status === 403) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<LockKeyhole className="h-6 w-6" />}
          title={t`You do not have access to notifications`}
          description={t`The server denied access to the current campaign-notifications admin permission boundary.`}
          className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
        />
      </AdminCampaignLayout>
    );
  }

  if (activeQuery.error?.status === 404) {
    return (
      <AdminCampaignLayout
        campaignKey={campaignKey}
        title={pageTitle}
        description={pageDescription}
        eyebrow={headerEyebrow}
      >
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title={t`Campaign notifications unavailable`}
          description={t`This campaign notifications admin surface is either not enabled on the current server or the campaign key is not supported.`}
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
      details={
        <>
          <InlineStat
            label={getCampaignAdminNotificationTabLabel(
              normalizedSearch.tab ?? "audit",
            )}
            value={
              normalizedSearch.tab === "audit"
                ? auditItems.length
                : normalizedSearch.tab === "triggers"
                  ? (triggersQuery.data?.length ?? 0)
                  : (templatesQuery.data?.length ?? 0)
            }
          />
          {normalizedSearch.tab === "audit" ? (
            <span className="text-xs text-muted-foreground">
              {t`Page ${currentPageIndex}`}
            </span>
          ) : null}
        </>
      }
    >
      <Tabs
        value={normalizedSearch.tab}
        onValueChange={handleTabChange}
        className="space-y-4"
      >
        <TabsList className="grid w-full max-w-md grid-cols-3 rounded-full p-1">
          <TabsTrigger value="audit">{t`Audit`}</TabsTrigger>
          <TabsTrigger value="triggers">{t`Triggers`}</TabsTrigger>
          <TabsTrigger value="templates">{t`Templates`}</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeQuery.error &&
      activeQuery.error.status !== 401 &&
      activeQuery.error.status !== 403 &&
      activeQuery.error.status !== 404 ? (
        <Alert variant="destructive" aria-live="polite">
          <Ban className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{t`Failed to load notifications`}</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{activeQuery.error.message}</p>
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

      {normalizedSearch.tab === "audit" ? (
        <section
          className="space-y-4"
          aria-labelledby="notifications-audit-title"
        >
          <div className="space-y-1">
            <h2
              id="notifications-audit-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {t`Audit log`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t`Inspect durable notification activity without exposing raw provider or recipient data.`}
            </p>
          </div>

          {auditQuery.isLoading && auditQuery.data === undefined ? (
            <NotificationsTableSkeleton />
          ) : (
            <div className="space-y-4">
              {auditItems.length === 0 ? (
                <CampaignAdminNotificationsToolbar
                  embedded
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
                items={auditItems}
                sortBy={normalizedSearch.sortBy}
                sortOrder={normalizedSearch.sortOrder}
                onSortChange={handleAuditSortChange}
                header={
                  auditItems.length > 0
                    ? ({ actions, trailingActions }) => (
                        <CampaignAdminNotificationsToolbar
                          embedded
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

              {auditItems.length > 0 ? (
                <CampaignAdminCursorPager
                  pageIndex={currentPageIndex}
                  pageSize={normalizedSearch.limit}
                  itemCount={auditItems.length}
                  canPrevious={canPreviousPage}
                  canNext={auditQuery.data?.page.hasMore ?? false}
                  isLoading={auditQuery.isFetching}
                  onPrevious={handlePreviousPage}
                  onNext={handleNextPage}
                />
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {normalizedSearch.tab === "triggers" ? (
        <section
          className="space-y-4"
          aria-labelledby="notifications-triggers-title"
        >
          <div className="space-y-1">
            <h2
              id="notifications-triggers-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {t`Manual trigger catalog`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t`Run only the trigger definitions that the server explicitly allows for this campaign.`}
            </p>
          </div>

          {triggersQuery.isLoading && triggersQuery.data === undefined ? (
            <NotificationsCardsSkeleton />
          ) : triggersQuery.data && triggersQuery.data.length > 0 ? (
            <div className="space-y-3">
              {triggersQuery.data.map((trigger) => (
                <article
                  key={trigger.triggerId}
                  className="rounded-2xl border border-border/70 bg-card/80 shadow-none"
                >
                  <div className="flex flex-col gap-0 lg:flex-row">
                    <div className="flex-1 space-y-4 p-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">
                          {trigger.description}
                        </h3>
                        <p className="font-mono text-xs text-muted-foreground">
                          {trigger.triggerId}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {t`Template`}
                          <span className="ml-1.5 font-mono font-medium text-foreground">
                            {trigger.templateId}
                          </span>
                        </span>
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {t`Target`}
                          <span className="ml-1.5 font-medium text-foreground">
                            {trigger.targetKind}
                          </span>
                        </span>
                      </div>

                      {trigger.inputFields.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {t`Input fields`}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {trigger.inputFields.map((field) => (
                              <span
                                key={`${trigger.triggerId}:${field.name}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs text-foreground"
                              >
                                <span className="font-mono font-medium">
                                  {field.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {field.type}
                                </span>
                                {field.required ? (
                                  <span className="text-destructive">*</span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t`This trigger does not require additional input.`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-stretch border-t border-border/60 lg:border-l lg:border-t-0">
                      <div className="flex w-full items-center justify-center p-5 lg:w-auto lg:min-w-[12rem]">
                        <Button
                          type="button"
                          className="w-full lg:w-auto"
                          onClick={() => {
                            setActiveTriggerId(trigger.triggerId);
                          }}
                        >
                          {t`Execute`}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title={t`No triggers available`}
              description={t`The server did not expose any manual notification triggers for this campaign.`}
              className="rounded-2xl border border-border/70 bg-card/80"
            />
          )}
        </section>
      ) : null}

      {normalizedSearch.tab === "templates" ? (
        <section
          className="space-y-4"
          aria-labelledby="notifications-templates-title"
        >
          <div className="space-y-1">
            <h2
              id="notifications-templates-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              {t`Previewable templates`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t`Inspect example-driven subject, HTML, and text previews through the authenticated admin boundary.`}
            </p>
          </div>

          {templatesQuery.isLoading && templatesQuery.data === undefined ? (
            <NotificationsCardsSkeleton />
          ) : templatesQuery.data && templatesQuery.data.length > 0 ? (
            <div className="space-y-3">
              {templatesQuery.data.map((template) => (
                <article
                  key={template.templateId}
                  className="rounded-2xl border border-border/70 bg-card/80 shadow-none"
                >
                  <div className="flex flex-col gap-0 lg:flex-row">
                    <div className="flex-1 space-y-4 p-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">
                          {template.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {template.description}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 font-mono text-xs font-medium text-foreground">
                          {template.templateId}
                        </span>
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                          {t`Version ${template.version}`}
                        </span>
                      </div>

                      {template.requiredFields.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                            {t`Required fields`}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {template.requiredFields.map((field) => (
                              <span
                                key={`${template.templateId}:${field.name}`}
                                className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1 text-xs text-foreground"
                              >
                                <span className="font-mono font-medium">
                                  {field.name}
                                </span>
                                <span className="text-muted-foreground">
                                  {field.type}
                                </span>
                                {field.required ? (
                                  <span className="text-destructive">*</span>
                                ) : null}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {t`No required fields.`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-stretch border-t border-border/60 lg:border-l lg:border-t-0">
                      <div className="flex w-full items-center justify-center p-5 lg:w-auto lg:min-w-[12rem]">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full lg:w-auto"
                          onClick={() => {
                            setActiveTemplateId(template.templateId);
                          }}
                        >
                          {t`Preview`}
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<AlertTriangle className="h-6 w-6" />}
              title={t`No templates available`}
              description={t`The server did not expose any previewable notification templates for this campaign.`}
              className="rounded-2xl border border-border/70 bg-card/80"
            />
          )}
        </section>
      ) : null}

      <CampaignAdminNotificationTriggerDialog
        open={activeTriggerId !== null}
        trigger={activeTrigger}
        isPending={executeTriggerMutation.isPending}
        result={triggerResult}
        onOpenChange={(open) => {
          if (!open) {
            setActiveTriggerId(null);
          }
        }}
        onSubmit={handleTriggerSubmit}
      />

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
