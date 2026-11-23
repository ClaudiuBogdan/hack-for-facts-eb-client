import { plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { BUDGET_YEAR, NO_DATA_COLOR, positionOnScale, type Measure, type MeasureScale } from '../../lib/budget-map-measures'
import type { NumberLocale } from '../../lib/national-facts'

/**
 * The legend under the map, one form at every width: what the map shows (its
 * name and what it is), the balance's two ends, the colour bar with the
 * primărie under the pointer marked on it, the values where one colour gives
 * way to the next, how many primării have no figure, and where the figures come
 * from.
 *
 * The values sit under the joins rather than naming each class (the owner's
 * choice; DESIGN.md decision log, 23 November 2026). A class still holds its
 * lower bound, and the hover card gives each primărie's exact figure.
 *
 * Before the figures arrive the bar is grey and the values row is empty but
 * keeps its height, so nothing moves when they come.
 */
export function MapLegend({
  measure,
  scale,
  active,
  coverage,
  outsideMap,
  locale,
}: {
  readonly measure: Measure
  /** Null while the figures load: the bar holds its place. */
  readonly scale: MeasureScale | null
  /** The figure of the primărie under the pointer, marked on the bar. */
  readonly active: number | null
  /** Primării with a figure, of all of them; null while the figures load. */
  readonly coverage: { readonly withData: number; readonly total: number } | null
  /** Budgets with figures but no shape on the map (the capital's own, drawn as its sectors). */
  readonly outsideMap: number
  readonly locale: NumberLocale
}) {
  const { i18n } = useLingui()
  const classes = scale?.classes ?? []
  const at = scale && classes.length > 0 ? positionOnScale(scale, active) : null
  const missing = coverage ? coverage.total - coverage.withData : 0
  const year = BUDGET_YEAR

  return (
    <div className="space-y-4" data-legend="budget-map">
      <div className="max-w-2xl">
        <p className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-sm font-medium text-foreground">{i18n._(measure.title)}</span>
          <span className="text-sm text-muted-foreground">{i18n._(measure.description)}</span>
        </p>
        {measure.ends ? (
          <p className="mt-3 flex justify-between text-xs text-muted-foreground">
            <span>{i18n._(measure.ends.below)}</span>{' '}
            <span>{i18n._(measure.ends.above)}</span>
          </p>
        ) : null}
        <div className={measure.ends ? 'relative mt-1.5' : 'relative mt-3'} aria-hidden="true">
          {classes.length > 0 ? (
            <div className="flex h-2.5 gap-px">
              {classes.map((item, i) => (
                <span key={i} className="flex-1" style={{ background: item.color }} />
              ))}
            </div>
          ) : (
            <div className="h-2.5 rounded-[2px] bg-muted" />
          )}
          {at !== null ? <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: `${(at * 100).toFixed(2)}%` }} /> : null}
        </div>
        {/* The boundaries, each centred under the join it names: classes 1..n−1 start there. */}
        <ul className="relative mt-1.5 h-4 text-xs tabular-nums text-muted-foreground" aria-hidden="true">
          {classes.map((item, k) =>
            k === 0 || item.from === null ? null : (
              <li key={k} className="absolute top-0 -translate-x-1/2 whitespace-nowrap" style={{ left: `${((k / classes.length) * 100).toFixed(2)}%` }}>
                {measure.tick(item.from, locale)}
              </li>
            ),
          )}
        </ul>
      </div>
      {missing > 0 ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2.5 w-4 shrink-0 rounded-[2px]" style={{ background: NO_DATA_COLOR }} aria-hidden="true" />
          {plural(missing, { one: '# primărie fără date', few: '# primării fără date', other: '# de primării fără date' })}
        </p>
      ) : null}
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground" data-source-line>
        {t`Sursa: Ministerul Finanțelor, execuția de casă ${year} a primăriilor (ordonator principal), cu transferurile și finanțările incluse.`}
        {outsideMap > 0 ? ` ${t`Bugetul propriu al Municipiului București nu apare: harta arată cele șase sectoare.`}` : null}
      </p>
    </div>
  )
}
