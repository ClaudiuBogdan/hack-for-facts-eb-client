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
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground text-pretty sm:text-2xl">
              {title}
            </h1>
            <Badge variant="outline">
              {getCampaignAdminCampaignLabel(campaignKey)}
            </Badge>
          </div>
          <p className="max-w-3xl text-sm text-muted-foreground text-pretty">
            {description}
          </p>
        </div>
      </header>

      {children}
    </div>
  );
}
