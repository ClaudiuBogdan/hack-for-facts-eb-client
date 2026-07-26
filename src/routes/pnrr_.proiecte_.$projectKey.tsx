import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/pnrr_/proiecte_/$projectKey")({
  ssr: false,
  beforeLoad: ({ params }) => {
    if (params.projectKey.length < 1 || params.projectKey.length > 512) {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `Proiect PNRR ${params.projectKey} — Transparenta.eu`,
      },
    ],
  }),
});
