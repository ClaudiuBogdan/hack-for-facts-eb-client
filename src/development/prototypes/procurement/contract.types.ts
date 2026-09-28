import type { ContractModificationRow, ContractNoticeSource, ContractRow } from '@/features/procurement/lib/contract-model'

/**
 * The contract page's prototype records: the dev API's answers for eleven
 * real contracts, trimmed, and each one's award notice read from e-licitatie
 * (`source`) — what the fixed API must serve beside the row (`design.md`
 * §17.7). The page's own types live in the feature
 * (`features/procurement/lib/contract-model.ts`).
 */

export type RawContractRow = ContractRow

export type RawModification = ContractModificationRow

interface RawParty {
  readonly cui: string | null
  readonly name: string | null
  readonly displayName?: string | null
}

export interface RawYearPoint {
  readonly year: number
  readonly value: number | null
}

interface RawStats {
  readonly count: number
  readonly withValue: number
  readonly value: number | null
}

/**
 * The award notice on e-licitatie, as read on 2026-09-28: more than the page
 * reads today (the plan, the totals, each lot's title and financing) — kept,
 * as the notice gives them, for the API's side.
 */
export interface RawSource extends ContractNoticeSource {
  readonly authorityType: string | null
  readonly contractType: string | null
  readonly totalEstimate: { readonly value: number; readonly currency: string | null } | null
  readonly offerSpread: { readonly lowest: number; readonly highest: number } | null
  readonly frameworkValue: number | null
  readonly plan: { readonly name: string; readonly value: number | null } | null
  readonly annexD: {
    readonly explanation: string | null
    readonly forceMajeure: boolean
    readonly noOffers: boolean
    readonly uniqueOfferer: string | null
    readonly repetition: boolean
    readonly supplementary: boolean
  }
  readonly lots: readonly (ContractNoticeSource['lots'][number] & {
    readonly title: string | null
    readonly estimate: number | null
    readonly currency: string | null
    readonly financing: string | null
    readonly euProgram: string | null
  })[]
  readonly contract:
    | (Omit<NonNullable<ContractNoticeSource['contract']>, 'offers' | 'winners'> & {
        readonly offers: { readonly received: number | null; readonly sme: number | null; readonly eu: number | null; readonly nonEu: number | null; readonly electronic: number | null } | null
        readonly subcontracting: unknown
        readonly winners: readonly { readonly name: string; readonly cui: string; readonly sme: boolean | null; readonly city: string | null; readonly county: string | null }[]
      })
    | null
  readonly contractsInNotice: number
}

export interface RawContractRecord {
  readonly label: string
  readonly source: RawSource | null
  readonly contract: RawContractRow & {
    readonly displayTitle: { readonly text: string | null; readonly source: string | null; readonly sourceUrl: string | null } | null
    readonly authority: RawParty
    readonly supplier: RawParty
    readonly cpvCode: string | null
    readonly estimatedValueRon: string | null
    readonly sourceSystem: string
    readonly sourceUrl: string | null
    readonly valueComparable: string | null
    readonly modifications: readonly RawModification[]
  }
  readonly procedure: {
    readonly id: string
    readonly noticeNo: string | null
    readonly procedureType: string | null
    readonly title: string | null
    readonly authorityCui: string | null
    readonly estimatedValueRon: string | null
    readonly awardedValueRon: string | null
    readonly cpvCode: string | null
    readonly publicationDate: string | null
  } | null
  readonly ted: { readonly tedNoticeNo: string; readonly sourceUrl: string } | null
  readonly duplicates: readonly string[]
  readonly notice: { readonly total: number; readonly rows: readonly RawContractRow[] }
  readonly names: {
    readonly labels: readonly (readonly [string, string])[]
    readonly entity: {
      readonly organization: { readonly name: string } | null
      readonly territory: { readonly kind: string | null; readonly name: string; readonly countyCode: string | null; readonly countyName: string | null } | null
      readonly reference: { readonly name: string | null; readonly address: string | null; readonly entityType: string | null; readonly isTerritorialExecutive: boolean } | null
      readonly budget: { readonly presence: boolean } | null
    } | null
  }
  readonly cpv: readonly { readonly code: string; readonly ro: string | null; readonly en: string | null }[]
  readonly context: {
    readonly year: number
    readonly awards: readonly RawYearPoint[]
    readonly frameworks: readonly RawYearPoint[]
    readonly direct: readonly (RawYearPoint & { readonly lei: number | null })[]
    readonly pairYear: RawStats | null
    readonly buyer: { readonly awards: RawStats | null; readonly frameworks: RawStats | null; readonly firms: { readonly parties: number; readonly more: boolean; readonly count: number } }
    readonly seller: { readonly awards: RawStats | null; readonly clients: { readonly parties: number; readonly more: boolean; readonly count: number } }
    readonly records: number | null
    readonly newer: readonly RawContractRow[]
    readonly older: readonly RawContractRow[]
  } | null
}
