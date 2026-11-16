import { plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { compactParts, formatCount, joinParts } from '../../lib/budget-map-format'
import { BUDGET_YEAR, NO_DATA_COLOR, positionOnScale, type Measure, type MeasureClass, type MeasureScale } from '../../lib/budget-map-measures'
import type { NumberLocale } from '../../lib/national-facts'

/**
 * The legend under the map, in the INS map's form (`uat-map-legend.tsx`):
 * what the colours are and in what unit, every class named by exactly the
 * values it holds (DESIGN.md decision log, 2026-10-02: a class holds its lower
 * bound, not its upper one), the primărie under the pointer marked on the bar,
 * how many have no figure, and one line on where the figures come from.
 *
 * On a phone the classes are a two-column list beside their swatches: seven
 * labels under a 390 px bar wrap to a column of fragments.
 */

/** Exactly the values a class holds, in the measure's unit; a range whose ends share a suffix names it once. */
function useClassLabel(locale: NumberLocale) {
    return ({ from, to }: MeasureClass): string => {
    if (from === null && to === null) return ''
    if (from === null) {
      const bound = joinParts(compactParts(to!, locale), locale)
      return t`sub ${bound}`
    }
    if (to === null) {
      const bound = joinParts(compactParts(from, locale), locale)
      return t`${bound} sau mai mult`
    }
    const [low, high] = [compactParts(from, locale), compactParts(to, locale)]
    const lower = low.suffix === high.suffix ? low.number : joinParts(low, locale)
    const upper = joinParts(high, locale)
    return t`${lower} – sub ${upper}`
  }
}

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
  const classLabel = useClassLabel(locale)
  const classes = scale?.classes ?? []
  const at = scale && classes.length > 0 ? positionOnScale(scale, active) : null
  const missing = coverage ? coverage.total - coverage.withData : 0
  const year = BUDGET_YEAR
  const withData = coverage ? formatCount(coverage.withData, locale) : ''
  const total = coverage ? formatCount(coverage.total, locale) : ''

  return (
    <div className="space-y-4" data-legend="budget-map">
      <div className="max-w-2xl space-y-1.5">
        <MonoLabel className="block text-muted-foreground">
          {i18n._(measure.title)} · {i18n._(measure.unit)}
        </MonoLabel>
        {scale?.ends ? (
          <div className="flex justify-between">
            <MonoLabel className="text-muted-foreground">
              <span aria-hidden="true">← </span>
              {i18n._(scale.ends.below)}
            </MonoLabel>
            <MonoLabel className="text-muted-foreground">
              {i18n._(scale.ends.above)}
              <span aria-hidden="true"> →</span>
            </MonoLabel>
          </div>
        ) : null}
        {classes.length > 0 ? (
          <>
            <div className="relative" aria-hidden="true">
              <div className="flex h-2.5 gap-px">
                {classes.map((item, i) => (
                  <span key={i} className="flex-1" style={{ background: item.color }} />
                ))}
              </div>
              {at !== null ? <span className="absolute -inset-y-1.5 w-0.5 -translate-x-1/2 bg-foreground" style={{ left: `${(at * 100).toFixed(2)}%` }} /> : null}
            </div>
            {/* Wider screens: each class named under its own colour. */}
            <ol className="hidden gap-px sm:grid" style={{ gridTemplateColumns: `repeat(${classes.length}, minmax(0, 1fr))` }}>
              {classes.map((item, i) => (
                <li key={i} className="text-center font-mono text-[10px] leading-tight tabular-nums text-muted-foreground">
                  {classLabel(item)}
                </li>
              ))}
            </ol>
            {/* A phone: the classes as a list, each beside its swatch. */}
            <ol className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 sm:hidden">
              {classes.map((item, i) => (
                <li key={i} className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.color }} aria-hidden="true" />
                  {classLabel(item)}
                </li>
              ))}
            </ol>
          </>
        ) : (
          <div className="h-2.5 rounded-[2px] bg-muted" aria-hidden="true" />
        )}
      </div>
      {missing > 0 ? (
        <p className="flex items-center gap-2">
          <span className="h-2.5 w-4 shrink-0 rounded-[2px]" style={{ background: NO_DATA_COLOR }} aria-hidden="true" />
          <MonoLabel className="text-muted-foreground">
            {plural(missing, { one: '# primărie fără date', few: '# primării fără date', other: '# de primării fără date' })}
          </MonoLabel>
        </p>
      ) : null}
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground" data-source-line>
        {measure.note ? `${i18n._(measure.note)} ` : null}
        {t`Sursa: Ministerul Finanțelor, execuția bugetară ${year} a primăriilor (ordonator principal), în lei, valori nominale, fără transferurile dintre bugete, ca în restul platformei.`}
        {coverage ? ` ${t`${withData} din ${total} primării de pe hartă au date.`}` : null}
        {outsideMap > 0 ? ` ${t`Bugetul propriu al Municipiului București nu are un contur pe hartă și nu apare: harta arată cele șase sectoare.`}` : null}
      </p>
    </div>
  )
}
