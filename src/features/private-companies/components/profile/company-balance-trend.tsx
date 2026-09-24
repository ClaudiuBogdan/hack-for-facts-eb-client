import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { count, moneyText } from '../../lib/company-profile-format'
import type { CompanyProfileModel } from '../../lib/company-profile-model'

/** The legend column beside the chart's bands. */
const LABEL_COLUMN = '7.5rem'

/**
 * The head's chart: turnover, net result and people over the last five years
 * with a statement, all at once, no toggle, no table — the shape at a glance,
 * the figures on a pointer.
 *
 * Two units share no axis, so they share only the years: people are a line in
 * a band of their own above, lei are bars below — turnover wide and pale, the
 * net result narrow and solid in front of it from the same zero, so the margin
 * is the share of the pale bar the solid one covers and a loss hangs under the
 * line in red. Each band is named beside it in its series' colour, which is
 * the whole legend. Pointing at a year (or tapping it) marks its column and
 * gives its three figures in full; a table only assistive technology reads
 * carries the same values.
 */
export function CompanyBalanceTrend({ model, className }: { readonly model: CompanyProfileModel; readonly className?: string }) {
  const [active, setActive] = useState<number | null>(null)
  const titleId = useId()
  const figureRef = useRef<HTMLElement>(null)
  // A year tapped open closes on a tap anywhere else, as the band charts' readings do.
  useEffect(() => {
    if (active === null) return
    const release = (event: PointerEvent) => {
      if (event.target instanceof Node && figureRef.current?.contains(event.target)) return
      setActive(null)
    }
    document.addEventListener('pointerdown', release)
    return () => document.removeEventListener('pointerdown', release)
  }, [active])
  const { recent } = model
  const years = recent.years
  const n = years.length
  if (!model.latest || n === 0) return null
  const last = n - 1
  const repeat = `repeat(${n}, minmax(0, 1fr))`
  const centre = (index: number) => ((index + 0.5) / n) * 100

  const lei = [...recent.turnover, ...recent.netResult].filter((value): value is number => value !== null)
  const top = Math.max(0, ...lei)
  const bottom = Math.min(0, ...lei)
  const range = top - bottom || 1
  const zero = (top / range) * 100
  const barStyle = (value: number) => {
    const height = `${Math.max((Math.abs(value) / range) * 100, 1).toFixed(1)}%`
    return value >= 0 ? { bottom: `${(100 - zero).toFixed(1)}%`, height } : { top: `${zero.toFixed(1)}%`, height }
  }

  const staff = recent.employees.filter((value): value is number => value !== null)
  const hasStaff = staff.length > 0
  const staffLow = hasStaff ? Math.min(...staff) : 0
  const staffHigh = hasStaff ? Math.max(...staff) : 0
  // A line of people starts where the counts do, padded, not at zero: it shows the change, the tooltip the numbers.
  const staffPad = (staffHigh - staffLow) * 0.15 || Math.max(staffHigh * 0.1, 1)
  const staffY = (value: number) => (1 - (value - (staffLow - staffPad)) / (staffHigh - staffLow + staffPad * 2)) * 100
  let staffPath = ''
  recent.employees.forEach((value, index) => {
    if (value === null) return
    const move = staffPath === '' || recent.employees[index - 1] === null
    staffPath += `${move ? 'M' : 'L'}${centre(index).toFixed(2)},${staffY(value).toFixed(2)} `
  })
  const leiRow = hasStaff ? 2 : 1

  const rows = [
    { key: 'turnover', label: t`Cifra de afaceri`, swatch: 'size-2.5 rounded-[2px] bg-primary/30', values: recent.turnover, format: moneyText },
    { key: 'net', label: t`Rezultat net`, swatch: 'size-2.5 rounded-[2px] bg-primary', values: recent.netResult, format: moneyText },
    {
      key: 'employees',
      label: t`Salariați`,
      swatch: 'h-0.5 w-3 rounded-full bg-amber-500 dark:bg-amber-400',
      values: recent.employees,
      format: (value: number) => count(value),
    },
  ]

  return (
    <figure ref={figureRef} className={className} aria-labelledby={titleId}>
      <MonoLabel id={titleId} className="block text-primary">
        {n >= 5 ? t`Ultimii 5 ani cu bilanț` : t`Anii cu bilanț`}
      </MonoLabel>

      {/* The drawing; the hidden table below says every value to assistive technology. */}
      <div className="relative mt-4 grid" style={{ gridTemplateColumns: `${LABEL_COLUMN} ${repeat}` }} aria-hidden="true">
        {hasStaff ? (
          <>
            <MonoLabel className="self-center pr-3 leading-relaxed text-amber-600 dark:text-amber-400" style={{ gridRow: 1, gridColumn: 1 }}>
              <Trans>Salariați</Trans>
            </MonoLabel>
            <div className="relative h-11" style={{ gridRow: 1, gridColumn: `2 / span ${n}` }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
                <path
                  d={staffPath}
                  fill="none"
                  className="stroke-amber-500 dark:stroke-amber-400"
                  strokeWidth={2}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {recent.employees.map((value, index) =>
                value === null ? null : (
                  <span
                    key={years[index]}
                    className={cn(
                      'absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background',
                      index === last || index === active ? 'bg-amber-600 dark:bg-amber-400' : 'bg-amber-500/70',
                    )}
                    style={{ left: `${centre(index).toFixed(2)}%`, top: `${staffY(value).toFixed(1)}%` }}
                  />
                ),
              )}
            </div>
          </>
        ) : null}

        <span className="flex flex-col justify-center gap-2 pr-3" style={{ gridRow: leiRow, gridColumn: 1 }}>
          <MonoLabel className="block leading-relaxed text-primary/60">
            <Trans>Cifra de afaceri</Trans>
          </MonoLabel>
          <MonoLabel className="block leading-relaxed text-primary">
            <Trans>Rezultat net</Trans>
          </MonoLabel>
        </span>
        <div className={cn('relative h-28', hasStaff && 'mt-3')} style={{ gridRow: leiRow, gridColumn: `2 / span ${n}` }}>
          <span className="absolute inset-x-0 h-px bg-border" style={{ top: `${zero.toFixed(1)}%` }} />
          <div className="grid h-full" style={{ gridTemplateColumns: repeat }}>
            {years.map((year, index) => {
              const turnover = recent.turnover[index] ?? null
              const net = recent.netResult[index] ?? null
              const strong = index === last || index === active
              return (
                <div key={year} className="relative">
                  {turnover !== null ? (
                    <span
                      className={cn('absolute inset-x-1.5 rounded-[2px] transition-colors sm:inset-x-2.5', strong ? 'bg-primary/30' : 'bg-primary/15')}
                      style={barStyle(turnover)}
                    />
                  ) : null}
                  {net !== null ? (
                    <span
                      className={cn(
                        'absolute left-1/2 w-2/5 -translate-x-1/2 rounded-[2px] transition-colors',
                        net < 0 ? (strong ? 'bg-destructive' : 'bg-destructive/60') : strong ? 'bg-primary' : 'bg-primary/60',
                      )}
                      style={barStyle(net)}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid border-t pt-1.5" style={{ gridRow: leiRow + 1, gridColumn: `2 / span ${n}`, gridTemplateColumns: repeat }}>
          {years.map((year, index) => (
            <span
              key={year}
              className={cn('text-center font-mono text-[10px] tabular-nums', index === last || index === active ? 'text-foreground' : 'text-muted-foreground')}
            >
              {year}
            </span>
          ))}
        </div>

        {/* The pointer's targets: one column per year over both bands, marked while read. */}
        <div
          className="relative z-10 grid"
          style={{ gridRow: hasStaff ? '1 / span 2' : '1', gridColumn: `2 / span ${n}`, gridTemplateColumns: repeat }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') setActive(null)
          }}
        >
          {years.map((year, index) => (
            <div
              key={year}
              // A mouse reads a year by pointing at it; a finger or a pen by tapping it, and taps it again to let go.
              // A touch fires `pointerenter` just before `pointerdown`, so hover must not answer it.
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setActive(index)
              }}
              onPointerDown={(event) => {
                if (event.pointerType !== 'mouse') setActive((current) => (current === index ? null : index))
              }}
              // A pan that starts on the chart is the browser's, not a tap: let go of the year it opened.
              onPointerCancel={(event) => {
                if (event.pointerType !== 'mouse') setActive(null)
              }}
              className={cn('rounded-sm transition-colors', active === index && 'bg-foreground/5')}
            />
          ))}
          {active !== null ? (
            <div
              className="pointer-events-none absolute top-0 z-20 w-max min-w-40 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md"
              style={{
                left: `${centre(active).toFixed(2)}%`,
                // Beside the column, on the side with room: right of the first half, left of the second.
                transform: active < n / 2 ? 'translateX(1rem)' : 'translateX(calc(-100% - 1rem))',
              }}
            >
              <MonoLabel className="block text-muted-foreground">{years[active]}</MonoLabel>
              <dl className="mt-2 grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1">
                {rows.map((row) => {
                  const value = row.values[active] ?? null
                  return (
                    <Fragment key={row.key}>
                      <dt className="flex items-center gap-1.5">
                        <span className="flex w-3 justify-center">
                          <span className={row.swatch} />
                        </span>
                        {row.label}
                      </dt>
                      <dd className={cn('text-right font-medium tabular-nums', value !== null && value < 0 && 'text-destructive')}>
                        {value === null ? '—' : row.format(value)}
                      </dd>
                    </Fragment>
                  )
                })}
              </dl>
            </div>
          ) : null}
        </div>
      </div>

      <table className="sr-only">
        <caption>{t`Cifra de afaceri, rezultatul net și salariații, ${years[0]}–${years[last]}`}</caption>
        <thead>
          <tr>
            <th scope="col">{t`An`}</th>
            {rows.map((row) => (
              <th key={row.key} scope="col">
                {row.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {years.map((year, index) => (
            <tr key={year}>
              <th scope="row">{year}</th>
              {rows.map((row) => {
                const value = row.values[index] ?? null
                return <td key={row.key}>{value === null ? '—' : row.format(value)}</td>
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  )
}
