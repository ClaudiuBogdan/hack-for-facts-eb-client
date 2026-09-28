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

// ────────────────────────────────────────────────────── records around ──

const AROUND_FIELDS = 'id uniqueCode title valueRon status publicationDate finalizationDate value { valueAccepted valueRonComparable }'

/**
 * The records between the same two, newer and older than this one's day
 * (the list filters by publication date), and how many there are in all.
 */
export const DIRECT_PURCHASE_AROUND_QUERY = /* GraphQL */ `
  query ProcurementDirectPurchaseAround($all: ProcurementDirectAcquisitionsFilter!, $newer: ProcurementDirectAcquisitionsFilter!, $older: ProcurementDirectAcquisitionsFilter!, $perSide: Int!) {
    all: procurementDirectAcquisitions(filter: $all, sort: date_desc, pageSize: 1) { total totalEstimated items { id } }
    newer: procurementDirectAcquisitions(filter: $newer, sort: date_asc, pageSize: $perSide) { items { ${AROUND_FIELDS} } }
    older: procurementDirectAcquisitions(filter: $older, sort: date_desc, pageSize: $perSide) { items { ${AROUND_FIELDS} } }
  }
`

const aroundItemSchema = z.object({
  id: z.string(),
  uniqueCode: z.string().nullable(),
  title: z.string().nullable(),
  valueRon: z.string().nullable(),
  status: z.string(),
  publicationDate: z.string().nullable(),
  finalizationDate: z.string().nullable(),
  value: z.object({ valueAccepted: z.boolean(), valueRonComparable: z.string().nullable() }).nullable(),
})

export const directPurchaseAroundSchema = z.object({
  all: z.object({ total: z.number().nullable(), totalEstimated: z.boolean() }),
  newer: z.object({ items: z.array(aroundItemSchema) }),
  older: z.object({ items: z.array(aroundItemSchema) }),
})

export type RawDirectPurchaseAround = z.infer<typeof directPurchaseAroundSchema>
export type RawAroundItem = z.infer<typeof aroundItemSchema>
