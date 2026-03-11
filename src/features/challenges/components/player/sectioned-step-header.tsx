import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { ArrowLeft, FileText, Rows3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { ChallengeStepSection } from '../../utils/sectioned-step-markdown'
import {
  clearChallengeStepSearch,
} from './challenge-step-player.utils'
import type {
  ChallengeStepViewMode,
  SectionNavigationTarget,
} from './challenge-step-player.shared'

type SectionedStepHeaderProps = {
  readonly backTarget: SectionNavigationTarget
  readonly currentViewMode: ChallengeStepViewMode
  readonly currentSectionIndex: number
  readonly onProgressSectionSelect: (sectionId: string) => void
  readonly onViewModeChange?: (
    viewMode: ChallengeStepViewMode,
    options?: { readonly replace?: boolean },
  ) => void
  readonly sections: readonly ChallengeStepSection[]
  readonly stepTitle: string
}

export function SectionedStepHeader({
  backTarget,
  currentViewMode,
  currentSectionIndex,
  onProgressSectionSelect,
  onViewModeChange,
  sections,
  stepTitle,
}: SectionedStepHeaderProps) {
  const nextViewMode: ChallengeStepViewMode =
    currentViewMode === 'section' ? 'article' : 'section'
  const ToggleIcon = nextViewMode === 'article' ? FileText : Rows3
  const toggleLabel =
    nextViewMode === 'article' ? t`Switch to article view` : t`Switch to section view`
  const getSectionLabel = (section: ChallengeStepSection) =>
    section.title || section.interactive?.question || stepTitle

  return (
    <div className="flex-none border-b border-border/60 bg-background/95 px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          {backTarget.kind === 'section' ? (
            <button
              type="button"
              onClick={() => onProgressSectionSelect(backTarget.sectionId)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {backTarget.label}
            </button>
          ) : (
            <Link
              to={backTarget.href as '/'}
              search={(previousSearch) => clearChallengeStepSearch(previousSearch)}
              resetScroll={true}
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {backTarget.label}
            </Link>
          )}

          <div className="flex items-center gap-2">
            {currentViewMode === 'section' ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => onViewModeChange?.(nextViewMode, undefined)}
                aria-label={toggleLabel}
                title={toggleLabel}
                className="h-9 w-9 rounded-full"
              >
                <ToggleIcon className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onViewModeChange?.(nextViewMode, undefined)}
                aria-label={toggleLabel}
                title={toggleLabel}
                className="h-9 rounded-full border border-border/70 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
              >
                <Rows3 className="mr-2 h-4 w-4" />
                {t`Section View`}
              </Button>
            )}

            {currentViewMode === 'section' ? (
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <span>{currentSectionIndex + 1}</span>
                <span>/</span>
                <span>{sections.length}</span>
              </div>
            ) : null}
          </div>
        </div>

        {currentViewMode === 'section' ? (
          <div className="flex items-center gap-1.5" aria-label={t`Step sections`} role="navigation">
            {sections.map((section, index) => (
              <TooltipProvider key={section.id} delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      data-testid={`section-progress-${section.id}`}
                      aria-current={index === currentSectionIndex ? 'step' : undefined}
                      aria-label={`Section ${index + 1}: ${getSectionLabel(section)}`}
                      onClick={() => onProgressSectionSelect(section.id)}
                      className="group flex-1 rounded-full p-1 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <span
                        className={[
                          'block h-2 w-full rounded-full transition-all',
                          index < currentSectionIndex ? 'bg-emerald-500' : '',
                          index === currentSectionIndex ? 'bg-foreground' : '',
                          index > currentSectionIndex
                            ? 'bg-muted group-hover:bg-muted-foreground/45'
                            : '',
                        ].join(' ')}
                      />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    {getSectionLabel(section)}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
