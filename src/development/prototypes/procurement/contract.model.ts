import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { buyerName, tidyAddress, type BuyerIdentity } from '@/features/procurement/lib/buyer-model'
import { cpvDivisionLabelEn, cpvDivisionLabelRo } from '@/features/procurement/lib/cpv-labels'
import { toElicitatieClientUrl } from '@/features/procurement/lib/elicitatie-client-url'
import { DIRECT_COMPARABLE_FROM, homeYear, isUnpublishedProcedure, tidyName, tidyTitle } from '@/features/procurement/lib/home-model'
import type {
  ContractSheet,
  CtAmendment,
  CtContext,
  CtContract,
  CtKind,
  CtOffers,
  CtOther,
  CtParty,
  CtProcedure,
  CtValue,
  CtVersion,
  CtYear,
  RawContractRecord,
  RawContractRow,
  RawModification,
} from './contract.types'

/**
 * The contract page's rules, as far as the data lets it speak (§17.1): an
 * award row is one firm's line on a notice, so a contract is read from the
 * notice — the rows under its number are its firms (one value: an
 * association) or its versions (several values the source does not rank);
 * the amendments are the ones filed under its number; the procedure is shown
 * only when it is the institution's own.
 */

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

/** The row's title, else the display title — not one taken from a procedure that is another institution's (a legacy join). */
function titleOf(raw: RawContractRecord): string | null {
  const display = raw.contract.displayTitle
  const trusted = display?.source !== 'procedure' || (raw.procedure?.authorityCui != null && raw.procedure.authorityCui === raw.contract.authority.cui)
  return tidyTitle(raw.contract.title ?? (trusted ? (display?.text ?? null) : null))
}

export function kindOf(row: Pick<RawContractRow, 'recordKind' | 'valueStateRule' | 'title'>, title: string | null, sourceKind?: string | null): CtKind {
  // The notice's own word for it, when read: „Acord-cadru", „Contract subsecvent", „Contract de achizitii publice".
  if (sourceKind && /acord/iu.test(sourceKind)) return 'framework'
  if (sourceKind && /subsecvent/iu.test(sourceKind)) return 'call-off'
  if (row.recordKind === 'framework_agreement' || row.valueStateRule === 'framework_guard') return 'framework'
  return CALL_OFF_TITLE.test(title ?? row.title ?? '') ? 'call-off' : 'award'
}

/** The value as the platform judged it: checked (`valueAccepted`) or not, and why not. */
export function valueOf(row: RawContractRow & { readonly valueComparable?: string | null }): CtValue {
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

/** The figure a list may show for a row: its value, marked when the page cannot take it as checked. */
export function rowFigure(row: RawContractRow): { readonly value: number | null; readonly accepted: boolean } {
  const value = valueOf(row)
  if (value.kind === 'accepted' || value.kind === 'converted') return { value: value.value, accepted: true }
  if (value.kind === 'ceiling') return { value: value.value, accepted: false }
  if (value.kind === 'unverified') return { value: value.published, accepted: false }
  return { value: null, accepted: false }
}

// ─────────────────────────────────────────────────────────────── names ──

function identityOf(raw: RawContractRecord): { readonly name: string; readonly identity: BuyerIdentity; readonly hasBudget: boolean } | null {
  const entity = raw.names.entity
  const known = entity && (entity.reference !== null || !/^\d+$/u.test(entity.organization?.name ?? ''))
  if (!entity || !known) return null
  const townHall = entity.reference?.isTerritorialExecutive ?? false
  const labels = new Map(raw.names.labels)
  const cui = raw.contract.authority.cui ?? ''
  const identity: BuyerIdentity = {
    cui,
    name: buyerName(entity.organization?.name ?? entity.reference?.name ?? labels.get(cui) ?? '', entity.territory, townHall),
    entityType: entity.reference?.entityType ?? null,
    isTownHall: townHall,
    place: entity.territory,
    population: null,
    address: tidyAddress(entity.reference?.address ?? null),
    hasBudget: entity.budget?.presence ?? false,
  }
  return identity.name ? { name: identity.name, identity, hasBudget: identity.hasBudget } : null
}

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
function contractKeyOf(row: RawContractRow): string {
  const no = normalizeNo(row.contractNo)
  return no ? `no:${no}` : `row:${row.id}`
}

function contractOf(rows: readonly RawContractRow[], thisId: string, labels: ReadonlyMap<string, string>): CtContract {
  const firms = new Map<string, CtParty>()
  const firmOfRow = new Map<string, string>()
  for (const row of rows) firmOfRow.set(row.id, addFirm(firms, firmOf(row.supplier, labels)))
  // A row that joined a firm by name after that firm got its CUI key: resolve it to where the firm lives now.
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
function noticeOf(raw: RawContractRecord, labels: ReadonlyMap<string, string>): { readonly contract: CtContract; readonly others: readonly CtContract[] } {
  const own = raw.contract
  const rows = raw.notice.rows.filter((row) => row.noticeNo === own.noticeNo)
  if (!rows.some((row) => row.id === own.id)) rows.push(own)
  const groups = new Map<string, RawContractRow[]>()
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
function statedChange(text: string | null): number | null {
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
 * notice, and a notice holds several contracts); one with no number only when
 * the notice has no other contract it could belong to.
 */
function amendmentsOf(raw: RawContractRecord, alone: boolean): readonly CtAmendment[] {
  const own = normalizeNo(raw.contract.contractNo)
  return raw.contract.modifications
    .filter((item: RawModification) => (normalizeNo(item.contractNo) ? !own || normalizeNo(item.contractNo) === own : alone))
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

/** „…-t2-2025.xlsx" → „T2 2025"; „contracte-2010.csv" → „2010". */
function fileOf(url: string | null): string | null {
  const quarter = url?.match(/t[-_]?(iv|i{1,3}|[1-4])[-_](\d{4})\.(?:xlsx?|csv)$/iu)
  if (quarter?.[1] && quarter[2]) {
    const roman: Record<string, string> = { i: '1', ii: '2', iii: '3', iv: '4' }
    return `T${roman[quarter[1].toLowerCase()] ?? quarter[1]} ${quarter[2]}`
  }
  return url?.match(/(\d{4})\.(?:xlsx?|csv)$/iu)?.[1] ?? null
}

function procedureOf(raw: RawContractRecord, contract: CtContract, others: readonly CtContract[]): CtProcedure | null {
  const procedure = raw.procedure
  // Legacy rows are joined to a procedure by a bare notice number: another institution's, often. Only the institution's own is shown.
  if (!procedure || !procedure.authorityCui || procedure.authorityCui !== raw.contract.authority.cui) return null
  const awarded = num(procedure.awardedValueRon)
  const own = contract.versions.find((version) => version.isThis)?.value ?? null
  return {
    id: procedure.id,
    type: procedure.procedureType,
    unpublished: procedure.procedureType ? isUnpublishedProcedure(procedure.procedureType) : false,
    ted: raw.ted ? { no: raw.ted.tedNoticeNo, url: `https://ted.europa.eu/ro/notice/-/detail/${raw.ted.tedNoticeNo}` } : null,
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
 * The notice's winners of this contract join the row's firms: a member the
 * rows miss (an e-licitatie award row names one firm) is still a member, and
 * several winners of one contract won it together — or, for a framework,
 * share it.
 */
function withWinners(contract: CtContract, raw: RawContractRecord, labels: ReadonlyMap<string, string>): CtContract {
  const winners = raw.source?.contract?.winners ?? []
  if (winners.length === 0) return contract
  const firms = new Map(contract.firms.map((firm) => [firmKey(firm), firm]))
  for (const winner of winners) {
    const cui = winner.cui.replace(/^0+/u, '') || null
    const key = addFirm(firms, firmOf({ cui, name: winner.name }, labels))
    firms.set(key, { ...firms.get(key)!, sme: winner.sme, city: winner.city })
  }
  return { ...contract, firms: [...firms.values()], association: contract.association || winners.length > 1 }
}

/** The offers of this contract's lot, from its view; the notice counts them per contract and per lot. */
function offersOf(raw: RawContractRecord): CtOffers | null {
  const view = raw.source?.contract
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

export function contractSheetOf(raw: RawContractRecord): ContractSheet {
  const labels = new Map(raw.names.labels)
  const own = raw.contract
  const title = titleOf(raw)
  const notice = noticeOf(raw, labels)
  const amendments = amendmentsOf(raw, notice.others.length === 0)
  const contract = withWinners(withAmendments(notice.contract, amendments), raw, labels)
  const others = notice.others
  const source = raw.source
  const view = source?.contract ?? null
  // This contract's lot: the one its offers are counted on, else the notice's only lot.
  const lotNo = view?.lotOffers.length === 1 ? String(view.lotOffers[0]!.no) : null
  const lot = source?.lots.find((item) => lotNo !== null && String(item.no) === lotNo) ?? (source?.lots.length === 1 ? source.lots[0]! : null)
  const annex = source?.annexD
  const exclusive = /drepturi exclusive|art\.?\s*104\s*alin\.?\s*\(1\)\s*lit\.?\s*b/iu.test(annex?.explanation ?? '')
  const value = valueOf(own)
  const authority = identityOf(raw)
  const code = own.cpvCode?.slice(0, 8) ?? null
  const cpvLabel = code ? raw.cpv.find((item) => item.code === code) : undefined
  // The contract's own estimate from its view (in lei when the contract is), else the row's.
  const viewEstimate = view?.estimate != null && view.rate != null && view.currency && !/^(RON|Leu)/iu.test(view.currency) ? view.estimate * view.rate : (view?.estimate ?? null)
  const estimate = viewEstimate ?? num(own.estimatedValueRon)
  const shown = value.kind === 'accepted' || value.kind === 'converted' ? value.value : null
  const currentValue = view?.ronValue ?? view?.value ?? null
  const year = own.contractDate ? Number(own.contractDate.slice(0, 4)) : null
  return {
    id: own.id,
    title,
    kind: kindOf(own, title, view?.framework ?? null),
    value,
    date: own.contractDate,
    contractNo: own.contractNo?.trim() || null,
    noticeNo: own.noticeNo,
    cpv: code
      ? { code, label: cpvLabel ? { ro: cpvLabel.ro, en: cpvLabel.en } : { ro: cpvDivisionLabelRo(code.slice(0, 2)), en: cpvDivisionLabelRo(code.slice(0, 2)) ? cpvDivisionLabelEn(code.slice(0, 2)) : null } }
      : null,
    // A legacy notice repeats its whole estimate on every row: only a contract alone in its notice keeps one, and only when it says something.
    estimate: estimate !== null && shown !== null && hundred(estimate) !== hundred(shown) && (viewEstimate !== null || (others.length === 0 && (year ?? 0) >= DIRECT_COMPARABLE_FROM)) ? estimate : null,
    authority: {
      cui: own.authority.cui,
      name: authority?.name ?? buyerName(tidyName(labels.get(own.authority.cui ?? '') ?? own.authority.name ?? '—'), null, false),
      identity: authority?.identity ?? null,
      hasBudget: authority?.hasBudget ?? false,
    },
    supplier: firmOf(own.supplier, labels),
    contract,
    others,
    noticeRows: Math.max(raw.notice.total, raw.notice.rows.length),
    amendments,
    procedure: procedureOf(raw, contract, others),
    noticeUrl: source ? `https://e-licitatie.ro/pub/notices/ca-notices/view-c/${source.caNoticeId}` : null,
    // The award notice states its values without VAT: this row's value is one of them when it is the notice's own entry, or equals the notice's.
    vatExcluded: source !== null && (own.sourceSystem === 'elicitatie_ca_award' || (shown !== null && view !== null && [view.ronValue, view.value].some((notice) => notice !== null && Math.abs(notice - shown) <= 1))),
    offers: offersOf(raw),
    duration: lot && (lot.months || lot.days) ? { months: lot.months, days: lot.days } : null,
    criterion: lot?.criterion ?? null,
    call: source?.callNotice ?? null,
    awardNoticeDate: source?.awardNoticeDate ?? null,
    republished: source && source.awardNoticeVersions.length > 1 ? { times: source.awardNoticeVersions.length - 1, last: source.awardNoticeVersions[source.awardNoticeVersions.length - 1]! } : null,
    startDate: view?.startDate && view.startDate !== own.contractDate ? view.startDate : null,
    justification: annex && (annex.explanation || annex.forceMajeure || exclusive) ? { text: annex.explanation?.trim() || null, urgency: annex.forceMajeure, exclusive } : null,
    current: view && view.modified > 0 && currentValue !== null && hundred(currentValue) !== hundred(shown) ? { value: currentValue, modified: view.modified } : null,
    lots: source && source.lotsTotal > 1 ? { total: source.lotsTotal, cancelled: source.lots.filter((item) => /anulat/iu.test(item.status ?? '')).length } : null,
    spread: source?.offerSpread ?? null,
    source:
      own.sourceSystem === 'elicitatie_ca_award'
        ? { kind: 'notice', url: own.sourceUrl ? toElicitatieClientUrl(own.sourceUrl) : null, file: null }
        : { kind: 'export', url: own.sourceUrl, file: fileOf(own.sourceUrl) },
    alsoIn: raw.duplicates.length,
  }
}

// ──────────────────────────────────────────────────────────── the context ──

function aroundOf(raw: RawContractRecord, sheet: ContractSheet): readonly CtOther[] {
  const context = raw.context
  if (!context) return []
  const groups = new Map<string, RawContractRow[]>()
  for (const row of [...context.newer, ...context.older]) {
    const key = row.noticeNo ? `${row.noticeNo}|${contractKeyOf(row)}` : row.id
    groups.set(key, [...(groups.get(key) ?? []).filter((item) => item.id !== row.id), row])
  }
  const thisIds = new Set(sheet.contract.versions.flatMap((version) => version.ids))
  const others: CtOther[] = [...groups.values()].map((rows) => {
    // This contract's group shows this page's row — not another version of it.
    const mine = rows.find((row) => row.id === sheet.id) ?? rows.find((row) => thisIds.has(row.id))
    const first = mine ?? rows[0]!
    const figure = mine ? rowFigure(raw.contract) : rowFigure(first)
    return {
      id: mine ? sheet.id : first.id,
      title: tidyTitle(rows.find((row) => row.title)?.title ?? null) ?? (mine ? sheet.title : null),
      date: first.contractDate,
      value: figure.value,
      accepted: figure.accepted,
      framework: kindOf(first, first.title) === 'framework',
      rows: new Set(rows.map((row) => hundred(num(row.valueRon)))).size,
      contractNo: first.contractNo?.trim() || null,
    }
  })
  if (!others.some((other) => other.id === sheet.id)) {
    const figure = rowFigure(raw.contract)
    others.push({ id: sheet.id, title: sheet.title, date: sheet.date, value: figure.value, accepted: figure.accepted, framework: sheet.kind === 'framework', rows: 1, contractNo: sheet.contractNo })
  }
  const sorted = others.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || b.id.localeCompare(a.id))
  const at = sorted.findIndex((other) => other.id === sheet.id)
  return sorted.slice(Math.max(0, at - 3), at + 4)
}

export function contractContextOf(raw: RawContractRecord, sheet: ContractSheet): CtContext | null {
  const context = raw.context
  if (!context) return null
  // To the year in progress, as the direct-purchase page's years run: „din 2019 încoace" holds for a contract of any year.
  const last = homeYear() + 1
  const at = (points: readonly { readonly year: number; readonly value: number | null }[], year: number) => points.find((point) => point.year === year)?.value ?? 0
  const years: CtYear[] = []
  for (let year = DIRECT_COMPARABLE_FROM; year <= last; year += 1) {
    years.push({
      year,
      awards: at(context.awards, year),
      frameworks: at(context.frameworks, year),
      direct: at(context.direct, year),
      directLei: context.direct.find((point) => point.year === year)?.lei ?? null,
    })
  }
  return {
    year: context.year,
    years,
    pairAwards: context.pairYear?.count ?? 0,
    pairFrameworks: at(context.frameworks, context.year),
    buyer: {
      awards: context.buyer.awards?.count ?? 0,
      frameworks: context.buyer.frameworks?.count ?? 0,
      firms: context.buyer.firms.parties,
      more: context.buyer.firms.more,
    },
    seller: { awards: context.seller.awards?.count ?? 0, clients: context.seller.clients.parties, more: context.seller.clients.more, fromThis: context.seller.clients.count },
    records: context.records,
    around: aroundOf(raw, sheet),
  }
}
