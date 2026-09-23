import { useRef, useState } from 'react'
import type { PointerEvent, ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { STEP_BG } from '@/features/statistics/lib/county-map'
import { cn } from '@/lib/utils'
import { formatNgoNumber } from './ngo-format'
import { countyName, countyRegistrySearch, layerScale } from './ngo-county-layer'
import { rankCounties, type NgoCountyLayer, type NgoCountyValue } from './registry-figures'

/**
 * The counties of one layer, highest first: the first and last five, the
 * rest a click away. Each row carries the map's colour for the county, so
 * the list is the map's key, and shares its highlight — the INS hub's
 * ranking (`HubCountyRank`) over the registry.
 *
 * A rate runs from the national value — the dashed line — left when below,
 * right when above; a count runs from zero.
 */
export function NgoCountyRank({
  layer,
  unit,
  registry,
  edge = 5,
  activeCode,
  onActiveChange,
  className,
}: {
  readonly layer: NgoCountyLayer
  /** The column's unit, in the header („la 10.000 loc."). */
  readonly unit: string
  readonly registry: boolean
  /** How many counties each end of the collapsed list shows. */
  readonly edge?: number
  readonly activeCode?: string
  readonly onActiveChange?: (code: string | undefined) => void
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const scale = layerScale(layer)
  const ranked = rankCounties(layer.values, countyName)
  const reference = layer.kind === 'rate' ? layer.national : 0
  const from = Math.min(scale.min, reference)
  const to = Math.max(scale.max, reference)
  const at = (value: number) => (to > from ? ((value - from) / (to - from)) * 100 : 50)
  const base = at(reference)
  const collapsible = ranked.length > edge * 2 + 1
  const hidden = collapsible && !expanded ? ranked.length - edge * 2 : 0
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }
  // From the keyboard (`detail` 0) focus goes where the reader is headed; a mouse needs no focus moved.
  const toggle = (next: boolean, keyboard: boolean) => {
    setExpanded(next)
    if (!keyboard) return
    requestAnimationFrame(() => {
      // Rows are links only with a registry; without one, focus lands on the control that folds the list again.
      const target = next
        ? (listRef.current?.querySelectorAll<HTMLElement>('ol li > a')[edge] ?? listRef.current?.querySelector<HTMLElement>('[data-county-collapse]'))
        : listRef.current?.querySelector<HTMLElement>('[data-county-expander]')
      target?.focus()
    })
  }

  const row = (county: NgoCountyValue, rank: number) => {
    const active = activeCode === county.code
    const value = at(county.value)
    const cells: ReactNode = (
      <>
        <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(rank).padStart(2, '0')}</MonoLabel>
        <span className={cn('size-2.5 rounded-[2px] ring-1 ring-inset ring-foreground/10', STEP_BG[scale.stepOf(county.value)])} aria-hidden="true" />
        <span className={cn('truncate text-sm text-foreground', active && 'font-medium')}>{countyName(county.code)}</span>
        <span className="relative h-2" aria-hidden="true">
          <span
            className={cn('absolute inset-y-0 bg-primary/70 transition-colors group-hover:bg-primary', active && 'bg-primary')}
            style={{ left: `${Math.min(base, value).toFixed(2)}%`, width: `${Math.max(Math.abs(value - base), 0.6).toFixed(2)}%` }}
          />
          {layer.kind === 'rate' ? (
            <span className="absolute -inset-y-1.5 border-l border-dashed border-foreground/60" style={{ left: `${base.toFixed(2)}%` }} />
          ) : null}
        </span>
        <span className="pr-1 text-right text-sm tabular-nums text-foreground">{formatNgoNumber(county.value, layer.digits)}</span>
      </>
    )
    const rowClass = cn('group col-span-5 grid min-h-11 grid-cols-subgrid items-center transition-colors hover:bg-muted/50', active && 'bg-muted/50')
    return (
      <li key={county.code} value={rank} className="col-span-5 grid grid-cols-subgrid">
        {registry ? (
          <Link
            to="/ong-uri/registru"
            search={countyRegistrySearch(county)}
            onPointerEnter={(event) => hoverOnly(event, county.code)}
            onPointerLeave={(event) => hoverOnly(event, undefined)}
            onFocus={() => onActiveChange?.(county.code)}
            onBlur={() => onActiveChange?.(undefined)}
            className={rowClass}
          >
            {cells}
          </Link>
        ) : (
          <div
            onPointerEnter={(event) => hoverOnly(event, county.code)}
            onPointerLeave={(event) => hoverOnly(event, undefined)}
            className={rowClass}
          >
            {cells}
          </div>
        )}
      </li>
    )
  }

  const nationalAt = layer.kind === 'rate' ? base : null
  const national = formatNgoNumber(layer.national, layer.digits)
  return (
    <div
      ref={listRef}
      className={cn(
        'grid grid-cols-[auto_auto_minmax(0,7rem)_minmax(3rem,1fr)_auto] gap-x-2.5 sm:grid-cols-[auto_auto_minmax(0,9rem)_minmax(3rem,1fr)_auto] sm:gap-x-3',
        className,
      )}
    >
      <div className="col-span-5 grid grid-cols-subgrid items-end border-b border-border/70 pb-2">
        <MonoLabel className="col-span-3 pl-1 text-muted-foreground">
          <Trans>Județ</Trans>
        </MonoLabel>
        <span className="relative h-2.5">
          {nationalAt !== null ? (
            <MonoLabel
              className={cn(
                'absolute top-0 whitespace-nowrap text-foreground',
                nationalAt < 25 ? 'translate-x-0' : nationalAt > 75 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: `${nationalAt.toFixed(2)}%` }}
            >
              <Trans>România {national}</Trans>
            </MonoLabel>
          ) : null}
        </span>
        {/* On a phone the national label needs the room; the map's readout names the unit. */}
        <MonoLabel className="pr-1 text-right text-muted-foreground max-sm:invisible">{unit}</MonoLabel>
      </div>
      <ol className="col-span-5 grid grid-cols-subgrid divide-y divide-border/70">
        {(hidden > 0 ? ranked.slice(0, edge) : ranked).map((county, index) => row(county, index + 1))}
      </ol>
      {hidden > 0 ? (
        <>
          {/* Between two lists, not an item of one: the collapsed ranking reads as its ten counties. */}
          <button
            type="button"
            data-county-expander
            onClick={(event) => toggle(true, event.detail === 0)}
            className="col-span-5 flex min-h-11 w-full items-center gap-3 border-y border-border/70 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
          >
            <span className="h-px flex-1 border-t border-dashed border-border" aria-hidden="true" />
            {plural(hidden, { one: 'Încă un județ', few: 'Încă # județe', other: 'Încă # de județe' })}
            <span className="h-px flex-1 border-t border-dashed border-border" aria-hidden="true" />
          </button>
          <ol start={ranked.length - edge + 1} className="col-span-5 grid grid-cols-subgrid divide-y divide-border/70">
            {ranked.slice(-edge).map((county, index) => row(county, ranked.length - edge + index + 1))}
          </ol>
        </>
      ) : null}
      {collapsible && expanded ? (
        <button
          type="button"
          data-county-collapse
          onClick={(event) => toggle(false, event.detail === 0)}
          className="col-span-5 mt-3 inline-flex min-h-9 items-center justify-self-start text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <Trans>Doar primele și ultimele {edge}</Trans>
        </button>
      ) : null}
    </div>
  )
}
