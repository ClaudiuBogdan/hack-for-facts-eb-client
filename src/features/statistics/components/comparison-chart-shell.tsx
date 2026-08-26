import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import {
  comparisonLevelLabel,
  type ComparisonSeriesDescriptor,
} from '../lib/comparison-format'
import { COMPARISON_PALETTE_CLASS } from './comparison-palette'

/**
 * Shared chrome for the comparison charts: the palette custom properties, a
 * titled figure, and the legend that keeps identity from being carried by
 * colour alone.
 */

type LegendProps = {
  readonly series: readonly ComparisonSeriesDescriptor[]
}

/**
 * Always rendered for two or more series. The swatch carries the colour, the
 * text stays in muted ink — never the series colour.
 */
export function ComparisonLegend({ series }: LegendProps) {
  if (series.length < 2) return null

  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {series.map((entry) => (
        <li key={entry.code} className="flex items-center gap-2 text-xs text-muted-foreground">
          <span
            aria-hidden
            className="h-2.5 w-2.5 shrink-0 rounded-sm ring-2 ring-background"
            style={{ backgroundColor: entry.color }}
          />
          <span>{entry.label}</span>
          <span className="rounded-sm border border-border/70 px-1 text-[10px] uppercase tracking-wide">
            {comparisonLevelLabel(entry.level)}
          </span>
        </li>
      ))}
    </ul>
  )
}

type FigureProps = {
  readonly title: ReactNode
  readonly caption?: ReactNode
  readonly series: readonly ComparisonSeriesDescriptor[]
  readonly children: ReactNode
  readonly className?: string
}

export function ComparisonFigure({
  title,
  caption,
  series,
  children,
  className,
}: FigureProps) {
  return (
    <figure
      className={cn(
        'space-y-3 rounded-lg border border-border bg-card p-4',
        COMPARISON_PALETTE_CLASS,
        className,
      )}
    >
      <figcaption className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {caption ? <p className="text-xs text-muted-foreground">{caption}</p> : null}
      </figcaption>
      <ComparisonLegend series={series} />
      {children}
    </figure>
  )
}
