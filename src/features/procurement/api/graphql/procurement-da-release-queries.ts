/**
 * GraphQL documents + raw-response Zod schemas for direct acquisitions,
 * release 1 — the API's `procurementDa*` surface beside the legacy
 * `procurementDirectAcquisition*` one (server
 * `docs/server-redesign/10-public-contracts-da-release-1.md`; field meanings:
 * the data platform's direct-acquisition serving contract).
 *
 * The capability (`procurementDaRelease.enabled`) chooses the path; with it
 * off, every data query answers `SERVICE_UNAVAILABLE`. Money is decimal text
 * in lei excluding VAT; counts in totals are integers as text.
 */
import { z } from 'zod'

// ─────────────────────────────────────────────────────────── capability ──

export const PROCUREMENT_DA_RELEASE_QUERY = /* GraphQL */ `
  query ProcurementDaRelease {
    procurementDaRelease { enabled dataAsOf }
  }
`

export const procurementDaReleaseSchema = z.object({
  procurementDaRelease: z.object({ enabled: z.boolean(), dataAsOf: z.string().nullable() }),
})

// ───────────────────────────────────────────────────────────── purchase ──

const PARTY_FIELDS = 'displayKind partyId name fiscalCode'

export const rawDaPartySchema = z.object({
  displayKind: z.string(),
  partyId: z.string().nullable(),
  name: z.string().nullable(),
  fiscalCode: z.string().nullable(),
})
export type RawDaParty = z.infer<typeof rawDaPartySchema>

const PURCHASE_FIELDS = /* GraphQL */ `
  purchaseId nativeId code sourceUrl outcome stateLabel
  publicationDay finalizationDay buyerDecisionAt supplierDecisionAt
  reportedValue counted countedValue
  notCountedReason { code labelEn labelRo }
  valueCorrected correctedValue
  reviewRule { rule effect descriptionEn descriptionRo }
  symbolicPrice listedNow
  title description categoryCode categoryLabel cpvDivision acquisitionTypeLabel
  buyer { ${PARTY_FIELDS} }
  supplier { ${PARTY_FIELDS} }
`

export const rawDaPurchaseSchema = z.object({
  purchaseId: z.string(),
  nativeId: z.string().nullable(),
  code: z.string().nullable(),
  sourceUrl: z.string().nullable(),
  outcome: z.string(),
  stateLabel: z.string().nullable(),
  publicationDay: z.string().nullable(),
  finalizationDay: z.string().nullable(),
  buyerDecisionAt: z.string().nullable(),
  supplierDecisionAt: z.string().nullable(),
  reportedValue: z.string().nullable(),
  counted: z.boolean(),
  countedValue: z.string().nullable(),
  notCountedReason: z.object({ code: z.string(), labelEn: z.string(), labelRo: z.string() }).nullable(),
  valueCorrected: z.boolean(),
  correctedValue: z.string().nullable(),
  reviewRule: z.object({ rule: z.string(), effect: z.string(), descriptionEn: z.string().nullable(), descriptionRo: z.string().nullable() }).nullable(),
  symbolicPrice: z.boolean(),
  listedNow: z.boolean().nullable(),
  title: z.string().nullable(),
  description: z.string().nullable(),
  categoryCode: z.string().nullable(),
  categoryLabel: z.string().nullable(),
  cpvDivision: z.string().nullable(),
  acquisitionTypeLabel: z.string().nullable(),
  buyer: rawDaPartySchema.nullable(),
  supplier: rawDaPartySchema.nullable(),
})
export type RawDaPurchase = z.infer<typeof rawDaPurchaseSchema>

export const rawDaPurchaseItemSchema = z.object({
  itemIndex: z.number(),
  name: z.string().nullable(),
  unit: z.string().nullable(),
  quantity: z.string().nullable(),
  requestedQuantity: z.string().nullable(),
  unitPrice: z.string().nullable(),
  cataloguePrice: z.string().nullable(),
  reportedLineValue: z.string().nullable(),
  supplierRejected: z.boolean().nullable(),
  quantityCorrection: z.boolean().nullable(),
})
export type RawDaPurchaseItem = z.infer<typeof rawDaPurchaseItemSchema>

export const PROCUREMENT_DA_PURCHASE_QUERY = /* GraphQL */ `
  query ProcurementDaPurchase($purchaseId: ID!) {
    procurementDaPurchase(purchaseId: $purchaseId) {
      purchase { ${PURCHASE_FIELDS} }
      items {
        itemIndex name unit quantity requestedQuantity unitPrice cataloguePrice
        reportedLineValue supplierRejected quantityCorrection
      }
      dataAsOf
      valueBasis
    }
  }
`

export const procurementDaPurchaseSchema = z.object({
  procurementDaPurchase: z.object({
    purchase: rawDaPurchaseSchema,
    items: z.array(rawDaPurchaseItemSchema),
    dataAsOf: z.string(),
    valueBasis: z.string(),
  }),
})
export type RawDaPurchaseDetail = z.infer<typeof procurementDaPurchaseSchema>['procurementDaPurchase']

// ───────────────────────────────────────────────────────────────── list ──

/** The list's filter, as the API takes it (AND; days bound `finalizationDay`, inclusive). */
export interface DaPurchaseFilter {
  readonly buyerFiscalCode?: string
  readonly supplierFiscalCode?: string
  readonly cpvDivision?: string
  readonly finalizationFrom?: string
  readonly finalizationTo?: string
  readonly outcomes?: readonly string[]
  readonly counted?: boolean
  readonly code?: string
  readonly nativeId?: string
}

export const PROCUREMENT_DA_PURCHASES_QUERY = /* GraphQL */ `
  query ProcurementDaPurchases($filter: ProcurementDaPurchaseFilter, $page: Int, $pageSize: Int) {
    procurementDaPurchases(filter: $filter, page: $page, pageSize: $pageSize) {
      items { ${PURCHASE_FIELDS} }
      page pageSize total totalCapped hasMore dataAsOf valueBasis
    }
  }
`

export const procurementDaPurchasesSchema = z.object({
  procurementDaPurchases: z.object({
    items: z.array(rawDaPurchaseSchema),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalCapped: z.boolean(),
    hasMore: z.boolean(),
    dataAsOf: z.string(),
    valueBasis: z.string(),
  }),
})
export type RawDaPurchasePage = z.infer<typeof procurementDaPurchasesSchema>['procurementDaPurchases']

/** A legacy link's code to the release's id: the one purchase with that portal code, if any. */
export const PROCUREMENT_DA_LOOKUP_QUERY = /* GraphQL */ `
  query ProcurementDaLookup($code: String!) {
    procurementDaPurchases(filter: { code: $code }, pageSize: 2) { items { purchaseId } total }
  }
`

export const procurementDaLookupSchema = z.object({
  procurementDaPurchases: z.object({ items: z.array(z.object({ purchaseId: z.string() })), total: z.number() }),
})

// ─────────────────────────────────────────────────────────────── totals ──

export type DaTotalsGroupBy = 'buyer' | 'supplier' | 'cpvDivision' | 'month' | 'year'

const TOTALS_FIELDS = 'countedValue countedCount symbolicPriceCount purchaseCount'

export const PROCUREMENT_DA_TOTALS_QUERY = /* GraphQL */ `
  query ProcurementDaTotals($filter: ProcurementDaPurchaseFilter, $groupBy: ProcurementDaTotalsGroupBy, $page: Int, $pageSize: Int) {
    procurementDaTotals(filter: $filter, groupBy: $groupBy, page: $page, pageSize: $pageSize) {
      groupBy
      overall { ${TOTALS_FIELDS} }
      groups { key party { ${PARTY_FIELDS} } noSupplier ${TOTALS_FIELDS} }
      page pageSize groupCount hasMore dataAsOf valueBasis
    }
  }
`

const rawDaTotalsFields = {
  countedValue: z.string().nullable(),
  countedCount: z.string(),
  symbolicPriceCount: z.string(),
  purchaseCount: z.string(),
}

export const procurementDaTotalsSchema = z.object({
  procurementDaTotals: z.object({
    groupBy: z.enum(['buyer', 'supplier', 'cpvDivision', 'month', 'year']).nullable(),
    overall: z.object(rawDaTotalsFields),
    groups: z.array(z.object({ key: z.string().nullable(), party: rawDaPartySchema.nullable(), noSupplier: z.boolean(), ...rawDaTotalsFields })),
    page: z.number(),
    pageSize: z.number(),
    groupCount: z.number(),
    hasMore: z.boolean(),
    dataAsOf: z.string(),
    valueBasis: z.string(),
  }),
})
export type RawDaTotalsAnswer = z.infer<typeof procurementDaTotalsSchema>['procurementDaTotals']
