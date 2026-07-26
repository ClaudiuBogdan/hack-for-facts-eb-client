import { createLazyFileRoute } from "@tanstack/react-router";
import { PnrrLiveVerificationPage } from "@/features/pnrr/components/live/PnrrLivePages";

export const Route = createLazyFileRoute("/pnrr_/verificare")({
  component: PnrrLiveVerificationPage,
});
