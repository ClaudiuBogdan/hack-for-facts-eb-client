import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

export const pnrrOrganizationsSearchSchema = z.object({
  q: z.coerce.string().max(200).optional(),
  role: z
    .enum(["beneficiary", "applicant", "winner", "subcontractor"])
    .optional(),
  hub: z.enum(["public_entities", "companies"]).optional(),
  after: z.coerce.string().max(4096).optional(),
  first: z.coerce.number().int().min(1).max(100).optional(),
});

export const Route = createFileRoute("/pnrr_/organizatii")({
  ssr: false,
  validateSearch: pnrrOrganizationsSearchSchema,
  beforeLoad: () => {
    throw redirect({
      to: "/pnrr",
      search: { view: "beneficiaries" },
      replace: true,
    });
  },
  head: () => ({
    meta: [
      { title: "Organizatii PNRR — Transparenta.eu" },
      {
        name: "description",
        content:
          "Beneficiari, solicitanti si participanti la achizitii PNRR, conectati prin CUI.",
      },
    ],
  }),
});
