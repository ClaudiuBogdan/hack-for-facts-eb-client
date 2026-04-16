/* eslint-disable react-refresh/only-export-components */
import {
  createLazyFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { CampaignAdminInstitutionThreadsPage } from "@/features/campaigns/buget/admin/components/CampaignAdminInstitutionThreadsPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminInstitutionThreadsSearch,
} from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute(
  "/admin/campaigns/$campaignKey/institution-threads",
)({
  component: CampaignAdminInstitutionThreadsRoute,
});

function CampaignAdminInstitutionThreadsRoute() {
  const { campaignKey: rawCampaignKey } = Route.useParams() as {
    campaignKey: string;
  };
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);
  const search = Route.useSearch() as CampaignAdminInstitutionThreadsSearch;
  const location = useLocation();
  const navigate = useNavigate({
    from: "/admin/campaigns/$campaignKey/institution-threads",
  });
  const basePath = `/admin/campaigns/${campaignKey}/institution-threads`;
  const isIndexRoute =
    location.pathname === basePath || location.pathname === `${basePath}/`;

  if (!isIndexRoute) {
    return <Outlet />;
  }

  return (
    <CampaignAdminInstitutionThreadsPage
      key={campaignKey}
      campaignKey={campaignKey}
      search={search}
      onSearchChange={(nextSearch, options) => {
        void navigate({
          search:
            toCampaignAdminInstitutionThreadsRouteSearch(nextSearch),
          replace: options?.replace,
        });
      }}
    />
  );
}

function resolveCampaignAdminCampaignKey(
  campaignKey: string,
): CampaignAdminCampaignKey {
  if (campaignKey !== FUNKY_CAMPAIGN_KEY) {
    throw new Error(`Unsupported campaign admin key: ${campaignKey}`);
  }

  return campaignKey;
}

function toCampaignAdminInstitutionThreadsRouteSearch(
  search: CampaignAdminInstitutionThreadsSearch,
) {
  return {
    stateGroup: search.stateGroup,
    threadState: search.threadState,
    responseStatus: search.responseStatus,
    query: search.query,
    entityCui: search.entityCui,
    updatedAtFrom: search.updatedAtFrom,
    updatedAtTo: search.updatedAtTo,
    latestResponseAtFrom: search.latestResponseAtFrom,
    latestResponseAtTo: search.latestResponseAtTo,
    selectedThreadId: search.selectedThreadId,
    cursor: search.cursor,
    pageIndex: search.pageIndex,
    limit: search.limit,
  };
}
