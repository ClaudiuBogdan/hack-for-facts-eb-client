import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaignAdminNotificationTemplatePreviewQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationFieldDescriptor,
  CampaignAdminNotificationTemplateDescriptor,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminTemplatePreviewDialogProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly open: boolean;
  readonly template: CampaignAdminNotificationTemplateDescriptor | null;
  readonly onOpenChange: (open: boolean) => void;
};

function FieldTypeBadges({ type }: { readonly type: string }) {
  const parts = type
    .split("|")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
        {parts[0]}
      </code>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      {parts.map((part, index) => (
        <span key={part} className="inline-flex items-center gap-1">
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-foreground">
            {part}
          </code>
          {index < parts.length - 1 ? (
            <span className="text-muted-foreground">|</span>
          ) : null}
        </span>
      ))}
    </span>
  );
}

function RequiredFieldsTable({
  fields,
}: {
  readonly fields: readonly CampaignAdminNotificationFieldDescriptor[];
}) {
  if (fields.length === 0) {
    return (
      <p className="py-3 text-center text-xs text-muted-foreground">
        {t`No required fields.`}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border/50">
      {fields.map((field) => (
        <div
          key={field.name}
          className="flex items-center justify-between gap-3 px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-2">
            <code className="truncate font-mono text-xs font-medium text-foreground">
              {field.name}
            </code>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <FieldTypeBadges type={field.type} />
            {field.required ? (
              <Badge
                variant="outline"
                className="h-5 rounded px-1.5 text-[10px]"
              >
                {t`Required`}
              </Badge>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewLoadingState() {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="flex-1 rounded-xl" />
      </div>
      <Separator orientation="vertical" />
      <div className="w-72 shrink-0 space-y-4 overflow-y-auto p-6">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}

export function CampaignAdminTemplatePreviewDialog({
  campaignKey,
  open,
  template,
  onOpenChange,
}: CampaignAdminTemplatePreviewDialogProps) {
  const [previewTab, setPreviewTab] = useState("html");

  useEffect(() => {
    setPreviewTab("html");
  }, [template?.templateId]);

  const previewQuery = useCampaignAdminNotificationTemplatePreviewQuery({
    campaignKey,
    templateId: template?.templateId ?? null,
    enabled: open && template !== null,
  });

  const preview = previewQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl overflow-hidden p-0 sm:max-h-[90vh]">
        <div className="flex min-h-[70vh] flex-col">
          <DialogHeader className="border-b border-border/70 px-6 py-4 text-left">
            <DialogTitle className="text-base">
              {template?.name ?? t`Template preview`}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {template ? (
                <>
                  <code className="font-mono text-xs">{template.templateId}</code>
                  <Separator orientation="vertical" className="h-3" />
                  <Badge
                    variant="secondary"
                    className="font-mono text-[10px]"
                  >
                    {t`v${template.version}`}
                  </Badge>
                </>
              ) : (
                t`Preview a campaign notification template in isolation.`
              )}
            </DialogDescription>
          </DialogHeader>

          {previewQuery.isLoading ? (
            <PreviewLoadingState />
          ) : previewQuery.error ? (
            <div className="p-6">
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                <AlertTitle>{t`Failed to load template preview`}</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{previewQuery.error.message}</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      void previewQuery.refetch();
                    }}
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t`Retry`}
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : preview ? (
            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                <div className="mb-4 rounded-lg border border-border/70 bg-muted/40 px-4 py-2.5">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {t`Subject`}
                  </p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {preview.exampleSubject}
                  </p>
                </div>

                <Tabs
                  value={previewTab}
                  onValueChange={setPreviewTab}
                  className="flex min-h-0 flex-1 flex-col overflow-hidden"
                >
                  <TabsList className="w-full justify-start rounded-lg">
                    <TabsTrigger value="html">{t`HTML`}</TabsTrigger>
                    <TabsTrigger value="text">{t`Plain Text`}</TabsTrigger>
                  </TabsList>

                  <div className="relative min-h-[30rem] flex-1 rounded-xl border border-border/70">
                    {previewTab === "html" ? (
                      <iframe
                        title={`${preview.name} HTML preview`}
                        srcDoc={preview.html}
                        sandbox=""
                        className="absolute inset-x-0 top-0 h-full w-full bg-white"
                      />
                    ) : (
                      <div className="absolute inset-0 overflow-auto bg-card/80">
                        <pre className="whitespace-pre-wrap break-words p-4 text-sm text-foreground">
                          {preview.text}
                        </pre>
                      </div>
                    )}
                  </div>
                </Tabs>
              </div>

              <Separator orientation="vertical" />

              <aside className="w-72 shrink-0 overflow-y-auto">
                <div className="space-y-1 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    {t`Required fields`}
                  </p>
                </div>
                <RequiredFieldsTable fields={preview.requiredFields} />
              </aside>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
