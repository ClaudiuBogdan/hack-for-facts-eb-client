import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Info,
  LockKeyhole,
  Plus,
  RefreshCw,
  SearchX,
  Send,
  X,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignAdminNotificationPlanSummary } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationPlanSummary";
import { CampaignAdminNotificationPlanTable } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationPlanTable";
import { CampaignAdminCursorPager } from "@/features/campaigns/buget/admin/components/CampaignAdminCursorPager";
import {
  campaignAdminNotificationPlanPageQueryOptions,
  useCampaignAdminNotificationPlanPageQuery,
  useCampaignAdminRunnableTemplatesQuery,
  useCreateCampaignAdminNotificationDryRunPlanMutation,
  useSendCampaignAdminNotificationPlanMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationPlanSendResponse,
  CampaignAdminNotificationsSearch,
} from "@/features/campaigns/buget/admin/types";
import {
  buildCampaignAdminNotificationPreviewBody,
  canSendCampaignAdminNotificationPlan,
  classifyCampaignAdminNotificationRunError,
  createCampaignAdminNotificationCondition,
  createCampaignAdminNotificationTypeOptions,
  getCampaignAdminConditionDefinition,
  getCampaignAdminNotificationConditionOperatorLabel,
  getNextCampaignAdminNotificationPlanPaginationState,
  getPreviousCampaignAdminNotificationPlanPaginationState,
  normalizeCampaignAdminNotificationConditions,
  parseCampaignAdminNotificationConditions,
  parseCampaignAdminNotificationPreviewTrail,
  serializeCampaignAdminNotificationConditions,
  serializeCampaignAdminNotificationPreviewTrail,
  type CampaignAdminNotificationCondition,
  type CampaignAdminNotificationRunErrorState,
  type CampaignAdminNotificationTypeOption,
} from "@/features/campaigns/buget/admin/utils/campaign-admin-notification-run-utils";
import { AuthSignInButton } from "@/lib/auth";

type CampaignAdminNotificationsRunTabProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminNotificationsSearch;
  readonly onSearchChange: (
    search: CampaignAdminNotificationsSearch,
    options?: { readonly replace?: boolean },
  ) => void;
  readonly onPreviewTemplate: (templateId: string) => void;
};

function clampPreviewPageSize(notificationType: CampaignAdminNotificationTypeOption): number {
  return Math.min(
    notificationType.maxPageSize,
    Math.max(1, notificationType.defaultPageSize),
  );
}

function formatSendButtonLabel(readyCount: number): string {
  if (readyCount === 1) {
    return t`Send 1 notification`;
  }

  return t`Send ${readyCount} notifications`;
}

function buildRunSearch(
  currentSearch: CampaignAdminNotificationsSearch,
  patch: Partial<CampaignAdminNotificationsSearch>,
): CampaignAdminNotificationsSearch {
  return {
    ...currentSearch,
    tab: "run",
    ...patch,
  };
}

function ConditionValueInput({
  notificationType,
  condition,
  onChange,
}: {
  readonly notificationType: CampaignAdminNotificationTypeOption;
  readonly condition: CampaignAdminNotificationCondition;
  readonly onChange: (value: string) => void;
}) {
  const conditionDefinition = getCampaignAdminConditionDefinition(
    notificationType,
    condition.fieldKey,
  );

  if (!conditionDefinition) {
    return null;
  }

  if (conditionDefinition.inputKind === "review-status") {
    return (
      <Select
        value={condition.value || "__empty__"}
        onValueChange={(value) => {
          onChange(value === "__empty__" ? "" : value);
        }}
      >
        <SelectTrigger aria-label={t`Condition value`}>
          <SelectValue placeholder={t`Choose a value`} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__empty__">{t`Choose a value`}</SelectItem>
          <SelectItem value="approved">{t`Approved`}</SelectItem>
          <SelectItem value="rejected">{t`Rejected`}</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      type={conditionDefinition.inputKind === "date" ? "date" : "text"}
      value={condition.value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
      placeholder={t`Enter a value`}
      aria-label={t`Condition value`}
    />
  );
}

function NotificationConditionRow({
  notificationType,
  condition,
  onFieldChange,
  onOperatorChange,
  onValueChange,
  onRemove,
}: {
  readonly notificationType: CampaignAdminNotificationTypeOption;
  readonly condition: CampaignAdminNotificationCondition;
  readonly onFieldChange: (fieldKey: string) => void;
  readonly onOperatorChange: (
    operator: CampaignAdminNotificationCondition["operator"],
  ) => void;
  readonly onValueChange: (value: string) => void;
  readonly onRemove: () => void;
}) {
  const conditionDefinition = getCampaignAdminConditionDefinition(
    notificationType,
    condition.fieldKey,
  );

  if (!conditionDefinition) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-2xl border border-border/70 bg-background/40 p-4 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto]">
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {t`Field`}
        </Label>
        <Select
          value={condition.fieldKey}
          onValueChange={(fieldKey) => {
            onFieldChange(fieldKey);
          }}
        >
          <SelectTrigger aria-label={t`Condition field`}>
            <SelectValue placeholder={t`Choose a field`} />
          </SelectTrigger>
          <SelectContent>
            {notificationType.conditionDefinitions.map((field) => (
              <SelectItem key={field.fieldKey} value={field.fieldKey}>
                {field.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {t`Operator`}
        </Label>
        <Select
          value={condition.operator}
          onValueChange={(operator) => {
            onOperatorChange(
              operator as CampaignAdminNotificationCondition["operator"],
            );
          }}
        >
          <SelectTrigger aria-label={t`Condition operator`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {conditionDefinition.operators.map((operator) => (
              <SelectItem key={operator} value={operator}>
                {getCampaignAdminNotificationConditionOperatorLabel(operator)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {t`Value`}
        </Label>
        <ConditionValueInput
          notificationType={notificationType}
          condition={condition}
          onChange={onValueChange}
        />
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={t`Remove condition`}
          onClick={onRemove}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function NotificationTypesSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-3xl" />
      <Skeleton className="h-56 w-full rounded-3xl" />
      <Skeleton className="h-72 w-full rounded-3xl" />
    </div>
  );
}

export function CampaignAdminNotificationsRunTab({
  campaignKey,
  search,
  onSearchChange,
  onPreviewTemplate,
}: CampaignAdminNotificationsRunTabProps) {
  const queryClient = useQueryClient();
  const runnableTemplatesQuery = useCampaignAdminRunnableTemplatesQuery({
    campaignKey,
  });
  const previewMutation =
    useCreateCampaignAdminNotificationDryRunPlanMutation(campaignKey);
  const sendNotificationsMutation =
    useSendCampaignAdminNotificationPlanMutation(campaignKey);

  const [actionError, setActionError] =
    useState<CampaignAdminNotificationRunErrorState | null>(null);
  const [restorationNotice, setRestorationNotice] =
    useState<CampaignAdminNotificationRunErrorState | null>(null);
  const [sendResult, setSendResult] =
    useState<CampaignAdminNotificationPlanSendResponse | null>(null);
  const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
  const [isPreviewConsumed, setIsPreviewConsumed] = useState(false);
  const latestSearchRef = useRef(search);
  const sendInFlightRef = useRef(false);

  const notificationTypes = useMemo(
    () =>
      createCampaignAdminNotificationTypeOptions(
        runnableTemplatesQuery.data ?? [],
      ),
    [runnableTemplatesQuery.data],
  );

  const selectedNotificationType =
    notificationTypes.find(
      (candidate) => candidate.notificationTypeId === search.runNotificationType,
    ) ?? null;

  const parsedConditions = useMemo(
    () => parseCampaignAdminNotificationConditions(search.runConditions),
    [search.runConditions],
  );
  const conditions = useMemo(
    () =>
      normalizeCampaignAdminNotificationConditions({
        notificationType: selectedNotificationType,
        conditions: parsedConditions,
      }),
    [parsedConditions, selectedNotificationType],
  );

  const previewTrail = useMemo(
    () => parseCampaignAdminNotificationPreviewTrail(search.previewTrail),
    [search.previewTrail],
  );
  const currentPreviewPagination = useMemo(
    () => ({
      currentCursor: search.previewCursor ?? null,
      previousCursors: previewTrail,
      pageIndex:
        search.previewPageIndex ??
        (search.previewCursor || previewTrail.length > 0
          ? previewTrail.length + 1
          : 1),
    }),
    [previewTrail, search.previewCursor, search.previewPageIndex],
  );
  const previewFilter = search.previewFilter ?? "all";

  const activePreviewQuery = useCampaignAdminNotificationPlanPageQuery({
    campaignKey,
    planId: search.previewId ?? null,
    cursor: search.previewCursor ?? null,
    limit: selectedNotificationType
      ? clampPreviewPageSize(selectedNotificationType)
      : 25,
    enabled: search.previewId !== undefined,
  });

  const activePreview =
    search.previewId !== undefined ? activePreviewQuery.data ?? null : null;
  const readyCount = activePreview?.summary.willSendCount ?? 0;
  const previewPageError =
    search.previewId && activePreview === null && activePreviewQuery.error
      ? classifyCampaignAdminNotificationRunError(
          activePreviewQuery.error,
          "previewPage",
        )
      : null;
  const noReadyWhyMessages = useMemo(() => {
    if (!activePreview || readyCount > 0) {
      return [];
    }

    return Array.from(
      new Set(
        activePreview.rows
          .map((row) => row.statusMessage.trim())
          .filter((message) => message.length > 0),
      ),
    ).slice(0, 3);
  }, [activePreview, readyCount]);

  const canSend = canSendCampaignAdminNotificationPlan({
    previewId: search.previewId ?? null,
    readyCount,
    isPreviewPending: previewMutation.isPending,
    isSendPending: sendNotificationsMutation.isPending,
    isConsumed: isPreviewConsumed,
  });

  useEffect(() => {
    latestSearchRef.current = search;
  }, [search]);

  useEffect(() => {
    if (notificationTypes.length === 0) {
      return;
    }

    const notificationTypeIsValid =
      search.runNotificationType &&
      notificationTypes.some(
        (candidate) =>
          candidate.notificationTypeId === search.runNotificationType,
      );

    if (notificationTypeIsValid) {
      return;
    }

    onSearchChange(
      buildRunSearch(search, {
        runNotificationType: notificationTypes[0]?.notificationTypeId,
      }),
      { replace: true },
    );
  }, [
    notificationTypes,
    onSearchChange,
    search,
    search.runNotificationType,
  ]);

  useEffect(() => {
    if (runnableTemplatesQuery.data === undefined) {
      return;
    }

    if (search.runNotificationType && selectedNotificationType === null) {
      return;
    }

    const serializedConditions = serializeCampaignAdminNotificationConditions(
      conditions,
    );

    if (serializedConditions === search.runConditions) {
      return;
    }

    onSearchChange(
      buildRunSearch(search, {
        runConditions: serializedConditions,
        previewId: undefined,
        previewCursor: undefined,
        previewPageIndex: undefined,
        previewTrail: undefined,
      }),
      { replace: true },
    );
  }, [
    conditions,
    onSearchChange,
    runnableTemplatesQuery.data,
    search,
    search.runConditions,
    search.runNotificationType,
    selectedNotificationType,
  ]);

  useEffect(() => {
    setSendResult(null);
    setIsPreviewConsumed(false);
    setIsSendDialogOpen(false);
  }, [search.previewId]);

  useEffect(() => {
    if (activePreview) {
      setRestorationNotice(null);
    }
  }, [activePreview]);

  useEffect(() => {
    if (!activePreview || notificationTypes.length === 0) {
      return;
    }

    const matchedNotificationType = notificationTypes.find(
      (candidate) => candidate.backend.runnableId === activePreview.runnableId,
    );

    if (!matchedNotificationType) {
      setRestorationNotice({
        title: t`Notification type unavailable`,
        description: t`This preview no longer matches an available notification type. Choose a notification type and run preview again.`,
        shouldClearPreview: true,
      });
      onSearchChange(
        buildRunSearch(search, {
          previewId: undefined,
          previewCursor: undefined,
          previewPageIndex: undefined,
          previewTrail: undefined,
        }),
        { replace: true },
      );
      return;
    }

    if (
      matchedNotificationType.notificationTypeId !== search.runNotificationType
    ) {
      onSearchChange(
        buildRunSearch(search, {
          runNotificationType: matchedNotificationType.notificationTypeId,
        }),
        { replace: true },
      );
    }
  }, [
    activePreview,
    notificationTypes,
    onSearchChange,
    search,
    search.runNotificationType,
  ]);

  useEffect(() => {
    if (!search.previewId || !activePreviewQuery.error) {
      return;
    }

    const nextError = classifyCampaignAdminNotificationRunError(
      activePreviewQuery.error,
      "previewPage",
    );

    if (!nextError.shouldClearPreview) {
      return;
    }

    setRestorationNotice(nextError);
    onSearchChange(
      buildRunSearch(search, {
        previewId: undefined,
        previewCursor: undefined,
        previewPageIndex: undefined,
        previewTrail: undefined,
      }),
      { replace: true },
    );
  }, [activePreviewQuery.error, onSearchChange, search]);

  const clearPreviewFromSearch = (options?: { readonly replace?: boolean }) => {
    onSearchChange(
      buildRunSearch(search, {
        previewId: undefined,
        previewCursor: undefined,
        previewPageIndex: undefined,
        previewTrail: undefined,
      }),
      options,
    );
    setIsSendDialogOpen(false);
    setIsPreviewConsumed(false);
    setSendResult(null);
  };

  const updateConditions = (
    nextConditions: readonly CampaignAdminNotificationCondition[],
  ) => {
    setActionError(null);
    setRestorationNotice(null);
    setSendResult(null);
    setIsPreviewConsumed(false);

    onSearchChange(
      buildRunSearch(search, {
        runConditions:
          serializeCampaignAdminNotificationConditions(nextConditions),
        previewId: undefined,
        previewCursor: undefined,
        previewPageIndex: undefined,
        previewTrail: undefined,
      }),
      { replace: true },
    );
  };

  const handleAddCondition = () => {
    const nextCondition = createCampaignAdminNotificationCondition(
      selectedNotificationType,
    );

    if (!nextCondition) {
      return;
    }

    updateConditions([...conditions, nextCondition]);
  };

  const handleConditionChange = (
    conditionId: string,
    updater: (condition: CampaignAdminNotificationCondition) => CampaignAdminNotificationCondition,
  ) => {
    updateConditions(
      conditions.map((condition) =>
        condition.id === conditionId ? updater(condition) : condition,
      ),
    );
  };

  const handleRemoveCondition = (conditionId: string) => {
    updateConditions(
      conditions.filter((condition) => condition.id !== conditionId),
    );
  };

  const handlePreview = async () => {
    if (selectedNotificationType === null) {
      return;
    }

    const submittedSearch = latestSearchRef.current;

    setActionError(null);
    setRestorationNotice(null);
    setSendResult(null);
    setIsPreviewConsumed(false);

    try {
      const response = await previewMutation.mutateAsync({
        runnableId: selectedNotificationType.backend.runnableId,
        body: buildCampaignAdminNotificationPreviewBody({
          notificationType: selectedNotificationType,
          conditions,
        }),
      });

      queryClient.setQueryData(
        campaignAdminNotificationPlanPageQueryOptions({
          campaignKey,
          planId: response.planId,
          cursor: null,
          limit: clampPreviewPageSize(selectedNotificationType),
        }).queryKey,
        response,
      );

      const latestSearch = latestSearchRef.current;
      if (
        latestSearch.runNotificationType !== submittedSearch.runNotificationType ||
        latestSearch.runConditions !== submittedSearch.runConditions
      ) {
        return;
      }

      onSearchChange(
        buildRunSearch(latestSearch, {
          previewId: response.planId,
          previewCursor: undefined,
          previewPageIndex: undefined,
          previewTrail: undefined,
        }),
      );
    } catch (error) {
      setActionError(
        classifyCampaignAdminNotificationRunError(error, "preview"),
      );
    }
  };

  const handleNextPage = () => {
    if (activePreview?.page.nextCursor === null || activePreview === null) {
      return;
    }

    const nextPagination = getNextCampaignAdminNotificationPlanPaginationState(
      currentPreviewPagination,
      activePreview.page.nextCursor,
    );

    onSearchChange(
      buildRunSearch(search, {
        previewCursor: nextPagination.currentCursor ?? undefined,
        previewPageIndex:
          nextPagination.pageIndex === 1 ? undefined : nextPagination.pageIndex,
        previewTrail: serializeCampaignAdminNotificationPreviewTrail(
          nextPagination.previousCursors,
        ),
      }),
    );
  };

  const handlePreviousPage = () => {
    const nextPagination =
      getPreviousCampaignAdminNotificationPlanPaginationState(
        currentPreviewPagination,
      );

    if (nextPagination === null) {
      return;
    }

    onSearchChange(
      buildRunSearch(search, {
        previewCursor: nextPagination.currentCursor ?? undefined,
        previewPageIndex:
          nextPagination.pageIndex === 1 ? undefined : nextPagination.pageIndex,
        previewTrail: serializeCampaignAdminNotificationPreviewTrail(
          nextPagination.previousCursors,
        ),
      }),
    );
  };

  const handleSendNotifications = async () => {
    if (
      !search.previewId ||
      sendNotificationsMutation.isPending ||
      sendInFlightRef.current
    ) {
      return;
    }

    setActionError(null);
    sendInFlightRef.current = true;

    try {
      const response = await sendNotificationsMutation.mutateAsync({
        planId: search.previewId,
      });
      setSendResult(response);
      setIsPreviewConsumed(true);
      setIsSendDialogOpen(false);
    } catch (error) {
      const nextError = classifyCampaignAdminNotificationRunError(
        error,
        "sendNotifications",
      );
      if (nextError.shouldClearPreview) {
        clearPreviewFromSearch({ replace: true });
      }
      setActionError(nextError);
    } finally {
      sendInFlightRef.current = false;
    }
  };

  if (runnableTemplatesQuery.isLoading && runnableTemplatesQuery.data === undefined) {
    return <NotificationTypesSkeleton />;
  }

  if (runnableTemplatesQuery.error?.status === 401) {
    return (
      <Card className="max-w-xl rounded-3xl border-border/70 bg-card/80 shadow-none">
        <CardHeader>
          <CardTitle>{t`Session expired`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t`Refresh your authentication session, then reload notification types.`}
          </p>
          <AuthSignInButton>
            <Button>{t`Sign in again`}</Button>
          </AuthSignInButton>
        </CardContent>
      </Card>
    );
  }

  if (runnableTemplatesQuery.error?.status === 403) {
    return (
      <EmptyState
        icon={<LockKeyhole className="h-6 w-6" />}
        title={t`You do not have access to notifications`}
        description={t`The server denied access to this campaign-admin notification screen.`}
        className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
      />
    );
  }

  if (runnableTemplatesQuery.error?.status === 404) {
    return (
      <EmptyState
        icon={<SearchX className="h-6 w-6" />}
        title={t`Notification types unavailable`}
        description={t`This server does not expose notification types for the current campaign.`}
        className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
      />
    );
  }

  if (runnableTemplatesQuery.error) {
    return (
      <Alert variant="destructive" aria-live="polite">
        <AlertTriangle className="h-4 w-4" aria-hidden="true" />
        <AlertTitle>{t`Failed to load notification types`}</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{runnableTemplatesQuery.error.message}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              void runnableTemplatesQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t`Retry`}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (notificationTypes.length === 0) {
    return (
      <EmptyState
        title={t`No notification types available`}
        description={t`The server did not expose any notification types for this campaign.`}
        className="rounded-3xl border border-border/70 bg-card/80"
      />
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="notifications-run-title">
      <div className="space-y-1">
        <h2
          id="notifications-run-title"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          {t`Send notifications`}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t`Choose a notification type, add conditions, preview matches, then send notifications.`}
        </p>
      </div>

      <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-none">
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">{t`Notification type`}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">
                {t`Choose a notification type`}
              </Label>
              <Select
                value={selectedNotificationType?.notificationTypeId ?? ""}
                onValueChange={(value) => {
                  onSearchChange(
                    buildRunSearch(search, {
                      runNotificationType: value,
                      runConditions: undefined,
                      previewId: undefined,
                      previewCursor: undefined,
                      previewPageIndex: undefined,
                      previewTrail: undefined,
                    }),
                  );
                  setActionError(null);
                  setRestorationNotice(null);
                  setSendResult(null);
                  setIsPreviewConsumed(false);
                }}
              >
                <SelectTrigger aria-label={t`Notification type`}>
                  <SelectValue placeholder={t`Choose a notification type`} />
                </SelectTrigger>
                <SelectContent>
                  {notificationTypes.map((notificationType) => (
                    <SelectItem
                      key={notificationType.notificationTypeId}
                      value={notificationType.notificationTypeId}
                    >
                      {notificationType.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (selectedNotificationType) {
                    onPreviewTemplate(selectedNotificationType.templateId);
                  }
                }}
              >
                {t`Preview template`}
              </Button>
            </div>
          </div>

          {selectedNotificationType ? (
            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">
                  {selectedNotificationType.label}
                </p>
                <Badge variant="outline" className="rounded-full">
                  {t`Version ${selectedNotificationType.templateVersion}`}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedNotificationType.description}
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {selectedNotificationType ? (
        <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-none">
          <CardHeader className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">{t`Conditions`}</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleAddCondition}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {t`Add condition`}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>{t`All conditions must match.`}</span>
              <span aria-hidden="true">•</span>
              <span>{t`Leave empty to include all eligible matches.`}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {conditions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-background/30 p-5 text-sm text-muted-foreground">
                {t`No conditions yet. Leave it empty to include all eligible matches, or add conditions to narrow the preview.`}
              </div>
            ) : (
              <div className="space-y-3">
                {conditions.map((condition) => (
                  <NotificationConditionRow
                    key={condition.id}
                    notificationType={selectedNotificationType}
                    condition={condition}
                    onFieldChange={(fieldKey) => {
                      const nextDefinition = getCampaignAdminConditionDefinition(
                        selectedNotificationType,
                        fieldKey,
                      );

                      handleConditionChange(condition.id, () => ({
                        id: condition.id,
                        fieldKey,
                        operator: nextDefinition?.operators[0] ?? "is",
                        value: "",
                      }));
                    }}
                    onOperatorChange={(operator) => {
                      handleConditionChange(condition.id, (currentCondition) => ({
                        ...currentCondition,
                        operator,
                        value: "",
                      }));
                    }}
                    onValueChange={(value) => {
                      handleConditionChange(condition.id, (currentCondition) => ({
                        ...currentCondition,
                        value,
                      }));
                    }}
                    onRemove={() => {
                      handleRemoveCondition(condition.id);
                    }}
                  />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {t`Preview matches`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t`Check who matches and what the send result would be before sending anything.`}
                </p>
              </div>
              <Button
                type="button"
                onClick={() => {
                  void handlePreview();
                }}
                disabled={previewMutation.isPending}
              >
                {previewMutation.isPending
                  ? t`Running preview…`
                  : t`Preview matches`}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {restorationNotice ? (
        <Alert aria-live="polite">
          <Info className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{restorationNotice.title}</AlertTitle>
          <AlertDescription>{restorationNotice.description}</AlertDescription>
        </Alert>
      ) : null}

      {actionError ? (
        <Alert variant="destructive" aria-live="polite">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>{actionError.title}</AlertTitle>
          <AlertDescription>{actionError.description}</AlertDescription>
        </Alert>
      ) : null}

      {search.previewId ? (
        activePreviewQuery.isLoading && activePreview === null ? (
          <NotificationTypesSkeleton />
        ) : previewPageError && !previewPageError.shouldClearPreview ? (
          <Alert variant="destructive" aria-live="polite">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>{previewPageError.title}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{previewPageError.description}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  void activePreviewQuery.refetch();
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t`Retry`}
              </Button>
            </AlertDescription>
          </Alert>
        ) : activePreview ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">
                  {t`Preview matches`}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {t`These results show what would happen if you send notifications now.`}
                </p>
              </div>
              <CampaignAdminNotificationPlanSummary
                summary={activePreview.summary}
              />
            </div>

            <CampaignAdminNotificationPlanTable
              rows={activePreview.rows}
              activeFilter={previewFilter}
              onFilterChange={(nextFilter) => {
                onSearchChange(
                  buildRunSearch(search, {
                    previewFilter: nextFilter === "all" ? undefined : nextFilter,
                  }),
                  { replace: true },
                );
              }}
            />

            <CampaignAdminCursorPager
              pageIndex={currentPreviewPagination.pageIndex}
              pageSize={
                selectedNotificationType
                  ? clampPreviewPageSize(selectedNotificationType)
                  : 25
              }
              itemCount={activePreview.rows.length}
              canPrevious={
                currentPreviewPagination.pageIndex > 1 && !isPreviewConsumed
              }
              canNext={activePreview.page.hasMore && !isPreviewConsumed}
              isLoading={
                activePreviewQuery.isFetching || sendNotificationsMutation.isPending
              }
              onPrevious={handlePreviousPage}
              onNext={handleNextPage}
            />

            <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-none">
              <CardHeader className="space-y-1">
                <CardTitle className="text-base">
                  {t`Send notifications`}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t`Sending applies to all ready matches in this preview, not only the rows on this page.`}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                  <p className="text-sm text-foreground">
                    {readyCount > 0
                      ? t`This preview currently has ${readyCount} notifications ready to send.`
                      : t`No matching notifications are ready to send in this preview.`}
                  </p>
                  {readyCount === 0 && noReadyWhyMessages.length > 0 ? (
                    <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                      {noReadyWhyMessages.map((message) => (
                        <p key={message}>{message}</p>
                      ))}
                    </div>
                  ) : null}
                </div>

                {sendResult ? (
                  <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950">
                    <p className="font-medium">
                      {t`Notification send completed`}
                    </p>
                    <p className="mt-1">
                      {t`Queued ${sendResult.queuedCount}, already sent ${sendResult.alreadySentCount}, already pending ${sendResult.alreadyPendingCount}, not eligible ${sendResult.ineligibleCount}, missing data ${sendResult.missingDataCount}, enqueue failed ${sendResult.enqueueFailedCount}.`}
                    </p>
                    <p className="mt-2">
                      {t`This preview is now consumed. Run preview again before sending anything else.`}
                    </p>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    className="gap-2"
                    disabled={!canSend}
                    onClick={() => {
                      setIsSendDialogOpen(true);
                    }}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {formatSendButtonLabel(readyCount)}
                  </Button>
                  {!canSend ? (
                    <p className="text-sm text-muted-foreground">
                      {isPreviewConsumed
                        ? t`Run preview again to create a fresh result set before sending.`
                        : readyCount === 0
                          ? t`No notifications in this preview are ready to send.`
                          : t`Run preview first to see which notifications are ready to send.`}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null
      ) : null}

      <AlertDialog open={isSendDialogOpen} onOpenChange={setIsSendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Send notifications`}</AlertDialogTitle>
            <AlertDialogDescription>
              {readyCount === 1
                ? t`This sends 1 ready notification from the current preview, not only the rows you can see on this page.`
                : t`This sends ${readyCount} ready notifications from the current preview, not only the rows you can see on this page.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              disabled={sendNotificationsMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                void handleSendNotifications();
              }}
            >
              {sendNotificationsMutation.isPending
                ? t`Sending…`
                : formatSendButtonLabel(readyCount)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
