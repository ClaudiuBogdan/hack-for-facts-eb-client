import type { CompanyProfileModel } from '@/features/private-companies/lib/company-profile-model'

/**
 * PROTOTYPE data for the labelled IFRS-form series (spec: scrapper PRIV-ZVPV, owner decisions of 25 November 2026,
 * „show IFRS-form figures as a labelled series" and „label IFRS-form years per company-year"). The API field does not
 * exist yet: these are shaped like the server's expected answer, so wiring it is an adapter swap.
 */

/** One year the publisher put on the IFRS form, as the API is expected to send it: exact strings, employees a count. */
export type IfrsFormYear = {
  readonly year: number
  readonly publisher: 'mfp' | 'anaf'
  readonly turnover: string | null
  readonly netProfit: string | null
  readonly netLoss: string | null
  readonly netResult: string | null
  readonly employees: string | null
  readonly sourceUrl: string | null
  readonly snapshotId: string
  readonly locator: string
}

/** A typed year's form marker: `ifrs` or null — null is unmarked, never „ordinary". */
export type ReportingForm = {
  readonly reportingForm: 'ifrs' | null
  readonly formEvidence: 'mfp_filer_class_ir' | 'anaf_statement_layout' | null
}

const MFP = (dataset: string, resource: string, file: string) => `https://data.gov.ro/dataset/${dataset}/resource/${resource}/download/${file}`

/**
 * OMV Petrom (1590082), FY2012–2018, exactly as the view's own query returned them on production (read-only, by the
 * IFRS session, 26 November 2026): filed values, netResult = netProfit − netLoss, the Ministry of Finance's IFRS file.
 */
export const PETROM_IFRS: readonly IfrsFormYear[] = [
  ['2012', '19510054765', '3850620876', '0', '3850620876', '20508', 49, MFP('20e2efd2-ead2-4d18-bf44-50ac49509a52', '0646b71b-8dbc-4241-9c6b-7d01cce771e4', 'webiran2012.txt'), 'situatii_financiare_2012'],
  ['2013', '18071913810', '4839327415', '0', '4839327415', '19016', 19, MFP('f8353c0e-fee9-4aa3-b26d-be0e96c328a7', '13dec119-4013-4689-90e0-52da4c69d3ea', 'web_ir_an2013.txt'), 'situatii_financiare_2021'],
  ['2014', '16511641496', '1837149580', '0', '1837149580', '17866', 35, MFP('e977e5b9-0a1f-46ac-8cb8-f856a011a8ed', '4597c587-1e23-4713-b611-47e97219f3ce', 'web_ir_an2014.txt'), 'situatii_financiare_2020'],
  ['2015', '13687616179', '0', '630646624', '-630646624', '15581', 15, MFP('6a021146-6a0d-4262-8b0e-2b43aa79bca7', '7d8056aa-18bf-4385-b2e7-c5ac221a0617', 'webir2015.txt'), 'situatii_financiare_2015'],
  ['2016', '12523026161', '907853264', '0', '907853264', '14380', 86, MFP('e977e5b9-0a1f-46ac-8cb8-f856a011a8ed', '01b90a68-1805-484c-8b54-5190f7433d0e', 'web_ir_an2016.txt'), 'situatii_financiare_2020'],
  ['2017', '14764836448', '2399947986', '0', '2399947986', '13322', 34, MFP('f8353c0e-fee9-4aa3-b26d-be0e96c328a7', '216e24ee-b7dc-4782-af33-9917380067b9', 'web_ir_an2017.txt'), 'situatii_financiare_2021'],
  ['2018', '17817366024', '3879650048', '0', '3879650048', '12498', 82, MFP('e977e5b9-0a1f-46ac-8cb8-f856a011a8ed', '985407c7-fa3c-4565-aef5-c3b7c934d178', 'web_ir_an2018.txt'), 'situatii_financiare_2020'],
].map(([year, turnover, netProfit, netLoss, netResult, employees, line, sourceUrl, pack]) => {
  const resource = /resource\/([^/]+)/.exec(String(sourceUrl))?.[1] ?? ''
  return {
    year: Number(year),
    publisher: 'mfp',
    turnover: String(turnover),
    netProfit: String(netProfit),
    netLoss: String(netLoss),
    netResult: String(netResult),
    employees: String(employees),
    sourceUrl: String(sourceUrl),
    snapshotId: `mfp:${String(pack)}:${String(year)}:${resource}`,
    locator: `mfp:${resource}:${String(line)}`,
  } as const
})

/** Petrom's typed years: FY2019–2025 on ANAF's IFRS layout; FY2008–2011 unmarked. */
export const PETROM_FORMS: Readonly<Record<number, ReportingForm>> = Object.fromEntries(
  [2019, 2020, 2021, 2022, 2023, 2024, 2025].map((year) => [year, { reportingForm: 'ifrs', formEvidence: 'anaf_statement_layout' }]),
)

// ───────────────────────────────────────────────────────────── the chart's rows ──

/** A year as the prototype chart draws it: its form, its publisher, three figures (or why not), its source. */
export type FormRow = {
  readonly year: number
  /** The publisher's form for that year: `ifrs`, or null (unmarked — never said to be another form). */
  readonly form: 'ifrs' | null
  readonly publisher: 'mfp' | 'anaf' | null
  readonly turnover: number | null
  /** `result` a net result (a loss red); `profit` an admitted profit whose result is held (outlined). */
  readonly net: { readonly value: number | null; readonly kind: 'result' | 'profit' }
  readonly employees: number | null
  /** Why a figure is not drawn, in its reading. */
  readonly reasons: { readonly turnover?: string; readonly net?: string; readonly employees?: string }
  readonly source: { readonly url: string; readonly label: string } | null
}

const number = (value: string | null) => (value === null || value.trim() === '' ? null : Number(value))

const BLANK_MFP = 'Celulă goală în fișierul Ministerului Finanțelor'

/** A live company's rows: its typed years from the page's model, its IFRS-file years from the (expected) API. */
export function rowsFromModel(model: CompanyProfileModel, ifrs: readonly IfrsFormYear[], forms: Readonly<Record<number, ReportingForm>>): readonly FormRow[] {
  const typed: FormRow[] = model.span.map((year, index) => {
    const statement = model.profile.financials.find((entry) => entry.fiscalYear === year)
    const point = model.series.net[index]
    const source = statement?.source?.url
      ? { url: statement.source.url, label: statement.source.urlKind === 'mfp_resource' ? 'Fișierul pe data.gov.ro' : `Interoghează ANAF pentru ${String(year)}` }
      : null
    const generic = statement ? 'Valoare reținută: nu intră în grafic' : 'Fără valori comparabile pentru acest an'
    return {
      year,
      form: forms[year]?.reportingForm ?? null,
      publisher: statement?.sourceSystem === 'anaf' || statement?.sourceSystem === 'mfp' ? statement.sourceSystem : null,
      turnover: model.series.turnover[index]?.value ?? null,
      net: { value: point?.value ?? null, kind: point?.kind === 'profit' ? 'profit' : 'result' },
      employees: model.series.employees[index]?.value ?? null,
      reasons: { turnover: generic, net: generic, employees: generic },
      source,
    }
  })
  const byYear = new Map(typed.map((row) => [row.year, row]))
  for (const entry of ifrs) {
    const has = byYear.get(entry.year)
    // A typed statement and an IFRS-file one never share a year (one selection per CUI and year).
    if (has && (has.turnover !== null || has.net.value !== null || has.employees !== null)) continue
    byYear.set(entry.year, {
      year: entry.year,
      form: 'ifrs',
      publisher: entry.publisher,
      turnover: number(entry.turnover),
      net: { value: number(entry.netResult), kind: 'result' },
      employees: number(entry.employees),
      reasons: { turnover: BLANK_MFP, net: BLANK_MFP, employees: BLANK_MFP },
      // The publisher never calls it an IFRS file (it is its „IR" class file): named by its publisher.
      source: entry.sourceUrl ? { url: entry.sourceUrl, label: 'Fișierul Ministerului Finanțelor pe data.gov.ro' } : null,
    })
  }
  return [...byYear.values()].sort((a, b) => a.year - b.year)
}

// ───────────────────────────────────────────────────── fictitious hard cases (MOCK) ──

type MockYear = readonly [year: number, form: 'ifrs' | null, publisher: 'mfp' | 'anaf', turnover: number | null, net: number | null, employees: number | null, netKind?: 'profit']

const UNKNOWN_NET = 'Profit net zero și nicio pierdere disponibilă aici: rezultatul net nu se știe'

function mockRows(years: readonly MockYear[], held: Readonly<Record<number, string>> = {}): readonly FormRow[] {
  return years.map(([year, form, publisher, turnover, net, employees, netKind]) => ({
    year,
    form,
    publisher,
    turnover,
    net: { value: net, kind: netKind ?? 'result' },
    employees,
    reasons: {
      turnover: publisher === 'mfp' ? BLANK_MFP : 'Nicio valoare disponibilă aici',
      net: held[year] ?? (publisher === 'mfp' ? BLANK_MFP : 'Nicio valoare disponibilă aici'),
      employees: publisher === 'mfp' ? BLANK_MFP : 'Nicio valoare disponibilă aici',
    },
    source: null,
  }))
}

const M = 1_000_000

/**
 * MOCK — a fictitious company that switches form: unmarked 2010–2011; the Ministry's IFRS file 2012–2018 (a blank
 * headcount in 2016, a blank turnover in 2018); ANAF's IFRS layout 2019–2020 (a zero turnover in 2019 where 2018 was
 * blank; 2020 a loss year whose result is unknown under PRIV-Z2VJ); unmarked 2021; IFRS layout 2022–2023; unmarked after.
 */
export const MOCK_SWITCHER: readonly FormRow[] = mockRows(
  [
    [2010, null, 'mfp', 4.2 * M, 0.3 * M, 40],
    [2011, null, 'mfp', 4.6 * M, 0.35 * M, 42],
    [2012, 'ifrs', 'mfp', 5.1 * M, 0.4 * M, 45],
    [2013, 'ifrs', 'mfp', 5.4 * M, 0.5 * M, 47],
    [2014, 'ifrs', 'mfp', 5.0 * M, -0.2 * M, 46],
    [2015, 'ifrs', 'mfp', 4.8 * M, 0.1 * M, 44],
    [2016, 'ifrs', 'mfp', 5.2 * M, 0.3 * M, null],
    [2017, 'ifrs', 'mfp', 5.9 * M, 0.6 * M, 48],
    [2018, 'ifrs', 'mfp', null, 0.5 * M, 50],
    [2019, 'ifrs', 'anaf', 0, 0.45 * M, 49, 'profit'],
    [2020, 'ifrs', 'anaf', 4.1 * M, null, 47],
    [2021, null, 'anaf', 6.0 * M, 0.7 * M, 52],
    [2022, 'ifrs', 'anaf', 6.4 * M, 0.8 * M, 55, 'profit'],
    [2023, 'ifrs', 'anaf', 6.9 * M, 0.9 * M, 57, 'profit'],
    [2024, null, 'anaf', 7.2 * M, 1.0 * M, 58],
    [2025, null, 'anaf', 7.5 * M, 1.1 * M, 60],
  ],
  { 2020: UNKNOWN_NET },
)

/** MOCK — a fictitious small firm the Ministry put in its IFRS file for 2014 alone; every other year unmarked. */
export const MOCK_ONE_YEAR: readonly FormRow[] = mockRows([
  [2011, null, 'mfp', 48_000, 4_000, 3],
  [2012, null, 'mfp', 52_000, 5_500, 3],
  [2013, null, 'mfp', 55_000, 3_000, 4],
  [2014, 'ifrs', 'mfp', 58_000, 6_000, 4],
  [2015, null, 'mfp', 61_000, -2_000, 4],
  [2016, null, 'mfp', 63_000, 7_000, 5],
  [2017, null, 'mfp', 66_000, 8_000, 5],
  [2018, null, 'mfp', 70_000, 9_000, 5],
  [2019, null, 'anaf', 72_000, 9_500, 5],
  [2020, null, 'anaf', 69_000, 4_000, 4],
  [2021, null, 'anaf', 75_000, 10_000, 5],
  [2022, null, 'anaf', 80_000, 12_000, 5],
])
