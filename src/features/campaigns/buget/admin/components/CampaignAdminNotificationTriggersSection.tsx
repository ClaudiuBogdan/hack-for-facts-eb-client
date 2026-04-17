import { useMemo, useState } from "react";
import { LockKeyhole, RefreshCw, SearchX } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignAdminNotificationTriggerDialog } from "@/features/campaigns/buget/admin/components/CampaignAdminNotificationTriggerDialog";
import {
  useCampaignAdminNotificationTriggersQuery,
  useExecuteCampaignAdminNotificationTriggerBulkMutation,
  useExecuteCampaignAdminNotificationTriggerMutation,
} from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationTriggerBulkExecutionBody,
  CampaignAdminNotificationTriggerBulkExecutionResponse,
  CampaignAdminNotificationTriggerDescriptor,
  CampaignAdminNotificationTriggerExecutionBody,
  CampaignAdminNotificationTriggerExecutionResponse,
  CampaignAdminNotificationTriggerMode,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminNotificationTriggersSectionProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
};

function formatTargetKind(targetKind: string): string {
  return targetKind
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function TriggerCard({
  trigger,
  onOpen,
}: {
  readonly trigger: CampaignAdminNotificationTriggerDescriptor;
  readonly onOpen: () => void;
}) {
  const supportsSingleExecution =
    trigger.capabilities?.supportsSingleExecution ?? true;
  const supportsBulkExecution =
    trigger.capabilities?.supportsBulkExecution ?? false;
  const supportsDryRun = trigger.capabilities?.supportsDryRun ?? false;

  return (
    <article className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-none">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {trigger.description}
            </h3>
            {trigger.familyId ? (
              <Badge variant="outline" className="rounded-full">
                {trigger.familyId}
              </Badge>
            ) : null}
          </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p className="font-mono">{trigger.triggerId}</p>
            <p>
              {t`Template`}{" "}
              <span className="font-mono text-foreground">{trigger.templateId}</span>
            </p>
            <p>{formatTargetKind(trigger.targetKind)}</p>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {supportsSingleExecution ? (
              <Badge variant="secondary">{t`Single`}</Badge>
            ) : null}
            {supportsBulkExecution ? (
              <Badge variant="secondary">{t`Bulk`}</Badge>
            ) : null}
            {supportsDryRun ? (
              <Badge variant="secondary">{t`Dry-run`}</Badge>
            ) : null}
            {trigger.inputFields.length > 0 ? (
              <Badge variant="outline">
                {trigger.inputFields.length === 1
                  ? t`1 input field`
                  : t`${trigger.inputFields.length} input fields`}
              </Badge>
            ) : (
              <Badge variant="outline">{t`No input fields`}</Badge>
            )}
          </div>
        </div>

        <Button type="button" variant="outline" onClick={onOpen}>
          {t`Open trigger`}
        </Button>
      </div>
    </article>
  );
}

function TriggerCardsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border/70 bg-card/80 p-5 shadow-none"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-80" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CampaignAdminNotificationTriggersSection({
  campaignKey,
}: CampaignAdminNotificationTriggersSectionProps) {
  const triggersQuery = useCampaignAdminNotificationTriggersQuery({ campaignKey });
  const executeTriggerMutation =
    useExecuteCampaignAdminNotificationTriggerMutation(campaignKey);
  const executeTriggerBulkMutation =
    useExecuteCampaignAdminNotificationTriggerBulkMutation(campaignKey);

  const [selectedTrigger, setSelectedTrigger] =
    useState<CampaignAdminNotificationTriggerDescriptor | null>(null);
  const [dialogMode, setDialogMode] =
    useState<CampaignAdminNotificationTriggerMode>("single");
  const [initialSingleBody, setInitialSingleBody] =
    useState<CampaignAdminNotificationTriggerExecutionBody>({});
  const [initialBulkBody, setInitialBulkBody] =
    useState<CampaignAdminNotificationTriggerBulkExecutionBody>({
      filters: {},
    });
  const [singleResult, setSingleResult] =
    useState<CampaignAdminNotificationTriggerExecutionResponse | null>(null);
  const [bulkResult, setBulkResult] =
    useState<CampaignAdminNotificationTriggerBulkExecutionResponse | null>(null);

  const sortedTriggers = useMemo(
    () =>
      [...(triggersQuery.data ?? [])].sort((left, right) =>
        left.description.localeCompare(right.description),
      ),
    [triggersQuery.data],
  );

  const openTrigger = (trigger: CampaignAdminNotificationTriggerDescriptor) => {
    setSelectedTrigger(trigger);
    setDialogMode(
      trigger.capabilities?.supportsSingleExecution === false ? "bulk" : "single",
    );
    setInitialSingleBody({});
    setInitialBulkBody({ filters: {} });
    setSingleResult(null);
    setBulkResult(null);
  };

  return (
    <>
      <section className="space-y-4" aria-labelledby="notifications-triggers-title">
        <div className="space-y-1">
          <h2
            id="notifications-triggers-title"
            className="text-base font-semibold tracking-tight text-foreground"
          >
            {t`Server triggers`}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t`Run server-owned notification triggers for exact event replays, including the latest admin response on a thread.`}
          </p>
        </div>

        {triggersQuery.isLoading && triggersQuery.data === undefined ? (
          <TriggerCardsSkeleton />
        ) : triggersQuery.error?.status === 403 ? (
          <EmptyState
            icon={<LockKeyhole className="h-6 w-6" />}
            title={t`You do not have access to triggers`}
            description={t`The server denied access to manual notification triggers for this campaign.`}
            className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
          />
        ) : triggersQuery.error?.status === 404 ? (
          <EmptyState
            icon={<SearchX className="h-6 w-6" />}
            title={t`Triggers unavailable`}
            description={t`This server does not expose manual notification triggers for the current campaign.`}
            className="max-w-xl rounded-3xl border border-border/70 bg-card/80"
          />
        ) : triggersQuery.error ? (
          <Alert variant="destructive" aria-live="polite">
            <AlertTitle>{t`Failed to load triggers`}</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>{triggersQuery.error.message}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => {
                  void triggersQuery.refetch();
                }}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                {t`Retry`}
              </Button>
            </AlertDescription>
          </Alert>
        ) : sortedTriggers.length === 0 ? (
          <Card className="rounded-3xl border border-border/70 bg-card/80 shadow-none">
            <CardHeader>
              <CardTitle className="text-base">
                {t`No manual triggers available`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {t`The server returned no trigger definitions for this campaign.`}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {sortedTriggers.map((trigger) => (
              <TriggerCard
                key={trigger.triggerId}
                trigger={trigger}
                onOpen={() => {
                  openTrigger(trigger);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <CampaignAdminNotificationTriggerDialog
        open={selectedTrigger !== null}
        trigger={selectedTrigger}
        mode={dialogMode}
        initialSingleBody={initialSingleBody}
        initialBulkBody={initialBulkBody}
        isSinglePending={executeTriggerMutation.isPending}
        isBulkPending={executeTriggerBulkMutation.isPending}
        singleResult={singleResult}
        bulkResult={bulkResult}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTrigger(null);
          }
        }}
        onModeChange={setDialogMode}
        onSubmitSingle={async (body) => {
          if (selectedTrigger === null) {
            return;
          }

          setInitialSingleBody(body);
          const result = await executeTriggerMutation.mutateAsync({
            triggerId: selectedTrigger.triggerId,
            body,
          });
          setSingleResult(result);
        }}
        onSubmitBulk={async (body) => {
          if (selectedTrigger === null) {
            return;
          }

          setInitialBulkBody(body);
          const result = await executeTriggerBulkMutation.mutateAsync({
            triggerId: selectedTrigger.triggerId,
            body,
          });
          setBulkResult(result);
        }}
      />
    </>
  );
}
