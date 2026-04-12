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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useCampaignAdminNotificationTemplatePreviewQuery } from "@/features/campaigns/buget/admin/hooks/use-campaign-admin-notifications";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminNotificationTemplateDescriptor,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminTemplatePreviewDialogProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly open: boolean;
  readonly template: CampaignAdminNotificationTemplateDescriptor | null;
  readonly onOpenChange: (open: boolean) => void;
};

export function CampaignAdminTemplatePreviewDialog({
  campaignKey,
  open,
  template,
  onOpenChange,
}: CampaignAdminTemplatePreviewDialogProps) {
  const previewQuery = useCampaignAdminNotificationTemplatePreviewQuery({
    campaignKey,
    templateId: template?.templateId ?? null,
    enabled: open && template !== null,
  });

  const preview = previewQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl overflow-hidden p-0 sm:max-h-[90vh]">
        <div className="flex h-full flex-col">
          <DialogHeader className="border-b border-border/70 px-6 py-5 text-left">
            <DialogTitle>{template?.name ?? t`Template preview`}</DialogTitle>
            <DialogDescription>
              {template
                ? t`${template.templateId} · version ${template.version}`
                : t`Preview a campaign notification template in isolation.`}
            </DialogDescription>
          </DialogHeader>

          {previewQuery.isLoading ? (
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-[28rem] w-full rounded-2xl" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
            </div>
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
            <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
              <div className="space-y-4 overflow-hidden">
                <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                    {t`Subject`}
                  </p>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {preview.exampleSubject}
                  </p>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
                  <div className="border-b border-border/60 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {t`HTML preview`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t`Rendered in an isolated iframe using preview-safe example props.`}
                    </p>
                  </div>
                  <iframe
                    title={`${preview.name} HTML preview`}
                    srcDoc={preview.html}
                    sandbox=""
                    className="min-h-[30rem] w-full bg-white"
                  />
                </div>
              </div>

              <div className="grid min-h-0 gap-4 overflow-hidden">
                <div className="rounded-2xl border border-border/70 bg-card/80 p-4">
                  <p className="text-sm font-medium text-foreground">
                    {preview.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {preview.templateId}
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      {t`Version ${preview.version}`}
                    </Badge>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
                  <div className="border-b border-border/60 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {t`Required fields`}
                    </p>
                  </div>
                  <ScrollArea className="max-h-48">
                    <div className="space-y-3 p-4">
                      {preview.requiredFields.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {t`No required fields.`}
                        </p>
                      ) : (
                        preview.requiredFields.map((field) => (
                          <div
                            key={field.name}
                            className="rounded-xl border border-border/60 bg-background/40 p-3"
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-mono text-sm text-foreground">
                                {field.name}
                              </p>
                              <Badge variant="outline" className="rounded-full">
                                {field.type}
                              </Badge>
                              {field.required ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full"
                                >
                                  {t`Required`}
                                </Badge>
                              ) : (
                                <Badge
                                  variant="outline"
                                  className="rounded-full"
                                >
                                  {t`Optional`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>

                <div className="min-h-0 overflow-hidden rounded-2xl border border-border/70 bg-card/80">
                  <div className="border-b border-border/60 px-4 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {t`Text preview`}
                    </p>
                  </div>
                  <ScrollArea className="max-h-[24rem]">
                    <pre className="whitespace-pre-wrap break-words p-4 text-sm text-foreground">
                      {preview.text}
                    </pre>
                  </ScrollArea>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
