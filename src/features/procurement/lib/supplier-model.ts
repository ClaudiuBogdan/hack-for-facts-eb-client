import { buildCompanyProfileModel, type CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'
import type { PrivateCompanyProfile } from '@/schemas/private-company'
import type { CategoryFigure } from './home-categories'
import { DIRECT_COMPARABLE_FROM, type RecentRecord, type YearPoint } from './home-model'
import type { CountyFigureRow, PartyYears, ProcedureCountRow } from './profile-model'

/**
 * One firm's procurement page (`/procurement/suppliers/$cui`) as read. Two
 * populations, never summed: direct purchases (clean money, without VAT,
 * comparable from 2019) and contracts won through a procedure (counted; their
 * money is provisional).
 *
 * Contracts are counted from the record list, where a consortium member keeps
 * its row. The analysis withholds a consortium's money from each member's
 * figures (SEAP never publishes the split) and, for some firms, its rows too
 * (a foreign member's: Hydrostroy, 2 of 16). So the page reads the firm's
 * contract rows and finds, for each, the other firms on the same award.
 */

export interface GrainFigures {
  readonly count: number | null
  readonly valued: number | null
  readonly value: number | null
}

/** A ranked institution: what the firm got from it in the year. */
export interface ClientRow {
  readonly cui: string
  readonly count: number
  readonly value: number | null
  /** Of the firm's own total, on the ranking's measure. */
  readonly share: number | null
}

export interface ClientRanking {
  readonly rankedBy: 'value' | 'count'
  readonly rows: readonly ClientRow[]
}

/** The other side: the firm's share of the institution's own direct purchases in the year, and whether it led them. */
export interface ClientWeight {
  readonly share: number | null
  readonly first: boolean
}

/** A firm the page's firm won contracts with. */
export interface Partner {
  /** The partner's CUI, or its name for a firm with none (a foreign one). */
  readonly key: string
  readonly cui: string | null
  readonly name: string
  readonly contracts: number
  /** The institutions of the contracts won together, by name. */
  readonly buyers: readonly string[]
}

/** The year's contracts as the record list holds them, consortia included. */
export interface ContractPicture {
  /** The award rows, as SEAP publishes them and the explorer lists them (a contract's lots are rows of their own). */
  readonly count: number
  /** Rows read for the consortium scan: the largest by value, at most a hundred. */
  readonly scanned: number
  /** Among the rows read, the ones won together with other firms. */
  readonly together: number
  /** Those rows as awards (one per buyer, notice and contract number). */
  readonly togetherContracts: number
  /** The awards among them whose rows agree on a value. */
  readonly togetherValued: number
  /** Their whole value, each award once: SEAP never publishes a member's part. */
  readonly togetherValue: number | null
  /** Rows the scan could not tell: no buyer, day, notice or contract number, or a day fuller than one read. */
  readonly unresolved: number
  readonly partners: readonly Partner[]
  /** Clients by number of contracts when every row was read (consortia included); null when the list was longer. */
  readonly clients: ClientRanking | null
  /** How many institutions those rows came from, when every row was read. */
  readonly buyers: number | null
  /** The year's largest contracts, every winner named. */
  readonly largest: readonly RecentRecord[]
  /** The contracts' reader categories, consortia included at their whole value, when every row was read. */
  readonly categories: readonly CategoryFigure[] | null
  /** The contracts by their buyer's county, consortia included, when every row was read and its buyers placed. */
  readonly counties: readonly CountyFigureRow[] | null
}

export interface SupplierProfile {
  readonly cui: string
  readonly year: number
  /** The last complete year. */
  readonly latest: number
  /** The year in progress is read through this month (SEAP's cutoff); null for a complete year. */
  readonly through: string | null
  /** The firm's name: the registry's, as the company page writes it; else its own records', else its CUI. */
  readonly name: string
  /** The company registry's record; null for a firm it does not hold (a foreign one) or could not read. */
  readonly registry: PrivateCompanyProfile | null
  /** The registry could not be read: the page says nothing of what the firm is, rather than calling it foreign. */
  readonly registryFailed: boolean
  readonly direct: GrainFigures & { readonly clients: number | null }
  /** The whole year before; null for 2019 (the year before is legacy SEAP) and for the year in progress. */
  readonly directPrev: GrainFigures | null
  /** The analysis's figures for the contract awards: every row counted (for most firms), the money without consortium awards. */
  readonly awards: GrainFigures
  readonly contracts: ContractPicture
  readonly directYears: readonly YearPoint[]
  /** Contract award rows per year, consortia included. */
  readonly contractYears: readonly YearPoint[]
  readonly partYear: number | null
  readonly cutoff: { readonly direct: string | null; readonly contract: string | null }
  readonly directClients: ClientRanking
  /** Contract clients from the analysis, for a year with too many rows to read. */
  readonly analysisClients: ClientRanking
  readonly weights: ReadonlyMap<string, ClientWeight>
  readonly clientYears: readonly PartyYears[]
  readonly categories: { readonly direct: readonly CategoryFigure[]; readonly contract: readonly CategoryFigure[] }
  /** The buyers' counties: by direct-purchase money, or — for a firm with none — by contracts. */
  readonly counties: readonly CountyFigureRow[]
  readonly countiesRankedBy: 'value' | 'count'
  /** What the counties count: the year's direct purchases, or — for a firm with none — its contracts. */
  readonly countiesOf: 'direct' | 'contracts'
  /** The contract awards by procedure, as the analysis counts them. */
  readonly procedures: readonly ProcedureCountRow[]
  readonly proceduresUnlisted: number
  /** The first year with any record since 2019. */
  readonly firstYear: number | null
  readonly names: ReadonlyMap<string, string>
  /** Some part could not be read (the registry, names, the matrix, the weights, the partners): served once, never kept. */
  readonly partial: boolean
}

/** The page's view of a profile: the registry's model, and the county the firm sits in. */
export interface SupplierView extends SupplierProfile {
  readonly company: CompanyProfileModel | null
  readonly county: string | null
}

export function supplierView(profile: SupplierProfile): SupplierView {
  const company = profile.registry ? buildCompanyProfileModel(profile.registry) : null
  return { ...profile, company, county: company?.place.countyCode ?? null }
}

/** A year from 2019 through the year in progress; anything else, and no year, is the last complete one. */
export function supplierYear(requested: number | undefined, latest: number): number {
  return requested !== undefined && Number.isInteger(requested) && requested >= DIRECT_COMPARABLE_FROM && requested <= latest + 1 ? requested : latest
}

export function clientName(profile: Pick<SupplierProfile, 'names'>, cui: string): string {
  return profile.names.get(cui) ?? cui
}

export function hasAnyRecord(profile: Pick<SupplierProfile, 'directYears' | 'contractYears'>): boolean {
  return profile.directYears.some((point) => (point.count ?? 0) > 0) || profile.contractYears.some((point) => (point.count ?? 0) > 0)
}

export function isEmptyYear(profile: SupplierProfile): boolean {
  return (profile.direct.count ?? 0) === 0 && profile.contracts.count === 0
}

/** The contract clients to show: every row's when all were read, else the analysis's. */
export function contractClients(profile: SupplierProfile): ClientRanking {
  return profile.contracts.clients ?? profile.analysisClients
}

/** An institution's name, when one is known: a bare CUI is not a name to put in a sentence. */
export function knownClientName(profile: Pick<SupplierProfile, 'names'>, cui: string): string | null {
  return profile.names.get(cui) ?? null
}

/** Whether the consortium scan covered every row: its counts are then whole, not a floor. */
export function scanIsWhole(profile: SupplierProfile): boolean {
  return profile.contracts.scanned >= profile.contracts.count && profile.contracts.unresolved === 0
}

/** The clients that bought from the firm in all years but one at most, from its first year through the last complete one. */
export function steadyClients(rows: readonly PartyYears[], from: number, through: number): readonly PartyYears[] {
  const span = through - from + 1
  if (span < 3) return []
  return rows.filter((row) => row.years.filter((point) => point.year >= from && point.year <= through && (point.value ?? 0) > 0).length >= span - 1)
}
