import { BarChart3, Building2, FileText, HandCoins, LayoutDashboard } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  type ChallengeEntityAnalysisView,
} from '@/features/challenges/schemas/challenge-entity-analysis-route-search-schema'
import { cn } from '@/lib/utils'

export type ChallengeEntityViewOption = {
  readonly id: ChallengeEntityAnalysisView
  readonly label: string
}

export const VIEW_ICONS: Record<ChallengeEntityAnalysisView, LucideIcon> = {
  'main-info': LayoutDashboard,
  contracts: FileText,
  commitments: HandCoins,
  ins: BarChart3,
  profile: Building2,
}

type ChallengeEntityViewMenuProps = {
  readonly title: string
  readonly views: readonly ChallengeEntityViewOption[]
  readonly activeView: ChallengeEntityAnalysisView
  readonly onViewChange: (view: ChallengeEntityAnalysisView) => void
}

export function ChallengeEntityViewMenu({
  title,
  views,
  activeView,
  onViewChange,
}: ChallengeEntityViewMenuProps) {
  return (
    <div
      data-testid="challenge-entity-view-menu"
      className="w-full space-y-3 p-2"
    >
      <h3 className="px-2 pt-2 text-lg font-semibold text-muted-foreground sm:px-1.5 sm:text-xs">
        {title}
      </h3>

      <div className="divide-y divide-border/40 sm:divide-y-0">
        {views.map((view) => {
          const isActive = view.id === activeView
          const Icon = VIEW_ICONS[view.id]

          return (
            <button
              key={view.id}
              type="button"
              aria-pressed={isActive}
              className={cn(
                'flex w-full items-center gap-2.5 px-2 py-3.5 text-left text-base font-medium transition-colors sm:gap-2 sm:rounded-md sm:py-2 sm:text-sm',
                'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-foreground',
              )}
              onClick={() => onViewChange(view.id)}
            >
              <Icon className="h-4 w-4 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              {view.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
