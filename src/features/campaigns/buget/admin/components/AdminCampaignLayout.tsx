import { ShieldCheck } from "lucide-react";
import { t } from "@lingui/core/macro";
import { Badge } from "@/components/ui/badge";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import type { CampaignAdminCampaignKey } from "@/features/campaigns/buget/admin/types";

type AdminCampaignLayoutProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly title: string;
  readonly description: string;
  readonly children: React.ReactNode;
};

export function AdminCampaignLayout({
  campaignKey,
  title,
  description,
  children,
}: AdminCampaignLayoutProps) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
      <header className="rounded-3xl border border-border/70 bg-card/80 px-6 py-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {t`Campaign admin`}
            </Badge>
            <Badge variant="outline">
              {getCampaignAdminCampaignLabel(campaignKey)}
            </Badge>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold tracking-tight text-foreground text-pretty sm:text-2xl">
              {title}
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground text-pretty">
              {description}
            </p>
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
