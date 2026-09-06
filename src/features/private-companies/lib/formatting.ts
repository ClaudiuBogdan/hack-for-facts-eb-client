import { formatCurrency, formatNumber, getUserLocale } from '@/lib/utils'
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

/**
 * Year-on-year deltas. The sign is placed by `Intl` via `signDisplay` rather
 * than by concatenation, so it lands where the active locale puts it and the
 * grouping follows that locale too — `formatInteger` is pinned to `ro-RO`, so
 * prefixing onto it showed an EN reader "+1.234" for one thousand two hundred.
 * Zero carries no sign. The hyphen Intl emits is swapped for a true minus
 * (U+2212) to match `formatRonNetResultCompact` and to align in `tabular-nums`.
 */
function withTrueMinus(formatted: string): string {
  return formatted.replace(/^-/, '−')
}
function activeNumberLocale(): string {
  return getUserLocale() === 'ro' ? 'ro-RO' : 'en-US'
}

export function formatSignedRonCompact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  const formatted = new Intl.NumberFormat(activeNumberLocale(), {
    style: 'currency',
    currency: 'RON',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    signDisplay: 'exceptZero',
  }).format(value)
  return withTrueMinus(
    getUserLocale() === 'ro' ? formatted.replace(/\sK(?=\s|$)/, ' mii') : formatted,
  )
}

export function formatSignedInteger(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  return withTrueMinus(
    new Intl.NumberFormat(activeNumberLocale(), {
      style: 'decimal',
      maximumFractionDigits: 0,
      signDisplay: 'exceptZero',
    }).format(value),
  )
}

/**
 * An exact RON amount in the active locale. `formatRonAmount` is pinned to
 * `ro-RO`, which is fine for a tooltip but wrong for a figure a reader is meant
 * to cite: an EN reader would see `415.603.318` and read it as a decimal.
 */
export function formatRonExact(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return '—'
  }
  return new Intl.NumberFormat(activeNumberLocale(), {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(value)
}

/** A share, in the active locale — `toFixed` would print "7.6%" to a RO reader. */
export function formatShare(fraction: number): string {
  return new Intl.NumberFormat(activeNumberLocale(), {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(fraction)
}
