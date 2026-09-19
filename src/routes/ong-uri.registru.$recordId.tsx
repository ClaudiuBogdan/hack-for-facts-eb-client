import { createFileRoute, notFound } from "@tanstack/react-router";
import { fetchRegistryRecord } from "@/features/ngos/registry/api";
import {
  NgoRegistryDetail,
  RegistryLoading,
  RegistryNotFound,
  RegistryUnavailable,
} from "@/features/ngos/registry/registry-page";

export const Route = createFileRoute("/ong-uri/registru/$recordId")({
  loader: async ({ params, abortController }) => {
    const record = await fetchRegistryRecord(
      params.recordId,
      abortController.signal,
    );
    if (record === null) throw notFound();
    return record;
  },
  component: RegistryDetailRoute,
  pendingComponent: RegistryLoading,
  errorComponent: RegistryUnavailable,
  notFoundComponent: RegistryNotFound,
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Registrul ONG"} — Transparenta.eu` },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
});
function RegistryDetailRoute() {
  return <NgoRegistryDetail record={Route.useLoaderData()} />;
}
