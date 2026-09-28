import { plural, selectOrdinal, t } from '@lingui/core/macro'
import { formatHubNumber, hubNumberLocale } from '@/features/private-companies/lib/hub-format'
import { getUserLocale } from '@/lib/utils'
import type { BuyerIdentity } from './buyer-model'
import { buyerKind, inCounty } from './buyer-text'
import { moneyText, monthText, percentText } from './home-format'
import {
  byMoney,
  excludedLine,
  titleNamesOneLine,
  type DirectPurchase,
  type DpContext,
  type DpContractType,
  type DpFamily,
  type DpItem,
  type DpLabel,
  type DpOutcome,
  type DpPeers,
} from './direct-purchase-model'

/**
 * Every sentence the direct-purchase page says, computed from the record so
 * it holds for any purchase — and left out when the data would not support
 * it. Numbers follow the page's language (`hub-format`).
 */

const NBSP = '\u00a0'

// ───────────────────────────────────────────────────────────── numbers ──

/** Lei as a receipt writes them, to the ban: „98.448 lei", „479,71 lei". */
export function leiExact(value: number): string {
  const cents = Math.round(value * 100)
  const figure = formatHubNumber(cents / 100, { digits: cents % 100 === 0 ? 0 : 2 })
  return `${figure}${NBSP}lei`
}

/** Lei for a total over many records: „1,76 mil. lei", „98.448 lei". */
export function leiShort(value: number): string {
  return moneyText(value)
}

/** A quantity with its own decimals, up to three: „18,35", „150". */
export function quantityText(value: number): string {
  const decimals = Math.min(3, (String(value).split('.')[1] ?? '').length)
  return formatHubNumber(value, { digits: decimals })
}

const UNIT_WORDS: Readonly<Record<string, string>> = {
  bucata: 'buc.',
  bucată: 'buc.',
  buc: 'buc.',
  'buc.': 'buc.',
  kg: 'kg',
  kilogram: 'kg',
  litru: 'l',
  l: 'l',
  luna: 'lună',
  lună: 'lună',
}

/** The source's unit, read: „bucata", „BUC" and „bucată" are one „buc."; anything else in lower case, as written. */
export function unitText(unit: string | null): string | null {
  if (!unit) return null
  const key = unit.trim().toLocaleLowerCase('ro-RO')
  if (key === '') return null
  return UNIT_WORDS[key] ?? key
}

const dayFormatters = new Map<string, Intl.DateTimeFormat>()

/** `2026-01-21` → „21 ianuarie 2026", in the page's language; an unreadable date as written. */
export function dayLong(date: string): string {
  const locale = hubNumberLocale()
  let formatter = dayFormatters.get(locale)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    dayFormatters.set(locale, formatter)
  }
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(parsed.getTime()) ? date : formatter.format(parsed)
}

/** `2026-01-21` → „21.01.2026": a date in a list. */
export function dayShort(date: string): string {
  return date.slice(0, 10).split('-').reverse().join('.')
}

/** When, as the sentence says it: „pe 21 ianuarie 2026", or that SEAP does not publish the date. */
export function whenText(day: string | null): string {
  if (!day) return t`la o dată nepublicată`
  const on = dayLong(day)
  return t`pe ${on}`
}

/** Whole days between two dates, by the calendar. */
export function daysBetween(from: string, to: string): number {
  const a = Date.parse(`${from.slice(0, 10)}T00:00:00Z`)
  const b = Date.parse(`${to.slice(0, 10)}T00:00:00Z`)
  return Math.round((b - a) / 86_400_000)
}

/** „în aceeași zi", „a doua zi", „după 3 zile". */
export function afterText(days: number): string {
  if (days <= 0) return t`în aceeași zi`
  if (days === 1) return t`a doua zi`
  return plural(days, { one: 'după # zi', few: 'după # zile', other: 'după # de zile' })
}

/** Masculine ordinals, as a rank reads: „primul", „al doilea", „al 28-lea". */
export function ordinalText(rank: number): string {
  switch (rank) {
    case 1:
      return t({ message: 'primul', context: 'rank' })
    case 2:
      return t({ message: 'al doilea', context: 'rank' })
    case 3:
      return t({ message: 'al treilea', context: 'rank' })
    case 4:
      return t({ message: 'al patrulea', context: 'rank' })
    case 5:
      return t({ message: 'al cincilea', context: 'rank' })
    case 6:
      return t({ message: 'al șaselea', context: 'rank' })
    case 7:
      return t({ message: 'al șaptelea', context: 'rank' })
    case 8:
      return t({ message: 'al optulea', context: 'rank' })
    case 9:
      return t({ message: 'al nouălea', context: 'rank' })
    case 10:
      return t({ message: 'al zecelea', context: 'rank' })
    default:
      // Romanian writes every rank past ten „al 11-lea"; the translation picks its own ordinal forms.
      return selectOrdinal(rank, { one: 'al #-lea', other: 'al #-lea' })
  }
}

// ───────────────────────────────────────────────────────────── counts ──

export function itemsCount(value: number): string {
  return plural(value, { one: '# produs', few: '# produse', other: '# de produse' })
}

/** A basket's lines, named for what they are: products, services or works. */
export function basketCount(value: number, type: DpContractType | null): string {
  if (type === 'services') return plural(value, { one: '# serviciu', few: '# servicii', other: '# de servicii' })
  if (type === 'works') return plural(value, { one: '# lucrare', few: '# lucrări', other: '# de lucrări' })
  return itemsCount(value)
}

export function contractTypeText(type: DpContractType | null): string | null {
  if (type === 'supply') return t({ message: 'furnizare de produse', context: 'contract type' })
  if (type === 'services') return t({ message: 'servicii', context: 'contract type' })
  if (type === 'works') return t({ message: 'lucrări', context: 'contract type' })
  return null
}

export function purchasesCount(value: number): string {
  return plural(value, { one: '# achiziție', few: '# achiziții', other: '# de achiziții' })
}

export function directSalesCount(value: number): string {
  return plural(value, { one: '# vânzare directă', few: '# vânzări directe', other: '# de vânzări directe' })
}

/** How many more times: „încă o dată", „de încă 3 ori". */
export function timesText(value: number): string {
  return plural(value, { one: 'încă o dată', few: 'de încă # ori', other: 'de încă # de ori' })
}

// ───────────────────────────────────────────────────────────── labels ──

/** A label in the page's language, the other when the API gives only one. */
export function labelText(label: DpLabel | null): string | null {
  if (!label) return null
  return getUserLocale() === 'ro' ? (label.ro ?? label.en) : (label.en ?? label.ro)
}

/** What an institution is and where, as its own page says it: „Spital, județul Mureș". */
export function aboutText(identity: BuyerIdentity | null): string | null {
  if (!identity) return null
  const kind = buyerKind(identity)
  const county = identity.place?.countyCode
  return county ? `${kind}, ${inCounty(county)}` : kind
}

/** The other SEAP sources that publish the same purchase, said once in the source line. */
export function alsoInText(families: readonly DpFamily[]): string | null {
  if (families.length === 0) return null
  const names = families.map((family) =>
    family === 'catalog' ? t`catalogul electronic` : family === 'notification' ? t`notificările de atribuire` : t`raportul trimestrial al achizițiilor directe`,
  )
  const list = names.join(t` și `)
  return t`SEAP o publică și în ${list}; Transparenta o numără o singură dată.`
}

// ────────────────────────────────────────────────────────────── title ──

export function titleOf(purchase: DirectPurchase): string {
  return purchase.title ?? t`Achiziție directă fără titlu în SEAP`
}

/** „și alte 5 produse", after a title that names one line of a basket; null otherwise. */
export function titleRestText(purchase: DirectPurchase): string | null {
  if (!titleNamesOneLine(purchase)) return null
  const rest = (purchase.detail?.items.length ?? 1) - 1
  if (rest === 1) return t`și încă un produs`
  const others = itemsCount(rest)
  return t`și alte ${others}`
}

// ──────────────────────────────────────────────────────────── outcome ──

/** The status in two or three words. */
export function outcomeLabel(outcome: DpOutcome): string {
  switch (outcome.kind) {
    case 'accepted':
      return t`Finalizată`
    case 'reported':
      return t`Raportată în SEAP`
    case 'firm-refused':
      return t`Refuzată de firmă`
    case 'firm-late':
      return t`Fără răspunsul firmei`
    case 'institution-refused':
      return t`Refuzată de instituție`
    case 'institution-late':
      return t`Neacceptată la timp`
    case 'stopped':
      return t`Nefinalizată`
    case 'unknown':
      return t`Stare necunoscută`
  }
}

/** A reason the source wrote, quoted as written. */
export function reasonText(reason: string): string {
  const clean = reason.trim().replace(/\.$/, '')
  return `„${clean}”`
}

/** Why an attempt is not a purchase, in one clause after „Achiziția nu s-a făcut:". */
export function refusalText(outcome: DpOutcome): string | null {
  switch (outcome.kind) {
    case 'firm-refused': {
      if (!outcome.reason) return t`firma a refuzat condițiile instituției.`
      const reason = reasonText(outcome.reason)
      return t`firma a refuzat condițiile instituției (${reason}).`
    }
    case 'firm-late':
      return t`firma nu a răspuns la timp.`
    case 'institution-refused': {
      if (!outcome.reason) return t`instituția a refuzat oferta firmei.`
      const reason = reasonText(outcome.reason)
      return t`instituția a refuzat oferta firmei (${reason}).`
    }
    case 'institution-late':
      return t`instituția nu a acceptat oferta la timp.`
    case 'stopped':
      return t`SEAP o arată anulată.`
    default:
      return null
  }
}

/** Under the status in the facts: who accepted, who refused and why, or where SEAP has it from. */
export function outcomeDetailText(outcome: DpOutcome, family: 'catalog' | 'export' | 'notification'): string | null {
  switch (outcome.kind) {
    case 'accepted':
      return t`Ambele părți au acceptat.`
    case 'reported':
      return family === 'notification' ? t`Din notificarea instituției; SEAP nu spune pașii.` : t`Din raportul trimestrial; SEAP nu spune pașii.`
    case 'firm-refused':
    case 'institution-refused':
      return outcome.reason ? reasonText(outcome.reason) : null
    case 'stopped':
      return t`SEAP nu spune cine a oprit-o.`
    case 'unknown':
      return t`SEAP nu spune cum s-a încheiat.`
    default:
      return null
  }
}

// ──────────────────────────────────────────────────────────── receipt ──

/** Each counted line's share of the basket's money; null when a line's money is unknown — the shares would be of a part. */
export function lineShares(purchase: DirectPurchase): ReadonlyMap<DpItem, number> | null {
  const excluded = excludedLine(purchase)
  const items = (purchase.detail?.items ?? []).filter((item) => item !== excluded)
  if (items.length < 2 || items.some((item) => item.line === null)) return null
  const total = items.reduce((sum, item) => sum + (item.line ?? 0), 0)
  if (total <= 0) return null
  return new Map(items.map((item) => [item, (item.line ?? 0) / total]))
}

/** One sentence on where the basket's money went — its size is among the facts; none for a single line, or when a line's money is unknown. */
export function receiptLede(purchase: DirectPurchase): string | null {
  const shares = lineShares(purchase)
  const [top] = byMoney([...(shares?.keys() ?? [])])
  const share = top ? shares?.get(top) : undefined
  if (!top || share === undefined) return null
  const name = top.name
  const part = percentText(share, 0)
  if (share > 0.5) return t`Un singur rând, ${name}, face mai mult de jumătate din bani.`
  if (share >= 0.2) return t`Cel mai mare rând, ${name}, face ${part} din bani.`
  return t`Niciun rând nu domină: cel mai mare face ${part} din bani.`
}

/** When the lines do not add up to the value: the gap, and the line it equals if one does. */
export function reconciliationText(purchase: DirectPurchase): string | null {
  const detail = purchase.detail
  if (!detail || detail.itemsTotal === null || purchase.value === null) return null
  const match = excludedLine(purchase)
  const lines = leiExact(detail.itemsTotal)
  const value = leiExact(purchase.value)
  if (match) {
    const name = match.name
    return t`Rândurile adună ${lines}, iar achiziția are ${value}: diferența e exact rândul ${name}, tăiat mai sus, probabil scos din comandă după ofertă. SEAP publică ambele cifre; pagina numără valoarea achiziției.`
  }
  return t`Rândurile adună ${lines}, iar achiziția are ${value}. SEAP publică ambele cifre; pagina numără valoarea achiziției.`
}

/** The same product from the same firm, at other institutions: one price, or a range with where this price falls. */
export function peersText(item: DpItem, peers: DpPeers, year: number): string {
  const institutions = plural(peers.buyers, { one: 'o altă instituție', few: 'alte # instituții', other: 'alte # de instituții' })
  const Institutions = plural(peers.buyers, { one: 'O altă instituție', few: 'Alte # instituții', other: 'Alte # de instituții' })
  if (peers.min === peers.max) {
    const price = leiExact(peers.min)
    return peers.min === item.unitPrice
      ? t`Același preț la ${institutions} care l-au cumpărat de la firmă în ${year}.`
      : t`${Institutions} l-au cumpărat de la firmă în ${year} cu ${price}.`
  }
  const range = `${leiExact(peers.min)} – ${leiExact(peers.max)}`
  const price = item.unitPrice
  let where: string
  if (price === null) where = t`aici, fără preț pe unitate`
  else if (price <= peers.min) where = t`aici, cel mai mic preț`
  else if (price >= peers.max) where = t`aici, cel mai mare preț`
  else if (price > peers.median) {
    const above = percentText(price / peers.median - 1, 0)
    where = t`aici, ${above} peste mediană`
  } else if (price < peers.median) {
    const below = percentText(1 - price / peers.median, 0)
    where = t`aici, ${below} sub mediană`
  } else where = t`aici, prețul median`
  return t`${Institutions} l-au cumpărat de la firmă în ${year} cu ${range}; ${where}.`
}

export function catalogText(item: DpItem): string | null {
  if (item.catalogPrice === null || item.unitPrice === null || item.catalogPrice === item.unitPrice) return null
  const change = item.unitPrice / item.catalogPrice - 1
  const catalog = leiExact(item.catalogPrice)
  const part = percentText(Math.abs(change), 0)
  return change < 0 ? t`Cu ${part} sub prețul din catalogul firmei (${catalog}).` : t`Cu ${part} peste prețul din catalogul firmei (${catalog}).`
}

export function repeatsText(item: DpItem, year: number): string | null {
  if (item.repeats === null || item.repeats <= 0) return null
  const times = timesText(item.repeats)
  return t`Instituția l-a cumpărat de la firmă ${times} în ${year}.`
}

// ──────────────────────────────────────────────────────────── context ──

/** „2026 (până în mai)" for the year in progress, „2025" for a complete one. */
export function contextYearText(context: Pick<DpContext, 'year' | 'through'>): string {
  if (!context.through) return String(context.year)
  const month = monthText(context.through).split(' ')[0]
  const year = context.year
  return t`${year} (până în ${month})`
}

/** A share, with a floor: „sub 0,1%" rather than a „0,0%" that reads as nothing. */
export function shareText(share: number): string {
  return share < 0.001 ? t`sub 0,1%` : percentText(share)
}
