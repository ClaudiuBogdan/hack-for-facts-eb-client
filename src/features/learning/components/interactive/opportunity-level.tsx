/* eslint-disable react-refresh/only-export-components */
import { t } from '@lingui/core/macro'
import { Equal, Minus, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { OpportunityLevel } from './budget-cycle-data'

/**
 * A budget phase's citizen-opportunity level, as a word and a symbol, shared by
 * the budget-cycle timeline and the phase cards: the level never rides on a
 * fill colour alone, and it is a cue of its own, separate from selection
 * (primary) and from "now".
 */

export function getOpportunityLabel(opportunity: OpportunityLevel): string {
  if (opportunity === 'high') return t`High opportunity`
  if (opportunity === 'medium') return t`Medium opportunity`
  return t`Low opportunity`
}

export function OpportunityMark({ opportunity, className }: Readonly<{ opportunity: OpportunityLevel; className?: string }>) {
  if (opportunity === 'high') return <Star className={cn(className, 'fill-current')} aria-hidden="true" />
  if (opportunity === 'medium') return <Equal className={className} aria-hidden="true" />
  return <Minus className={className} aria-hidden="true" />
}

const LEGEND_SWATCH: Readonly<Record<OpportunityLevel, string>> = {
  high: 'bg-status-partial-fg',
  medium: 'bg-primary',
  low: 'bg-muted-foreground',
}

/**
 * The three levels, each with its symbol on the level's fill and its word. Words are muted on a plain surface;
 * pass `text-foreground` where the legend sits over a tint or glow.
 */
export function OpportunityLegendItems({ textClassName = 'text-muted-foreground' }: Readonly<{ textClassName?: string }>) {
  return (
    <>
      {(['high', 'medium', 'low'] as const).map((level) => (
        <div key={level} className={cn('flex items-center gap-2 text-xs', textClassName)}>
          <div className={cn('w-4 h-4 rounded-full flex items-center justify-center', LEGEND_SWATCH[level])}>
            <OpportunityMark opportunity={level} className="w-2.5 h-2.5 text-background" />
          </div>
          <span>{getOpportunityLabel(level)}</span>
        </div>
      ))}
    </>
  )
}
