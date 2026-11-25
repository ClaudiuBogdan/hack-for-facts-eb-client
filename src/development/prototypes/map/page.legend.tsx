import { plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { Info } from 'lucide-react'
import { PopulationMethodologyNote } from '@/components/normalization/population-methodology-note'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { LegendScale } from '@/features/landing/components/budget-map/map-legend'
import { NO_DATA_COLOR, type Measure, type MeasureScale } from '@/features/landing/lib/budget-map-measures'
import type { NumberLocale } from '@/features/landing/lib/national-facts'
import { cn } from '@/lib/utils'
import type { Basis, Level } from './page.measures'

/**
 * The map page's legend, a card on the map's corner (under the map on a
 * phone): the map's name and what it is, the landing's colour scale, the
 * no-data count and one source line. What the source line cannot hold — the
 * full wording and, per inhabitant, where the population comes from — is one
 * tap away, behind the „i".
 */
export function PageLegend({
  measure,
  scale,
  active,
  coverage,
  outsideMap,
  year,
  basis,
  level,
  locale,
  className,
}: {
  readonly measure: Measure
  /** Null while the figures load: the bar holds its place. */
  readonly scale: MeasureScale | null
  readonly active: number | null
  readonly coverage: { readonly withData: number; readonly total: number } | null
  readonly outsideMap: number
  readonly year: string
  readonly basis: Basis
  readonly level: Level
  readonly locale: NumberLocale
  readonly className?: string
}) {
  const { i18n } = useLingui()
  const missing = coverage ? coverage.total - coverage.withData : 0
  return (
    <section className={cn('text-foreground', className)} aria-label={t`Legenda hărții`} data-legend="map-page">
      <p className="text-sm font-medium leading-tight">{i18n._(measure.title)}</p>
      <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{i18n._(measure.description)}</p>
      <LegendScale measure={measure} scale={scale} active={active} locale={locale} />
      {missing > 0 ? (
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-2.5 w-4 shrink-0 rounded-[2px]" style={{ background: NO_DATA_COLOR }} aria-hidden="true" />
          {plural(missing, { one: '# primărie fără date', few: '# primării fără date', other: '# de primării fără date' })}
        </p>
      ) : null}
      <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground" data-source-line>
        <span>{basis === 'per_capita' ? t`Sursa: Ministerul Finanțelor, execuția ${year}; populația după domiciliu la 1 ianuarie ${year}, INS` : t`Sursa: Ministerul Finanțelor, execuția ${year}`}</span>
        <Popover>
          <PopoverTrigger asChild>
            <button type="button" aria-label={t`Despre aceste date`} className="grid size-6 shrink-0 place-items-center rounded-md hover:bg-muted hover:text-foreground">
              <Info className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" collisionPadding={12} className="w-80 space-y-2 p-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              {level === 'county'
                ? t`Sursa: Ministerul Finanțelor, execuția de casă ${year} a primăriilor și a consiliilor județene (ordonator principal), cu transferurile și finanțările incluse. Fiecare județ adună bugetele primăriilor sale și al consiliului județean, așa cum au fost raportate; la București, sectoarele și bugetul propriu al capitalei.`
                : t`Sursa: Ministerul Finanțelor, execuția de casă ${year} a primăriilor (ordonator principal), cu transferurile și finanțările incluse.`}
              {outsideMap > 0 ? ` ${t`Bugetul propriu al Municipiului București nu apare: harta arată cele șase sectoare.`}` : null}
            </p>
            {basis === 'per_capita' ? (
              <>
                <p>{level === 'county' ? t`Sumele sunt împărțite la populația din ${year} a localităților din județ, adunată.` : t`Sumele sunt împărțite la populația localității din ${year}.`}</p>
                <PopulationMethodologyNote />
              </>
            ) : null}
          </PopoverContent>
        </Popover>
      </p>
    </section>
  )
}
