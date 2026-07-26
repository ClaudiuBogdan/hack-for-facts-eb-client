import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pnrr_/judete")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({
      to: "/pnrr",
      search: { view: "map" },
      replace: true,
    });
  },
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
