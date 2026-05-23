import type { PrivateCompanyFinancialYear } from '@/schemas/private-company'

export type CompanyFinancialChartPoint = {
  readonly year: string
  readonly fiscalYear: number
  readonly turnover: number | null
  readonly netResult: number | null
  readonly employees: number | null
}

export function getNetResultValue(
  year: Pick<PrivateCompanyFinancialYear, 'netProfit' | 'netLoss'>,
): number | null {
  if (year.netProfit !== null && Number.isFinite(year.netProfit)) {
    return year.netProfit
  }
  if (year.netLoss !== null && Number.isFinite(year.netLoss)) {
    return -year.netLoss
  }
  return null
}

export function buildFinancialChartPoints(
  financials: readonly PrivateCompanyFinancialYear[],
): CompanyFinancialChartPoint[] {
  return [...financials]
    .sort((a, b) => a.fiscalYear - b.fiscalYear)
    .map((year) => ({
      year: String(year.fiscalYear),
      fiscalYear: year.fiscalYear,
      turnover: year.turnover,
      netResult: getNetResultValue(year),
      employees: year.employees,
    }))
}

export function getFinancialYearRangeLabel(
  points: readonly CompanyFinancialChartPoint[],
): string | null {
  if (points.length === 0) {
    return null
  }
  if (points.length === 1) {
    return points[0]?.year ?? null
  }
  const first = points[0]?.year
  const last = points[points.length - 1]?.year
  if (!first || !last) {
    return null
  }
  return `${first}–${last}`
}
