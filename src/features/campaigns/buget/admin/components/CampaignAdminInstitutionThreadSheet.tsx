import { type ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { CampaignAdminInstitutionThreadDetailContent } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadDetailContent";
import type {
  CampaignAdminAppendInstitutionThreadResponseBody,
  CampaignAdminAppendInstitutionThreadResponseResult,
  CampaignAdminInstitutionThreadDetail,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadSheetProps = {
  readonly open: boolean;
  readonly thread: CampaignAdminInstitutionThreadDetail | null;
  readonly isLoading: boolean;
  readonly errorMessage?: string | null;
  readonly submitErrorMessage?: string | null;
  readonly isSubmitting: boolean;
  readonly headerAction?: ReactNode;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmitResponse: (
    body: CampaignAdminAppendInstitutionThreadResponseBody,
  ) =>
    | Promise<CampaignAdminAppendInstitutionThreadResponseResult | void>
    | CampaignAdminAppendInstitutionThreadResponseResult
    | void;
};

export function CampaignAdminInstitutionThreadSheet({
  open,
  thread,
  isLoading,
  errorMessage,
  submitErrorMessage,
  isSubmitting,
  headerAction,
  onOpenChange,
  onSubmitResponse,
}: CampaignAdminInstitutionThreadSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
        <SheetHeader className="space-y-2 border-b border-border/60 pb-4">
          <SheetTitle>{thread?.institutionEmail ?? t`Institution thread`}</SheetTitle>
          <SheetDescription>
            {thread
              ? t`Inspect the full correspondence history and record a manual institution response from the same entity workflow.`
              : t`Load a thread to inspect full correspondence history.`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : errorMessage ? (
            <Alert variant="destructive">
              <AlertTitle>{t`Failed to load institution thread`}</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : thread === null ? (
            <Alert>
              <AlertTitle>{t`No thread selected`}</AlertTitle>
              <AlertDescription>
                {t`Select a thread from the list to inspect the full detail drawer.`}
              </AlertDescription>
            </Alert>
          ) : (
            <CampaignAdminInstitutionThreadDetailContent
              detail={thread}
              isSubmitting={isSubmitting}
              submitErrorMessage={submitErrorMessage}
              onSubmitResponse={onSubmitResponse}
              headerAction={headerAction}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
