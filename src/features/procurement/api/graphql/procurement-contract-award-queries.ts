import { z } from 'zod'

/**
 * Contract awards served from procurement v3 (PROC-KB0Z step 1): a buyer's
 * counts, a page of its records and one record with its winners and lots
 * (server `ca-records-schema.ts`). Each field reads its own snapshot and says
 * its `dataAsOf`; every answer is no-store at the API, as winner codes and
 * names can be withdrawn without it moving.
 *
 * `disclosureKey` is selected under its own name, never under `meta`: the
 * client's D6 key watch (`disclosure-key.ts`) follows the direct
 * acquisitions' publication, and a contract-award answer neither moves it nor
 * is refused by it.
 */

const BUYER_FIELDS = 'fiscalCode displayKind name'
const WINNER_FIELDS = 'order displayKind fiscalCode name disclosed'
const ROW_FIELDS = `recordId contractKind valueKind additive status amountLei nativeAmount currency flags awardDay title cpvCode winnerCount winners { ${WINNER_FIELDS} }`
const WINDOW_FIELDS = 'floor from to'

export const PROCUREMENT_CONTRACT_AWARDS_QUERY = /* GraphQL */ `
  query ProcurementContractAwards($buyerFiscalCode: String!, $from: Date, $to: Date, $sort: ProcurementCaListSort, $page: Int, $pageSize: Int) {
    summary: procurementContractAwardSummary(buyerFiscalCode: $buyerFiscalCode, from: $from, to: $to) {
      dataAsOf
      disclosureKey
      window { ${WINDOW_FIELDS} }
      buyer { ${BUYER_FIELDS} }
      recordCount
      valuedCount
      identityReviewCount
      undatedCount
    }
    records: procurementContractAwards(buyerFiscalCode: $buyerFiscalCode, from: $from, to: $to, sort: $sort, page: $page, pageSize: $pageSize) {
      dataAsOf
      disclosureKey
      window { ${WINDOW_FIELDS} }
      items { ${ROW_FIELDS} }
      page
      pageSize
      total
      hasMore
      depthLimited
    }
  }
`

export const PROCUREMENT_CONTRACT_AWARD_QUERY = /* GraphQL */ `
  query ProcurementContractAward($recordId: ID!) {
    award: procurementContractAward(recordId: $recordId) {
      dataAsOf
      disclosureKey
      reanchored
      record {
        ${ROW_FIELDS}
        headStatus
        fxSource
        vatBasis
        amountOrigin
        changeLei
        changePublicationDay
        publicationDay
        buyer { ${BUYER_FIELDS} }
        cpvDivision
        procedureId
        noticeNo
        sourceUrl
        lotCount
      }
      lots { lotOrder lotNumber title cpvCode estimatedValue currency isEuFunded cancelledStatus }
    }
  }
`

const windowSchema = z.object({ floor: z.string(), from: z.string(), to: z.string().nullable() })

const buyerSchema = z.object({ fiscalCode: z.string(), displayKind: z.string(), name: z.string().nullable() })

const winnerSchema = z.object({
  order: z.number().nullable(),
  displayKind: z.string(),
  fiscalCode: z.string().nullable(),
  name: z.string().nullable(),
  disclosed: z.boolean().nullable(),
})

const rowSchema = z.object({
  recordId: z.string(),
  contractKind: z.string().nullable(),
  valueKind: z.string(),
  additive: z.boolean(),
  status: z.string(),
  amountLei: z.string().nullable(),
  nativeAmount: z.string().nullable(),
  currency: z.string().nullable(),
  flags: z.array(z.string()),
  awardDay: z.string().nullable(),
  title: z.string().nullable(),
  cpvCode: z.string().nullable(),
  winnerCount: z.number(),
  winners: z.array(winnerSchema),
})

export const contractAwardsResponseSchema = z.object({
  summary: z.object({
    dataAsOf: z.string(),
    disclosureKey: z.string(),
    window: windowSchema,
    buyer: buyerSchema,
    recordCount: z.number(),
    valuedCount: z.number(),
    identityReviewCount: z.number(),
    undatedCount: z.number(),
  }),
  records: z.object({
    dataAsOf: z.string(),
    disclosureKey: z.string(),
    window: windowSchema,
    items: z.array(rowSchema),
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    hasMore: z.boolean(),
    depthLimited: z.boolean(),
  }),
})

export const contractAwardResponseSchema = z.object({
  award: z.object({
    dataAsOf: z.string(),
    disclosureKey: z.string(),
    reanchored: z.boolean(),
    record: rowSchema.extend({
      headStatus: z.string().nullable(),
      fxSource: z.string().nullable(),
      vatBasis: z.string(),
      amountOrigin: z.string().nullable(),
      changeLei: z.string().nullable(),
      changePublicationDay: z.string().nullable(),
      publicationDay: z.string().nullable(),
      buyer: buyerSchema.nullable(),
      cpvDivision: z.string().nullable(),
      procedureId: z.string().nullable(),
      noticeNo: z.string().nullable(),
      sourceUrl: z.string().nullable(),
      lotCount: z.number(),
    }),
    lots: z.array(
      z.object({
        lotOrder: z.number(),
        lotNumber: z.string().nullable(),
        title: z.string().nullable(),
        cpvCode: z.string().nullable(),
        estimatedValue: z.string().nullable(),
        currency: z.string().nullable(),
        isEuFunded: z.boolean().nullable(),
        cancelledStatus: z.string().nullable(),
      }),
    ),
  }),
})

export type RawCaBuyer = z.infer<typeof buyerSchema>
export type RawCaWinner = z.infer<typeof winnerSchema>
export type RawCaRow = z.infer<typeof rowSchema>
export type RawContractAwards = z.infer<typeof contractAwardsResponseSchema>
export type RawContractAward = z.infer<typeof contractAwardResponseSchema>['award']

/**
 * A buyer's contract-award money (server `totals-schema.ts`, totals v2): one
 * request over the money build, one figure per value kind, never summed
 * across kinds. Labels and the explanation come from the API's label table
 * and are shown as served. The field is nullable at the root: a totals error
 * nulls it alone.
 */
export const PROCUREMENT_CONTRACT_AWARD_TOTALS_QUERY = /* GraphQL */ `
  query ProcurementContractAwardTotals($requests: [ProcurementTotalRequestInput!]!) {
    totals: procurementTotals(requests: $requests) {
      id
      totals { valueKind sumLei recordCount }
      included { valueKinds { key labelRo labelEn } }
      explanation { textRo textEn }
    }
  }
`

export const contractAwardTotalsResponseSchema = z.object({
  totals: z
    .array(
      z.object({
        id: z.string(),
        totals: z.array(z.object({ valueKind: z.string(), sumLei: z.string(), recordCount: z.string() })),
        included: z.object({ valueKinds: z.array(z.object({ key: z.string(), labelRo: z.string(), labelEn: z.string() })) }),
        explanation: z.object({ textRo: z.string(), textEn: z.string() }),
      }),
    )
    .nullable(),
})

export type RawContractAwardTotal = NonNullable<z.infer<typeof contractAwardTotalsResponseSchema>['totals']>[number]
