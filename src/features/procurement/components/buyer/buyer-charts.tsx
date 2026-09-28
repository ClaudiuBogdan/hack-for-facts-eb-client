import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { BuyerProfile } from '../../lib/buyer-model'
import { moneyText, monthText, percentText } from '../../lib/home-format'

// ───────────────────────────────────────────────── months of the year ──

/** Month initials, the page's language (`I F M A …` / `J F M A …`). */
function monthInitial(month: string): string {
  return monthText(month).charAt(0).toLocaleUpperCase()
}

/**
 * The year's direct-purchase money by month, December marked: year-end
 * spending is the question asked of it. Pointing at (or tapping) a month
 * gives its money and its share of the year. In the year in progress, the
 * months past SEAP's cutoff are not read yet: faint, and said so — not a
 * month with no purchase.
 */
export function MonthStrip({ profile, className }: { readonly profile: BuyerProfile; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const months = profile.directMonths
  const max = Math.max(1, ...months.map((month) => month.value ?? 0))
  const total = months.reduce((sum, month) => sum + (month.value ?? 0), 0)
  const shown = active === null ? null : months[active]
  const unread = (month: string) => profile.through !== null && month > profile.through
  // December marks a whole year's end; the year in progress has not reached it.
  const marksDecember = profile.year <= profile.latest
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
        ) : profile.through ? (
          t`Achiziții directe pe luni, lei, până în ${monthText(profile.through)}`
        ) : (
          <Trans>Achiziții directe pe luni, {profile.year}, lei</Trans>
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
              className={cn('block w-full transition-colors', marksDecember && index === 11 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-primary/45 group-hover:bg-primary/70')}
              style={{ height: `${month.value ? Math.max((month.value / max) * 100, 1.5) : 0}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-12 gap-1" aria-hidden="true">
        {months.map((month, index) => (
          <MonoLabel
            key={month.month}
            className={cn(
              'text-center',
              marksDecember && index === 11 ? 'text-amber-600 dark:text-amber-400' : unread(month.month) ? 'text-muted-foreground/40' : 'text-muted-foreground',
            )}
          >
            {monthInitial(month.month)}
          </MonoLabel>
        ))}
      </div>
    </figure>
  )
}
