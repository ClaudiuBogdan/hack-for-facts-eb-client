/**
 * GraphQL documents + raw-response Zod schemas for one direct purchase's
 * page (`/procurement/direct-acquisitions/$id`), beyond the record itself
 * (`PROCUREMENT_DA_DETAIL_QUERY`): the names (the spine's labels, the budget
 * platform's record of the institution, the CPV labels) and the records
 * around this one between the same two. The context's analysis reads are
 * the buyer page's shapes (`procurement-buyer-queries.ts`).
 */
import { z } from 'zod'
import { buyerEntitySchema, buyerLabelsSchema } from './procurement-buyer-queries'

// ─────────────────────────────────────────────────────────────── names ──

/** The spine's labels for both parties, the budget platform's record of the institution, the CPV codes' labels. */
export const DIRECT_PURCHASE_NAMES_QUERY = /* GraphQL */ `
  query ProcurementDirectPurchaseNames($cuis: [String!]!, $codes: [String!]!, $entityCui: CUI!, $withEntity: Boolean!) {
    labels: organizationLabels(cuis: $cuis) { cui canonicalName status }
    entity(cui: $entityCui) @include(if: $withEntity) {
      organization { name }
      territory { kind name countyCode countyName }
      reference { name address entityType isTerritorialExecutive }
      budget { presence }
    }
    cpv: procurementCpvCodes(codes: $codes) { cpvCode labelRo labelEn }
  }
`

export const directPurchaseNamesSchema = z.object({
  labels: buyerLabelsSchema,
  entity: buyerEntitySchema.optional(),
  cpv: z.array(z.object({ cpvCode: z.string(), labelRo: z.string().nullable(), labelEn: z.string().nullable() })),
})

export type RawDirectPurchaseNames = z.infer<typeof directPurchaseNamesSchema>
