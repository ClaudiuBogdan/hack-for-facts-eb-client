import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { isIsoCalendarDate } from "@/features/pnrr/lib/pnrr-route-validation";

const isoDateSchema = z.string().refine(isIsoCalendarDate, "Invalid ISO date");

export const pnrrProjectsSearchSchema = z
  .object({
    componentCode: z.coerce.string().max(32).optional(),
    beneficiaryCui: z.coerce
      .string()
      .regex(/^[0-9]{2,10}$/)
      .optional(),
    contractNumber: z.coerce.string().max(200).optional(),
    countySiruta: z.coerce
      .string()
      .regex(/^[0-9]{1,16}$/)
      .optional(),
    status: z.coerce.string().max(100).optional(),
    measureCode: z.coerce.string().max(64).optional(),
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    after: z.coerce.string().max(4096).optional(),
    first: z.coerce.number().int().min(1).max(100).optional(),
  })
  .superRefine((value, context) => {
    if (value.from && value.to && value.from > value.to) {
      context.addIssue({
        code: "custom",
        path: ["to"],
        message: "The end date must not precede the start date",
      });
    }
  });

export const Route = createFileRoute("/pnrr_/proiecte")({
  ssr: false,
  validateSearch: pnrrProjectsSearchSchema,
  beforeLoad: () => {
    throw redirect({
      to: "/pnrr",
      search: { view: "projects" },
      replace: true,
    });
  },
  errorComponent: () => (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-black">Invalid PNRR project filters</h1>
      <p className="mt-3 text-[var(--pnrr-muted)]">
        Check the dates and identifiers in this link. The end date cannot be
        earlier than the start date.
      </p>
      <Link
        to="/pnrr/proiecte"
        search={{}}
        className="mt-6 inline-block border-2 border-current px-4 py-3 font-bold"
      >
        Clear filters
      </Link>
    </main>
  ),
  head: () => ({
    meta: [
      { title: "Proiecte PNRR multi-source — Transparenta.eu" },
      {
        name: "description",
        content:
          "Proiecte si angajamente PNRR cu valori, progres, organizatii si provenienta.",
      },
    ],
  }),
});
