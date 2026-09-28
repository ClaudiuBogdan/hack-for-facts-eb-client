import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { buyerName, type BuyerIdentity } from './buyer-model'
import { cpvDivisionLabelEn, cpvDivisionLabelRo } from './cpv-labels'
import { cpvKey, type DpLabel, type DpNames } from './direct-purchase-model'
import { toElicitatieClientUrl } from './elicitatie-client-url'
import { DIRECT_COMPARABLE_FROM, homeYear, isUnpublishedProcedure, tidyName, tidyTitle } from './home-model'

/**
 * One contract award's page (`/procurement/contracts/$id`, `design.md` §17),
 * as far as the data lets it speak (§17.1): an award row is one firm's line
 * on a notice, so a contract is read from its notice — the rows under its
 * number are its firms (one value: an association) or its versions (several
 * values the source does not rank); the amendments are the ones filed under
 * its number, checked against their own text; the procedure is shown only
 * when it is the institution's own.
 */

// ─────────────────────────────────────────────────────────── what is read ──

/** One contract row, as the notice's list answers it. */
export interface ContractRow {
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

/** An amendment as SEAP files it: by notice, with the number of the contract it names. */
export interface ContractModificationRow {
  readonly id: string
  readonly date: string | null
  readonly before: string | null
  readonly after: string | null
  readonly delta: string | null
  /** The act's own text („Actul adițional nr. 5/08.04.2024 … se majorează cu suma de …"). */
  readonly text: string | null
  readonly contractNo: string | null
}

/**
 * The award notice on e-licitatie, beyond what the API serves: its call for
 * competition, its lots, the justification of a route without one, and —
 * from the contract's own view — the offers it received, its estimate, its
 * start and its value today. Not served yet (`design.md` §17.7 asks the
 * scrapper and the server for it): the page reads `null` and shows these
 * parts where they arrive.
 */
export interface ContractNoticeSource {
  readonly caNoticeId: string
  readonly callNotice: { readonly no: string; readonly date: string | null } | null
  readonly awardNoticeDate: string | null
  /** Every published version's day, in order: the first made the award public, the rest republish it. */
  readonly awardNoticeVersions: readonly string[]
  readonly annexD: { readonly explanation: string | null; readonly forceMajeure: boolean } | null
  readonly lotsTotal: number
  readonly lots: readonly {
    readonly no: string | number | null
    readonly criterion: string | null
    readonly days: number | null
    readonly months: number | null
    readonly status: string | null
  }[]
  readonly contract: {
    /** The notice's word for the contract: „Acord-cadru", „Contract subsecvent". */
    readonly framework: string | null
    readonly startDate: string | null
    readonly offers: { readonly received: number | null; readonly sme: number | null; readonly eu: number | null; readonly nonEu: number | null } | null
    readonly lotOffers: readonly { readonly no: string; readonly admitted: number; readonly unaccepted: number; readonly nonconformed: number; readonly withdrawn: number }[]
    readonly estimate: number | null
    readonly value: number | null
    readonly currency: string | null
    readonly ronValue: number | null
    readonly rate: number | null
    readonly modified: number
    readonly winners: readonly { readonly name: string; readonly cui: string; readonly sme: boolean | null; readonly city: string | null }[]
  } | null
}

/** What the page's read gives: the contract with its amendments, its procedure, the notice's rows, the names. */
export interface ContractRead {
  readonly contract: ContractRow & {
    readonly displayTitle: { readonly text: string | null; readonly source: string | null; readonly sourceUrl: string | null } | null
    readonly authority: { readonly cui: string | null; readonly name: string | null; readonly displayName?: string | null }
    readonly cpvCode: string | null
    readonly estimatedValueRon: string | null
    readonly sourceSystem: string
    readonly sourceUrl: string | null
    readonly valueComparable: string | null
    readonly modifications: readonly ContractModificationRow[]
  }
  readonly procedure: {
    readonly id: string
    readonly procedureType: string | null
    readonly authorityCui: string | null
    readonly awardedValueRon: string | null
  } | null
  readonly ted: { readonly tedNoticeNo: string } | null
  /** The source systems of the records SEAP publishes it again as. */
  readonly duplicates: readonly string[]
  /**
   * The notice's rows: a page of the institution's contracts whose text holds
   * the notice's number (the page keeps this notice's). `full`: the page came
   * back full, so the notice may have more. `failed`: they could not be read
   * — the contract then stands alone, and the page says what may be missing.
   */
  readonly notice: { readonly rows: readonly ContractRow[]; readonly full: boolean; readonly failed: boolean }
  readonly names: DpNames
  readonly source: ContractNoticeSource | null
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
  /** …and that amendment's reported values, or an earlier one's, disagree with their own text. */
  readonly suspect: boolean
}

/**
 * One contract in the notice: a contract number (or, with none, a row of its
 * own), the firms SEAP publishes it under and the values it publishes it at.
 * Several firms at one value are an association; several values are
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
  /** The title is the procedure's: SEAP gives the contract none of its own (a multi-lot procedure's names every lot). */
  readonly titleFromProcedure: boolean
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
  /** The notice's other contracts. */
  readonly others: readonly CtContract[]
  /** The notice's rows were read from a full page: it may hold more contracts than listed. */
  readonly noticeMore: boolean
  /** The notice's rows could not be read: the association's firms, the other values and the other contracts may be missing. */
  readonly noticeUnread: boolean
  readonly amendments: readonly CtAmendment[]
  /** The procedure, only when it is the institution's own (legacy rows link to another's). */
  readonly procedure: CtProcedure | null
  /** The award notice, or the export row — its file's year and quarter, as its name says them. */
  readonly source: { readonly kind: 'notice' | 'export'; readonly url: string | null; readonly file: { readonly year: string; readonly quarter: string | null } | null }
  /** How many times SEAP publishes it again, in another source; the platform counts it once. */
  readonly alsoIn: number
  /** The award notice's page on e-licitatie, when it is known. */
  readonly noticeUrl: string | null
  /** The value is the award notice's, which states its values without VAT. */
  readonly vatExcluded: boolean
  readonly offers: CtOffers | null
  /** How long the contract runs, as the notice says it. */
  readonly duration: { readonly months: number | null; readonly days: number | null } | null
  /** SEAP's criterion („pretul cel mai scazut"). */
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
  /** A read failed (the names, or the notice's other rows): served, never kept or cached. */
  readonly partial: boolean
}

// ───────────────────────────────────────────────────────────── helpers ──

const num = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Money to the hundred lei, for comparing an estimate or a total with a value. */
const hundred = (value: number | null) => (value === null ? 'none' : String(Math.round(value / 100)))
/** One value, to the leu: a consortium's rows differ only in their cents (6.142.792.901,00 and ,06). */
const leu = (value: number | null) => (value === null ? 'none' : String(Math.round(value)))

const normalizeNo = (value: string | null) => value?.trim().toLocaleLowerCase('ro-RO').replace(/\s+/g, '') || null

const FRAMEWORK_TITLE = /acord[\s-]*cadru/iu
const CALL_OFF_TITLE = /subsecvent/iu

/**
 * The row's title, else the display title — not one taken from a procedure
 * that is another institution's (a legacy join); a procedure's own title is
 * said to be the procedure's.
 */
function titleOf(read: ContractRead): { readonly title: string | null; readonly fromProcedure: boolean } {
  const own = tidyTitle(read.contract.title)
  if (own) return { title: own, fromProcedure: false }
  const display = read.contract.displayTitle
  const fromProcedure = display?.source === 'procedure'
  const trusted = !fromProcedure || (read.procedure?.authorityCui != null && read.procedure.authorityCui === read.contract.authority.cui)
  const title = trusted ? tidyTitle(display?.text ?? null) : null
  return { title, fromProcedure: title !== null && fromProcedure }
}

export function kindOf(row: Pick<ContractRow, 'recordKind' | 'valueStateRule' | 'title'>, title: string | null, sourceKind?: string | null): CtKind {
  // The notice's own word for it, when read: „Acord-cadru", „Contract subsecvent", „Contract de achizitii publice".
  if (sourceKind && /acord/iu.test(sourceKind)) return 'framework'
  if (sourceKind && /subsecvent/iu.test(sourceKind)) return 'call-off'
  if (row.recordKind === 'framework_agreement' || row.valueStateRule === 'framework_guard') return 'framework'
  return CALL_OFF_TITLE.test(title ?? row.title ?? '') ? 'call-off' : 'award'
}

/** The value as the platform judged it: checked (`valueAccepted`) or not, and why not. */
export function valueOf(row: ContractRow & { readonly valueComparable?: string | null }): CtValue {
  const own = num(row.valueRon)
  if (row.recordKind === 'framework_agreement' || row.valueStateRule === 'framework_guard') return { kind: 'ceiling', value: own }
  if (row.valueAccepted && own !== null) {
    // The source's own conversion of a value in another currency: RON, with the currency when the row says it.
    if (row.valueState === 'official_ron_equivalent') return { kind: 'converted', value: own, currency: row.currency && !/^(RON|Leu)/iu.test(row.currency) ? row.currency : null }
    return { kind: 'accepted', value: num(row.valueComparable ?? null) ?? own }
  }
  switch (row.valueState) {
    case 'conflicting_sources':
      return { kind: 'unverified', published: own, reason: 'conflicting' }
    case 'invalid_source_value':
      return { kind: 'unverified', published: own, reason: 'invalid' }
    case 'not_applicable':
      // A call-off counted with its framework; otherwise a duplicate, a notice without an award, or a procedure cancelled before it.
      return { kind: 'unverified', published: own, reason: /call_off/iu.test(row.valueStateRule ?? '') ? 'call-off' : 'not-counted' }
    case 'foreign_currency_only':
      return { kind: 'missing', reason: 'foreign' }
    default:
      return own === null ? { kind: 'missing', reason: 'none' } : { kind: 'unverified', published: own, reason: 'pending' }
  }
}

/** The figure a list may show for a value: the value, marked when the page cannot take it as checked. */
export function figureOf(value: CtValue): { readonly value: number | null; readonly accepted: boolean } {
  if (value.kind === 'accepted' || value.kind === 'converted') return { value: value.value, accepted: true }
  if (value.kind === 'ceiling') return { value: value.value, accepted: false }
  if (value.kind === 'unverified') return { value: value.published, accepted: false }
  return { value: null, accepted: false }
}

export function rowFigure(row: ContractRow): { readonly value: number | null; readonly accepted: boolean } {
  return figureOf(valueOf(row))
}

// ─────────────────────────────────────────────────────────────── names ──

function firmOf(supplier: { readonly cui: string | null; readonly name: string | null }, labels: ReadonlyMap<string, string>): CtParty {
  const label = supplier.cui ? labels.get(supplier.cui) : undefined
  return { cui: supplier.cui, name: displayCompanyName(label ?? supplier.name ?? supplier.cui ?? '—'), identity: null, hasBudget: false }
}

const LEGAL_FORMS = /\b(s\.?\s?r\.?\s?l|s\.?\s?a|a\.?\s?g|s\.?\s?c|gmbh|ltd|spa)\b\.?/giu

/** A firm's name without its legal form, letters and digits only: to match a row that carries no CUI to one that does. */
const nameKey = (name: string) =>
  name
    .toLocaleLowerCase('ro-RO')
    .replace(LEGAL_FORMS, '')
    .replace(/[^\p{L}\p{N}]/gu, '')

/** A firm's key: its CUI when a row has it (two firms of one name are two firms); its name only for a row without one. */
const firmKey = (firm: CtParty) => (firm.cui ? `cui:${firm.cui}` : `name:${nameKey(firm.name)}`)

/**
 * Adds a firm to a list keyed by `firmKey`: a row without a CUI joins the
 * firm of that name; a row with one takes the place of the name-only entry.
 * Returns the key the firm is under.
 */
function addFirm(firms: Map<string, CtParty>, firm: CtParty): string {
  const byName = [...firms.entries()].find(([, known]) => nameKey(known.name) === nameKey(firm.name) && (!known.cui || !firm.cui || known.cui === firm.cui))
  if (!firm.cui) {
    if (byName) return byName[0]
    firms.set(firmKey(firm), firm)
    return firmKey(firm)
  }
  const key = firmKey(firm)
  if (firms.has(key)) return key
  if (byName && !byName[1].cui) firms.delete(byName[0])
  firms.set(key, { ...(byName?.[1] ?? {}), ...firm })
  return key
}

// ──────────────────────────────────────────────────────────── the notice ──

/** A contract in its notice is its number; a row without one is a contract of its own (legacy notices hold several). */
export function contractKeyOf(row: Pick<ContractRow, 'id' | 'contractNo'>): string {
  const no = normalizeNo(row.contractNo)
  return no ? `no:${no}` : `row:${row.id}`
}

function contractOf(rows: readonly ContractRow[], thisId: string, labels: ReadonlyMap<string, string>): CtContract {
  const firms = new Map<string, CtParty>()
  const firmOfRow = new Map<string, string>()
  for (const row of rows) firmOfRow.set(row.id, addFirm(firms, firmOf(row.supplier, labels)))
  // A row that joined a firm by name before that firm got its CUI key: resolve it to where the firm lives now.
  const resolve = (key: string) => (firms.has(key) ? key : ([...firms.keys()].find((known) => nameKey(firms.get(known)!.name) === key.slice(5)) ?? key))
  const byValue = new Map<string, { value: number | null; date: string | null; ids: string[]; accepted: boolean; firmKeys: Set<string> }>()
  for (const row of rows) {
    const figure = rowFigure(row)
    const value = figure.value ?? num(row.valueRon)
    const key = leu(value)
    const version = byValue.get(key) ?? { value, date: row.contractDate, ids: [], accepted: figure.accepted, firmKeys: new Set<string>() }
    version.ids.push(row.id)
    version.accepted ||= figure.accepted
    version.firmKeys.add(resolve(firmOfRow.get(row.id)!))
    if (row.contractDate && (!version.date || row.contractDate < version.date)) version.date = row.contractDate
    byValue.set(key, version)
  }
  const versions: CtVersion[] = [...byValue.values()]
    .map(({ firmKeys, ...version }) => ({
      ...version,
      firms: [...firmKeys].map((key) => firms.get(key)?.name ?? '—'),
      isThis: version.ids.includes(thisId),
      afterAmendment: null,
      suspect: false,
    }))
    .sort((a, b) => (a.value ?? Infinity) - (b.value ?? Infinity))
  const association = [...byValue.values()].some((version) => version.firmKeys.size > 1)
  const first = rows[0]!
  const title = tidyTitle(rows.find((row) => row.title)?.title ?? null)
  const isThis = rows.some((row) => row.id === thisId)
  // This page's firm first, then the firms SEAP names with a CUI.
  const own = rows.find((row) => row.id === thisId)
  const ownKey = own ? resolve(firmOfRow.get(own.id)!) : null
  const ordered = [...firms.entries()].sort(([a, x], [b, y]) => Number(b === ownKey) - Number(a === ownKey) || Number(Boolean(y.cui)) - Number(Boolean(x.cui))).map(([, firm]) => firm)
  return {
    key: contractKeyOf(first),
    contractNo: first.contractNo?.trim() || null,
    date: rows.map((row) => row.contractDate).filter((date): date is string => Boolean(date)).sort()[0] ?? null,
    title,
    firms: ordered,
    versions,
    association,
    // A call-off's title names its framework („Contract subsecvent … la Acordul-cadru"): that does not make it one.
    framework: rows.some((row) => kindOf(row, row.title) === 'framework') || (FRAMEWORK_TITLE.test(title ?? '') && !CALL_OFF_TITLE.test(title ?? '')),
    isThis,
    linkId: isThis ? thisId : first.id,
  }
}

/** The notice's rows as contracts: this one, and the others newest first. */
function noticeOf(read: ContractRead, labels: ReadonlyMap<string, string>): { readonly contract: CtContract; readonly others: readonly CtContract[] } {
  const own = read.contract
  const rows = read.notice.rows.filter((row) => row.noticeNo === own.noticeNo)
  if (!rows.some((row) => row.id === own.id)) rows.push(own)
  const groups = new Map<string, ContractRow[]>()
  for (const row of rows) groups.set(contractKeyOf(row), [...(groups.get(contractKeyOf(row)) ?? []), row])
  const contracts = [...groups.values()].map((group) => contractOf(group, own.id, labels))
  const contract = contracts.find((item) => item.isThis)!
  const others = contracts.filter((item) => !item.isThis).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  return { contract, others }
}

// ────────────────────────────────────────────────────────── amendments ──

const AMENDMENT = /(?:act(?:ul)?\s*adi[tț]ional|\bAA)\s*(?:nr\.?\s*)?(\d+)[./\s]*(?:din\s*)?(\d{1,2}[./]\d{1,2}[./]\d{4})?/iu
/** An amount in lei: „1.809.030,69 lei", „28209,34 lei". */
const AMOUNT = /(\d{1,3}(?:[.\s]\d{3})+(?:,\d{1,2})?|\d+(?:,\d{1,2})?)\s*lei/giu
/** The verbs a change of price is said with. */
const VERB = /(major|m[aă]re[sș]t|cre[sș]t|suplimenta|diminu|reduc|scad|mic[sș]or)\w*/giu
/**
 * Texts whose amount is not a change of the price excluding VAT: one with
 * VAT in it, a change of the VAT rate (CNI's act nr. 9 — 19% to 21%), a
 * guarantee.
 */
const NOT_THE_PRICE = /inclusiv\s+tva|cu\s+tva\b|cot(?:a|ei)\b[^.;]{0,30}(?:tva|tax)|tax(?:a|ei)\s+pe\s+valoare|garan[tț]i/iu

/**
 * The change of price an act's text states, signed by the verb nearest before
 * its amount — or none when the text is not plainly one change of the price
 * without VAT (two amounts, VAT, a rate, a guarantee).
 */
export function statedChange(text: string | null): number | null {
  if (!text || NOT_THE_PRICE.test(text)) return null
  const amounts = [...text.matchAll(AMOUNT)]
  if (amounts.length !== 1) return null
  const match = amounts[0]!
  const verbs = [...text.slice(Math.max(0, (match.index ?? 0) - 90), match.index ?? 0).matchAll(VERB)]
  const verb = verbs[verbs.length - 1]?.[1]
  if (!verb) return null
  const amount = Number(match[1]!.replace(/[.\s]/gu, '').replace(',', '.'))
  if (!Number.isFinite(amount)) return null
  return /^(diminu|reduc|scad|mic)/iu.test(verb) ? -amount : amount
}

function dayOfText(text: string | undefined): string | null {
  const match = text?.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/u)
  return match ? `${match[3]}-${match[2]!.padStart(2, '0')}-${match[1]!.padStart(2, '0')}` : null
}

/**
 * The amendments filed under this contract's number (SEAP links them by
 * notice, and a notice holds several contracts); one with no number — or any,
 * for a contract with none — only when the notice is known to hold no other
 * contract it could belong to.
 */
function amendmentsOf(read: ContractRead, alone: boolean): readonly CtAmendment[] {
  const own = normalizeNo(read.contract.contractNo)
  return read.contract.modifications
    .filter((item) => {
      const named = normalizeNo(item.contractNo)
      return named && own ? named === own : alone
    })
    .map((item) => {
      const match = item.text?.match(AMENDMENT)
      const before = num(item.before)
      const after = num(item.after)
      // A delta alone is not reliable (some rows carry the whole value as the change): values only with both ends.
      const both = before !== null && after !== null
      const stated = statedChange(item.text)
      // The text is the act itself; the values are what the institution typed beside it.
      const mismatch = both && stated !== null && Math.abs(after - before - stated) > Math.max(1, Math.abs(stated) * 0.005)
      return { id: item.id, number: match?.[1] ?? null, date: dayOfText(match?.[2]) ?? item.date, before: both ? before : null, after: both ? after : null, text: item.text?.trim() || null, stated, mismatch }
    })
    .sort((a, b) => Number(a.number ?? 999) - Number(b.number ?? 999) || (a.date ?? '').localeCompare(b.date ?? ''))
}

// ───────────────────────────────────────────────────────────── the sheet ──

/** „…-t-ii-2024.csv" → 2024, quarter 2; „contracte-2010.csv" → 2010. */
function fileOf(url: string | null): { readonly year: string; readonly quarter: string | null } | null {
  const quarter = url?.match(/t[-_]?(iv|i{1,3}|[1-4])[-_](\d{4})\.(?:xlsx?|csv)$/iu)
  if (quarter?.[1] && quarter[2]) {
    const roman: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4' }
    return { year: quarter[2], quarter: roman[quarter[1].toLowerCase()] ?? quarter[1] }
  }
  const year = url?.match(/(\d{4})\.(?:xlsx?|csv)$/iu)?.[1]
  return year ? { year, quarter: null } : null
}

function procedureOf(read: ContractRead, contract: CtContract, others: readonly CtContract[]): CtProcedure | null {
  const procedure = read.procedure
  // Legacy rows are joined to a procedure by a bare notice number: another institution's, often. Only the institution's own is shown.
  if (!procedure || !procedure.authorityCui || procedure.authorityCui !== read.contract.authority.cui) return null
  const awarded = num(procedure.awardedValueRon)
  const own = contract.versions.find((version) => version.isThis)?.value ?? null
  return {
    id: procedure.id,
    type: procedure.procedureType,
    unpublished: procedure.procedureType ? isUnpublishedProcedure(procedure.procedureType) : false,
    ted: read.ted ? { no: read.ted.tedNoticeNo, url: `https://ted.europa.eu/ro/notice/-/detail/${read.ted.tedNoticeNo}` } : null,
    awardedTotal: others.length > 0 && awarded !== null && hundred(awarded) !== hundred(own) ? awarded : null,
  }
}

/** A published value that is an amendment's reported value says so — the act that produced it — and whether the acts' values hold. */
function withAmendments(contract: CtContract, amendments: readonly CtAmendment[]): CtContract {
  const versions = contract.versions.map((version) => {
    // Only an act that changed the value produced one; the earliest that reached it.
    const act = amendments.find((item) => item.after !== null && item.before !== item.after && version.value !== null && Math.abs(item.after - version.value) <= 1)
    const suspect = act ? amendments.slice(0, amendments.indexOf(act) + 1).some((item) => item.mismatch) : false
    return act ? { ...version, afterAmendment: act.number, suspect } : version
  })
  return { ...contract, versions }
}

/**
 * The notice's winners of this contract join the rows' firms: a member the
 * rows miss (an e-licitatie award row names one firm) is still a member, and
 * several winners of one contract won it together — or, for a framework,
 * share it.
 */
function withWinners(contract: CtContract, read: ContractRead, labels: ReadonlyMap<string, string>): CtContract {
  const winners = read.source?.contract?.winners ?? []
  if (winners.length === 0) return contract
  const firms = new Map(contract.firms.map((firm) => [firmKey(firm), firm]))
  for (const winner of winners) {
    const cui = winner.cui.replace(/^0+/u, '') || null
    const key = addFirm(firms, firmOf({ cui, name: winner.name }, labels))
    firms.set(key, { ...firms.get(key)!, sme: winner.sme })
  }
  return { ...contract, firms: [...firms.values()], association: contract.association || winners.length > 1 }
}

/** The offers of this contract's lot, from its view; the notice counts them per contract and per lot. */
function offersOf(read: ContractRead): CtOffers | null {
  const view = read.source?.contract
  const received = view?.offers?.received
  if (!view || received === null || received === undefined) return null
  const lot = view.lotOffers.length === 1 ? view.lotOffers[0]! : null
  return {
    received,
    admitted: lot?.admitted ?? null,
    unaccepted: lot?.unaccepted ?? null,
    nonconformed: lot?.nonconformed ?? null,
    withdrawn: lot?.withdrawn ?? null,
    sme: view.offers?.sme ?? null,
    eu: view.offers?.eu ?? null,
    nonEu: view.offers?.nonEu ?? null,
  }
}

/**
 * The award notice's page: the notice read, else the row's own source when
 * it is the notice, else the notice SEAP matched an export row to. Never the
 * procedure's (a call for competition, not the award).
 */
function noticeUrlOf(read: ContractRead): string | null {
  if (read.source) return `https://e-licitatie.ro/pub/notices/ca-notices/view-c/${read.source.caNoticeId}`
  const own = read.contract
  if (own.sourceSystem === 'elicitatie_ca_award' && own.sourceUrl) return toElicitatieClientUrl(own.sourceUrl)
  const display = own.displayTitle
  return display?.source === 'matched_award' && display.sourceUrl ? toElicitatieClientUrl(display.sourceUrl) : null
}

export function contractSheetOf(read: ContractRead): ContractSheet {
  const { labels } = read.names
  const own = read.contract
  const { title, fromProcedure } = titleOf(read)
  const notice = noticeOf(read, labels)
  // Alone in its notice only when the notice was read and holds nothing else: an unread notice says nothing.
  const alone = !read.notice.failed && notice.others.length === 0
  const amendments = amendmentsOf(read, alone)
  const contract = withWinners(withAmendments(notice.contract, amendments), read, labels)
  const others = notice.others
  const source = read.source
  const view = source?.contract ?? null
  // This contract's lot: the one its offers are counted on, else the notice's only lot.
  const lotNo = view?.lotOffers.length === 1 ? String(view.lotOffers[0]!.no) : null
  const lot = source?.lots.find((item) => lotNo !== null && String(item.no) === lotNo) ?? (source?.lots.length === 1 ? source.lots[0]! : null)
  const annex = source?.annexD ?? null
  const exclusive = /drepturi exclusive|art\.?\s*104\s*alin\.?\s*\(1\)\s*lit\.?\s*b/iu.test(annex?.explanation ?? '')
  const value = valueOf(own)
  const code = cpvKey(own.cpvCode)
  const cpvLabel = code ? read.names.cpv.get(code) : undefined
  // The contract's own estimate from its view (in lei when the contract is), else the row's.
  const viewEstimate = view?.estimate != null && view.rate != null && view.currency && !/^(RON|Leu)/iu.test(view.currency) ? view.estimate * view.rate : (view?.estimate ?? null)
  const estimate = viewEstimate ?? num(own.estimatedValueRon)
  const shown = value.kind === 'accepted' || value.kind === 'converted' ? value.value : null
  const currentValue = view?.ronValue ?? view?.value ?? null
  const year = own.contractDate ? Number(own.contractDate.slice(0, 4)) : null
  const division = code?.slice(0, 2) ?? ''
  return {
    id: own.id,
    title,
    titleFromProcedure: fromProcedure,
    kind: kindOf(own, title, view?.framework ?? null),
    value,
    date: own.contractDate,
    contractNo: own.contractNo?.trim() || null,
    noticeNo: own.noticeNo,
    cpv: code ? { code, label: cpvLabel ?? { ro: cpvDivisionLabelRo(division), en: cpvDivisionLabelRo(division) ? cpvDivisionLabelEn(division) : null } } : null,
    // A legacy notice repeats its whole estimate on every row: only a contract alone in its notice keeps one, and only when it says something.
    estimate:
      estimate !== null && shown !== null && hundred(estimate) !== hundred(shown) && (viewEstimate !== null || (alone && (year ?? 0) >= DIRECT_COMPARABLE_FROM)) ? estimate : null,
    authority: {
      cui: own.authority.cui,
      name: read.names.authority?.name ?? buyerName(tidyName(labels.get(own.authority.cui ?? '') ?? own.authority.name ?? own.authority.cui ?? '—'), null, false),
      identity: read.names.authority?.identity ?? null,
      hasBudget: read.names.authority?.hasBudget ?? false,
    },
    supplier: firmOf(own.supplier, labels),
    contract,
    others,
    noticeMore: read.notice.full,
    noticeUnread: read.notice.failed,
    amendments,
    procedure: procedureOf(read, contract, others),
    noticeUrl: noticeUrlOf(read),
    // The award notice states its values without VAT: this row's value is one of them when it is the notice's own entry, or equals the notice's.
    vatExcluded:
      own.sourceSystem === 'elicitatie_ca_award' || (shown !== null && view !== null && [view.ronValue, view.value].some((notice) => notice !== null && Math.abs(notice - shown) <= 1)),
    offers: offersOf(read),
    duration: lot && (lot.months || lot.days) ? { months: lot.months, days: lot.days } : null,
    criterion: lot?.criterion ?? null,
    call: source?.callNotice ?? null,
    awardNoticeDate: source?.awardNoticeDate ?? null,
    republished: source && source.awardNoticeVersions.length > 1 ? { times: source.awardNoticeVersions.length - 1, last: source.awardNoticeVersions[source.awardNoticeVersions.length - 1]! } : null,
    startDate: view?.startDate && view.startDate !== own.contractDate ? view.startDate : null,
    justification: annex && (annex.explanation || annex.forceMajeure || exclusive) ? { text: annex.explanation?.trim() || null, urgency: annex.forceMajeure, exclusive } : null,
    current: view && view.modified > 0 && currentValue !== null && hundred(currentValue) !== hundred(shown) ? { value: currentValue, modified: view.modified } : null,
    lots: source && source.lotsTotal > 1 ? { total: source.lotsTotal, cancelled: source.lots.filter((item) => /anulat/iu.test(item.status ?? '')).length } : null,
    source:
      own.sourceSystem === 'elicitatie_ca_award'
        ? { kind: 'notice', url: own.sourceUrl ? toElicitatieClientUrl(own.sourceUrl) : null, file: null }
        : { kind: 'export', url: own.sourceUrl, file: fileOf(own.sourceUrl) },
    alsoIn: read.duplicates.length,
    partial: read.names.failed || read.notice.failed,
  }
}

/** The year a party's procurement page opens on: the contract's, when the pages have it; else their default. */
export function linkYearOf(sheet: Pick<ContractSheet, 'date'>, latest: number = homeYear()): number | undefined {
  const year = sheet.date ? Number(sheet.date.slice(0, 4)) : null
  return year !== null && year >= DIRECT_COMPARABLE_FROM && year <= latest + 1 ? year : undefined
}

// ──────────────────────────────────────────────────────────── the context ──

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
  /** How many values SEAP publishes it at. */
  readonly rows: number
  readonly contractNo: string | null
}

/**
 * What passed between the two, by count — contract money is provisional
 * (§12.1): the pair's years since 2019, the pair's, the institution's and the
 * firm's year, the contracts around this one. A part whose read failed is
 * `null`, never a zero, and the context is `partial`.
 */
export interface CtContext {
  /** The contract's year. */
  readonly year: number
  /** The year in progress is read through SEAP's cutoff month („2026, până în mai"); null for a complete year. */
  readonly through: string | null
  /** The pair's years from 2019 — to the year in progress when SEAP has any of it, that year counted through its cutoff. */
  readonly years: readonly CtYear[] | null
  /** That year in progress, when the years run to it, and the month it is counted through: its column is drawn dashed. */
  readonly inProgress: { readonly year: number; readonly through: string } | null
  /** The pair in the contract's year: contracts and frameworks. */
  readonly pair: { readonly awards: number; readonly frameworks: number } | null
  readonly buyer: { readonly awards: number; readonly frameworks: number } | null
  readonly seller: { readonly awards: number } | null
  /** Every contract row between them since 2019. */
  readonly records: number | null
  readonly around: readonly CtOther[]
  readonly partial: boolean
}

/** What the context's reads need from the contract: both parties and its day. */
export interface CtContextInput {
  readonly id: string
  readonly authorityCui: string
  readonly supplierCui: string
  readonly day: string
}

/** Why a contract has no context to read: SEAP gives no CUI for a side, no date, or a date before 2019. */
export type CtContextGap = 'no-cui' | 'no-date' | 'before-comparable'

export function contractContextGapOf(sheet: Pick<ContractSheet, 'authority' | 'supplier' | 'date'>): CtContextGap | null {
  if (!sheet.authority.cui || !sheet.supplier.cui) return 'no-cui'
  if (!sheet.date) return 'no-date'
  return Number(sheet.date.slice(0, 4)) < DIRECT_COMPARABLE_FROM ? 'before-comparable' : null
}

export function contractContextInputOf(sheet: ContractSheet): CtContextInput | null {
  if (contractContextGapOf(sheet) !== null || !sheet.authority.cui || !sheet.supplier.cui || !sheet.date) return null
  return { id: sheet.id, authorityCui: sheet.authority.cui, supplierCui: sheet.supplier.cui, day: sheet.date }
}

/** Rows read either side of this contract's day: `full` when the side came back full, its farthest contract perhaps cut off. */
export interface CtAroundSide {
  readonly rows: readonly ContractRow[]
  readonly full: boolean
}

const aroundKeyOf = (row: ContractRow) => (row.noticeNo ? `${row.noticeNo}|${contractKeyOf(row)}` : row.id)

/**
 * The contracts around this one between the same two, newest first — a
 * contract's rows (its firms, its versions) collapsed into one — this page's
 * own kept in place even when the lists missed it. The lists read rows, not
 * contracts: a full side's farthest contract may have rows past it, so it is
 * left out rather than shown short.
 */
export function contractAroundOf(sheet: ContractSheet, newer: CtAroundSide, older: CtAroundSide, perSide = 3): readonly CtOther[] {
  const thisIds = new Set(sheet.contract.versions.flatMap((version) => version.ids))
  const thisKeys = new Set([...newer.rows, ...older.rows].filter((row) => row.id === sheet.id || thisIds.has(row.id)).map(aroundKeyOf))
  const cut = new Set(
    [newer, older]
      .filter((side) => side.full && side.rows.length > 0)
      .map((side) => aroundKeyOf(side.rows[side.rows.length - 1]!))
      .filter((key) => !thisKeys.has(key)),
  )
  const groups = new Map<string, ContractRow[]>()
  for (const row of [...newer.rows, ...older.rows]) {
    const key = aroundKeyOf(row)
    if (cut.has(key)) continue
    groups.set(key, [...(groups.get(key) ?? []).filter((item) => item.id !== row.id), row])
  }
  const own = figureOf(sheet.value)
  const others: CtOther[] = [...groups.values()].map((group) => {
    // This contract's group shows this page's row — not another version of it.
    const mine = group.find((row) => row.id === sheet.id) ?? group.find((row) => thisIds.has(row.id))
    const first = mine ?? group[0]!
    const figure = mine ? own : rowFigure(first)
    return {
      id: mine ? sheet.id : first.id,
      title: tidyTitle(group.find((row) => row.title)?.title ?? null) ?? (mine ? sheet.title : null),
      date: first.contractDate,
      value: figure.value,
      accepted: figure.accepted,
      framework: kindOf(first, first.title) === 'framework',
      rows: new Set(group.map((row) => hundred(num(row.valueRon)))).size,
      contractNo: first.contractNo?.trim() || null,
    }
  })
  if (!others.some((other) => other.id === sheet.id)) {
    others.push({ id: sheet.id, title: sheet.title, date: sheet.date, value: own.value, accepted: own.accepted, framework: sheet.kind === 'framework', rows: 1, contractNo: sheet.contractNo })
  }
  const sorted = others.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id.localeCompare(a.id))
  const at = sorted.findIndex((other) => other.id === sheet.id)
  return sorted.slice(Math.max(0, at - perSide), at + perSide + 1)
}

/** Every contract and framework between them since 2019, and the first year with one; null when the years were not read. */
export function contractsSince(context: CtContext): { readonly awards: number; readonly frameworks: number; readonly since: number | null } | null {
  if (context.years === null) return null
  const awards = context.years.reduce((sum, year) => sum + year.awards, 0)
  const frameworks = context.years.reduce((sum, year) => sum + year.frameworks, 0)
  return { awards, frameworks, since: context.years.find((year) => year.awards + year.frameworks > 0)?.year ?? null }
}
