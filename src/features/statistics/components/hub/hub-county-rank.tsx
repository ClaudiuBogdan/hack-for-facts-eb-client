import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { Link } from '@tanstack/react-router'
import { plural } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { StatisticsHubCountyLayer, StatisticsHubCountyValue } from '@/schemas/statistics'
import { STEP_BG, layerDecimals, layerScale } from '../../lib/county-map'
import { formatHubValue, hubUnitWord, isAdditiveUnit } from '../../lib/hub-format'

/**
 * The counties of one layer, highest first: the first and last five, the
 * rest a click away. Each row carries the map's colour for the county, so
 * the list is the map's key, and shares its highlight.
 *
 * The bar says where the county stands against the country. A rate or an
 * average runs from the national value — the dashed line — to the county's,
 * left when below, right when above; a bar from zero would draw 42 almost
 * equal bars for life expectancies between 74 and 82 years. A count runs
 * from zero, as a share of a total does. With no national value to measure
 * a rate against, the county is a dot on the range of the 42.
 */
export function HubCountyRank({
  layer,
  edge = 5,
  activeCode,
  onActiveChange,
  className,
}: {
  readonly layer: StatisticsHubCountyLayer
  /** How many counties each end of the collapsed list shows. */
  readonly edge?: number
  readonly activeCode?: string
  readonly onActiveChange?: (code: string | undefined) => void
  readonly className?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const scale = layerScale(layer)
  const ranked = [...layer.values].sort((a, b) => b.value - a.value)
  if (ranked.length === 0) {
    return (
      <p className={cn('text-sm text-muted-foreground', className)}>
        <Trans>Niciun județ cu valoare pentru {layer.period}.</Trans>
      </p>
    )
  }

  const digits = layerDecimals(layer)
  const additive = isAdditiveUnit(layer.unit)
  const reference = additive ? 0 : layer.national
  const from = Math.min(scale.min, reference ?? scale.min)
  const to = Math.max(scale.max, reference ?? scale.max)
  const at = (value: number) => (to > from ? ((value - from) / (to - from)) * 100 : 50)
  const collapsible = ranked.length > edge * 2 + 1
  const hidden = collapsible && !expanded ? ranked.length - edge * 2 : 0
  const unitWord = hubUnitWord(layer.unit, layer.unitLabel)
  const hoverOnly = (event: PointerEvent, code: string | undefined) => {
    if (event.pointerType !== 'touch') onActiveChange?.(code)
  }
  // The control that was pressed leaves the page. From the keyboard (`detail`
  // 0) focus goes where the reader is headed; a mouse needs no focus moved,
  // and focusing a row would make it the map's county.
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

  const row = (county: StatisticsHubCountyValue, rank: number) => {
    const active = activeCode === county.code
    const value = at(county.value)
    const base = reference === null ? null : at(reference)
    return (
      <li key={county.code} value={rank} className="col-span-5 grid grid-cols-subgrid">
        <Link
          to="/ins/seturi/$cod"
          params={{ cod: layer.code }}
          search={{ teritoriu: `cod:${county.code}`, frecventa: 'ANNUAL' }}
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
          <span className={cn('truncate text-sm text-foreground', active && 'font-medium')}>{county.name}</span>
          <span className="relative h-2" aria-hidden="true">
            {base === null ? (
              <span
                className={cn('absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/70 group-hover:bg-primary', active && 'bg-primary')}
                style={{ left: `${value.toFixed(2)}%` }}
              />
            ) : (
              <span
                className={cn('absolute inset-y-0 bg-primary/70 transition-colors group-hover:bg-primary', active && 'bg-primary')}
                style={{ left: `${Math.min(base, value).toFixed(2)}%`, width: `${Math.max(Math.abs(value - base), 0.6).toFixed(2)}%` }}
              />
            )}
            {base !== null && !additive ? (
              <span className="absolute -inset-y-1.5 border-l border-dashed border-foreground/60" style={{ left: `${base.toFixed(2)}%` }} />
            ) : null}
          </span>
          <span className="pr-1 text-right text-sm tabular-nums text-foreground">
            {formatHubValue(county.value, layer.unit, layer.unitLabel, { digits }).value}
          </span>
        </Link>
      </li>
    )
  }

  const nationalAt = !additive && layer.national !== null ? at(layer.national) : null
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
          {nationalAt !== null && layer.national !== null ? (
            <MonoLabel
              className={cn(
                'absolute top-0 whitespace-nowrap text-foreground',
                nationalAt < 25 ? 'translate-x-0' : nationalAt > 75 ? '-translate-x-full' : '-translate-x-1/2',
              )}
              style={{ left: `${nationalAt.toFixed(2)}%` }}
            >
              <Trans>România {formatHubValue(layer.national, layer.unit, layer.unitLabel, { digits }).value}</Trans>
            </MonoLabel>
          ) : null}
        </span>
        <MonoLabel className="pr-1 text-right text-muted-foreground">{unitWord === '%' ? '' : unitWord}</MonoLabel>
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

/** A mono segmented control: which indicator the map is coloured by. */
export function HubIndicatorToggle<K extends string>({
  options,
  value,
  onChange,
  label,
}: {
  readonly options: readonly { readonly key: K; readonly label: string }[]
  readonly value: K
  readonly onChange: (key: K) => void
  readonly label: string
}) {
  // One tab stop: the checked option; arrows move the selection and focus with it.
  const move = (group: HTMLElement, offset: number) => {
    const index = options.findIndex((option) => option.key === value)
    const nextIndex = (index + offset + options.length) % options.length
    const next = options[nextIndex]
    if (!next) return
    onChange(next.key)
    const radios = group.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    radios[nextIndex]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="grid auto-cols-fr grid-flow-col gap-px border bg-border/70 sm:flex"
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
          tabIndex={option.key === value ? 0 : -1}
          onClick={() => onChange(option.key)}
          className={cn(
            'min-h-9 bg-background px-2 py-1.5 text-sm leading-tight transition-colors hover:bg-muted/60 sm:px-3',
            option.key === value ? 'font-semibold text-foreground' : 'text-muted-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
