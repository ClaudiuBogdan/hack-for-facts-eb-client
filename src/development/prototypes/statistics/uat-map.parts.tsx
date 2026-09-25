import { memo, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import type { UatMapGeometry, UatMapSeries, UatMapSeriesId } from '@/features/statistics/lib/uat-map-snapshot'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { EMPTY_PERF, perfSnapshot, subscribePerf } from './uat-map.model'
import { figuresOf, formatFigure, isUnusual, type SeriesMeta, type View } from './uat-map.series'

/**
 * A mono segmented control: one tab stop, the checked option; the arrows move
 * the choice and the focus together. `phoneColumns` lays it out in rows on a
 * phone (six series: two rows of three), one row from `sm`.
 */
export function Segmented<K extends string>({
  label,
  options,
  value,
  onChange,
  phoneColumns,
  size = 'default',
}: {
  readonly label: string
  readonly options: readonly { readonly key: K; readonly label: string; readonly disabled?: boolean; readonly title?: string }[]
  readonly value: K
  readonly onChange: (key: K) => void
  readonly phoneColumns?: 2 | 3
  readonly size?: 'default' | 'small'
}) {
  // The arrows skip an option that does not apply.
  const enabled = options.filter((option) => !option.disabled)
  const move = (group: HTMLElement, offset: number) => {
    const index = enabled.findIndex((option) => option.key === value)
    const next = enabled[(index + offset + enabled.length) % enabled.length]
    if (!next) return
    onChange(next.key)
    group.querySelectorAll<HTMLButtonElement>('[role="radio"]')[options.indexOf(next)]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'gap-px border bg-border/70',
        phoneColumns === 3 ? 'grid grid-cols-3 sm:flex' : phoneColumns === 2 ? 'grid grid-cols-2 sm:inline-flex' : 'inline-flex',
      )}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault()
          move(event.currentTarget, 1)
        } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
          event.preventDefault()
          move(event.currentTarget, -1)
        }
      }}
    >
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={option.key === value}
          disabled={option.disabled}
          title={option.title}
          tabIndex={option.key === value ? 0 : -1}
          onClick={() => onChange(option.key)}
          className={cn(
            'bg-background leading-tight transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:text-muted-foreground/50 disabled:hover:bg-background',
            size === 'small' ? 'min-h-9 px-2.5 py-1 text-xs' : 'min-h-9 px-2 py-1.5 text-sm sm:px-3',
            option.key === value ? 'font-semibold text-foreground' : 'text-muted-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function SeriesToggle({
  metas,
  value,
  onChange,
}: {
  readonly metas: readonly SeriesMeta[]
  readonly value: UatMapSeriesId
  readonly onChange: (id: UatMapSeriesId) => void
}) {
  return (
    <Segmented
      label={t`Indicatorul de pe hartă`}
      options={metas.map((meta) => ({ key: meta.id, label: meta.short }))}
      value={value}
      onChange={onChange}
      phoneColumns={3}
    />
  )
}

/**
 * The three readings of every series: the count, the count per inhabitant,
 * the change from the year before. „La 1.000 locuitori" does not apply to the
 * population itself — shown, and greyed, so the three stay in their places.
 */
export function ViewSwitch({
  meta,
  series,
  value,
  onChange,
}: {
  readonly meta: SeriesMeta
  readonly series: UatMapSeries
  readonly value: View
  readonly onChange: (view: View) => void
}) {
  return (
    <Segmented
      label={t`Ce arată harta`}
      options={[
        { key: 'total', label: t`Total` },
        {
          key: 'rate',
          label: meta.rate?.unit === 'l/zi' ? t`Pe locuitor` : t`La 1.000 locuitori`,
          disabled: meta.rate === null,
          title: meta.rate === null ? t`Nu se aplică populației` : undefined,
        },
        { key: 'change', label: t`Față de ${series.previousYear}` },
      ]}
      value={value}
      onChange={onChange}
      size="small"
    />
  )
}

// ── the lists ──────────────────────────────────────────────────────────

interface ListProps {
  readonly meta: SeriesMeta
  readonly series: UatMapSeries
  readonly geometry: UatMapGeometry
  /** Which reading the rows are ranked and ordered by: its column leads; on a phone it is the only one. */
  readonly view: View
  readonly rank: ReadonlyMap<number, number>
  readonly onHover: (index: number | null) => void
}

const ROW_GRID = 'grid grid-cols-[2.25rem_minmax(0,1fr)_auto] items-baseline gap-x-3 sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto_auto]'

/** The readings a row shows, in the switch's order. */
function columns(meta: SeriesMeta): readonly View[] {
  return meta.rate ? ['total', 'rate', 'change'] : ['total', 'change']
}

function Cell({ view, active, children }: { readonly view: View; readonly active: View; readonly children: ReactNode }) {
  return (
    <span
      data-column={view}
      className={cn('text-right tabular-nums', view === active ? 'text-foreground' : 'text-muted-foreground max-sm:hidden')}
    >
      {children}
    </span>
  )
}

function ListHead({ meta, series, view }: Pick<ListProps, 'meta' | 'series' | 'view'>) {
  // The count's column by name, not by its unit: „locuri de muncă" would run into the place's name.
  const head: Record<View, string> = {
    total: t`total`,
    rate: meta.rate?.unit ?? '',
    change: series.change.kind === 'percent' ? t`% față de ${series.previousYear}` : t`față de ${series.previousYear}`,
  }
  return (
    <div
      className={cn(ROW_GRID, meta.rate ? '' : 'sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto]', 'px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground')}
      aria-hidden="true"
    >
      <span>{t`loc`}</span>
      <span>{t`localitate`}</span>
      {columns(meta).map((column) => (
        <Cell key={column} view={column} active={view}>
          {head[column]}
        </Cell>
      ))}
    </div>
  )
}

function UatRow({ index, meta, series, geometry, view, rank, onHover, showCounty }: ListProps & { readonly index: number; readonly showCounty: boolean }) {
  const reading = (column: View): string => {
    if (column === 'change' && series.unsteady.includes(index)) return '—'
    const figures = figuresOf(series, column)
    return formatFigure(meta, series, column, figures?.values[index] ?? null, false)
  }
  return (
    <li>
      <Link
        to="/ins/teritorii/$siruta"
        params={{ siruta: geometry.siruta[index]! }}
        onPointerEnter={() => onHover(index)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(index)}
        onBlur={() => onHover(null)}
        className={cn(ROW_GRID, meta.rate ? '' : 'sm:grid-cols-[2.25rem_minmax(0,1fr)_auto_auto]', 'px-2 py-1.5 text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/50')}
      >
        <span className="font-mono text-xs tabular-nums text-muted-foreground">{rank.get(index) ?? '—'}</span>
        <span className="min-w-0 truncate text-foreground">
          {geometry.name[index]}
          {showCounty ? <span className="text-muted-foreground"> · {geometry.county[index]}</span> : null}
        </span>
        {columns(meta).map((column) => (
          <Cell key={column} view={column} active={view}>
            {reading(column)}
            {column === 'rate' && series.small.includes(index) ? <span title={t`din sub 20 de evenimente`}>·</span> : null}
            {column === 'rate' && isUnusual(series, index) ? <span title={t`neobișnuit de mare, de verificat la INS`}>!</span> : null}
          </Cell>
        ))}
      </Link>
    </li>
  )
}

/**
 * The ten highest and ten lowest of the reading the map shows — rates from
 * under 20 events and changes too small to compare left out, a count's
 * bottom left out where it is only its smallest places. Unchanged by a hover.
 */
export const NationalExtremes = memo(function NationalExtremes(props: ListProps & { readonly order: readonly number[] }) {
  const { meta, series, view, order } = props
  const steady =
    view === 'rate' ? order.filter((index) => !series.small.includes(index)) : view === 'change' ? order.filter((index) => !series.unsteady.includes(index)) : order
  const blocks =
    view === 'total' && !meta.total.signed
      ? [{ title: t`Cele mai mari`, rows: steady.slice(0, 10) }]
      : view === 'change'
        ? [
            { title: t`Cele mai mari creșteri`, rows: steady.slice(0, 10) },
            { title: t`Cele mai mari scăderi`, rows: steady.slice(-10).reverse() },
          ]
        : [
            { title: t`Cele mai mari valori`, rows: steady.slice(0, 10) },
            { title: t`Cele mai mici valori`, rows: steady.slice(-10).reverse() },
          ]
  return (
    <div className="space-y-6" data-list="national">
      {blocks.map((block) => (
        <div key={block.title}>
          <MonoLabel className="block text-muted-foreground">{block.title}</MonoLabel>
          <div className="mt-2">
            <ListHead meta={meta} series={series} view={view} />
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

/** Every UAT of a county, highest first by the reading the map shows. Unchanged by a hover. */
export const CountyList = memo(function CountyList(props: ListProps & { readonly county: string; readonly order: readonly number[] }) {
  const { county, meta, series, geometry, view, order } = props
  const ranked = order.filter((index) => geometry.county[index] === county)
  const rest = geometry.county.flatMap((code, index) => (code === county && !ranked.includes(index) ? [index] : []))
  return (
    <div data-list="county">
      <MonoLabel className="block text-muted-foreground">
        {t`Județul`} {countyNameRo(county) ?? county} · {t`${ranked.length + rest.length} UAT-uri`}
      </MonoLabel>
      <div className="mt-2">
        <ListHead meta={meta} series={series} view={view} />
        <ol className="max-h-120 divide-y overflow-y-auto border-y">
          {[...ranked, ...rest].map((index) => (
            <UatRow key={index} {...props} index={index} showCounty={false} />
          ))}
        </ol>
      </div>
    </div>
  )
})

/** The timings the variants are judged on, as this browser measured them. */
export function PerfPanel() {
  const entries = useSyncExternalStore(subscribePerf, perfSnapshot, () => EMPTY_PERF)
  return (
    <details className="mt-10 border-t pt-4 text-sm" open>
      <summary className="cursor-pointer font-mono text-xs uppercase tracking-wider text-muted-foreground">
        {t`Măsurători în acest browser (dev, nu producție)`}
      </summary>
      {entries.length === 0 ? (
        <p className="mt-2 text-muted-foreground">{t`Nimic măsurat încă.`}</p>
      ) : (
        <table className="mt-2 w-full max-w-xl text-left">
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr key={entry.name}>
                <td className="py-1 pr-4 text-muted-foreground">{entry.name}</td>
                <td className="py-1 pr-4 text-right font-mono tabular-nums">{entry.ms.toFixed(1)} ms</td>
                <td className="py-1 text-muted-foreground">{entry.detail ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  )
}
