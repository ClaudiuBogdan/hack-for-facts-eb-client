import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { STEP_BG } from '@/features/statistics/lib/county-map'
import { cn } from '@/lib/utils'
import {
  countyDirectorySearch,
  countyName,
  hubLayerDecimals,
  hubLayerScale,
  rankCounties,
  type HubCountyLayer,
  type HubCountyValue,
} from '../../lib/hub-counties'
import { formatHubValue, isAdditiveUnit } from '../../lib/hub-format'

/**
 * The counties of one layer, highest first: the first and last five, the
 * rest a click away. Each row carries the map's colour for the county, so the
 * list is the map's key, and shares its highlight.
 *
 * A rate runs from the national rate — the dashed line — to the county's,
 * left when below, right when above: 42 bars from zero would all look alike.
 * A count runs from zero, as a share of the country's total does.
 */
export function CompanyCountyRank({
  layer,
  edge = 5,
  activeCode,
  onActiveChange,
  className,
}: {
  readonly layer: HubCountyLayer
  /** How many counties each end of the collapsed list shows. */
  readonly edge?: number
  readonly activeCode?: string
  readonly onActiveChange?: (code: string | undefined) => void
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const scale = hubLayerScale(layer)
  const ranked = rankCounties(layer.values)
  const digits = hubLayerDecimals(layer)
  const additive = isAdditiveUnit(layer.unit)
  const reference = additive ? 0 : layer.national
  const from = Math.min(scale.min, reference)
  const to = Math.max(scale.max, reference)
  const at = (value: number) => (to > from ? ((value - from) / (to - from)) * 100 : 50)
  const base = at(reference)
  const collapsible = ranked.length > edge * 2 + 1
  const hidden = collapsible && !expanded ? ranked.length - edge * 2 : 0
  const unit = formatHubValue(layer.national, layer.unit, { digits })
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }
  // From the keyboard (`detail` 0) focus goes where the reader is headed; a
  // mouse needs no focus moved, and focusing a row would make it the map's county.
  const toggle = (next: boolean, keyboard: boolean) => {
    setExpanded(next)
    if (!keyboard) return
    requestAnimationFrame(() => {
      const target = next
        ? listRef.current?.querySelectorAll<HTMLElement>('ol a')[edge]
        : listRef.current?.querySelector<HTMLElement>('[data-county-expander]')
      target?.focus()
    })
  }

  const row = (county: HubCountyValue, rank: number) => {
    const active = activeCode === county.code
    const value = at(county.value)
    return (
      <li key={county.code} value={rank} className="col-span-5 grid grid-cols-subgrid">
        <Link
          to="/companies/search"
          search={countyDirectorySearch(county.code)}
          onPointerEnter={(event) => hoverOnly(event, county.code)}
          onPointerLeave={(event) => hoverOnly(event, undefined)}
          onFocus={() => onActiveChange?.(county.code)}
          onBlur={() => onActiveChange?.(undefined)}
          className={cn(
            'group col-span-5 grid min-h-11 grid-cols-subgrid items-center transition-colors hover:bg-muted/50',
            active && 'bg-muted/50',
          )}
        >
          <MonoLabel className="pl-1 tabular-nums text-muted-foreground">{String(rank).padStart(2, '0')}</MonoLabel>
          <span className={cn('size-2.5 rounded-[2px] ring-1 ring-inset ring-foreground/10', STEP_BG[scale.stepOf(county.value)])} aria-hidden="true" />
          <span className={cn('truncate text-sm text-foreground', active && 'font-medium')}>{countyName(county.code)}</span>
          <span className="relative h-2" aria-hidden="true">
            <span
              className={cn('absolute inset-y-0 bg-primary/70 transition-colors group-hover:bg-primary', active && 'bg-primary')}
              style={{ left: `${Math.min(base, value).toFixed(2)}%`, width: `${Math.max(Math.abs(value - base), 0.6).toFixed(2)}%` }}
            />
            {additive ? null : (
              <span className="absolute -inset-y-1.5 border-l border-dashed border-foreground/60" style={{ left: `${base.toFixed(2)}%` }} />
            )}
          </span>
          <span className="pr-1 text-right text-sm tabular-nums text-foreground">{formatHubValue(county.value, layer.unit, { digits }).value}</span>
        </Link>
      </li>
    )
  }

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
          {additive ? null : (
            <MonoLabel
              className={cn(
                'absolute top-0 whitespace-nowrap text-foreground',
                base < 25 ? 'translate-x-0' : base > 75 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: `${base.toFixed(2)}%` }}
            >
              <Trans>România {unit.value}</Trans>
            </MonoLabel>
          )}
        </span>
        <MonoLabel className="pr-1 text-right text-muted-foreground">{layer.unit === 'per-thousand' ? '' : unit.unit}</MonoLabel>
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
          onClick={(event) => toggle(false, event.detail === 0)}
          className="col-span-5 mt-3 inline-flex min-h-9 items-center justify-self-start text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          <Trans>Doar primele și ultimele {edge}</Trans>
        </button>
      ) : null}
    </div>
  )
}
