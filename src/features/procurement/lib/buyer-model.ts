import type { CategoryFigure } from './home-categories'
import { DIRECT_COMPARABLE_FROM, tidyName, type RecentRecord, type YearPoint } from './home-model'
import type { ProfilePeriod } from './profile-period'

/**
 * One buyer's procurement page (`/procurement/institutions/$cui`): the shapes
 * the page reads and the pure helpers that name and place the buyer.
 *
 * Money rules as on the front door: direct purchases are the clean money
 * (accepted values, excl. VAT, comparable from 2019); contract money is
 * provisional; a count or a sum the API withheld is null — unknown, never 0.
 */

export interface BuyerIdentity {
  readonly cui: string
  readonly name: string
  /** The budget platform's entity type (`uat`, `health`, `education`, …); null when it has no record of the buyer. */
  readonly entityType: string | null
  /** A town hall: its territory is a UAT and its residents are its population. */
  readonly isTownHall: boolean
  readonly place: {
    /** `commune` | `town` | `municipality` | `county` | `sector` | … */
    readonly kind: string | null
    readonly name: string
    readonly countyCode: string | null
    readonly countyName: string | null
  } | null
  /** The UAT's residents, for a town hall only. */
  readonly population: { readonly year: number; readonly value: number } | null
  readonly address: string | null
  /** The budget platform publishes its execution: the page links to it. */
  readonly hasBudget: boolean
}

export interface GrainFigures {
  readonly count: number | null
  readonly valued: number | null
  readonly value: number | null
  /** Distinct suppliers (CUIs) with at least one record. */
  readonly suppliers: number | null
}

export interface SupplierFigure {
  readonly cui: string
  readonly count: number
  readonly value: number | null
  /** Share of the scope on the basis the server ranked by. */
  readonly share: number | null
}

export interface SupplierRanking {
  /** What the server actually ranked by — value only where the spend gate allowed it. */
  readonly rankedBy: 'value' | 'count'
  readonly rows: readonly SupplierFigure[]
}

export interface CountyShare {
  /** The county code (`CJ`, `B`). */
  readonly code: string
  readonly count: number
  readonly value: number | null
  readonly share: number | null
}

export interface ProcedureCount {
  /** SEAP's procedure type, as it spells it. */
  readonly key: string
  readonly count: number
}

export interface MonthFigure {
  /** `YYYY-MM`. */
  readonly month: string
  readonly value: number | null
  readonly count: number | null
}

export interface SupplierYears {
  readonly cui: string
  /** Direct-purchase money per year from 2019 through the last complete year; null when the firm sold nothing that year. */
  readonly years: readonly { readonly year: number; readonly value: number | null }[]
  readonly total: number
}

export interface BuyerProfile {
  readonly identity: BuyerIdentity
  /** What the page describes: the last twelve months through SEAP's cutoff, or a calendar year. */
  readonly period: ProfilePeriod
  /** The last complete year when the read was made; the year after it is the year in progress. */
  readonly latest: number
  /** The buyer's county: the budget platform's, else the one its procurement records carry. */
  readonly county: string | null
  readonly direct: GrainFigures
  /** What the change compares with — the twelve months before, the year before; null for 2019 (legacy SEAP before it) and the year in progress. */
  readonly directPrev: GrainFigures | null
  /**
   * Contract awards only; framework agreements are ceilings, counted apart.
   * A count is of award rows: a contract won by a consortium counts once per
   * member firm, as SEAP publishes it.
   */
  readonly awards: GrainFigures
  readonly frameworks: number | null
  /** Direct purchases per year from 2019, the year in progress through its cutoff month. */
  readonly directYears: readonly YearPoint[]
  /** Contract awards per year from 2019 (counts), the year in progress likewise. */
  readonly awardYears: readonly YearPoint[]
  /** The year in progress, when the read kept a column for it. */
  readonly partYear: number | null
  /** The newest month SEAP is complete enough to read, nationally, per population. */
  readonly cutoff: { readonly direct: string | null; readonly contract: string | null }
  readonly directMonths: readonly MonthFigure[]
  readonly directSuppliers: SupplierRanking
  readonly awardSuppliers: SupplierRanking
  readonly categories: { readonly direct: readonly CategoryFigure[]; readonly contract: readonly CategoryFigure[] }
  /** Direct purchases by the supplier's county. */
  readonly supplierCounties: readonly CountyShare[]
  /** What the county shares are of: money, or records where no valued purchase carries a supplier county. */
  readonly supplierCountiesRankedBy: 'value' | 'count'
  /** Contract awards by procedure type, by number. */
  readonly procedures: readonly ProcedureCount[]
  /** Awards past the listed procedure types, or with none recorded: never „all had a notice". */
  readonly proceduresUnlisted: number
  /** Supplier names by CUI; a CUI the identity spine cannot name is missing. */
  readonly names: ReadonlyMap<string, string>
  /** The top direct-purchase sellers since 2019, year by year; empty when that read failed. */
  readonly supplierYears: readonly SupplierYears[]
  /** The buyer's direct purchases against its county's, over the page's period. */
  readonly countyShare: { readonly county: string; readonly share: number } | null
  /**
   * A read failed — the budget platform's identity, or the follow-up — and the
   * page stands on the rest: it is served, never kept or cached, and read
   * again on the next visit.
   */
  readonly partial: boolean
  /** The follow-up failed: the firms show their CUIs, and the matrix and the county share are left out. */
  readonly namesUnread: boolean
}

export interface BuyerRecords {
  /** The period's largest contract awards, a consortium on one row. */
  readonly contracts: readonly RecentRecord[]
  /** The period's largest direct purchases. */
  readonly direct: readonly RecentRecord[]
}

// ───────────────────────────────────────────────────────── the buyer ──

const PLACE_PREFIX = /^(ORA[SȘŞ](UL)?|MUNICIPIU(L)?|COMUN(A|Ă)|JUDE[TȚŢ](UL)?)\s+/i
const PLACE_WORD: Readonly<Record<string, string>> = { commune: 'Comuna', town: 'Orașul', municipality: 'Municipiul', county: 'Județul' }

/**
 * A town hall is named by its territory, which the budget platform spells
 * with diacritics („Orașul Otopeni", not the registry's „ORASUL OTOPENI");
 * anyone else keeps its registry name, set in reading case.
 */
export function buyerName(organization: string, place: { readonly kind: string | null; readonly name: string } | null, townHall: boolean): string {
  if (townHall && place?.kind === 'sector' && /^SECTOR/i.test(place.name)) return tidyName(place.name.toLocaleUpperCase('ro-RO'))
  const word = place?.kind ? PLACE_WORD[place.kind] : undefined
  if (!townHall || !place || !word) return tidyName(organization)
  const bare = place.name.replace(PLACE_PREFIX, '').trim()
  return bare ? `${word} ${tidyName(bare.toLocaleUpperCase('ro-RO'))}` : tidyName(organization)
}

const EMPTY_FIELD = /^(Bloc\/Scara|Sector|Numar|Cod postal)\s*-?$/i

/**
 * The reference address without its empty form fields („Bloc/Scara , Sector ,")
 * and the county it opens with: „Str. 23 August, nr. 10, 75100".
 */
export function tidyAddress(address: string | null): string | null {
  if (!address) return null
  const parts = address
    .split(',')
    .map((part) => part.trim().replace(/\s+/g, ' '))
    .filter((part) => part !== '' && !EMPTY_FIELD.test(part))
    .map((part) =>
      part
        .replace(/^Numar\s+/i, 'nr. ')
        .replace(/^Cod postal\s+/i, '')
        .replace(/^Bloc\/Scara\s+/i, 'bl. ')
        .replace(/^Sector\s+/i, 'sector ')
        .replace(/^STRADA\s+/i, 'Str. ')
        .replace(/^BULEVARD(UL)?\s+/i, 'Bd. ')
        .replace(/^[SȘ]OSEA(UA)?\s+/i, 'Șos. ')
        .replace(/^CALEA\s+/i, 'Calea ')
        .replace(/^PIATA\s+/i, 'Piața '),
    )
    // A street in capitals reads in reading case, as names do.
    .map((part) => tidyName(part))
  // The county opens the address and the page says it already.
  const rest = parts.slice(1)
  return rest.length > 0 ? rest.join(', ') : null
}

/** Direct-purchase lei per resident, for a town hall whose population is known. */
export function perResident(profile: BuyerProfile): number | null {
  const people = profile.identity.isTownHall ? profile.identity.population?.value : null
  return people && people > 0 && profile.direct.value !== null ? profile.direct.value / people : null
}

/**
 * Any record since 2019: a direct purchase or a contract award in any year,
 * or a framework agreement in the year shown. A CUI without one (a supplier's,
 * a mistyped one) is not a buyer's page.
 */
export function hasAnyRecord(profile: BuyerProfile): boolean {
  return [...profile.directYears, ...profile.awardYears].some((point) => (point.count ?? 0) > 0) || (profile.frameworks ?? 0) > 0
}

/** The period had no record at all: the page says so once instead of seven empty bands. */
export function isEmptyYear(profile: BuyerProfile): boolean {
  return (profile.direct.count ?? 0) === 0 && (profile.awards.count ?? 0) === 0 && (profile.frameworks ?? 0) === 0
}

/**
 * The firms that sold to the buyer in (nearly) every year since 2019 — all
 * but one year at most. A standing relationship, stated, not judged.
 */
export function steadySellers(rows: readonly SupplierYears[], through: number): readonly SupplierYears[] {
  const span = through - DIRECT_COMPARABLE_FROM + 1
  if (span < 3) return []
  return rows.filter((row) => row.years.filter((point) => point.year <= through && point.value !== null && point.value > 0).length >= span - 1)
}

/** A supplier's name, or its CUI when the identity spine cannot name it. */
export function supplierName(profile: BuyerProfile, cui: string): string {
  return profile.names.get(cui) ?? cui
}
