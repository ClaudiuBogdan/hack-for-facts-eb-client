import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { normalizePnrrCui } from "@/features/pnrr/lib/pnrr-route-validation";

export const Route = createFileRoute("/pnrr_/organizatii_/$cui")({
  ssr: false,
  beforeLoad: ({ params }) => {
    const cui = normalizePnrrCui(params.cui);
    if (cui === null) throw notFound();
    if (cui && cui !== params.cui) {
      throw redirect({
        to: "/pnrr/organizatii/$cui",
        params: { cui },
        replace: true,
      });
    }
  },
  head: ({ params }) => ({
    meta: [{ title: `Organizatie PNRR ${params.cui} — Transparenta.eu` }],
  }),
});
