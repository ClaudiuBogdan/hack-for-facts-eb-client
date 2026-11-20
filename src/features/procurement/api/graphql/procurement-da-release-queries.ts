/**
 * GraphQL documents + raw-response Zod schemas for direct acquisitions,
 * release 1 — the API's `procurementDa*` surface beside the legacy
 * `procurementDirectAcquisition*` one (server
 * `docs/server-redesign/10-public-contracts-da-release-1.md`; field meanings:
 * the data platform's direct-acquisition serving contract).
 *
 * The capability (`procurementDaRelease.enabled`) chooses the path; with it
 * off, every data query answers `SERVICE_UNAVAILABLE`. Money is decimal text:
 * the counted value in lei excluding VAT (`countedValueBasis`), the reported
 * value as published; counts in totals are integers as text. Each top-level
 * field is its own snapshot, with its own `dataAsOf`.
 */
import { z } from 'zod'

/**
 * Money as the API writes it: plain decimal text. Anything else (`0x10`,
 * `1e3`, a blank) fails the read — `Number()` would read it as a figure the
 * source never wrote.
 */
const decimalText = z.string().regex(/^-?\d+(\.\d+)?$/u, 'not decimal text')
/** A count as the API writes it: whole-number text. */
const countText = z.string().regex(/^\d+$/u, 'not a whole number')

// ─────────────────────────────────────────────────────────── capability ──

export const PROCUREMENT_DA_RELEASE_QUERY = /* GraphQL */ `
  query ProcurementDaRelease {
    procurementDaRelease { enabled dataAsOf privacyEnforced privacyAsOf }
  }
`

export const procurementDaReleaseSchema = z.object({
  procurementDaRelease: z.object({
    enabled: z.boolean(),
    dataAsOf: z.string().nullable(),
    /** D6 enforced (its own switch, whatever `enabled` says), and the supplier-privacy publication it reads. */
    privacyEnforced: z.boolean(),
    privacyAsOf: z.string().nullable(),
  }),
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
  title titleWithheld description descriptionWithheld categoryCode categoryLabel cpvDivision acquisitionTypeLabel
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
  reportedValue: decimalText.nullable(),
  counted: z.boolean(),
  countedValue: decimalText.nullable(),
  notCountedReason: z.object({ code: z.string(), labelEn: z.string(), labelRo: z.string() }).nullable(),
  valueCorrected: z.boolean(),
  correctedValue: decimalText.nullable(),
  reviewRule: z.object({ rule: z.string(), effect: z.string(), descriptionEn: z.string().nullable(), descriptionRo: z.string().nullable() }).nullable(),
  symbolicPrice: z.boolean(),
  listedNow: z.boolean().nullable(),
  /** Free text is withheld until its privacy review: null, with `titleWithheld` / `descriptionWithheld` = "privacy". */
  title: z.string().nullable(),
  titleWithheld: z.string().nullable(),
  description: z.string().nullable(),
  descriptionWithheld: z.string().nullable(),
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
  nameWithheld: z.string().nullable(),
  /** Free text like the name: null, with `unitWithheld` = "privacy", until its review. */
  unit: z.string().nullable(),
  unitWithheld: z.string().nullable(),
  quantity: decimalText.nullable(),
  requestedQuantity: decimalText.nullable(),
  unitPrice: decimalText.nullable(),
  cataloguePrice: decimalText.nullable(),
  reportedLineValue: decimalText.nullable(),
  supplierRejected: z.boolean().nullable(),
  quantityCorrection: z.boolean().nullable(),
})
export type RawDaPurchaseItem = z.infer<typeof rawDaPurchaseItemSchema>

export const PROCUREMENT_DA_PURCHASE_QUERY = /* GraphQL */ `
  query ProcurementDaPurchase($purchaseId: ID!) {
    procurementDaPurchase(purchaseId: $purchaseId) {
      purchase { ${PURCHASE_FIELDS} }
      items {
        itemIndex name nameWithheld unit unitWithheld quantity requestedQuantity unitPrice cataloguePrice
        reportedLineValue supplierRejected quantityCorrection
      }
      dataAsOf
      countedValueBasis
      meta { disclosureKey }
    }
  }
`

export const procurementDaPurchaseSchema = z.object({
  procurementDaPurchase: z.object({
    purchase: rawDaPurchaseSchema,
    items: z.array(rawDaPurchaseItemSchema),
    dataAsOf: z.string(),
    countedValueBasis: z.string(),
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
      page pageSize total totalCapped hasMore dataAsOf countedValueBasis meta { disclosureKey }
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
    countedValueBasis: z.string(),
  }),
})
export type RawDaPurchasePage = z.infer<typeof procurementDaPurchasesSchema>['procurementDaPurchases']

/** A legacy link's code to the release's id: the one purchase with that portal code, if any. */
export const PROCUREMENT_DA_LOOKUP_QUERY = /* GraphQL */ `
  query ProcurementDaLookup($code: String!) {
    procurementDaPurchases(filter: { code: $code }, pageSize: 2) { items { purchaseId } total meta { disclosureKey } }
  }
`

export const procurementDaLookupSchema = z.object({
  procurementDaPurchases: z.object({ items: z.array(z.object({ purchaseId: z.string() })), total: z.number() }),
})

/** List order (`purchaseId` breaks ties); `countedValueDesc` puts uncounted purchases last. */
export type DaListSort = 'finalizationDesc' | 'finalizationAsc' | 'countedValueDesc'

const AROUND_FIELDS = 'purchaseId code outcome publicationDay finalizationDay reportedValue counted countedValue notCountedReason { code labelEn labelRo } valueCorrected correctedValue reviewRule { rule effect descriptionEn descriptionRo } symbolicPrice title titleWithheld categoryLabel'

/**
 * The purchases between one buyer and one supplier around a day, from the
 * release: how many since a day (`all`), and a few either side. Each field
 * is its own snapshot: the reader compares their `dataAsOf`.
 */
export const PROCUREMENT_DA_AROUND_QUERY = /* GraphQL */ `
  query ProcurementDaAround($all: ProcurementDaPurchaseFilter!, $newer: ProcurementDaPurchaseFilter!, $older: ProcurementDaPurchaseFilter!, $perSide: Int!) {
    all: procurementDaPurchases(filter: $all, pageSize: 1) { total totalCapped dataAsOf meta { disclosureKey } items { purchaseId } }
    newer: procurementDaPurchases(filter: $newer, sort: finalizationAsc, pageSize: $perSide) { dataAsOf meta { disclosureKey } items { ${AROUND_FIELDS} } }
    older: procurementDaPurchases(filter: $older, sort: finalizationDesc, pageSize: $perSide) { dataAsOf meta { disclosureKey } items { ${AROUND_FIELDS} } }
  }
`

export const rawDaAroundItemSchema = rawDaPurchaseSchema.pick({
  purchaseId: true,
  code: true,
  outcome: true,
  publicationDay: true,
  finalizationDay: true,
  reportedValue: true,
  counted: true,
  countedValue: true,
  notCountedReason: true,
  valueCorrected: true,
  correctedValue: true,
  reviewRule: true,
  symbolicPrice: true,
  title: true,
  titleWithheld: true,
  categoryLabel: true,
})
export type RawDaAroundItem = z.infer<typeof rawDaAroundItemSchema>

export const procurementDaAroundSchema = z.object({
  all: z.object({ total: z.number(), totalCapped: z.boolean(), dataAsOf: z.string() }),
  newer: z.object({ dataAsOf: z.string(), items: z.array(rawDaAroundItemSchema) }),
  older: z.object({ dataAsOf: z.string(), items: z.array(rawDaAroundItemSchema) }),
})
export type RawDaAround = z.infer<typeof procurementDaAroundSchema>

// ─────────────────────────────────────────────────────────────── totals ──

export type DaTotalsGroupBy = 'buyer' | 'supplier' | 'cpvDivision' | 'month' | 'year'

const TOTALS_FIELDS = 'countedValue countedCount symbolicPriceCount purchaseCount'

export const PROCUREMENT_DA_TOTALS_QUERY = /* GraphQL */ `
  query ProcurementDaTotals($filter: ProcurementDaPurchaseFilter, $groupBy: ProcurementDaTotalsGroupBy, $page: Int, $pageSize: Int) {
    procurementDaTotals(filter: $filter, groupBy: $groupBy, page: $page, pageSize: $pageSize) {
      groupBy
      overall { ${TOTALS_FIELDS} }
      groups { key party { ${PARTY_FIELDS} } noSupplier ${TOTALS_FIELDS} }
      page pageSize groupCount hasMore dataAsOf countedValueBasis meta { disclosureKey }
    }
  }
`

const rawDaTotalsFields = {
  countedValue: decimalText.nullable(),
  countedCount: countText,
  symbolicPriceCount: countText,
  purchaseCount: countText,
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
    countedValueBasis: z.string(),
  }),
})
export type RawDaTotalsAnswer = z.infer<typeof procurementDaTotalsSchema>['procurementDaTotals']
