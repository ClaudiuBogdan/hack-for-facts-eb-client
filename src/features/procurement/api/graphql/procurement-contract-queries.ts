/**
 * GraphQL documents + raw-response Zod schemas for one contract's page
 * (`/procurement/contracts/$id`): the contract with its amendments, its
 * procedure (to check it is the institution's own) and its TED notice; the
 * notice's rows (its firms, its versions, its other contracts); the contracts
 * around this one between the same two. The names are the direct-purchase
 * page's read (`readNames`); the context's analysis reads are the buyer
 * page's shapes (`procurement-buyer-queries.ts`).
 */
import { z } from 'zod'

// ────────────────────────────────────────────────────────────── the row ──

/** A contract row as the page reads it — in its notice and around it. */
const ROW_FIELDS = /* GraphQL */ `
  id contractNo contractDate noticeNo title recordKind
  supplier { cui name }
  valueRon currency
  value { valueState valueStateRule valueAccepted valueRonComparable }
`

const rawValueSchema = z.object({
  valueState: z.string().nullable(),
  valueStateRule: z.string().nullable(),
  valueAccepted: z.boolean(),
  valueRonComparable: z.string().nullable(),
})

const rawRowSchema = z.object({
  id: z.string(),
  contractNo: z.string().nullable(),
  contractDate: z.string().nullable(),
  noticeNo: z.string().nullable(),
  title: z.string().nullable(),
  recordKind: z.string().nullable(),
  supplier: z.object({ cui: z.string().nullable(), name: z.string().nullable() }),
  valueRon: z.string().nullable(),
  currency: z.string().nullable(),
  value: rawValueSchema.nullable(),
})

export type RawContractRow = z.infer<typeof rawRowSchema>

// ───────────────────────────────────────────────────────── the contract ──

/**
 * The contract, its amendments (each with the contract number it names —
 * SEAP files them by notice), its procedure and TED notice, its duplicates.
 */
export const CONTRACT_PAGE_QUERY = /* GraphQL */ `
  query ProcurementContractPage($id: ID!) {
    procurementContract(id: $id) {
      contract {
        ${ROW_FIELDS}
        displayTitle { text source sourceUrl }
        authority { cui name displayName }
        cpvCode estimatedValueRon sourceSystem sourceUrl
        modifications { id contractNo modificationDate valueBeforeRon valueAfterRon valueDeltaRon modificationType }
      }
      procedure { id procedureType awardedValueRon authority { cui } }
      ted { tedNoticeNo }
      duplicates { sourceSystem id }
    }
  }
`

export const contractPageSchema = z.object({
  procurementContract: z
    .object({
      contract: rawRowSchema.extend({
        displayTitle: z.object({ text: z.string().nullable(), source: z.string().nullable(), sourceUrl: z.string().nullable() }).nullable(),
        authority: z.object({ cui: z.string().nullable(), name: z.string().nullable(), displayName: z.string().nullable() }),
        cpvCode: z.string().nullable(),
        estimatedValueRon: z.string().nullable(),
        sourceSystem: z.string(),
        sourceUrl: z.string().nullable(),
        modifications: z
          .array(
            z.object({
              id: z.string(),
              contractNo: z.string().nullable(),
              modificationDate: z.string().nullable(),
              valueBeforeRon: z.string().nullable(),
              valueAfterRon: z.string().nullable(),
              valueDeltaRon: z.string().nullable(),
              modificationType: z.string().nullable(),
            }),
          )
          .nullable(),
      }),
      procedure: z.object({ id: z.string(), procedureType: z.string().nullable(), awardedValueRon: z.string().nullable(), authority: z.object({ cui: z.string().nullable() }) }).nullable(),
      ted: z.object({ tedNoticeNo: z.string() }).nullable(),
      duplicates: z.array(z.object({ sourceSystem: z.string(), id: z.string() })),
    })
    .nullable(),
})

export type RawContractPage = NonNullable<z.infer<typeof contractPageSchema>['procurementContract']>

// ─────────────────────────────────────────────────────────── the notice ──

/**
 * The notice's rows: the institution's contracts whose text holds the
 * notice's number (the list has no filter by notice), a page of them — the
 * page keeps those of this notice. The procedure's own list stops at fifty
 * with no total.
 */
export const CONTRACT_NOTICE_QUERY = /* GraphQL */ `
  query ProcurementContractNotice($authorityCui: String!, $noticeNo: String!, $pageSize: Int!) {
    procurementContracts(filter: { authorityCui: { eq: $authorityCui }, q: { contains: $noticeNo } }, pageSize: $pageSize) {
      total
      items { ${ROW_FIELDS} }
    }
  }
`

export const contractNoticeSchema = z.object({
  procurementContracts: z.object({ total: z.number().nullable(), items: z.array(rawRowSchema) }),
})

// ────────────────────────────────────────────────────── records around ──

/**
 * The contracts between the same two, newer and older than this one's day,
 * and how many there are since 2019.
 */
export const CONTRACT_AROUND_QUERY = /* GraphQL */ `
  query ProcurementContractAround($all: ProcurementContractsFilter!, $newer: ProcurementContractsFilter!, $older: ProcurementContractsFilter!, $perSide: Int!) {
    all: procurementContracts(filter: $all, sort: date_desc, pageSize: 1) { total totalEstimated items { id } }
    newer: procurementContracts(filter: $newer, sort: date_asc, pageSize: $perSide) { items { ${ROW_FIELDS} } }
    older: procurementContracts(filter: $older, sort: date_desc, pageSize: $perSide) { items { ${ROW_FIELDS} } }
  }
`

export const contractAroundSchema = z.object({
  all: z.object({ total: z.number().nullable(), totalEstimated: z.boolean() }),
  newer: z.object({ items: z.array(rawRowSchema) }),
  older: z.object({ items: z.array(rawRowSchema) }),
})
