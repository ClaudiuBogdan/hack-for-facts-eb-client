import { MonoLabel } from '@/components/landing-skin/mono-label'
import { BUDGET_YEAR, NO_DATA_COLOR, positionOnScale, primarii, type Measure, type MeasureScale } from './budget-map.data'

/**
 * The legend under the map, in the INS map's form (`uat-map-legend.tsx`):
 * what the colours are and in what unit, every class named by exactly the
 * values it holds, the UAT under the pointer marked on the bar, how many
 * primării have no figure, and one line on where the figures come from.
 *
 * On a phone the classes are a two-column list beside their swatches: seven
 * labels under a 390 px bar wrap to a column of fragments.
 */

const integer = new Intl.NumberFormat('ro-RO')

export function MapLegend({
  measure,
  scale,
  active,
  coverage,
}: {
  readonly measure: Measure
  /** Null while the figures load: the bar holds its place. */
  readonly scale: MeasureScale | null
  /** The figure of the UAT under the pointer, marked on the bar. */
  readonly active: number | null
  /** UATs with a figure, of all of them; null while the figures load. */
  readonly coverage: { readonly withData: number; readonly total: number } | null
}) {
  const classes = scale?.classes ?? []
  const at = scale && classes.length > 0 ? positionOnScale(scale, active) : null
  const missing = coverage ? coverage.total - coverage.withData : 0

  return (
    <div className="space-y-4" data-legend="budget-map">
      <div className="max-w-2xl space-y-1.5">
        <MonoLabel className="block text-muted-foreground">
          {measure.title} · {measure.unit}
        </MonoLabel>
        {scale?.ends ? (
          <div className="flex justify-between">
            <MonoLabel className="text-muted-foreground">
              <span aria-hidden="true">← </span>
              {scale.ends.below}
            </MonoLabel>
            <MonoLabel className="text-muted-foreground">
              {scale.ends.above}
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
                  {item.label}
                </li>
              ))}
            </ol>
            {/* A phone: the classes as a list, each beside its swatch. */}
            <ol className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 sm:hidden">
              {classes.map((item, i) => (
                <li key={i} className="flex items-center gap-2 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: item.color }} aria-hidden="true" />
                  {item.label}
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
          <MonoLabel className="text-muted-foreground">{primarii(missing)} fără date</MonoLabel>
        </p>
      ) : null}
      <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground" data-source-line>
        {measure.note ? `${measure.note} ` : null}
        Sursa: Ministerul Finanțelor, execuția bugetară {BUDGET_YEAR} a primăriilor (ordonator principal), în lei, valori nominale, fără transferurile dintre bugete, ca în restul platformei.
        {coverage ? ` ${integer.format(coverage.withData)} din ${integer.format(coverage.total)} primării au date.` : null}
      </p>
    </div>
  )
}
