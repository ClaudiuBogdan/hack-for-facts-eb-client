import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import { resolveProcurementOverviewPeriod } from '@/schemas/procurement-overview'
import type { ProcurementGeographyOptions } from '../api/procurement-reference-api'
import {
  findProcurementCounty,
  formatProcurementCountyName,
} from '../lib/procurement-geography'
import {
  procurementActiveFilterChipClassName,
  procurementActiveFilterChipPrefixClassName,
  procurementActiveFilterChipValueClassName,
  procurementActiveFilterClearClassName,
} from '../lib/procurement-theme'

type Chip = {
  readonly key: string
  readonly prefix: string
  readonly value: string
  readonly onRemove: () => void
}

type Props = {
  readonly filters: ProcurementLandingFilters
  readonly geography?: ProcurementGeographyOptions
  readonly onChange: (next: ProcurementLandingFilters) => void
  readonly compact?: boolean
  readonly className?: string
}

function formatMonth(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale || 'en', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

/**
 * Overview active-filter chips — PNRR lime tags + clear-all. Period is always
 * shown (default previous year, custom range, or all time).
 */
export function ProcurementOverviewActiveFilters({
  filters,
  geography,
  onChange,
  compact = false,
  className,
}: Props) {
  const { i18n } = useLingui()
  const selectedCounty = findProcurementCounty(geography, filters.buyerCounty)
  const period = resolveProcurementOverviewPeriod(filters)

  const chips: Chip[] = []

  if (period.isAllTime) {
    chips.push({
      key: 'period',
      prefix: t`Period`,
      value: t`All time`,
      onRemove: () =>
        onChange({
          ...filters,
          period: undefined,
          dateFrom: undefined,
          dateTo: undefined,
        }),
    })
  } else {
    const from = period.dateFrom
      ? formatMonth(period.dateFrom, i18n.locale)
      : t`First available month`
    const to = period.dateTo
      ? formatMonth(period.dateTo, i18n.locale)
      : t`Latest available month`
    chips.push({
      key: 'period',
      prefix: t`Period`,
      value: `${from} – ${to}`,
      onRemove: () =>
        onChange({
          ...filters,
          period: 'all',
          dateFrom: undefined,
          dateTo: undefined,
        }),
    })
  }

  if (filters.buyerCounty) {
    const countyLabel = selectedCounty
      ? t`${formatProcurementCountyName(selectedCounty.countyName)} County → ${selectedCounty.region ?? t`unknown region`}`
      : t`County ${filters.buyerCounty}`
    chips.push({
      key: 'buyer-county',
      prefix: t`Public institution`,
      value: countyLabel,
      onRemove: () =>
        onChange({
          ...filters,
          buyerRegion: undefined,
          buyerCounty: undefined,
        }),
    })
  } else if (filters.buyerRegion) {
    chips.push({
      key: 'buyer-region',
      prefix: t`Public institution`,
      value: filters.buyerRegion,
      onRemove: () =>
        onChange({
          ...filters,
          buyerRegion: undefined,
          buyerCounty: undefined,
        }),
    })
  }

  return (
    <div
      className={cn(
        'flex min-w-0 flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        compact ? 'py-1' : 'pb-1 pt-2',
        className,
      )}
      aria-label={t`Active procurement filters`}
    >
      <div className="flex min-w-0 w-full flex-1 flex-wrap items-center gap-2 sm:w-auto">
        {compact ? (
          <span className="inline-flex h-6 min-w-6 shrink-0 items-center justify-center bg-[var(--pnrr-fg)] px-1.5 text-xs font-black text-[var(--pnrr-bg)]">
            {chips.length}
          </span>
        ) : null}
        {chips.map((chip) => (
          <span key={chip.key} className={procurementActiveFilterChipClassName}>
            <span className="min-w-0 truncate">
              <span className={procurementActiveFilterChipPrefixClassName}>
                {chip.prefix}:{' '}
              </span>
              <span className={procurementActiveFilterChipValueClassName}>
                {chip.value}
              </span>
            </span>
            <button
              type="button"
              onClick={chip.onRemove}
              aria-label={t`Remove filter ${chip.prefix}`}
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange({})}
        className={cn(
          procurementActiveFilterClearClassName,
          compact && 'hidden sm:inline-flex',
        )}
      >
        <Trans>Clear all</Trans>
      </button>
    </div>
  )
}
