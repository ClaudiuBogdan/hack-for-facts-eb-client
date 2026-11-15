import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/pnrr_/judete")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Judete PNRR — Transparenta.eu" },
      {
        name: "description",
        content:
          "Date PNRR pe judete, separate dupa rolul geografic al fiecarei surse.",
      },
    ],
  }),
});
