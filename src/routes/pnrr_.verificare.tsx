import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/pnrr_/verificare")({
  ssr: false,
  beforeLoad: () => {
    throw redirect({
      to: "/pnrr",
      search: { view: "anomalies" },
      replace: true,
    });
  },
  head: () => ({
    meta: [
      { title: "Verificare date PNRR — Transparenta.eu" },
      {
        name: "description",
        content:
          "Semnale deterministe de calitate, acoperire si legaturi lipsa in datele PNRR.",
      },
    ],
  }),
});
