import { Badge } from "@/components/ui/badge";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";

type AdminCampaignLayoutProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly title: string | React.ReactNode;
  readonly description?: string;
  readonly eyebrow?: React.ReactNode;
  readonly actions?: React.ReactNode;
  readonly details?: React.ReactNode;
  readonly children: React.ReactNode;
};

export function AdminCampaignLayout({
  campaignKey,
  title,
  description,
  eyebrow,
  actions,
  details,
  children,
}: AdminCampaignLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="space-y-4 border-b border-border/70 pb-4" role="banner">
        {eyebrow ? <div>{eyebrow}</div> : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              {typeof title === "string" ? (
                <h1 className="text-xl font-semibold tracking-tight text-foreground text-pretty sm:text-2xl">
                  {title}
                </h1>
              ) : (
                title
              )}
              <Badge variant="outline" className="rounded-full">
                {getCampaignAdminCampaignLabel(campaignKey)}
              </Badge>
            </div>
            {description ? (
              <p className="max-w-3xl text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            ) : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
        {details ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {details}
          </div>
        ) : null}
      </header>

      {children}
    </div>
  );
}
