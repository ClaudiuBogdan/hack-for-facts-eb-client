import { createFileRoute, notFound } from "@tanstack/react-router";

export const Route = createFileRoute("/pnrr_/judete_/$countySiruta")({
  ssr: false,
  beforeLoad: ({ params }) => {
    if (!/^[0-9]{1,16}$/.test(params.countySiruta)) {
      throw notFound();
    }
  },
  head: ({ params }) => ({
    meta: [
      {
        title: `Judet PNRR ${params.countySiruta} — Transparenta.eu`,
      },
    ],
  }),
});
