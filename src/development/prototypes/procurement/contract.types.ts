import type { BuyerIdentity } from '@/features/procurement/lib/buyer-model'
import type { DpLabel } from '@/features/procurement/lib/direct-purchase-model'

/**
 * The contract page's prototype: what the fixtures hold (the dev API's
 * answers, trimmed) and the page's model, built from them. See
 * `docs/design/procurement/design.md` §17.
 */

// ─────────────────────────────────────────────────────────── the fixtures ──

/** One contract row as the notice's list answers it. */
export interface RawContractRow {
  readonly id: string
  readonly contractNo: string | null
  readonly contractDate: string | null
  readonly noticeNo: string | null
  readonly title: string | null
  readonly supplier: { readonly cui: string | null; readonly name: string | null }
  readonly valueRon: string | null
  readonly currency: string | null
  readonly valueState: string | null
  readonly valueStateRule: string | null
  readonly valueAccepted: boolean
  readonly recordKind: string | null
}

export interface RawModification {
  readonly id: string
  readonly date: string | null
  readonly before: string | null
  readonly after: string | null
  readonly delta: string | null
  readonly text: string | null
  readonly contractNo: string | null
}

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
 * The award notice on e-licitatie, beyond what the API serves: its call for
 * competition, its lots, the justification of a route without one, and —
 * from the contract's own view — the offers it received, its estimate, its
 * start and its current value. Prod holds part of it (lots, criteria, the
 * offer spread, the framework role); the offers and the contract's view are
 * not scraped yet (§17.7).
 */
export interface RawSource {
  readonly caNoticeId: string
  readonly callNotice: { readonly no: string; readonly date: string | null } | null
  readonly awardNoticeDate: string | null
  /** Every published version's day, in order: the first made the award public, the rest republish it. */
  readonly awardNoticeVersions: readonly string[]
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
  readonly lotsTotal: number
  readonly lots: readonly {
    readonly no: string | number | null
    readonly title: string | null
    readonly estimate: number | null
    readonly currency: string | null
    readonly criterion: string | null
    readonly financing: string | null
    readonly euProgram: string | null
    readonly days: number | null
    readonly months: number | null
    readonly status: string | null
  }[]
  readonly contract: {
    readonly framework: string | null
    readonly startDate: string | null
    readonly offers: { readonly received: number | null; readonly sme: number | null; readonly eu: number | null; readonly nonEu: number | null; readonly electronic: number | null } | null
    readonly lotOffers: readonly { readonly no: string; readonly admitted: number; readonly unaccepted: number; readonly nonconformed: number; readonly withdrawn: number }[]
    readonly estimate: number | null
    readonly value: number | null
    readonly currency: string | null
    readonly ronValue: number | null
    readonly rate: number | null
    readonly subcontracting: unknown
    readonly modified: number
    readonly winners: readonly { readonly name: string; readonly cui: string; readonly sme: boolean | null; readonly city: string | null; readonly county: string | null }[]
  } | null
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

// ───────────────────────────────────────────────────────────── the page ──

/** What the record is: an award, a framework agreement (a ceiling), or a contract under one. */
export type CtKind = 'award' | 'framework' | 'call-off'

/**
 * The value, as far as the page may say it: a checked value; SEAP's own
 * conversion of a foreign-currency value; a framework's ceiling (a maximum,
 * not spending); a published value that did not pass the checks; none.
 */
export type CtValue =
  | { readonly kind: 'accepted'; readonly value: number }
  | { readonly kind: 'converted'; readonly value: number; readonly currency: string | null }
  | { readonly kind: 'ceiling'; readonly value: number | null }
  | { readonly kind: 'unverified'; readonly published: number | null; readonly reason: 'conflicting' | 'invalid' | 'pending' | 'call-off' | 'not-counted' }
  | { readonly kind: 'missing'; readonly reason: 'none' | 'foreign' }

export interface CtParty {
  readonly cui: string | null
  readonly name: string
  readonly identity: BuyerIdentity | null
  readonly hasBudget: boolean
  /** The notice says the firm is a small or medium enterprise. */
  readonly sme?: boolean | null
  readonly city?: string | null
}

/** The offers the contract's lot received, as the notice counts them. */
export interface CtOffers {
  readonly received: number
  readonly admitted: number | null
  readonly unaccepted: number | null
  readonly nonconformed: number | null
  readonly withdrawn: number | null
  readonly sme: number | null
  /** From another EU state; from outside the EU. */
  readonly eu: number | null
  readonly nonEu: number | null
}

/** One value a contract number is published at, and the rows that carry it. */
export interface CtVersion {
  readonly value: number | null
  readonly date: string | null
  readonly ids: readonly string[]
  /** This page's row carries it. */
  readonly isThis: boolean
  /** The value passed the platform's checks (else it is shown muted). */
  readonly accepted: boolean
  /** The firms SEAP publishes it under — said beside a value when a contract's values carry different firms. */
  readonly firms: readonly string[]
  /** The amendment whose reported value this is („5"), when one is. */
  readonly afterAmendment: string | null
  /** …and that amendment's reported values disagree with its own text. */
  readonly suspect: boolean
}

/**
 * One contract in the notice: a contract number (or, with none, a value and
 * a day), the firms SEAP publishes it under and the values it publishes it
 * at. Several firms at one value are an association; several values are
 * versions the source does not rank.
 */
export interface CtContract {
  readonly key: string
  readonly contractNo: string | null
  readonly date: string | null
  readonly title: string | null
  readonly firms: readonly CtParty[]
  readonly versions: readonly CtVersion[]
  /** Several firms at one value: they won it together. Firms at different values under one number are not. */
  readonly association: boolean
  readonly framework: boolean
  readonly isThis: boolean
  /** A row to link to: this contract's page. */
  readonly linkId: string
}

/** An amendment as the institution reported it; its values only when both ends are reported. */
export interface CtAmendment {
  readonly id: string
  /** „5", from the text („Actul adițional nr. 5/08.04.2024"). */
  readonly number: string | null
  /** The day the text says it was signed, else the day SEAP has. */
  readonly date: string | null
  readonly before: number | null
  readonly after: number | null
  readonly text: string | null
  /** The change its own text states („se majorează cu suma de 1.809.030,69 lei"), signed. */
  readonly stated: number | null
  /** The reported values move by something else than the text says. */
  readonly mismatch: boolean
}

export interface CtProcedure {
  readonly id: string
  /** SEAP's label key („licitatie deschisa"). */
  readonly type: string | null
  /** Awarded without a call for competition: a fact about the route. */
  readonly unpublished: boolean
  readonly ted: { readonly no: string; readonly url: string } | null
  /** What the procedure awarded in all, when its contracts are more than this one. */
  readonly awardedTotal: number | null
}

export interface ContractSheet {
  readonly id: string
  readonly title: string | null
  readonly kind: CtKind
  readonly value: CtValue
  readonly date: string | null
  readonly contractNo: string | null
  readonly noticeNo: string | null
  readonly cpv: { readonly code: string; readonly label: DpLabel } | null
  /** The institution's estimate, only when it differs and belongs to this contract alone. */
  readonly estimate: number | null
  readonly authority: CtParty
  readonly supplier: CtParty
  /** This contract in its notice: its firms and versions. */
  readonly contract: CtContract
  /** The notice's other contracts, and how many rows it has in all. */
  readonly others: readonly CtContract[]
  readonly noticeRows: number
  readonly amendments: readonly CtAmendment[]
  /** The procedure, only when it is the institution's own (legacy rows link to another's). */
  readonly procedure: CtProcedure | null
  readonly source: { readonly kind: 'notice' | 'export'; readonly url: string | null; readonly file: string | null }
  readonly alsoIn: number
  /** The award notice's page on e-licitatie, when it is known. */
  readonly noticeUrl: string | null
  /** The values come from an award notice, which states them without VAT. */
  readonly vatExcluded: boolean
  readonly offers: CtOffers | null
  /** How long the contract runs, as the notice says it. */
  readonly duration: { readonly months: number | null; readonly days: number | null } | null
  /** „Prețul cel mai scăzut", „Cel mai bun raport calitate–preț". */
  readonly criterion: string | null
  /** The call for competition: its notice and day. */
  readonly call: { readonly no: string; readonly date: string | null } | null
  readonly awardNoticeDate: string | null
  /** How many times the award notice was published again, and the last time. */
  readonly republished: { readonly times: number; readonly last: string } | null
  readonly startDate: string | null
  /** Why the institution used no call for competition, in its words. */
  readonly justification: { readonly text: string | null; readonly urgency: boolean; readonly exclusive: boolean } | null
  /** The value the notice holds now, after the modifications it counts — when it differs from this row's. */
  readonly current: { readonly value: number; readonly modified: number } | null
  /** The notice's lots: how many, and how many were cancelled. */
  readonly lots: { readonly total: number; readonly cancelled: number } | null
  /** A framework's lowest and highest offers, and the ceiling it was concluded at. */
  readonly spread: { readonly lowest: number; readonly highest: number } | null
}

export interface CtYear {
  readonly year: number
  readonly awards: number
  readonly frameworks: number
  readonly direct: number
  readonly directLei: number | null
}

/** Another contract between the same two, rows of one contract collapsed. */
export interface CtOther {
  readonly id: string
  readonly title: string | null
  readonly date: string | null
  readonly value: number | null
  readonly accepted: boolean
  readonly framework: boolean
  readonly rows: number
  readonly contractNo: string | null
}

export interface CtContext {
  readonly year: number
  readonly years: readonly CtYear[]
  readonly pairAwards: number
  readonly pairFrameworks: number
  readonly buyer: { readonly awards: number; readonly frameworks: number; readonly firms: number; readonly more: boolean }
  readonly seller: { readonly awards: number; readonly clients: number; readonly more: boolean; readonly fromThis: number }
  readonly records: number | null
  readonly around: readonly CtOther[]
}
