import { createLazyFileRoute, useNavigate } from "@tanstack/react-router";
import {
  PnrrLiveProjectsPage,
  type PnrrProjectsRouteSearch,
} from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/proiecte")({
  component: PnrrProjectsRoute,
});

function PnrrProjectsRoute() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/pnrr/proiecte" });

  return (
    <PnrrLiveProjectsPage
      search={search as PnrrProjectsRouteSearch}
      onSearch={(next) => void navigate({ search: next })}
    />
  );
}
