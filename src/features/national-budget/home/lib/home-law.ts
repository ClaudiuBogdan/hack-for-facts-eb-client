/**
 * The budget law's chapters as the page reads them: the state budget
 * synthesis' chapter-level credit rows (functional chapters, stable from law
 * to law) and its printed 5001 total, for the law's own year, in lei.
 */
import type { ApprovedRecordsInput, ApprovedTotalsInput } from '@/features/national-budget/analytics/api/national-budget-api'
import { thousandToLei } from '@/features/national-budget/analytics/lib/exact'
import type { BudgetApprovedCodes, BudgetApprovedEdition, BudgetApprovedRecord } from '@/schemas/national-budget-api'

const blank = (value: string | null | undefined) => !value || value.trim() === ''
const economicCode = (codes: BudgetApprovedCodes) => (codes.grupa ?? '').trim() || (codes.titlu ?? '').trim()

/** A chapter's own total row: every code below the chapter blank. */
export const chapterLevel = (codes: BudgetApprovedCodes): boolean =>
  blank(codes.subcapitol) && blank(codes.paragraf) && economicCode(codes) === '' && blank(codes.articol) && blank(codes.alineat)

/** The spending totals' own codes (5000, 5001, 5005): never a chapter. */
export const totalCode = (capitol: string): boolean => /^500\d$/u.test(capitol)

/** A record's value for a target year, in lei, exactly (the law prints thousand lei). */
export function leiFor(record: BudgetApprovedRecord | undefined, year: number): string | null {
  const slot = record?.values.find((value) => value.measureYear === year)
  return slot?.value ? thousandToLei(slot.value) : null
}

/** The edition before this one, when it is loaded: its own year's figures are what a change compares with. */
export function previousEdition(editions: readonly BudgetApprovedEdition[], edition: BudgetApprovedEdition): BudgetApprovedEdition | null {
  return editions.find((entry) => entry.budgetYear === edition.budgetYear - 1) ?? null
}

/** Each fund's spending and revenue in this law and the one before, each for its own year: one read. */
export function planTotalsInput(edition: BudgetApprovedEdition, previous: BudgetApprovedEdition | null): ApprovedTotalsInput {
  return {
    totals: ['EXPENDITURE_5001_STATE_BUDGET', 'EXPENDITURE_5000_TOTAL_GENERAL', 'REVENUE_TOTAL'],
    editionIds: previous ? [previous.id, edition.id] : [edition.id],
    creditTypes: ['BUDGET_CREDITS'],
    measureYears: previous ? [previous.budgetYear, edition.budgetYear] : [edition.budgetYear],
  }
}

/** The state budget law's printed deficit: its synthesis' row 9901. */
export function lawDeficitInput(edition: BudgetApprovedEdition): ApprovedRecordsInput {
  return { editionId: edition.id, form: 'STATE_BUDGET_SYNTHESIS', rowRoles: ['DESCRIPTOR'], capitols: ['9901'] }
}

/** One approved chapter: its code, the law's own words for it (named at render, in the reader's language), its amount. */
export type LawChapter = { readonly code: string; readonly printed: string | null; readonly lei: string }

/**
 * The chapters and the 5001 total out of a synthesis' credit rows: only what
 * the page shows, so a cached (and server-sent) read is a few chapters, not
 * the law's hundreds of rows. Group totals (`…00`) are not chapters.
 */
export function lawChaptersOf(rows: readonly BudgetApprovedRecord[], year: number): { readonly chapters: readonly LawChapter[]; readonly total: string | null } {
  const chapters = rows
    .filter((row) => chapterLevel(row.codes) && !totalCode(row.codes.capitol) && !row.codes.capitol.endsWith('00'))
    .flatMap((row): LawChapter[] => {
      const lei = leiFor(row, year)
      return lei ? [{ code: row.codes.capitol, printed: row.contextLabel, lei }] : []
    })
  const total = leiFor(
    rows.find((row) => row.codes.capitol === '5001' && chapterLevel(row.codes)),
    year,
  )
  return { chapters, total }
}
