import { t } from '@lingui/core/macro'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Bone } from '@/features/procurement/components/home/home-chrome'
import { cn } from '@/lib/utils'
import { useAnalysisLevels } from '../../hooks/use-justice-analysis'
import { LEVEL_KEYS, type LevelKey, type Question } from '../../lib/analysis-model'
import { headlineText, levelLabel } from '../../lib/analysis-text'
import { countText } from '../../lib/judicial-format'

type LevelTab = LevelKey | 'toate'

/**
 * The court levels in the pinned bar, each with its count for the
 * question's other filters: the population the question reads, as
 * procurement's bar picks its records. A count's slot keeps its height while
 * it is read, so the bar never moves; several levels picked in the panel
 * press no tab. The question rides on the bar's left from a wide screen.
 */
export function AnalysisLevels({ question, onChange }: { readonly question: Question; readonly onChange: (question: Question) => void }) {
  const counts = useAnalysisLevels(question)
  const tabs: readonly LevelTab[] = ['toate', ...LEVEL_KEYS]
  const pressed = (tab: LevelTab) => (tab === 'toate' ? question.levels.length === 0 : question.levels.length === 1 && question.levels[0] === tab)
  const countOf = (tab: LevelTab) => (counts.data ? (tab === 'toate' ? [...counts.data.values()].reduce((sum, count) => sum + count, 0) : (counts.data.get(tab) ?? 0)) : undefined)
  return (
    <nav aria-label={t`Ce instanțe`} className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
      <RuledFrame className="flex items-center gap-6 py-0">
        <span className="hidden min-w-0 truncate py-3 text-sm font-semibold text-foreground lg:block lg:max-w-sm">{headlineText(question)}</span>
        <ol className="grid w-full grid-cols-3 gap-x-3 sm:flex sm:w-auto sm:shrink-0 sm:gap-5 lg:ml-auto">
          {tabs.map((tab) => {
            const active = pressed(tab)
            const count = countOf(tab)
            return (
              <li key={tab}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...question, levels: tab === 'toate' ? [] : [tab] })}
                  className={cn(
                    'flex h-full min-h-11 w-full flex-col justify-center border-b-2 py-2 text-left text-sm leading-tight transition-colors sm:w-auto',
                    active ? 'border-primary font-medium text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span>{tab === 'toate' ? t`Toate` : levelLabel(tab)}</span>
                  <span className="flex h-4 items-center text-xs tabular-nums text-muted-foreground">{count === undefined ? (counts.isError ? null : <Bone className="w-12" />) : countText(count)}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </RuledFrame>
    </nav>
  )
}
