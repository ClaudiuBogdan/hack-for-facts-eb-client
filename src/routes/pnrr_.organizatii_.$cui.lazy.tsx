import { createLazyFileRoute } from "@tanstack/react-router";
import { PnrrLiveOrganizationPage } from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/organizatii_/$cui")({
  component: PnrrOrganizationRoute,
});

function PnrrOrganizationRoute() {
  const { cui } = Route.useParams();
  return <PnrrLiveOrganizationPage cui={cui} />;
}
