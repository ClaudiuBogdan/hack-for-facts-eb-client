import { z } from "zod";
import { graphqlQuery } from "@/lib/graphql/graphql-client";
import { recordFields, recordSchema } from "../registry/api";

export const ngoProfileOverviewSchema = z.object({
  cui: z.string().regex(/^[1-9][0-9]{1,9}$/),
  identityBasis: z.literal("accepted_rnong_cui"),
  registryRecords: z.array(recordSchema).nonempty(),
  fiscal: z.discriminatedUnion("availability", [
    z.object({ availability: z.literal("unavailable"), data: z.null() }),
    z.object({
      availability: z.literal("available"),
      data: z.object({
        vatPayer: z.boolean().nullable(),
        declaredFiscallyInactive: z.boolean().nullable(),
        splitVat: z.boolean().nullable(),
        mainCaenCode: z.string().nullable(),
        mainCaenRev: z.string().nullable(),
        queryDate: z.string().nullable(),
        capturedAt: z.string().nullable(),
        sourceUrl: z.string().url().startsWith("https://"),
        sourceSnapshotId: z.string(),
      }),
    }),
  ]),
  sections: z.array(
    z.object({
      key: z.enum(["financials", "services", "accreditations", "funding"]),
      availability: z.literal("not_released"),
    }),
  ),
});
export type NgoProfileOverview = z.infer<typeof ngoProfileOverviewSchema>;
export const NGO_PROFILE_OVERVIEW_QUERY = `query NgoProfileOverview($cui: CUI!) {
  ngoProfileOverview(cui: $cui) { cui identityBasis registryRecords { ${recordFields} }
    fiscal { availability data { vatPayer declaredFiscallyInactive splitVat mainCaenCode mainCaenRev queryDate capturedAt sourceUrl sourceSnapshotId } }
    sections { key availability }
  }
}`;
/** Always live, independently of the legacy NGO mock dispatcher. */
export async function fetchNgoProfileOverview(
  cui: string,
): Promise<NgoProfileOverview | null> {
  const data = await graphqlQuery<unknown>(
    NGO_PROFILE_OVERVIEW_QUERY,
    { cui },
    { operationName: "NgoProfileOverview", auth: "none" },
  );
  return z
    .object({ ngoProfileOverview: ngoProfileOverviewSchema.nullable() })
    .parse(data).ngoProfileOverview;
}
