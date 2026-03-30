import { ChevronRight } from 'lucide-react'
import type { ChallengeEntityAnalysisView } from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import { cn } from '@/lib/utils'
import {
  type ChallengeEntityViewOption,
  VIEW_ICONS,
} from './challenge-entity-view-menu'

const NAVIGATOR_COPY = {
  ro: {
    title: 'Vezi mai mult',
  },
  en: {
    title: 'See more',
  },
} as const

type ChallengeEntityViewNavigatorProps = {
  readonly views: readonly ChallengeEntityViewOption[]
  readonly activeView: ChallengeEntityAnalysisView
  readonly onViewChange: (view: ChallengeEntityAnalysisView) => void
  readonly locale?: 'ro' | 'en'
}

export function ChallengeEntityViewNavigator({
  views,
  activeView,
  onViewChange,
  locale = 'ro',
}: ChallengeEntityViewNavigatorProps) {
  const copy = NAVIGATOR_COPY[locale]

  return (
    <div
      data-testid="challenge-entity-view-navigator"
      className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5"
    >
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
        {copy.title}
      </h3>

      <div className="flex flex-col gap-2">
        {views
          .filter((view) => view.id !== activeView)
          .map((view) => {
            const Icon = VIEW_ICONS[view.id]

            return (
              <button
                key={view.id}
                type="button"
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-border/40 px-4 py-3 text-left touch-manipulation transition-colors',
                  'hover:border-border hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                )}
                onClick={() => onViewChange(view.id)}
              >
                <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  {view.label}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/60" aria-hidden="true" />
              </button>
            )
          })}
      </div>
    </div>
  )
}
