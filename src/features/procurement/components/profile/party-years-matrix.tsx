import { useId, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { moneyFigure, moneyText } from '../../lib/home-format'
import type { PartyYears } from '../../lib/profile-model'

const SHADES = ['bg-primary/15', 'bg-primary/30', 'bg-primary/50', 'bg-primary/75', 'bg-primary'] as const

/** A square-root scale, so a small party's years still read beside the largest one's. */
function shadeOf(value: number, max: number): string {
  const step = Math.min(SHADES.length - 1, Math.floor(Math.sqrt(value / max) * SHADES.length))
  return SHADES[step] ?? SHADES[0]
}

/**
 * The other side's largest parties since 2019 — a buyer's firms, a firm's
 * institutions — a row each and a cell per year shaded by the direct-purchase
 * money: who keeps coming back, and since when. A year with nothing is a dot.
 * Pointing at (or tapping) a cell gives its money; each cell also carries it
 * as text for assistive technology, so the cells are not tab stops — the
 * party's name is, and opens its page. The total waits for a screen wide
 * enough for it.
 */
export function PartyYearsMatrix({
  rows,
  year,
  kind,
  nameOf,
  caption,
  className,
}: {
  readonly rows: readonly PartyYears[]
  /** The page's year, ringed in each row. */
  readonly year: number
  /** What the rows are: firms (a buyer's page) or institutions (a firm's page). */
  readonly kind: 'supplier' | 'authority'
  readonly nameOf: (cui: string) => string
  /** What the cells count, said above the table until a cell is pointed at. */
  readonly caption: string
  readonly className?: string
}) {
  const [active, setActive] = useState<{ readonly cui: string; readonly year: number } | null>(null)
  const captionId = useId()
  if (rows.length === 0) return null
  const max = Math.max(1, ...rows.flatMap((row) => row.years.map((point) => point.value ?? 0)))
  const years = rows[0]?.years.map((point) => point.year) ?? []
  const shownRow = active ? rows.find((row) => row.cui === active.cui) : undefined
  const shownPoint = shownRow?.years.find((point) => point.year === active?.year)
  const linkClass = 'block truncate text-foreground hover:underline hover:underline-offset-4'
  return (
    <div className={className}>
      <p className="min-h-6 text-sm text-muted-foreground" aria-hidden="true">
        {shownRow && shownPoint ? (
          <>
            <span className="font-semibold text-foreground">{nameOf(shownRow.cui)}</span>
            {`, ${shownPoint.year}: `}
            {shownPoint.value ? moneyText(shownPoint.value) : t`nicio achiziție directă`}
          </>
        ) : (
          caption
        )}
      </p>
      <table className="mt-2 w-full table-fixed border-collapse text-sm" aria-describedby={captionId} onPointerLeave={() => setActive(null)}>
        <caption id={captionId} className="sr-only">
          {caption}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="w-2/5 pb-1 text-left font-normal sm:w-1/3">
              <span className="sr-only">{kind === 'supplier' ? t`Firma` : t`Instituția`}</span>
            </th>
            {years.map((y) => (
              <th key={y} scope="col" className="pb-1 font-normal">
                <MonoLabel className={cn('tabular-nums', y === year ? 'text-foreground' : 'text-muted-foreground')}>
                  <span aria-hidden="true">{String(y).slice(2)}</span>
                  <span className="sr-only">{y}</span>
                </MonoLabel>
              </th>
            ))}
            <th scope="col" className="hidden w-20 pb-1 pl-3 text-right font-normal sm:table-cell">
              <MonoLabel className="text-muted-foreground">{t`Total`}</MonoLabel>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 border-y border-border/70">
          {rows.map((row) => (
            <tr key={row.cui}>
              <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                {kind === 'supplier' ? (
                  <Link to="/procurement/suppliers/$cui" params={{ cui: row.cui }} className={linkClass}>
                    {nameOf(row.cui)}
                  </Link>
                ) : (
                  <Link to="/procurement/institutions/$cui" params={{ cui: row.cui }} className={linkClass}>
                    {nameOf(row.cui)}
                  </Link>
                )}
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
                      point.year === year && 'ring-1 ring-foreground/40',
                    )}
                  >
                    {point.value ? null : <span className="size-1 rounded-full bg-muted-foreground/40" />}
                  </span>
                  <span className="sr-only">{point.value ? moneyText(point.value) : t`nicio achiziție directă`}</span>
                </td>
              ))}
              <td className="hidden py-1.5 pl-3 text-right tabular-nums text-foreground sm:table-cell">{moneyFigure(row.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
