import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { BuyerProfile } from '../../lib/buyer-model'
import { moneyText, monthText, percentText } from '../../lib/home-format'
import { isPartYear } from '../../lib/profile-period'
import { periodText } from '../../lib/profile-period-text'

// ───────────────────────────────────────────────── months of the year ──

/** Month initials, the page's language (`I F M A …` / `J F M A …`). */
function monthInitial(month: string): string {
  return monthText(month).charAt(0).toLocaleUpperCase()
}

/**
 * The period's direct-purchase money by month — a year's, or the last twelve
 * months', a year's label where one begins — December marked: year-end
 * spending is the question asked of it. Pointing at (or tapping) a month
 * gives its money and its share of the period. In the year in progress, the
 * months past SEAP's cutoff are not read yet: faint, and said so — not a
 * month with no purchase.
 */
export function MonthStrip({ profile, className }: { readonly profile: BuyerProfile; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const months = profile.directMonths
  const max = Math.max(1, ...months.map((month) => month.value ?? 0))
  const total = months.reduce((sum, month) => sum + (month.value ?? 0), 0)
  const shown = active === null ? null : months[active]
  const { period } = profile
  const unread = (month: string) => period.through !== null && month > period.through
  // December marks a year's end: in the last twelve months and a complete year; the year in progress has not reached it.
  const marksDecember = period.kind === 'recent' || period.year <= profile.latest
  const isDecember = (month: string) => marksDecember && month.endsWith('-12')
  // The last twelve months run across two years: each year's first month carries it.
  const yearOf = (month: string, index: number) => (period.kind === 'recent' && (index === 0 || month.endsWith('-01')) ? month.slice(0, 4) : '')
  const valueText = (month: { readonly month: string; readonly value: number | null }) =>
    unread(month.month) ? t`încă fără date` : month.value != null ? moneyText(month.value) : '—'
  return (
    <figure className={className}>
      <p className="min-h-6 text-sm text-muted-foreground">
        {shown ? (
          <>
            <span className="font-semibold text-foreground">{monthText(shown.month)}</span>
            {': '}
            {valueText(shown)}
            {shown.value != null && total > 0 ? ` · ${percentText(shown.value / total, 0)}` : ''}
          </>
        ) : isPartYear(period) && period.through ? (
          t`Achiziții directe pe luni, lei, până în ${monthText(period.through)}`
        ) : (
          <Trans>Achiziții directe pe luni, {periodText(period)}, lei</Trans>
        )}
      </p>
      <div className="mt-2 grid h-28 grid-cols-12 items-end gap-1 border-b border-foreground/20" onPointerLeave={() => setActive(null)}>
        {months.map((month, index) => (
          <button
            key={month.month}
            type="button"
            aria-label={`${monthText(month.month)}: ${valueText(month)}`}
            onPointerEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(index)}
            className="group flex h-full items-end outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn('block w-full transition-colors', isDecember(month.month) ? 'bg-amber-500 dark:bg-amber-400' : 'bg-primary/45 group-hover:bg-primary/70')}
              style={{ height: `${month.value ? Math.max((month.value / max) * 100, 1.5) : 0}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-12 gap-1" aria-hidden="true">
        {months.map((month) => (
          <MonoLabel
            key={month.month}
            className={cn(
              'text-center',
              isDecember(month.month) ? 'text-amber-600 dark:text-amber-400' : unread(month.month) ? 'text-muted-foreground/40' : 'text-muted-foreground',
            )}
          >
            {monthInitial(month.month)}
          </MonoLabel>
        ))}
      </div>
      {period.kind === 'recent' ? (
        <div className="mt-0.5 grid grid-cols-12 gap-1" aria-hidden="true">
          {months.map((month, index) => (
            <MonoLabel key={month.month} className="text-center text-[10px] text-muted-foreground/80">
              {yearOf(month.month, index)}
            </MonoLabel>
          ))}
        </div>
      ) : null}
    </figure>
  )
}
