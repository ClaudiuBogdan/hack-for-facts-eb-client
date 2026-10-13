import { describe, expect, it } from 'vitest'
import type { PrivateCompanyFinancialYear } from '@/schemas/private-company'
import { admittedQualification } from '../mocks/fixtures/qualification'
import { balanceSummary, companyProfile, financialYear } from './company-profile.fixture'
import { buildCompanyProfileModel } from './company-profile-model'
import { holdReasonText, yearsMatrix, type MatrixCell } from './company-years-matrix'

/**
 * The statements matrix: a column per statement, newest first, years without
 * one folded into a single gap; a row only for what some statement published;
 * a value the figures leave out kept, marked, never dropped.
 */

const matrixOf = (financials: readonly PrivateCompanyFinancialYear[]) =>
  yearsMatrix(buildCompanyProfileModel(companyProfile({ financials: [...financials] })).qualification.statements)

const columnLabels = (matrix: ReturnType<typeof matrixOf>) =>
  matrix.columns.map((column) => (column.kind === 'gap' ? `${column.from}–${column.to}` : String(column.statement.year)))

const rowOf = (matrix: ReturnType<typeof matrixOf>, key: string) => matrix.rows.find((row) => row.spec.key === key)

describe('the statements matrix', () => {
  it('puts the newest statement first and folds the years without one into a single gap', () => {
    const matrix = matrixOf([2010, 2011, 2019, 2020].map((year) => financialYear(year, { turnover: 1_000 * year })))
    expect(columnLabels(matrix)).toEqual(['2020', '2019', '2012–2018', '2011', '2010'])
    // The gap is unknown, never a zero: its cell is absent in every row.
    expect(matrix.rows.every((row) => row.cells[2]?.kind === 'absent')).toBe(true)
  })

  it('shows only the rows some statement published, in the statement’s order', () => {
    const matrix = matrixOf([
      financialYear(2024, { turnover: 5_000, employees: 2, summary: balanceSummary({ debts: 700 }) }),
      financialYear(2025, { turnover: 6_000, employees: 3 }),
    ])
    expect(matrix.rows.map((row) => row.spec.key)).toEqual(['turnover', 'debts', 'employees'])
    // A line the newer statement does not have is absent there, not zero.
    expect(rowOf(matrix, 'debts')?.cells.map((cell) => cell.kind)).toEqual(['absent', 'value'])
  })

  it('leaves out a regie’s patrimony a company that is no regie publishes as zero', () => {
    const zero = matrixOf([financialYear(2025, { turnover: 1, summary: balanceSummary({ patrimonyRegie: 0 }) })])
    expect(rowOf(zero, 'patrimony_regie')).toBeUndefined()
    const regie = matrixOf([financialYear(2025, { turnover: 1, summary: balanceSummary({ patrimonyRegie: 4_000 }) })])
    expect(rowOf(regie, 'patrimony_regie')).toBeDefined()
  })

  it('keeps a held value with its status, out of the figures, and marks its year only for a review hold', () => {
    const base = financialYear(2025, { turnover: 9_000, netProfit: 100, summary: balanceSummary({ grossLoss: 0 }) })
    const shaped = { ...base, qualification: admittedQualification(base, { gross_loss: 'held_profile', net_result: 'held_profile' }) }
    const matrix = matrixOf([shaped])
    expect(rowOf(matrix, 'gross_loss')?.cells[0]).toMatchObject({ kind: 'value', original: '0', status: 'held_profile', counted: false })
    expect(rowOf(matrix, 'turnover')?.cells[0]).toMatchObject({ kind: 'value', status: 'reported', counted: true })
    // The derived net, held: no value at all, only why.
    expect(rowOf(matrix, 'net_result')?.cells[0]).toEqual({ kind: 'held', status: 'held_profile' } satisfies MatrixCell)
    // A shape the policy leaves out is no reason to look: the year is not marked.
    expect(matrix.columns[0]).toMatchObject({ kind: 'statement', flagged: false })

    const reviewed = { ...base, qualification: { ...admittedQualification(base, { turnover: 'held_observation' }), holdReason: 'reviewed_suspect_statement' } }
    expect(matrixOf([reviewed]).columns[0]).toMatchObject({ kind: 'statement', flagged: true })
  })

  it('shows a reported net result from the evaluator, never one computed here', () => {
    const matrix = matrixOf([financialYear(2025, { turnover: 1_000, netLoss: 250 })])
    expect(rowOf(matrix, 'net_result')?.cells[0]).toMatchObject({ kind: 'value', original: '-250', number: -250, counted: true })
  })
})

describe('a reviewer’s reason for a hold', () => {
  it('is said in words for the reasons the policy records, and generally for any other', () => {
    expect(holdReasonText('reviewed_suspect_statement')).toMatch(/^La verificare, bilanțul a fost reținut ca suspect/u)
    expect(holdReasonText('reviewed_invalid_or_repeated_digit_employee_count')).toMatch(/numărul de salariați a fost reținut/u)
    expect(holdReasonText('reviewed_something_new')).toBe('Reținut după o verificare.')
  })
})
