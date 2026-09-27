import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { supplierName, type BuyerProfile, type SupplierYears } from '../../lib/buyer-model'
import { contractsCount, directPurchasesCount, moneyFigure, moneyText, monthText, percentText } from '../../lib/home-format'
import { DIRECT_COMPARABLE_FROM } from '../../lib/home-model'

// ───────────────────────────────────────────────────── the years chart ──

/**
 * The head's chart: direct purchases per year as bars (lei) and contract
 * awards as a line in a band of its own (a count) — two units, one set of
 * years, each band named beside it in its series' colour. The page's year is
 * the solid bar; pointing at a year gives its figures, and a column is a
 * button that makes its year the page's. The year in progress is dashed, runs
 * through SEAP's cutoff month, and cannot be picked.
 */
export function BuyerYearsChart({ profile, onYear, className }: { readonly profile: BuyerProfile; readonly onYear: (year: number) => void; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const titleId = useId()
  const last = profile.partYear ?? profile.latest
  const years = Array.from({ length: Math.max(0, last - DIRECT_COMPARABLE_FROM + 1) }, (_, index) => DIRECT_COMPARABLE_FROM + index)
  const direct = new Map(profile.directYears.map((point) => [point.year, point]))
  const awards = new Map(profile.awardYears.map((point) => [point.year, point]))
  const max = Math.max(1, ...years.map((year) => direct.get(year)?.value ?? 0))
  const counts = years.map((year) => awards.get(year)?.count ?? null)
  const countMax = Math.max(1, ...counts.map((count) => count ?? 0))
  const hasLine = counts.some((count) => count !== null && count > 0)
  const n = years.length
  const centre = (index: number) => ((index + 0.5) / n) * 100
  let path = ''
  counts.forEach((count, index) => {
    if (count === null) return
    const move = path === '' || counts[index - 1] === null
    path += `${move ? 'M' : 'L'}${centre(index).toFixed(2)},${(90 - (count / countMax) * 80).toFixed(2)} `
  })
  const shown = active ?? profile.year
  const shownDirect = direct.get(shown)
  const shownAwards = awards.get(shown)
  // The year in progress: each population runs through its own cutoff month.
  const isPartShown = shown === profile.partYear
  const directCutoff = isPartShown ? profile.cutoff.direct : null
  const contractCutoff = isPartShown ? profile.cutoff.contract : null
  const columns = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }
  if (n === 0) return null
  return (
    <figure className={className} aria-labelledby={titleId}>
      <MonoLabel id={titleId} className="block text-muted-foreground">
        <Trans>Pe ani, din {DIRECT_COMPARABLE_FROM}</Trans>
      </MonoLabel>
      {/* Not a live region: each column's name carries its figures, and a pointer passing over them is not news. */}
      <p className="mt-2 min-h-10 text-sm text-muted-foreground">
        <span className="font-semibold tabular-nums text-foreground">{shown}</span>
        {': '}
        {shownDirect?.value != null ? <span className="tabular-nums text-foreground">{moneyText(shownDirect.value)}</span> : '—'}
        {shownDirect?.count != null ? ` · ${directPurchasesCount(shownDirect.count)}` : ''}
        {directCutoff ? ` ${t`până în ${monthText(directCutoff)}`}` : ''}
        {shownAwards?.count != null && shownAwards.count > 0 ? ` · ${contractsCount(shownAwards.count)}` : ''}
        {contractCutoff && shownAwards?.count ? ` ${t`până în ${monthText(contractCutoff)}`}` : ''}
      </p>
      <div className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3">
        {hasLine ? (
          <>
            <span className="flex items-center gap-1.5 self-center text-xs text-muted-foreground">
              <span className="h-0.5 w-3 shrink-0 rounded-full bg-amber-500 dark:bg-amber-400" aria-hidden="true" />
              <Trans>Contracte atribuite</Trans>
            </span>
            <div className="relative h-10" aria-hidden="true">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                <path d={path} fill="none" className="stroke-amber-500 dark:stroke-amber-400" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </>
        ) : null}
        <span className="flex items-center gap-1.5 self-center text-xs text-muted-foreground">
          <span className="size-2.5 shrink-0 rounded-[2px] bg-primary" aria-hidden="true" />
          <Trans>Achiziții directe, lei</Trans>
        </span>
        <div className="grid h-32 items-end gap-1 border-b border-foreground/20" style={columns} onPointerLeave={() => setActive(null)}>
          {years.map((year) => {
            const point = direct.get(year)
            const isPart = year === profile.partYear
            return (
              <button
                key={year}
                type="button"
                // The year in progress is reachable (its figures are in its name) but cannot be picked.
                aria-disabled={isPart || undefined}
                aria-pressed={year === profile.year}
                aria-label={`${year}: ${point?.value != null ? moneyText(point.value) : '—'}${
                  isPart ? `, ${profile.cutoff.direct ? t`an în curs, până în ${monthText(profile.cutoff.direct)}` : t`an în curs`}` : ''
                }`}
                onPointerEnter={() => setActive(year)}
                onFocus={() => setActive(year)}
                onBlur={() => setActive(null)}
                onClick={() => {
                  if (!isPart) onYear(year)
                }}
                className="group relative flex h-full items-end outline-hidden focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-default"
              >
                <span
                  className={cn(
                    'block w-full transition-colors',
                    isPart
                      ? 'border border-dashed border-primary/60 bg-primary/10'
                      : year === profile.year
                        ? 'bg-primary'
                        : 'bg-primary/35 group-hover:bg-primary/60 group-focus-visible:bg-primary/60',
                  )}
                  style={{ height: `${point?.value ? Math.max((point.value / max) * 100, 1.5) : 0}%` }}
                />
              </button>
            )
          })}
        </div>
        <span />
        <div className="mt-1 grid gap-1" style={columns} aria-hidden="true">
          {years.map((year) => (
            <MonoLabel key={year} className={cn('text-center tabular-nums', year === profile.year ? 'text-foreground' : 'text-muted-foreground')}>
              {String(year).slice(2)}
            </MonoLabel>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 text-xs text-muted-foreground">
        <Trans>Alege un an: pagina îl descrie.</Trans>
      </figcaption>
    </figure>
  )
}

// ───────────────────────────────────────────────── months of the year ──

/** Month initials, the page's language (`I F M A …` / `J F M A …`). */
function monthInitial(month: string): string {
  return monthText(month).charAt(0).toLocaleUpperCase()
}

/**
 * The year's direct-purchase money by month, December marked: year-end
 * spending is the question asked of it. Pointing at (or tapping) a month
 * gives its money and its share of the year.
 */
export function MonthStrip({ profile, className }: { readonly profile: BuyerProfile; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const months = profile.directMonths
  const max = Math.max(1, ...months.map((month) => month.value ?? 0))
  const total = months.reduce((sum, month) => sum + (month.value ?? 0), 0)
  const shown = active === null ? null : months[active]
  return (
    <figure className={className}>
      <p className="min-h-6 text-sm text-muted-foreground">
        {shown ? (
          <>
            <span className="font-semibold text-foreground">{monthText(shown.month)}</span>
            {': '}
            {shown.value != null ? moneyText(shown.value) : '—'}
            {shown.value != null && total > 0 ? ` · ${percentText(shown.value / total, 0)}` : ''}
          </>
        ) : (
          <Trans>Achiziții directe pe luni, {profile.year}, lei</Trans>
        )}
      </p>
      <div className="mt-2 grid h-28 grid-cols-12 items-end gap-1 border-b border-foreground/20" onPointerLeave={() => setActive(null)}>
        {months.map((month, index) => (
          <button
            key={month.month}
            type="button"
            aria-label={`${monthText(month.month)}: ${month.value != null ? moneyText(month.value) : '—'}`}
            onPointerEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            onClick={() => setActive(index)}
            className="group flex h-full items-end outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn('block w-full transition-colors', index === 11 ? 'bg-amber-500 dark:bg-amber-400' : 'bg-primary/45 group-hover:bg-primary/70')}
              style={{ height: `${month.value ? Math.max((month.value / max) * 100, 1.5) : 0}%` }}
            />
          </button>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-12 gap-1" aria-hidden="true">
        {months.map((month, index) => (
          <MonoLabel key={month.month} className={cn('text-center', index === 11 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>
            {monthInitial(month.month)}
          </MonoLabel>
        ))}
      </div>
    </figure>
  )
}

// ──────────────────────────────────────────── the firms, year by year ──

const SHADES = ['bg-primary/15', 'bg-primary/30', 'bg-primary/50', 'bg-primary/75', 'bg-primary'] as const

/** A square-root scale, so a small seller's years still read beside the largest one's. */
function shadeOf(value: number, max: number): string {
  const step = Math.min(SHADES.length - 1, Math.floor(Math.sqrt(value / max) * SHADES.length))
  return SHADES[step] ?? SHADES[0]
}

/**
 * The top direct-purchase sellers since 2019, a row each and a cell per year
 * shaded by the money: who keeps selling to the buyer, and since when. A year
 * the firm sold nothing is a dot. Pointing at (or tapping) a cell gives its
 * money; each cell also carries it as text for assistive technology, so the
 * cells are not tab stops — the firm's name is, and opens its page. The
 * total waits for a screen wide enough for it.
 */
export function SupplierYearsMatrix({ profile, rows, className }: { readonly profile: BuyerProfile; readonly rows: readonly SupplierYears[]; readonly className?: string }) {
  const [active, setActive] = useState<{ readonly cui: string; readonly year: number } | null>(null)
  const captionId = useId()
  if (rows.length === 0) return null
  const max = Math.max(1, ...rows.flatMap((row) => row.years.map((point) => point.value ?? 0)))
  const years = rows[0]?.years.map((point) => point.year) ?? []
  const shownRow = active ? rows.find((row) => row.cui === active.cui) : undefined
  const shownPoint = shownRow?.years.find((point) => point.year === active?.year)
  return (
    <div className={className}>
      <p className="min-h-6 text-sm text-muted-foreground" aria-hidden="true">
        {shownRow && shownPoint ? (
          <>
            <span className="font-semibold text-foreground">{supplierName(profile, shownRow.cui)}</span>
            {`, ${shownPoint.year}: `}
            {shownPoint.value ? moneyText(shownPoint.value) : t`nicio achiziție directă`}
          </>
        ) : (
          <Trans>Achiziții directe de la fiecare firmă, pe ani, lei</Trans>
        )}
      </p>
      <table className="mt-2 w-full table-fixed border-collapse text-sm" aria-describedby={captionId} onPointerLeave={() => setActive(null)}>
        <caption id={captionId} className="sr-only">
          {t`Achiziții directe de la fiecare firmă, pe ani, lei`}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-2/5 pb-1 text-left font-normal sm:w-1/3">
              <span className="sr-only">{t`Firma`}</span>
            </th>
            {years.map((year) => (
              <th key={year} scope="col" className="pb-1 font-normal">
                <MonoLabel className={cn('tabular-nums', year === profile.year ? 'text-foreground' : 'text-muted-foreground')}>
                  <span aria-hidden="true">{String(year).slice(2)}</span>
                  <span className="sr-only">{year}</span>
                </MonoLabel>
              </th>
            ))}
            <th scope="col" className="hidden w-20 pb-1 pl-3 text-right font-normal sm:table-cell">
              <MonoLabel className="text-muted-foreground">{t`Total`}</MonoLabel>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 border-y border-border/70">
          {rows.map((row) => {
            const name = supplierName(profile, row.cui)
            return (
              <tr key={row.cui}>
                <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                  <Link to="/procurement/suppliers/$cui" params={{ cui: row.cui }} className="block truncate text-foreground hover:underline hover:underline-offset-4">
                    {name}
                  </Link>
                </th>
                {row.years.map((point) => (
                  <td
                    key={point.year}
                    className="p-0.5"
                    onPointerEnter={() => setActive({ cui: row.cui, year: point.year })}
                    onPointerDown={() => setActive({ cui: row.cui, year: point.year })}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex h-7 w-full items-center justify-center',
                        point.value ? shadeOf(point.value, max) : 'bg-transparent',
                        point.year === profile.year && 'ring-1 ring-foreground/40',
                      )}
                    >
                      {point.value ? null : <span className="size-1 rounded-full bg-muted-foreground/40" />}
                    </span>
                    <span className="sr-only">{point.value ? moneyText(point.value) : t`nicio achiziție directă`}</span>
                  </td>
                ))}
                <td className="hidden py-1.5 pl-3 text-right tabular-nums text-foreground sm:table-cell">{moneyFigure(row.total)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
