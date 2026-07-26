import { createLazyFileRoute } from "@tanstack/react-router";
import { PnrrLiveSourcesPage } from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/surse")({
  component: PnrrLiveSourcesPage,
});
