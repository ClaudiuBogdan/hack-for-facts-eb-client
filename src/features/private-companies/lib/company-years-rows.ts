import type { CompanyProfileModel, NetPoint } from './company-profile-model'

/** Where a year's figures can be read at their source: ANAF's answer for the year, or the Ministry's file. */
export interface YearSource {
  readonly url: string
  readonly kind: 'anaf_statement' | 'mfp_resource'
}

/**
 * A year as the company chart draws it: its form, its publisher, three figures (null: not drawn, the reason said in
 * its reading) and its source. Typed years carry the page's series — reported values on the one basis; a year held
 * only in the publisher's IFRS file carries its figures as filed, in its own labelled series (owner, 25 November
 * 2026), and nothing else on the page reads them.
 */
export interface YearRow {
  readonly year: number
  /** `ifrs` where the publisher put the year on the IFRS form; null unmarked — never said to be another form. */
  readonly form: 'ifrs' | null
  /** Held only in the publisher's IFRS file, outside the typed history. */
  readonly ifrsFile: boolean
  readonly publisher: 'anaf' | 'mfp' | null
  readonly turnover: number | null
  readonly net: NetPoint
  readonly employees: number | null
  readonly source: YearSource | null
}

/** Only a web address is linked. */
const linkable = (url: string | null | undefined): url is string => typeof url === 'string' && /^https:\/\/\S+$/u.test(url)

const hasValues = (row: YearRow) => row.turnover !== null || row.net.value !== null || row.employees !== null

/**
 * Every year from the first to the last the company has figures for, typed or in the IFRS file, oldest first: a
 * year between them with neither stays, empty, so the chart says it as a gap.
 */
export function yearRowsOf(model: CompanyProfileModel): readonly YearRow[] {
  const marked = new Set(model.ifrsForm.markedYears)
  const rows = new Map<number, YearRow>()
  model.span.forEach((year, index) => {
    const statement = model.profile.financials.find((entry) => entry.fiscalYear === year)
    const url = statement?.source?.url
    const kind = statement?.source?.urlKind
    rows.set(year, {
      year,
      form: marked.has(year) ? 'ifrs' : null,
      ifrsFile: false,
      publisher: statement?.sourceSystem ?? null,
      turnover: model.series.turnover[index]?.value ?? null,
      net: model.series.net[index] ?? { year, value: null, kind: null },
      employees: model.series.employees[index]?.value ?? null,
      source: linkable(url) && kind ? { url, kind } : null,
    })
  })
  // The model keeps only file years without a typed statement: one selection per CUI and year.
  for (const file of model.ifrsForm.fileYears) {
    rows.set(file.year, {
      year: file.year,
      form: 'ifrs',
      ifrsFile: true,
      publisher: file.publisher,
      turnover: file.turnover,
      net: { year: file.year, value: file.netResult, kind: 'result' },
      employees: file.employees,
      source: linkable(file.sourceUrl) ? { url: file.sourceUrl, kind: file.publisher === 'anaf' ? 'anaf_statement' : 'mfp_resource' } : null,
    })
  }
  const years = [...rows.keys()]
  if (years.length === 0) return []
  const first = Math.min(...years)
  const last = Math.max(...years)
  return Array.from({ length: last - first + 1 }, (_, offset) => {
    const year = first + offset
    return (
      rows.get(year) ?? {
        year,
        form: null,
        ifrsFile: false,
        publisher: null,
        turnover: null,
        net: { year, value: null, kind: null },
        employees: null,
        source: null,
      }
    )
  })
}

/**
 * The years with nothing to draw that are no year of the publisher's IFRS file: no statement, or one whose values
 * are all left out. The chart's real gaps — what „no comparable values" says, never „no statement".
 */
export function blankYearsOf(rows: readonly YearRow[]): readonly number[] {
  return rows.filter((row) => !row.ifrsFile && !hasValues(row)).map((row) => row.year)
}

/** Whether two neighbouring years are one stretch of the people line: consecutive, both on the same form. */
export function sameStretch(a: YearRow, b: YearRow): boolean {
  return b.year === a.year + 1 && a.form === b.form
}

/** The years with nothing to draw, IFRS-file years included: a run of two or more unmarked ones is one hatched slot. */
export function isEmptyRow(row: YearRow): boolean {
  return !hasValues(row)
}
