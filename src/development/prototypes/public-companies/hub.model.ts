import { plural, t } from '@lingui/core/macro'

import { divisionLabel } from '@/features/private-companies/lib/caen-divisions'
import { foldCountyName } from '@/features/private-companies/lib/county-names'
import { displayCompanyName } from '@/features/private-companies/lib/company-profile-model'
import { ROMANIA_COUNTIES } from '@/lib/territory-counties'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import fixtureJson from './hub.fixture.json'

/**
 * The public-enterprise hub's figures, as `scripts/generate-public-enterprise-hub-fixture.mjs`
 * computed them from the dev API on the date it carries. The API serves no
 * aggregate yet (design note §12.3, ask 1): this file is the shape one would
 * have to serve. Counts are exact; money stays decimal text; a missing value
 * is null, never zero.
 */

export type Level = 'central' | 'local'
export type AuthorityKind = 'county' | 'municipality' | 'town' | 'commune' | 'sector' | 'central_authority' | 'public_entity' | 'education' | 'unresolved'

export type AuthorityRow = {
  readonly cui: string
  /** The source's own words, its most frequent spelling. */
  readonly name: string | null
  /** Where `name` came from: ANAF's list, or another source where it gave none. */
  readonly nameSource: 's1001' | 'json_apt' | 'budget' | null
  readonly level: Level | null
  readonly kind: AuthorityKind
  readonly county: string | null
  readonly hasBudget: boolean
  readonly enterprises: number
  readonly inactive: number
}

export type EnterpriseRow = {
  readonly cui: string
  readonly name: string | null
  /** Exact decimal text. */
  readonly value: string
  readonly level: Level | null
  readonly authority: string | null
  readonly county: string | null
}

type Split = { readonly total: number; readonly central: number; readonly local: number; readonly none: number }

export type HubFixture = {
  readonly generatedAt: string
  readonly sources: readonly {
    readonly family: 'amepip' | 's1001' | 'json_apt'
    readonly laneStatus: 'available' | 'partial' | 'unavailable'
    readonly sourceUrl: string | null
    readonly observedAt: string | null
    readonly sourceLastModifiedAt: string | null
  }[]
  readonly members: { readonly anchors: number; readonly current: number; readonly historical: number }
  readonly families: { readonly s1001: number; readonly amepipCompanyYear: number; readonly amepipForm: number; readonly jsonApt: number }
  readonly control: {
    readonly central: number
    readonly local: number
    readonly noS1001: number
    readonly noEdge: number
    readonly authorities: number
    readonly s1001Authorities: number
    readonly s1001AuthoritiesWithBudget: number
    readonly disagreements: number
    readonly kinds: readonly { readonly kind: AuthorityKind; readonly level: Level; readonly enterprises: number }[]
    readonly ranking: { readonly central: readonly AuthorityRow[]; readonly county: readonly AuthorityRow[]; readonly local: readonly AuthorityRow[] }
  }
  readonly status: {
    readonly s1001: readonly { readonly status: string | null; readonly enterprises: number }[]
    /** Members ANAF's list does not hold. */
    readonly s1001NotListed: number
    readonly onrc: readonly { readonly status: string | null; readonly enterprises: number }[]
    /** Members with no company record. */
    readonly onrcMissing: number
    readonly anafInactive: number
    readonly crossings: { readonly radiatedButS1001Active: number; readonly radiatedOnS1001: number; readonly fiscallyInactiveButS1001Active: number }
    readonly amepip: readonly { readonly status: string | null; readonly enterprises: number }[]
  }
  readonly legalForms: readonly { readonly form: string | null; readonly enterprises: number }[]
  readonly counties: readonly (Split & { readonly county: string | null })[]
  readonly sectors: readonly (Split & { readonly division: string | null })[]
  readonly financials: {
    readonly year: number
    readonly withAny: number
    readonly years: readonly { readonly year: number; readonly filed: number; readonly turnover: number; readonly employees: number }[]
    readonly filed: number
    /** The statements whose net result the companies module's evaluator reported: the base of `profit` and `loss`. */
    readonly netReported: number
    readonly profit: number
    readonly loss: number
    readonly implausibleEmployees: readonly { readonly cui: string; readonly name: string | null; readonly employees: string }[]
    readonly largest: { readonly turnover: readonly EnterpriseRow[]; readonly employees: readonly EnterpriseRow[]; readonly loss: readonly EnterpriseRow[] }
  }
  readonly procurement: { readonly from: string; readonly to: string; readonly buyers: number; readonly buyerDirect: number; readonly buyerAwards: number; readonly sellers: number }
  readonly indicators: {
    readonly calculated: readonly { readonly year: number; readonly enterprises: number }[]
    readonly form: readonly { readonly year: number; readonly enterprises: number }[]
  }
}

export const HUB = fixtureJson as unknown as HubFixture

// ─────────────────────────────────────────────────────────── numbers ──

export function count(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ro-RO').format(value)
}

/** Lei the way the hubs write them: „9,7 mld. lei", „354,2 mil. lei". */
export function lei(decimal: string, locale: string): string {
  const value = Number(decimal)
  const format = (n: number, digits: number) => new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ro-RO', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)
  if (Math.abs(value) >= 1e9) return t`${format(value / 1e9, 1)} mld. lei`
  if (Math.abs(value) >= 1e6) return t`${format(value / 1e6, 1)} mil. lei`
  return t`${format(value, 0)} lei`
}

/** „1.721 de întreprinderi", „19 întreprinderi", „o întreprindere": Romanian counts agree with their noun. */
export function enterprises(value: number): string {
  return plural(value, { one: 'o întreprindere', few: '# întreprinderi', other: '# de întreprinderi' })
}

// ──────────────────────────────────────────────────────────── names ──

/** Registry and source names arrive in capitals; set as the company page sets them. */
export function nameOf(raw: string | null): string {
  return raw ? displayCompanyName(raw) : t`fără nume în sursă`
}

/** The authority's kind, as the authority's own budget record gives it (never its name). */
export function kindLabel(kind: AuthorityKind, enterprisesCount: number): string {
  switch (kind) {
    case 'county':
      return t`Consiliile județene`
    case 'municipality':
      return t`Consiliile municipiilor`
    case 'town':
      return t`Consiliile orașelor`
    case 'commune':
      return t`Consiliile comunelor`
    case 'sector':
      return t`Sectoarele Bucureștiului`
    case 'central_authority':
      return t`Ministerele și guvernul`
    case 'public_entity':
      return t`Agențiile și alte instituții centrale`
    case 'education':
      return t`Ministerul Educației`
    case 'unresolved':
      return enterprisesCount === 1 ? t`Autoritate fără fișă în buget` : t`Autorități fără fișă în buget`
  }
}

export const LOCAL_KINDS: readonly AuthorityKind[] = ['commune', 'municipality', 'town', 'county', 'sector']

// ───────────────────────────────────────────────────────── counties ──

const CODE_BY_NAME = new Map(ROMANIA_COUNTIES.map((county) => [foldCountyName(county.nameRo), county.code]))

export type CountyMeasure = 'toate' | 'locale' | 'centrale'

/**
 * The enterprises by the county of their seat (the registry's address), as the
 * hubs' county band reads a layer. Every member was read, so a county with no
 * enterprise there is a zero, not a gap; a count has no national figure.
 */
export function countyLayer(measure: CountyMeasure): StatisticsHubCountyLayer {
  const byCode = new Map(
    HUB.counties.flatMap((row) => {
      const code = row.county ? CODE_BY_NAME.get(foldCountyName(row.county)) : undefined
      return code ? [[code, measure === 'locale' ? row.local : measure === 'centrale' ? row.central : row.total] as const] : []
    }),
  )
  return {
    code: `public-enterprises-${measure}`,
    period: null,
    unit: 'count',
    unitLabel: null,
    values: ROMANIA_COUNTIES.map((county) => ({ code: county.code, name: county.nameRo, value: byCode.get(county.code) ?? 0 })),
    missingCounties: [],
    national: null,
  }
}

export const NO_COUNTY = HUB.counties.find((row) => row.county === null)?.total ?? 0

// ────────────────────────────────────────────────────────── sectors ──

export type SectorRow = { readonly division: string | null; readonly label: string; readonly total: number; readonly central: number; readonly local: number }

export function sectorRows(): readonly SectorRow[] {
  return HUB.sectors.map((row) => ({ ...row, label: row.division ? divisionLabel(row.division) : t`Fără cod CAEN` }))
}

// ────────────────────────────────────────────────────────── sources ──

const month = (iso: string | null, locale: string) =>
  iso ? new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)) : null

export function sourceDate(family: 'amepip' | 's1001' | 'json_apt', locale: string): string | null {
  const source = HUB.sources.find((entry) => entry.family === family)
  return month(source?.sourceLastModifiedAt ?? source?.observedAt ?? null, locale)
}

const RO_MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie']

/** The S1001 list's own date, as ANAF writes it in the file name („… 26 august 2026 .pdf"); null when the name carries none. */
export function s1001ListDate(locale: string): string | null {
  const url = decodeURIComponent(HUB.sources.find((entry) => entry.family === 's1001')?.sourceUrl ?? '')
  // „… OMFP 2873 si 2874  26 august 2026 .pdf": the date is the day, month name and year together.
  for (const match of url.matchAll(/(\d{1,2})\s+(\p{L}+)\s+(\d{4})/gu)) {
    const monthIndex = RO_MONTHS.indexOf(match[2]!.toLowerCase())
    if (monthIndex >= 0) return month(new Date(Date.UTC(Number(match[3]), monthIndex, Number(match[1]))).toISOString(), locale)
  }
  return null
}

export function companyHref(cui: string): string {
  return `/companies/${encodeURIComponent(cui)}`
}

export function entityHref(cui: string): string {
  return `/entities/${encodeURIComponent(cui)}`
}
