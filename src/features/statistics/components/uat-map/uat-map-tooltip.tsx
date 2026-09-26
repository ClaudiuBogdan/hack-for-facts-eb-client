import type { RefObject } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import type { UatMapGeometry, UatMapSeries } from '../../lib/uat-map-snapshot'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import { CAPITAL_COUNTY, countyLabel, formatCount, formatTotal, kindLabel, missingLabel, type SeriesMeta } from './uat-map-series'

/**
 * The UAT under the pointer or the finger, in a box beside it — the INS
 * charts' tooltip, on a map. It is placed by writing its transform, not by
 * rendering: a mouse moving across one commune moves the box without a React
 * render; only a new commune renders it again. Where it goes is
 * `tooltipPosition`'s (`uat-map-placement.ts`).
 */

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
  geometry,
  index,
  standing,
  pinned,
}: {
  readonly tooltipRef: RefObject<HTMLDivElement | null>
  readonly meta: SeriesMeta
  readonly series: UatMapSeries
  readonly geometry: UatMapGeometry
  readonly index: number
  readonly standing: UatStanding
  /** Held by a tap: the box takes taps, for its link. */
  readonly pinned: boolean
}) {
  const county = geometry.county[index]!
  // The capital is its own county: its county's figure and rank would repeat its own.
  const capital = county === CAPITAL_COUNTY
  const total = series.total.values[index] ?? null
  const provisional = series.flags[index] !== undefined

  return (
    <div
      ref={tooltipRef}
      data-uat-tooltip={pinned ? 'pinned' : 'hover'}
      // A hover box repeats what the list and the finder give every reader; a held one carries a link.
      {...(pinned ? { role: 'group', 'aria-label': geometry.name[index] } : { 'aria-hidden': true })}
      className={cn(
        'absolute left-0 top-0 z-10 w-max min-w-52 max-w-72 rounded-sm border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md',
        !pinned && 'pointer-events-none',
      )}
    >
      <p className="text-sm font-medium leading-snug text-foreground">{geometry.name[index]}</p>
      <p className="text-muted-foreground">
        {kindLabel(geometry.kind[index]!)}
        {capital ? null : `, ${countyNameRo(county) ?? county}`}
      </p>
      {total === null ? (
        <p className="mt-1.5 text-foreground">{missingLabel(series.missing[index], series.id)}</p>
      ) : (
        <p className="mt-1.5">
          <span className="text-lg font-semibold tabular-nums tracking-tight text-foreground">{formatTotal(meta, total, { unit: false })}</span>{' '}
          <span className="text-muted-foreground">
            {meta.unit} {meta.period(series)}
          </span>
        </p>
      )}
      {standing.rank ? (
        <p className="text-muted-foreground">
          {t`locul ${formatCount(standing.rank)} din ${formatCount(standing.of)}`}
          {standing.countyRank && !capital ? ` · ${t`${standing.countyRank} din ${standing.countyOf} în județ`}` : ''}
        </p>
      ) : null}
      {meta.receipt ? <p className="mt-1 text-muted-foreground">{meta.receipt(series, index)}</p> : null}
      <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-4 border-t pt-1.5">
        {capital ? null : (
          <>
            <dt className="text-muted-foreground">{countyLabel(county)}</dt>
            <dd className="text-right tabular-nums text-foreground">{formatTotal(meta, series.total.counties[county])}</dd>
          </>
        )}
        <dt className="text-muted-foreground">{t`România`}</dt>
        <dd className="text-right tabular-nums text-foreground">{formatTotal(meta, series.total.national)}</dd>
      </dl>
      {provisional ? <p className="mt-1 text-muted-foreground">{t`date provizorii`}</p> : null}
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
