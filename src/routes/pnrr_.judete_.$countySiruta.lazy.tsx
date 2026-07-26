import { createLazyFileRoute } from "@tanstack/react-router";
import { PnrrLiveCountyPage } from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/judete_/$countySiruta")({
  component: PnrrCountyRoute,
});

function PnrrCountyRoute() {
  const { countySiruta } = Route.useParams();
  return <PnrrLiveCountyPage countySiruta={countySiruta} />;
}
