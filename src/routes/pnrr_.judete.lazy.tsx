import { createLazyFileRoute } from "@tanstack/react-router";
import { PnrrLivePlacesPage } from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/judete")({
  component: PnrrLivePlacesPage,
});
