import { createLazyFileRoute } from "@tanstack/react-router";
import { PnrrLiveProjectPage } from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/proiecte_/$projectKey")({
  component: PnrrProjectRoute,
});

function PnrrProjectRoute() {
  const { projectKey } = Route.useParams();
  return <PnrrLiveProjectPage projectKey={projectKey} />;
}
