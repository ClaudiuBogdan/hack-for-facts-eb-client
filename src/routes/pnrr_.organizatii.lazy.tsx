import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import {
  PnrrLiveOrganizationsPage,
  type PnrrOrganizationsRouteSearch,
} from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/organizatii")({
  component: PnrrOrganizationsRoute,
});

function PnrrOrganizationsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/pnrr/organizatii" });

  return (
    <PnrrLiveOrganizationsPage
      search={search as PnrrOrganizationsRouteSearch}
      onSearch={(next) => void navigate({ search: next })}
    />
  );
}
