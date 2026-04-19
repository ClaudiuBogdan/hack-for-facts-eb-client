import { t } from "@lingui/core/macro";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AdminCampaignLayout } from "@/features/campaigns/buget/admin/components/AdminCampaignLayout";
import { CampaignAdminInstitutionThreadsSection } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsSection";
import { getCampaignAdminCampaignLabel } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";

type CampaignAdminInstitutionThreadsPageProps = {
  readonly campaignKey: CampaignAdminCampaignKey;
  readonly search: CampaignAdminInstitutionThreadsSearch;
  readonly onSearchChange: (
    search: CampaignAdminInstitutionThreadsSearch,
    options?: { readonly replace?: boolean },
  ) => void;
};

export function CampaignAdminInstitutionThreadsPage({
  campaignKey,
  search,
  onSearchChange,
}: CampaignAdminInstitutionThreadsPageProps) {
  return (
    <AdminCampaignLayout
      campaignKey={campaignKey}
      title={t`Institution Threads`}
      description={t`Inspect institution email threads, filter the operational queue, and record manual institution response events.`}
    >
      <div className="space-y-6">
        <Breadcrumb>
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
              <BreadcrumbPage>{t`Institution threads`}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <CampaignAdminInstitutionThreadsSection
          campaignKey={campaignKey}
          search={search}
          onSearchChange={onSearchChange}
        />
      </div>
    </AdminCampaignLayout>
  );
}
