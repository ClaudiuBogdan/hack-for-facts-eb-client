import { createLazyFileRoute } from "@tanstack/react-router";
import {
  NgoLiveProfilePage,
  NgoLiveProfileNotFound,
  NgoLiveProfileUnavailable,
} from "@/features/ngos/profile/profile-page";
export const Route = createLazyFileRoute("/ngos/$cui")({
  component: NgoProfileRoutePage,
  notFoundComponent: NgoLiveProfileNotFound,
  errorComponent: NgoLiveProfileUnavailable,
});
function NgoProfileRoutePage() {
  const { profile } = Route.useLoaderData();
  return <NgoLiveProfilePage profile={profile} />;
}
