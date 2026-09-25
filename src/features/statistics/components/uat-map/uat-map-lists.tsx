import { memo } from 'react'
import { Link } from '@tanstack/react-router'
import { plural, t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { UatMapGeometry, UatMapSeries } from '../../lib/uat-map-snapshot'
import { cn } from '@/lib/utils'
import { countyLabel, formatTotal, type SeriesMeta } from './uat-map-series'

/**
 * The lists beside the map: the country's ten largest (and, for a balance,
 * smallest) totals, or every UAT of the county shown — each a link to the
 * UAT's page.
 */

interface ListProps {
  readonly meta: SeriesMeta
  readonly series: UatMapSeries
  readonly geometry: UatMapGeometry
  readonly rank: ReadonlyMap<number, number>
  readonly onHover: (index: number | null) => void
}

const ROW_GRID = 'grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3'

function ListHead({ meta }: { readonly meta: SeriesMeta }) {
  return (
    <div className={cn(ROW_GRID, 'px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground')} aria-hidden="true">
      <span>{t`loc`}</span>
      <span>{t`localitate`}</span>
      <span className="text-right">{meta.unit}</span>
    </div>
  )
}

function UatRow({ index, meta, series, geometry, rank, onHover, showCounty }: ListProps & { readonly index: number; readonly showCounty: boolean }) {
  return (
    <li>
      <Link
        to="/ins/teritorii/$siruta"
        params={{ siruta: geometry.siruta[index]! }}
        onPointerEnter={() => onHover(index)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(index)}
        onBlur={() => onHover(null)}
        className={cn(ROW_GRID, 'px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/50')}
      >
        {/* The head is for the eye: a screen reader hears „locul" and the unit in the row itself. */}
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          <span className="sr-only">{t`locul`} </span>
          {rank.get(index) ?? '—'}
        </span>
        <span className="min-w-0 truncate text-foreground">
          {geometry.name[index]}
          {showCounty ? <span className="text-muted-foreground"> · {geometry.county[index]}</span> : null}
        </span>
        <span className="text-right tabular-nums text-foreground">
          {formatTotal(meta, series.total.values[index], { unit: false })}
          {series.total.values[index] != null ? <span className="sr-only"> {meta.unit}</span> : null}
        </span>
      </Link>
    </li>
  )
}

/**
 * The ten largest and — for a balance — the ten smallest totals.
 *
 * Memoized, like the county list: each row is a router `Link`, which
 * subscribes to the router — a hover on the map must not render twenty of them.
 */
export const NationalExtremes = memo(function NationalExtremes(props: ListProps & { readonly order: readonly number[] }) {
  const { meta, order } = props
  // A level's bottom is only its smallest places; a balance's bottom is its largest losses.
  const blocks = meta.signed
    ? [
        { title: t`Cele mai mari valori`, rows: order.slice(0, 10) },
        { title: t`Cele mai mici valori`, rows: order.slice(-10).reverse() },
      ]
    : [{ title: t`Cele mai mari`, rows: order.slice(0, 10) }]
  return (
    <div className="space-y-6" data-list="national">
      {blocks.map((block) => (
        <div key={block.title}>
          <MonoLabel className="block text-muted-foreground">{block.title}</MonoLabel>
          <div className="mt-2">
            <ListHead meta={meta} />
            <ol className="divide-y border-y">
              {block.rows.map((index) => (
                <UatRow key={index} {...props} index={index} showCounty />
              ))}
            </ol>
          </div>
        </div>
      ))}
    </div>
  )
})

/** Every UAT of a county, largest total first, the ones with none last. */
export const CountyList = memo(function CountyList(props: ListProps & { readonly county: string; readonly order: readonly number[] }) {
  const { county, meta, geometry, order } = props
  const ranked = order.filter((index) => geometry.county[index] === county)
  const placed = new Set(ranked)
  const rest = geometry.county.flatMap((code, index) => (code === county && !placed.has(index) ? [index] : []))
  return (
    <div data-list="county">
      <MonoLabel className="block text-muted-foreground">
        {countyLabel(county)} · {plural(ranked.length + rest.length, { one: '# UAT', few: '# UAT-uri', other: '# de UAT-uri' })}
      </MonoLabel>
      <div className="mt-2">
        <ListHead meta={meta} />
        {/* Positioned, so it clips its rows' screen-reader text too: an `sr-only` span is absolute, and one placed against an ancestor outside this scroll would lengthen the page by the list's hidden height. */}
        <ol className="relative max-h-120 divide-y overflow-y-auto border-y">
          {[...ranked, ...rest].map((index) => (
            <UatRow key={index} {...props} index={index} showCounty={false} />
          ))}
        </ol>
      </div>
    </div>
  )
})
