import { formatCurrency, formatNumber } from '@/lib/utils'
import type { PrivateCompanyFinancialYear } from '@/schemas/private-company'

const EMPLOYEE_COMPACT_THRESHOLD = 10_000

export function formatRonAmount(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatInteger(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  return new Intl.NumberFormat('ro-RO').format(value)
}

export function formatRonAmountCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  return formatCurrency(value, 'compact', 'RON')
}

export function formatRonNetResultCompact(
  netProfit: number | null,
  netLoss: number | null,
): string {
  if (netProfit !== null && Number.isFinite(netProfit)) {
    return formatRonAmountCompact(netProfit)
  }
  if (netLoss !== null && Number.isFinite(netLoss)) {
    const formatted = formatRonAmountCompact(netLoss)
    return formatted === '—' ? '—' : `−${formatted}`
  }
  return '—'
}

export function formatEmployeesDisplay(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  if (Math.abs(value) >= EMPLOYEE_COMPACT_THRESHOLD) {
    return formatNumber(value, 'compact')
  }
  return formatInteger(value)
}

export function getLatestFinancialYear(
  financials: readonly PrivateCompanyFinancialYear[],
): PrivateCompanyFinancialYear | null {
  if (financials.length === 0) {
    return null
  }
  return [...financials].sort((a, b) => b.fiscalYear - a.fiscalYear)[0] ?? null
}

export function sortFinancialsByYearDesc(
  financials: readonly PrivateCompanyFinancialYear[],
): PrivateCompanyFinancialYear[] {
  return [...financials].sort((a, b) => b.fiscalYear - a.fiscalYear)
}
