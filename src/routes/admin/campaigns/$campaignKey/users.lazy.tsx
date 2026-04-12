import {
  createLazyFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { CampaignAdminUsersSectionPage } from "@/features/campaigns/buget/admin/components/CampaignAdminUsersSectionPage";
import { FUNKY_CAMPAIGN_KEY } from "@/features/campaigns/buget/admin/constants";
import type {
  CampaignAdminCampaignKey,
  CampaignAdminUsersSearch,
} from "@/features/campaigns/buget/admin/types";

export const Route = createLazyFileRoute("/admin/campaigns/$campaignKey/users")({
  component: CampaignAdminUsersSectionRoute,
});

function CampaignAdminUsersSectionRoute() {
  const { campaignKey: rawCampaignKey } = Route.useParams();
  const search = Route.useSearch();
  const campaignKey = resolveCampaignAdminCampaignKey(rawCampaignKey);
  const location = useLocation();
  const navigate = useNavigate({
    from: "/admin/campaigns/$campaignKey/users",
  });

  const usersBasePath = `/admin/campaigns/${campaignKey}/users`;
  const isUsersIndexRoute =
    location.pathname === usersBasePath ||
    location.pathname === `${usersBasePath}/`;

  if (!isUsersIndexRoute) {
    return <Outlet />;
  }

  return (
    <CampaignAdminUsersSectionPage
      key={campaignKey}
      campaignKey={campaignKey}
      search={search}
      onSearchChange={(nextSearch, options) => {
        void navigate({
          search: toCampaignAdminUsersRouteSearch(nextSearch),
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

function toCampaignAdminUsersRouteSearch(search: CampaignAdminUsersSearch) {
  return {
    query: search.query,
    entityCui: search.entityCui,
    sortBy: search.sortBy,
    sortOrder: search.sortOrder,
    cursor: search.cursor,
    pageIndex: search.pageIndex,
    limit: search.limit,
  };
}
