import { useQuery } from '@tanstack/react-query'
import { t } from '@lingui/core/macro'
import evolutionJson from '../principal/results.evolution.json'
import { SUMMARY, type PartyCount, type Turnout } from '../principal/model'

/**
 * The component gallery's data: the main page's 2024/2020 extract plus the
 * earlier elections the production DB holds with usable party links — the
 * Chamber in 2008, 2016 and 2020, mayors and councillors in 2016, 2020 and
 * 2024, and turnout since 1992 from the derived turnout table. Parties,
 * counts and SIRUTA / county codes only.
 */

/** [year, registered, voted, validation status] */
export type TurnoutPoint = readonly [number, number, number, string]
export type TurnoutKind = 'parliamentary' | 'presidential' | 'local' | 'european' | 'referendum'

export interface ChamberYear {
  readonly edition: string
  /** `all`: every competitor's votes; `linked`: only those linked to a party (2016: the rest of the rows are unlabelled columns). */
  readonly basis: 'all' | 'linked'
  readonly national: readonly PartyCount[]
  readonly diaspora: readonly PartyCount[]
  readonly byCounty: Readonly<Record<string, readonly PartyCount[]>>
}

export interface MandateYear {
  readonly national: readonly PartyCount[]
  readonly byCounty?: Readonly<Record<string, readonly PartyCount[]>>
  /** Mandates left out so the year compares with 2024 (which has no București rows); null when there were none to leave out. */
  readonly bucharestExcluded: number | null
}

/** [SIRUTA, place, county, most-voted party, runner-up's party, vote gap, valid votes] */
export type CloseRace = readonly [string, string, string, string, string, number, number]

export interface Evolution {
  readonly readAt: string
  readonly parties: Readonly<Record<string, string>>
  readonly turnout: Readonly<Record<TurnoutKind, readonly TurnoutPoint[]>>
  readonly chamber: Readonly<Record<'2008' | '2016' | '2020', ChamberYear>>
  readonly chamberGaps: Readonly<Record<string, 'links' | 'absent'>>
  readonly diasporaVoters: Readonly<Record<'2008' | '2016' | '2020', number>>
  readonly mayors: Readonly<Record<'2016' | '2020' | '2024', MandateYear>>
  readonly localCouncillors: Readonly<Record<'2016' | '2024', MandateYear>>
  readonly countyCouncillors: Readonly<Record<'2016' | '2024', MandateYear>>
  readonly closestMayorRaces2024: readonly CloseRace[]
}

export const EVOLUTION = evolutionJson as unknown as Evolution
export const NAMES: Readonly<Record<string, string>> = { ...SUMMARY.parties, ...EVOLUTION.parties }
export { SUMMARY }
export type { PartyCount, Turnout }

export const CHAMBER_YEARS = ['2008', '2016', '2020'] as const
export const MAYOR_YEARS = ['2016', '2020', '2024'] as const

// ─────────────────────────────────────────────────── party lines ──

/**
 * A party line across elections: the party and the alliances it ran in
 * (Transparenta.eu's grouping, said beside every chart that uses it). Keys
 * not listed stay themselves, folded into „Alte partide" on charts.
 */
export const FAMILIES = {
  psd: ['partidul-social-democrat', 'alianta-politica-partidul-social-democrat-partidul-conservator'],
  pnl: ['partidul-national-liberal'],
  pdl: ['partidul-democrat-liberal'],
  usr: ['uniunea-salvati-romania', 'alianta-usr-plus'],
  udmr: ['uniunea-democrata-maghiara-din-romania'],
  aur: ['alianta-pentru-unirea-romanilor'],
  pmp: ['partidul-miscarea-populara'],
  alde: ['partidul-alianta-liberalilor-si-democratilor', 'partidul-alianta-liberalilor-si-democratilor-alde'],
  pro: ['partidul-pro-romania'],
  prm: ['partidul-romania-mare'],
  adu: ['alianta-dreapta-unita-usr-pmp-forta-dreptei'],
  psdpnl: ['alianta-electorala-psd-pnl'],
  ind: ['~independent'],
} as const

export type Family = keyof typeof FAMILIES
export type Line = Family | 'other'

const FAMILY_OF = new Map<string, Family>(Object.entries(FAMILIES).flatMap(([family, keys]) => keys.map((key) => [key, family as Family] as const)))

export const lineOf = (partyKey: string): Line => FAMILY_OF.get(partyKey) ?? 'other'

export interface LineStyle {
  readonly label: string
  readonly stroke: string
  readonly fill: string
  readonly swatch: string
}

/** Colours near each party's own (Transparenta.eu's choice, always beside the name). */
export function lineStyle(line: Line): LineStyle {
  switch (line) {
    case 'psd':
      return { label: 'PSD', stroke: 'stroke-[#d7262e]', fill: 'fill-[#d7262e]', swatch: 'bg-[#d7262e]' }
    case 'pnl':
      return { label: 'PNL', stroke: 'stroke-[#e0ac00]', fill: 'fill-[#f2c11b]', swatch: 'bg-[#f2c11b]' }
    case 'pdl':
      return { label: 'PDL', stroke: 'stroke-[#e8751a]', fill: 'fill-[#e8751a]', swatch: 'bg-[#e8751a]' }
    case 'usr':
      return { label: 'USR', stroke: 'stroke-[#1e64c8]', fill: 'fill-[#1e64c8]', swatch: 'bg-[#1e64c8]' }
    case 'udmr':
      return { label: 'UDMR', stroke: 'stroke-[#2f8f46]', fill: 'fill-[#2f8f46]', swatch: 'bg-[#2f8f46]' }
    case 'aur':
      return { label: 'AUR', stroke: 'stroke-[#8c6a1c]', fill: 'fill-[#8c6a1c]', swatch: 'bg-[#8c6a1c]' }
    case 'pmp':
      return { label: 'PMP', stroke: 'stroke-[#4fa3d1]', fill: 'fill-[#7fc3e8]', swatch: 'bg-[#7fc3e8]' }
    case 'alde':
      return { label: 'ALDE', stroke: 'stroke-[#4b5fa8]', fill: 'fill-[#4b5fa8]', swatch: 'bg-[#4b5fa8]' }
    case 'pro':
      return { label: 'PRO România', stroke: 'stroke-[#7b3fa0]', fill: 'fill-[#7b3fa0]', swatch: 'bg-[#7b3fa0]' }
    case 'prm':
      return { label: 'PRM', stroke: 'stroke-[#3a3a5c]', fill: 'fill-[#3a3a5c]', swatch: 'bg-[#3a3a5c]' }
    case 'adu':
      return { label: 'ADU', stroke: 'stroke-[#5b9be6]', fill: 'fill-[#5b9be6]', swatch: 'bg-[#5b9be6]' }
    case 'psdpnl':
      return { label: 'PSD+PNL', stroke: 'stroke-[#ec8a2f]', fill: 'fill-[#ec8a2f]', swatch: 'bg-[#ec8a2f]' }
    case 'ind':
      return { label: t`Independenți`, stroke: 'stroke-[#57534e]', fill: 'fill-[#57534e]', swatch: 'bg-[#57534e]' }
    case 'other':
      return { label: t`Alte partide`, stroke: 'stroke-[#a8a29e]', fill: 'fill-[#a8a29e]', swatch: 'bg-[#a8a29e]' }
  }
}

/** Sum a party tally into lines (a party and its alliances; the rest as `other`). */
export function byLine(counts: readonly PartyCount[]): ReadonlyMap<Line, number> {
  const out = new Map<Line, number>()
  for (const [party, n] of counts) {
    const line = party === '~other' || party === '~unlinked' ? 'other' : lineOf(party)
    out.set(line, (out.get(line) ?? 0) + n)
  }
  return out
}

export const sum = (counts: readonly PartyCount[]) => counts.reduce((s, [, n]) => s + n, 0)
export const share = (part: number, whole: number) => (whole > 0 ? part / whole : 0)
export const turnoutOf = ([registered, voted]: Turnout | readonly [number, number]) => (registered > 0 ? voted / registered : null)

/** Each line's share of a whole per year, for the years that have it. */
export function lineShares<Y extends string>(years: readonly Y[], tally: (year: Y) => readonly PartyCount[] | null): ReadonlyMap<Line, ReadonlyMap<Y, number>> {
  const out = new Map<Line, Map<Y, number>>()
  for (const year of years) {
    const counts = tally(year)
    if (!counts) continue
    const whole = sum(counts)
    for (const [line, n] of byLine(counts)) {
      const row = out.get(line) ?? new Map<Y, number>()
      row.set(year, share(n, whole))
      out.set(line, row)
    }
  }
  return out
}

/** Mandate counts per line per year. */
export function lineCounts<Y extends string>(years: readonly Y[], tally: (year: Y) => readonly PartyCount[] | null): ReadonlyMap<Line, ReadonlyMap<Y, number>> {
  const out = new Map<Line, Map<Y, number>>()
  for (const year of years) {
    const counts = tally(year)
    if (!counts) continue
    for (const [line, n] of byLine(counts)) {
      const row = out.get(line) ?? new Map<Y, number>()
      row.set(year, n)
      out.set(line, row)
    }
  }
  return out
}

// ─────────────────────────────────────────────────── per UAT ──

/** [votes counted, then ‰ per line in `families` order] */
export type UatShares = readonly number[]

export interface EvolutionUat {
  readonly readAt: string
  readonly families: readonly Family[]
  readonly chamber2016: Readonly<Record<string, UatShares>>
  readonly chamber2020: Readonly<Record<string, UatShares>>
  readonly turnout2016: Readonly<Record<string, Turnout>>
  readonly turnout2020: Readonly<Record<string, Turnout>>
  /** SIRUTA → the 2016 mayor's party (mandate rows; București's sectors left out). */
  readonly mayors2016: Readonly<Record<string, string>>
  /** SIRUTA → [runner-up's party, vote gap] for the 2024 mayor race. */
  readonly mayors2024Race: Readonly<Record<string, readonly [string | null, number | null]>>
  /** SIRUTA → R county seat, M other municipality, O town, C commune, B București. */
  readonly kinds: Readonly<Record<string, 'R' | 'M' | 'O' | 'C' | 'B'>>
}

export function useEvolutionUat() {
  return useQuery({
    queryKey: ['development', 'elections', 'componente', 'uat'],
    queryFn: async () => ((await import('../principal/results.evolution-uat.json')) as unknown as { readonly default: EvolutionUat }).default,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

/** A line's share in one UAT (null when the UAT has no votes counted). */
export function uatShare(data: EvolutionUat, row: UatShares | undefined, line: Family): number | null {
  if (!row || !row[0]) return null
  const index = data.families.indexOf(line)
  return index < 0 ? null : (row[index + 1] ?? 0) / 1000
}

export const KIND_ORDER = ['R', 'M', 'O', 'C'] as const
export type PlaceKind = (typeof KIND_ORDER)[number]
export const kindLabel = (kind: PlaceKind) => (kind === 'R' ? t`Reședințe de județ` : kind === 'M' ? t`Alte municipii` : kind === 'O' ? t`Orașe` : t`Comune`)

export const COUNTY_NAMES: Readonly<Record<string, string>> = {
  AB: 'Alba',
  AR: 'Arad',
  AG: 'Argeș',
  BC: 'Bacău',
  BH: 'Bihor',
  BN: 'Bistrița-Năsăud',
  BT: 'Botoșani',
  BR: 'Brăila',
  BV: 'Brașov',
  BZ: 'Buzău',
  CS: 'Caraș-Severin',
  CL: 'Călărași',
  CJ: 'Cluj',
  CT: 'Constanța',
  CV: 'Covasna',
  DB: 'Dâmbovița',
  DJ: 'Dolj',
  GL: 'Galați',
  GR: 'Giurgiu',
  GJ: 'Gorj',
  HR: 'Harghita',
  HD: 'Hunedoara',
  IL: 'Ialomița',
  IS: 'Iași',
  IF: 'Ilfov',
  MM: 'Maramureș',
  MH: 'Mehedinți',
  MS: 'Mureș',
  NT: 'Neamț',
  OT: 'Olt',
  PH: 'Prahova',
  SM: 'Satu Mare',
  SJ: 'Sălaj',
  SB: 'Sibiu',
  SV: 'Suceava',
  TR: 'Teleorman',
  TM: 'Timiș',
  TL: 'Tulcea',
  VS: 'Vaslui',
  VL: 'Vâlcea',
  VN: 'Vrancea',
  B: 'București',
}
export const countyName = (code: string) => COUNTY_NAMES[code] ?? code

/** A tile grid of the counties, roughly where each sits on the map (column, row). */
export const COUNTY_TILES: Readonly<Record<string, readonly [number, number]>> = {
  SM: [1, 0],
  MM: [2, 0],
  SV: [4, 0],
  BT: [5, 0],
  BH: [0, 1],
  SJ: [1, 1],
  BN: [2, 1],
  NT: [4, 1],
  IS: [5, 1],
  AR: [0, 2],
  CJ: [1, 2],
  MS: [2, 2],
  HR: [3, 2],
  BC: [4, 2],
  VS: [5, 2],
  TM: [0, 3],
  AB: [1, 3],
  SB: [2, 3],
  CV: [3, 3],
  VN: [4, 3],
  GL: [5, 3],
  CS: [0, 4],
  HD: [1, 4],
  VL: [2, 4],
  BV: [3, 4],
  BZ: [4, 4],
  BR: [5, 4],
  TL: [6, 4],
  MH: [0, 5],
  GJ: [1, 5],
  AG: [2, 5],
  PH: [3, 5],
  IL: [4, 5],
  CT: [5, 5],
  DJ: [1, 6],
  OT: [2, 6],
  DB: [3, 6],
  IF: [4, 6],
  CL: [5, 6],
  TR: [2, 7],
  GR: [3, 7],
  B: [4, 7],
}
