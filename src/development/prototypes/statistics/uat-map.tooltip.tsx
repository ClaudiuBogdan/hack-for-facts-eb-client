import { useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import type { UatKind, UatMapGeometry, UatMapSeries } from '@/features/statistics/lib/uat-map-snapshot'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { ViewBox } from './uat-map.model'
import { figuresOf, formatCount, formatFigure, isUnusual, type SeriesMeta, type View } from './uat-map.series'

/**
 * The UAT under the pointer or the finger, in a box beside it — the INS
 * charts' tooltip, on a map. It is placed by writing its transform, not by
 * rendering: a mouse moving across one commune moves the box without a React
 * render; only a new commune renders it again.
 */

/** A point in pixels, relative to the map's frame. */
export type FramePoint = { readonly x: number; readonly y: number }

const GAP = 14
const EDGE = 4

/**
 * Beside the anchor — to the right, or to the left where the right has no
 * room — and held inside the frame. Where neither side has room (a phone's
 * map is barely wider than the box), below it, centred and free to overhang
 * the frame over the legend, which is only read: never above, over the
 * controls a finger needs next, and never over what it describes.
 */
export function placeTooltip(element: HTMLElement, anchor: FramePoint, frame: { readonly width: number; readonly height: number }) {
  const width = element.offsetWidth
  const height = element.offsetHeight
  const clamp = (value: number, max: number) => Math.min(Math.max(value, EDGE), Math.max(EDGE, max))
  const right = anchor.x + GAP
  const left = anchor.x - GAP - width
  let x: number
  let y: number
  if (right + width <= frame.width - EDGE || left >= EDGE) {
    x = right + width <= frame.width - EDGE ? right : left
    y = anchor.y + GAP + height <= frame.height - EDGE ? anchor.y + GAP : anchor.y - GAP - height
    y = clamp(y, frame.height - height - EDGE)
  } else {
    x = clamp(anchor.x - width / 2, frame.width - width - EDGE)
    y = anchor.y + GAP
  }
  element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`
}

/** Where a UAT's label point is on screen, for a box that is not following the pointer. */
export function uatAnchor(geometry: UatMapGeometry, index: number, box: ViewBox, frame: { readonly width: number; readonly height: number }): FramePoint {
  const [x, y, w, h] = box
  return {
    x: ((geometry.labels[index * 3]! - x) / w) * frame.width,
    y: ((geometry.labels[index * 3 + 1]! - y) / h) * frame.height,
  }
}

/**
 * The box and where it points: at the pointer (a mouse over the map) or at a
 * UAT (a row of the list hovered, a UAT held by a tap), which it follows as
 * the map zooms. `place` is called after every commit and on every move.
 */
export function useTooltipAnchor(frameRef: RefObject<HTMLElement | null>) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const source = useRef<{ readonly kind: 'pointer'; readonly point: FramePoint } | { readonly kind: 'uat' }>({ kind: 'uat' })

  // Refs only: one object for the life of the map, so what it is passed to need not render again.
  return useMemo(
    () => ({
      tooltipRef,
      place: (resolveUat: () => FramePoint | null) => {
        const element = tooltipRef.current
        const frame = frameRef.current
        if (!element || !frame) return
        const anchor = source.current.kind === 'pointer' ? source.current.point : resolveUat()
        if (anchor) placeTooltip(element, anchor, { width: frame.clientWidth, height: frame.clientHeight })
      },
      /** Follows the pointer, at `clientX`/`clientY`. */
      followPointer: (clientX: number, clientY: number) => {
        const rect = frameRef.current?.getBoundingClientRect()
        if (rect) source.current = { kind: 'pointer', point: { x: clientX - rect.left, y: clientY - rect.top } }
      },
      /** Points at the UAT itself. */
      followUat: () => {
        source.current = { kind: 'uat' }
      },
    }),
    [frameRef],
  )
}

const kindLabel = (kind: UatKind) =>
  kind === 'comuna'
    ? t`comună`
    : kind === 'oras'
      ? t`oraș`
      : kind === 'municipiu'
        ? t`municipiu`
        : kind === 'resedinta'
          ? t`municipiu, reședință de județ`
          : t`capitala`

/** Where a UAT stands, by the figure the map shows: among all, and within its county. */
export interface UatStanding {
  readonly rank: number | undefined
  readonly of: number
  readonly countyRank: number | undefined
  readonly countyOf: number
}

export function UatTooltip({
  tooltipRef,
  meta,
  series,
  view,
  geometry,
  index,
  standing,
  pinned,
}: {
  readonly tooltipRef: RefObject<HTMLDivElement | null>
  readonly meta: SeriesMeta
  readonly series: UatMapSeries
  /** The figure the map draws: its row is the one read first. */
  readonly view: View
  readonly geometry: UatMapGeometry
  readonly index: number
  readonly standing: UatStanding
  /** Held by a tap: the box takes taps, for its link. */
  readonly pinned: boolean
}) {
  const county = geometry.county[index]!
  const countyName = countyNameRo(county) ?? county
  const small = series.small.includes(index)
  const unsteady = series.unsteady.includes(index)
  const provisional = series.flags[index] !== undefined
  const figure = (of: View, value: number | null | undefined) => formatFigure(meta, series, of, value ?? null)
  const rate = series.rate?.values[index] ?? null
  const rows: readonly { readonly view: View; readonly label: string; readonly value: string; readonly note?: string }[] = [
    {
      view: 'total',
      label: series.id === 'populatie' ? t`La 1 ianuarie ${series.year}` : t`În ${series.year}`,
      value: figure('total', series.total.values[index]),
    },
    ...(meta.rate
      ? [
          {
            view: 'rate' as const,
            label: meta.rate.words,
            value: rate === null ? meta.missing(series.missing[index] ?? 'absent') : figure('rate', rate),
            note: small ? t`din sub 20 de evenimente` : undefined,
          },
        ]
      : []),
    {
      view: 'change',
      label: t`Față de ${series.previousYear}`,
      value: figure('change', series.change.values[index]),
      note: unsteady
        ? t`prea mici pentru o comparație`
        : t`anul trecut: ${formatFigure(meta, series, 'total', series.previous.values[index] ?? null, false)}`,
    },
  ]
  const shown = figuresOf(series, view)

  return (
    <div
      ref={tooltipRef}
      data-uat-tooltip={pinned ? 'pinned' : 'hover'}
      // A hover box repeats what the list and the finder give every reader; a held one carries a link.
      {...(pinned ? { role: 'group', 'aria-label': geometry.name[index] } : { 'aria-hidden': true })}
      className={cn(
        'absolute left-0 top-0 z-10 w-max min-w-56 max-w-72 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md',
        !pinned && 'pointer-events-none',
      )}
    >
      <p className="text-sm font-medium leading-snug text-foreground">{geometry.name[index]}</p>
      <p className="text-muted-foreground">
        {kindLabel(geometry.kind[index]!)}, {countyName}
      </p>
      {/* The three readings, the one the map draws first in weight. */}
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-0.5">
        {rows.map((row) => (
          <div key={row.view} className="contents" data-reading={row.view}>
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className={cn('text-right tabular-nums', row.view === view ? 'text-sm font-semibold text-foreground' : 'text-foreground')}>
              {row.value}
              {row.note ? <span className="block text-[11px] font-normal text-muted-foreground">{row.note}</span> : null}
            </dd>
          </div>
        ))}
      </dl>
      {standing.rank ? (
        <p className="mt-1.5 text-muted-foreground">
          {t`locul ${formatCount(standing.rank)} din ${formatCount(standing.of)}`}
          {standing.countyRank ? ` · ${t`${standing.countyRank} din ${standing.countyOf} în județ`}` : ''}
        </p>
      ) : null}
      {meta.receipt ? <p className="mt-1 text-muted-foreground">{meta.receipt(series, index)}</p> : null}
      {shown ? (
        <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-4 border-t pt-1.5">
          <dt className="text-muted-foreground">{t`Județul ${countyName}`}</dt>
          <dd className="text-right tabular-nums text-foreground">{figure(view, shown.counties[county])}</dd>
          <dt className="text-muted-foreground">{t`România`}</dt>
          <dd className="text-right tabular-nums text-foreground">{figure(view, shown.national)}</dd>
        </dl>
      ) : null}
      {provisional ? <p className="mt-1 text-muted-foreground">{t`date provizorii`}</p> : null}
      {isUnusual(series, index) ? <p className="mt-1 font-medium text-foreground">{t`Neobișnuit de mare: de verificat la INS.`}</p> : null}
      {pinned ? (
        <p className="mt-2 border-t pt-2">
          <Link
            to="/ins/teritorii/$siruta"
            params={{ siruta: geometry.siruta[index]! }}
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {t`Deschide localitatea`} →
          </Link>
          <span className="block text-muted-foreground">{t`sau atinge-o încă o dată pe hartă`}</span>
        </p>
      ) : null}
    </div>
  )
}
