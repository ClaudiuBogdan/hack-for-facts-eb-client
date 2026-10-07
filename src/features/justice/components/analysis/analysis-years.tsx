import { useId, useRef, useState } from 'react'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { formatHubNumber } from '@/features/private-companies/lib/hub-format'
import { HubLoadError, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { cn } from '@/lib/utils'
import { useAnalysisYears } from '../../hooks/use-justice-analysis'
import { BAND_FROM, changeOf, sourceOf, YEARS, type Question } from '../../lib/analysis-model'
import { lastMonthText } from '../../lib/analysis-notes'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_LAST_CAPTURE_YEAR } from '../../lib/hub-years'
import { casesCount } from '../../lib/judicial-labels'
import { signedPercentText } from '../../lib/judicial-format'

/** The unit the bars' labels share, from the largest figure: „mii de dosare" once, „1.677" on the bar. */
function scaleOf(max: number): { readonly divisor: number; readonly digits: number; readonly caption: string } {
  if (max >= 1e6) return { divisor: 1e6, digits: 2, caption: t`milioane de dosare` }
  if (max >= 1e4) return { divisor: 1e3, digits: max >= 1e5 ? 0 : 1, caption: t`mii de dosare` }
  return { divisor: 1, digits: 0, caption: t`dosare` }
}

/**
 * The question in every year since the crawl began (May 2013), in a band of
 * its own: the years the capture holds whole solid, the question's year
 * marked; the years before them dashed (only cases still active later) and
 * the last a part-year. Pointing at a year, or focusing it, gives its count
 * and change; a click on a year a question can ask makes it the question's.
 * On a touch screen the first tap shows the figures and the second takes
 * the year.
 */
export function AnalysisYears({ question, onChange }: { readonly question: Question; readonly onChange: (question: Question) => void }) {
  const titleId = useId()
  const years = useAnalysisYears(question)
  const [active, setActive] = useState<number | null>(null)
  const pressedWith = useRef<string | null>(null)
  const points = Array.from({ length: JUSTICE_LAST_CAPTURE_YEAR - BAND_FROM + 1 }, (_, index) => BAND_FROM + index).map((year) => ({ year, count: years.data?.get(String(year)) ?? 0 }))
  const max = Math.max(0, ...points.map((point) => point.count))
  const scale = scaleOf(max)
  const columns = { gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }
  const askable = (year: number) => YEARS.includes(year)
  const part = (year: number) => year === JUSTICE_LAST_CAPTURE_YEAR
  const source = sourceOf(question)
  // The ÎCCJ's archive alone: its years do not compare (design.md §16).
  const changes = source !== 'iccj'
  return (
    <section className="border-b" aria-labelledby={titleId}>
      <RuledFrame className="py-12 sm:py-16">
        <HubSectionHead titleId={titleId} index={`${BAND_FROM}–${JUSTICE_LAST_CAPTURE_YEAR}`} title={t`Pe ani`} />
        <div className="mt-8">
          {years.isError && !years.data ? (
            <HubLoadError onRetry={years.retry} />
          ) : !years.data ? (
            <div className="h-56 animate-pulse bg-muted/40 sm:h-64" aria-hidden="true" />
          ) : (
            <figure aria-labelledby={titleId}>
              <MonoLabel className="block text-muted-foreground">{scale.caption}</MonoLabel>
              <ol className="mt-3 grid h-48 items-end border-b border-foreground/20 sm:h-60" style={columns} onPointerLeave={() => setActive(null)}>
                {points.map((point, index) => {
                  const chosen = point.year === question.year
                  const dashed = !askable(point.year) || part(point.year)
                  const previous = points[index - 1]
                  const change = changes && previous && previous.year >= JUSTICE_FIRST_WHOLE_YEAR && askable(point.year) && !part(point.year) ? changeOf(point.count, previous.count) : null
                  const lines = [
                    `${point.year}: ${casesCount(point.count)}`,
                    change !== null && previous ? t`${signedPercentText(change)} față de ${previous.year}` : null,
                    !askable(point.year) ? t`preluare parțială` : part(point.year) ? t`până în ${lastMonthText(source)}` : null,
                  ].filter((line): line is string => line !== null)
                  return (
                    <li key={point.year} className={cn('relative h-full min-w-0 transition-colors', active === point.year && 'bg-muted/60')}>
                      {/* A partial year stays in reach — its figures are read by pointing, focusing or tapping — but cannot be the question's year. */}
                      <button
                        type="button"
                        aria-disabled={askable(point.year) ? undefined : true}
                        aria-pressed={askable(point.year) ? chosen : undefined}
                        aria-label={lines.join(', ')}
                        onPointerEnter={(event) => {
                          if (event.pointerType !== 'touch') setActive(point.year)
                        }}
                        onPointerDown={(event) => {
                          pressedWith.current = event.pointerType
                        }}
                        onFocus={() => {
                          if (pressedWith.current === null) setActive(point.year)
                        }}
                        onBlur={() => setActive(null)}
                        onClick={() => {
                          const touch = pressedWith.current === 'touch'
                          pressedWith.current = null
                          if (touch && active !== point.year) return setActive(point.year)
                          if (askable(point.year)) onChange({ ...question, year: point.year })
                        }}
                        className="flex h-full w-full flex-col items-center justify-end px-0.5 outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset aria-disabled:cursor-default sm:px-2"
                      >
                        <span className={cn('mb-1.5 block h-3.5 max-w-full truncate text-[0.625rem] leading-none tabular-nums sm:text-xs', chosen ? 'font-semibold text-foreground' : 'text-muted-foreground')} aria-hidden="true">
                          {point.count > 0 ? formatHubNumber(point.count / scale.divisor, { digits: scale.digits }) : ''}
                        </span>
                        <span
                          className={cn(
                            'block w-full max-w-24 transition-colors',
                            dashed ? cn('border border-dashed border-primary', chosen ? 'bg-primary/55' : 'bg-primary/10') : chosen ? 'bg-primary' : active === point.year ? 'bg-primary/55' : 'bg-primary/25',
                          )}
                          style={{ height: `calc((100% - 1.25rem) * ${max > 0 ? point.count / max : 0})`, minHeight: point.count > 0 ? 2 : 0 }}
                        />
                      </button>
                      {active === point.year ? (
                        <div
                          aria-hidden="true"
                          className={cn(
                            'pointer-events-none absolute top-0 z-20 w-max max-w-44 space-y-1 border bg-popover px-3 py-2 text-xs leading-snug text-popover-foreground shadow-md sm:max-w-60',
                            index < points.length / 2 ? 'left-full ml-1.5' : 'right-full mr-1.5',
                          )}
                        >
                          {lines.map((line, position) => (
                            <p key={line} className={cn('tabular-nums', position === 0 ? 'font-semibold' : 'text-muted-foreground')}>
                              {line}
                            </p>
                          ))}
                          {askable(point.year) ? <p className="border-t pt-1 text-muted-foreground">{chosen ? t`Anul ales` : t`Clic: doar ${point.year}`}</p> : null}
                        </div>
                      ) : null}
                    </li>
                  )
                })}
              </ol>
              <ol className="mt-2 grid" style={columns} aria-hidden="true">
                {points.map((point) => (
                  <li key={point.year} className="min-w-0 text-center">
                    <MonoLabel className={cn('tabular-nums', point.year === question.year ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
                      <span className="sm:hidden">{`'${String(point.year).slice(2)}`}</span>
                      <span className="hidden sm:inline">{point.year}</span>
                    </MonoLabel>
                  </li>
                ))}
              </ol>
              <figcaption className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2.5 border border-dashed border-primary bg-primary/10" aria-hidden="true" />
                  {t`înainte de ${JUSTICE_FIRST_WHOLE_YEAR}: preluare parțială; ${JUSTICE_LAST_CAPTURE_YEAR}: până în ${lastMonthText(source)}`}
                </span>
              </figcaption>
            </figure>
          )}
        </div>
      </RuledFrame>
    </section>
  )
}
