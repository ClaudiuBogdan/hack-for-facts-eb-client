/**
 * The procedure page's prototype records (`procedure.fixtures.ts`): the dev
 * API's answers for ten real notices, and each award notice as e-licitatie
 * publishes it (`source`) — what a procedure page wants and the API does not
 * serve yet: the lots, their criteria, the offers each received, the
 * contracts with all their winners, the call behind the award, every
 * published version (`design.md` §22).
 */

export interface RawProcParty {
  readonly cui: string | null
  readonly name: string | null
}

/** A `procurementProcedure` row: one notice — an award notice on e-licitatie, or a row of SEAP's notice exports. */
export interface RawProcedureRow {
  readonly id: string
  readonly noticeNo: string | null
  readonly noticeKind: string | null
  readonly procedureType: string | null
  readonly contractKind: string | null
  readonly title: string | null
  readonly authority: RawProcParty
  readonly cpvCode: string | null
  readonly estimatedValueRon: string | null
  readonly awardedValueRon: string | null
  readonly currency: string | null
  readonly status: string
  readonly publicationDate: string | null
  readonly stateDate: string | null
  readonly sourceSystem: string
  readonly sourceUrl: string | null
  readonly valueAccepted: boolean
}

/** A contract row as the API serves it: one firm's line, at its value. */
export interface RawProcedureContract {
  readonly id: string
  readonly contractNo: string | null
  readonly contractDate: string | null
  readonly title: string | null
  readonly authority: RawProcParty
  readonly supplier: RawProcParty
  readonly valueRon: string | null
  readonly valueAccepted: boolean
  readonly valueState: string | null
  readonly recordKind: string | null
}

export interface RawNoticeCriterion {
  readonly name: string
  readonly weight: number | null
  readonly price: boolean
}

/** A lot as the award notice describes it (section II.2). */
export interface RawNoticeLot {
  readonly no: string
  readonly title: string | null
  readonly cpv: string | null
  readonly place: string | null
  readonly estimate: number | null
  readonly currency: string | null
  /** „Cel mai bun raport calitate – pret", „Pretul cel mai scazut", … */
  readonly criterion: string | null
  readonly criteria: readonly RawNoticeCriterion[]
  readonly months: number | null
  readonly days: number | null
  readonly financing: string | null
  /** „Atribuit", „Anulat". */
  readonly status: string | null
}

export interface RawNoticeOffers {
  readonly received: number | null
  readonly sme: number | null
  readonly eu: number | null
  readonly nonEu: number | null
  readonly electronic: number | null
}

export interface RawNoticeLotOffers {
  readonly no: string
  readonly admitted: number
  readonly unaccepted: number
  readonly nonconformed: number
  readonly withdrawn: number
}

/** A contract on the award notice (section V): all its winners, its value, and the offers its lots received. */
export interface RawNoticeContract {
  readonly id: string
  readonly no: string | null
  readonly date: string | null
  readonly title: string | null
  readonly lots: readonly string[]
  readonly value: number | null
  readonly currency: string | null
  readonly ronValue: number | null
  readonly winners: readonly { readonly name: string; readonly cui: string | null; readonly sme: boolean | null; readonly city: string | null }[]
  readonly modified: number
  /** The notice's word for the contract: „Contract de achizitii publice", „Acord-cadru". */
  readonly framework: string | null
  readonly estimate: number | null
  readonly lowest: number | null
  readonly highest: number | null
  readonly offers: RawNoticeOffers | null
  readonly lotOffers: readonly RawNoticeLotOffers[]
  readonly group: boolean
  readonly startDate: string | null
}

export interface RawNoticeVersion {
  readonly date: string
  /** „Publicat", „Retras". */
  readonly state: string | null
  readonly correcting: boolean
  readonly modification: boolean
}

/** The award notice on e-licitatie, read on 2 October 2026. */
export interface RawNoticeSource {
  readonly caNoticeId: string
  readonly title: string | null
  readonly reference: string | null
  /** „Lucrari", „Servicii", „Furnizare". */
  readonly contractType: string | null
  readonly authorityType: string | null
  readonly legislation: string | null
  readonly procedureType: string | null
  readonly framework: boolean
  /** The call for competition the award follows, when it had one. */
  readonly call: { readonly no: string; readonly date: string | null } | null
  readonly ted: string | null
  readonly totalEstimate: number | null
  readonly lotsEstimate: number | null
  readonly frameworkValue: number | null
  /** Why there was no call (annex D), for a negotiation without one. */
  readonly annexD: { readonly explanation: string | null; readonly forceMajeure: boolean } | null
  readonly lots: readonly RawNoticeLot[]
  readonly contracts: readonly RawNoticeContract[]
  /** Newest first, as e-licitatie lists them. */
  readonly versions: readonly RawNoticeVersion[]
}

/** Another notice of the same institution a record points to: the call behind an award, or the call a negotiation's reason names. */
export interface RawLinkedNotice {
  readonly row: RawProcedureRow
  /** How the two are tied: the award notice names the call, or the reason for a negotiation names it. */
  readonly tie: 'call' | 'award' | 'named-in-reason' | 'names-in-reason'
}

export interface RawProcedureRecord {
  readonly label: string
  /** The row the page is opened on. */
  readonly procedure: RawProcedureRow
  /** `procurementProcedure(id).contracts`: at most 50, no total. */
  readonly contracts: readonly RawProcedureContract[]
  readonly ted: string | null
  /** The notice's rows by the institution and the notice number, when the API's 50 came back full. */
  readonly notice: readonly RawProcedureContract[] | null
  readonly linked: readonly RawLinkedNotice[]
  /** The award notice on e-licitatie: on the award's own record, or on its call's. */
  readonly source: RawNoticeSource | null
  /** For a call a negotiation's reason names: that reason, as the negotiation's notice gives it. */
  readonly reason?: RawNoticeSource['annexD']
  readonly names: {
    readonly labels: readonly (readonly [string, string])[]
    readonly cpv: readonly { readonly code: string; readonly ro: string | null; readonly en: string | null }[]
  }
}
