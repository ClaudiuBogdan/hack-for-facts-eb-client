import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pnrr_/surse")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({
      to: "/pnrr",
      search: { view: "overview" },
      replace: true,
    });
  },
  head: () => ({
    meta: [
      { title: "Surse PNRR — Transparenta.eu" },
      {
        name: "description",
        content:
          "Prospetimea, limitarile si capacitatile surselor folosite in explorerul PNRR.",
      },
    ],
  }),
});
