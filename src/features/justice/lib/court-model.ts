import type { JudicialAggregate, JudicialCaseListRow, JudicialCourt, JudicialCourtLevel } from '@/schemas/judicial'
import { mergedMatters, yearBars, yearOf, type Share, type StageKey, type YearBar } from './judicial-model'

/**
 * One court's sheet: the court, its caseload over the years and in the year
 * the page describes, the year's matters and stages, its children's cases of
 * the year, and its newest cases. Pure; built from the court page's reads.
 */

export interface CourtCaseRow {
  readonly caseId: string
  readonly institutionCode: string
  readonly caseNumber: string
  readonly category: string | null
  readonly stageName: string | null
  readonly sourceOpenedAt: string | null
  readonly latestSourceModifiedAt: string | null
}

export interface CourtChild {
  readonly code: string
  readonly level: JudicialCourtLevel
  /** Its cases of the page's year; null when the children's read failed. */
  readonly count: number | null
}

export interface CourtSheet {
  readonly code: string
  readonly level: JudicialCourtLevel
  readonly specialization: string | null
  readonly county: string | null
  readonly parent: string | null
  /** The year the page describes. */
  readonly year: number
  /** The newest date the court's cases carry: the Portal's last modification, or (ÎCCJ) the newest archive date. */
  readonly newestAt: string | null
  /** Every case the API holds for the court, undated ones included. */
  readonly total: number
  /** The court's cases by the year of their source date, every dated year. */
  readonly years: readonly { readonly year: number; readonly count: number }[]
  /** Cases whose source date falls in the page's year. */
  readonly inYear: number
  readonly matters: readonly Share[]
  /** The year's cases at the four counted stages; `other` is the rest of the year's total. */
  readonly stages: Readonly<Record<Exclude<StageKey, 'extraordinare'> | 'other', number>>
  readonly children: readonly CourtChild[]
  readonly cases: { readonly rows: readonly CourtCaseRow[]; readonly endCursor: string | null; readonly hasNextPage: boolean }
  /** A read failed (the children's counts): the sheet is served once and read again, never kept. */
  readonly partial: boolean
}

export interface CourtReads {
  readonly court: JudicialCourt
  readonly year: number
  readonly newestModifiedAt: string | null
  readonly newestOpenedAt: string | null
  readonly years: JudicialAggregate
  readonly matters: JudicialAggregate
  readonly stages: readonly { readonly key: StageKey; readonly count: number }[]
  readonly cases: { readonly rows: readonly JudicialCaseListRow[]; readonly endCursor: string | null; readonly hasNextPage: boolean }
  readonly children: { readonly status: 'none' } | { readonly status: 'failed' } | { readonly status: 'read'; readonly groups: JudicialAggregate['groups'] }
}

/** The level a court's children sit at, where it has any the API lists. */
export function childLevelOf(court: Pick<JudicialCourt, 'courtLevel'>): JudicialCourtLevel | null {
  switch (court.courtLevel) {
    case 'curte_de_apel':
      return 'tribunal'
    case 'tribunal':
      return 'judecatorie'
    case 'curte_militara_apel':
      return 'tribunal_militar'
    default:
      return null
  }
}

export function courtSheetOf(reads: CourtReads): CourtSheet {
  const { court, year } = reads
  const years = reads.years.groups
    .map((group) => ({ year: Number(group.key), count: group.caseCount }))
    .filter((entry) => Number.isInteger(entry.year))
    .sort((a, b) => a.year - b.year)
  const inYear = reads.matters.denominator
  const counted = (key: StageKey) => reads.stages.find((stage) => stage.key === key)?.count ?? 0
  const stages = { fond: counted('fond'), apel: counted('apel'), recurs: counted('recurs'), contestatie: counted('contestatie') }
  const childCounts = reads.children.status === 'read' ? new Map(reads.children.groups.map((group) => [group.key, group.caseCount])) : null
  return {
    code: court.institutionCode,
    level: court.courtLevel,
    specialization: court.specialization,
    county: court.countyCode,
    parent: court.parentInstitutionCode,
    year,
    newestAt: reads.newestModifiedAt ?? reads.newestOpenedAt,
    total: reads.years.denominator,
    years,
    inYear,
    matters: mergedMatters(reads.matters.groups.map((group) => ({ key: group.key, count: group.caseCount }))),
    stages: { ...stages, other: Math.max(0, inYear - stages.fond - stages.apel - stages.recurs - stages.contestatie) },
    children: court.children
      .map((child) => ({ code: child.institutionCode, level: child.courtLevel, count: childCounts ? (childCounts.get(child.institutionCode) ?? 0) : null }))
      .sort((a, b) => (b.count ?? 0) - (a.count ?? 0) || a.code.localeCompare(b.code)),
    cases: { rows: reads.cases.rows.map(caseRowOf), endCursor: reads.cases.endCursor, hasNextPage: reads.cases.hasNextPage },
    partial: reads.children.status === 'failed',
  }
}

export function caseRowOf(row: JudicialCaseListRow): CourtCaseRow {
  return {
    caseId: row.caseId,
    institutionCode: row.institutionCode,
    caseNumber: row.caseNumber,
    category: row.category,
    stageName: row.stageName,
    sourceOpenedAt: row.sourceOpenedAt,
    latestSourceModifiedAt: row.latestSourceModifiedAt,
  }
}

/** The capture's last year for the court: the year of its newest date. */
export function courtLastYear(sheet: Pick<CourtSheet, 'newestAt'>): number | null {
  return yearOf(sheet.newestAt)
}

/**
 * The years the court page offers: the capture's whole years and its last
 * one, from `firstWholeYear` — the years before hold only cases still active
 * later, so they are drawn, never picked.
 */
export function courtYearChoices(sheet: Pick<CourtSheet, 'newestAt' | 'years'>, firstWholeYear: number): readonly number[] {
  const last = courtLastYear(sheet)
  if (last === null) return []
  return sheet.years.filter((entry) => entry.year >= firstWholeYear && entry.year <= last && entry.count > 0).map((entry) => entry.year)
}

export function courtYearBars(sheet: Pick<CourtSheet, 'newestAt' | 'years'>, firstWholeYear: number, from = 2019): readonly YearBar[] {
  const lastYear = courtLastYear(sheet) ?? firstWholeYear
  return yearBars(
    sheet.years.map((entry) => ({ key: String(entry.year), count: entry.count })),
    { from, lastYear, firstWholeYear },
  )
}
