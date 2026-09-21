import { createFileRoute } from "@tanstack/react-router";
import {
  fetchRegistryPage,
  parseRegistrySearch,
} from "@/features/ngos/registry/api";
import {
  NgoRegistryPage,
  RegistryLoading,
  RegistryUnavailable,
} from "@/features/ngos/registry/registry-page";

export const Route = createFileRoute("/ong-uri/registru/")({
  validateSearch: parseRegistrySearch,
  loaderDeps: ({ search }) => search,
  loader: ({ deps, abortController }) =>
    fetchRegistryPage(deps, abortController.signal),
  component: RegistryRoute,
  pendingComponent: RegistryLoading,
  errorComponent: RegistryUnavailable,
  head: () => ({
    meta: [
      { title: "Registrul ONG — Transparenta.eu" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
});
function RegistryRoute() {
  return (
    <NgoRegistryPage page={Route.useLoaderData()} search={Route.useSearch()} />
  );
}
