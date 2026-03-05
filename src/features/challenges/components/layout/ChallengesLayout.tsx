import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Library,
  Trophy,
} from 'lucide-react'
import { useEffect, useMemo, useState, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'
import type { CampaignRouteSearch } from '@/features/campaigns/local-budget-2026/types'
import { LearningProgressProvider } from '@/features/learning/hooks/use-learning-progress'
import { useScrollToActive } from '@/features/learning/hooks/use-scroll-to-active'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import {
  getChallengeModuleBySlug,
  getChallengeModules,
  getChallengeModuleStats,
  getTranslatedText,
} from '../../utils/modules'
import { CHALLENGES_BASE_PATH } from '../../constants'
import type { ChallengeDefinition, ChallengeLocale } from '../../types'

function parseChallengesRoute(pathname: string): {
  readonly moduleSlug: string | null
  readonly challengeSlug: string | null
  readonly stepSlug: string | null
} {
  const parts = pathname.split('/').filter(Boolean)
  // Route: /bugete-locale-2026/challenges/$moduleSlug/$challengeSlug/$stepSlug
  const challengesIndex = parts.indexOf('challenges')
  const moduleSlug = challengesIndex >= 0 ? (parts[challengesIndex + 1] ?? null) : null
  const challengeSlug = challengesIndex >= 0 ? (parts[challengesIndex + 2] ?? null) : null
  const stepSlug = challengesIndex >= 0 ? (parts[challengesIndex + 3] ?? null) : null

  return { moduleSlug, challengeSlug, stepSlug }
}

function StepStatusIcon({
  isCompleted,
  isActive,
}: {
  readonly isCompleted: boolean
  readonly isActive: boolean
}) {
  if (isCompleted) {
    return <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5px] text-green-500" />
  }

  if (isActive) {
    return <div className="h-2.5 w-2.5 rounded-full bg-background" />
  }

  return (
    <Circle className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/40 stroke-[2px]" />
  )
}

type ChallengeNavProps = {
  readonly challenge: ChallengeDefinition
  readonly moduleSlug: string
  readonly locale: ChallengeLocale
  readonly currentStepSlug: string | null
  readonly currentChallengeSlug: string | null
  readonly isOpen: boolean
  readonly onOpenChange: (isOpen: boolean) => void
  readonly isStepCompleted: (stepId: string) => boolean
  readonly activeStepRef?: RefObject<HTMLAnchorElement | null>
}

function ChallengeNav({
  challenge,
  moduleSlug,
  locale,
  currentStepSlug,
  currentChallengeSlug,
  isOpen,
  onOpenChange,
  isStepCompleted,
  activeStepRef,
}: ChallengeNavProps) {
  const completedSteps = challenge.steps.filter((step) => isStepCompleted(step.id)).length
  const isChallengeComplete = completedSteps === challenge.steps.length
  const isThisChallenge = challenge.slug === currentChallengeSlug

  return (
    <Collapsible open={isOpen} onOpenChange={onOpenChange}>
      <CollapsibleTrigger className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors text-left group">
        <ChevronRight
          className={cn(
            'h-3 w-3 text-muted-foreground/40 transition-transform shrink-0',
            isOpen && 'rotate-90',
          )}
        />
        <span className="text-xs font-medium text-muted-foreground/80 flex-1 min-w-0 truncate leading-snug">
          {getTranslatedText(challenge.title, locale)}
        </span>
        {isChallengeComplete ? (
          <div className="h-4 w-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
          </div>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground/40 tabular-nums shrink-0">
            {completedSteps}/{challenge.steps.length}
          </span>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="ml-3 space-y-0.5 mt-0.5">
          {challenge.steps.map((step) => {
            const completed = isStepCompleted(step.id)
            const isActive = step.slug === currentStepSlug && isThisChallenge

            return (
              <Link
                key={step.id}
                ref={isActive ? activeStepRef : undefined}
                to={`${CHALLENGES_BASE_PATH}/${moduleSlug}/${challenge.slug}/${step.slug}` as '/'}
                className={cn(
                  'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200 min-w-0 overflow-hidden',
                  isActive
                    ? 'bg-foreground text-background font-medium'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                )}
              >
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <StepStatusIcon isCompleted={completed} isActive={isActive} />
                </div>
                <span className="truncate flex-1 w-0 leading-snug">
                  {getTranslatedText(step.title, locale)}
                </span>
              </Link>
            )
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

function ModuleProgress({ percent }: { readonly percent: number }) {
  return (
    <div className="px-4 py-4 border-b border-border/30">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <span className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t`Progress`}
          </span>
          <span className="text-foreground tabular-nums">{percent}%</span>
        </div>
        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function ChallengesSidebar({
  pathname,
  locale,
}: {
  readonly pathname: string
  readonly locale: ChallengeLocale
}) {
  const { isStepCompleted, getStepStatus } = useChallengeProgress()
  const { moduleSlug, challengeSlug, stepSlug } = parseChallengesRoute(pathname)
  const activeStepRef = useScrollToActive<HTMLAnchorElement>(stepSlug)
  const [openChallengeSlugs, setOpenChallengeSlugs] = useState<Record<string, boolean>>({})

  const modules = useMemo(() => getChallengeModules(), [])
  const activeModule = useMemo(() => {
    if (moduleSlug) return getChallengeModuleBySlug(moduleSlug)
    return modules[0] ?? null
  }, [moduleSlug, modules])

  useEffect(() => {
    if (!challengeSlug) return

    setOpenChallengeSlugs((currentOpenChallengeSlugs) => {
      if (currentOpenChallengeSlugs[challengeSlug]) {
        return currentOpenChallengeSlugs
      }

      return {
        ...currentOpenChallengeSlugs,
        [challengeSlug]: true,
      }
    })
  }, [challengeSlug])

  const completionStats = useMemo(() => {
    if (!activeModule) return null

    return getChallengeModuleStats({
      module: activeModule,
      getStepStatus: (stepId) => getStepStatus(stepId),
    })
  }, [activeModule, getStepStatus])

  const setChallengeOpen = (challengeSlugToUpdate: string, isOpen: boolean) => {
    setOpenChallengeSlugs((currentOpenChallengeSlugs) => ({
      ...currentOpenChallengeSlugs,
      [challengeSlugToUpdate]: isOpen,
    }))
  }

  return (
    <div className="flex h-full flex-col bg-background border-r border-border/50">
      <div className="shrink-0">
        {/* Header */}
        <div className="relative overflow-hidden bg-linear-to-b from-amber-50/50 to-transparent dark:from-amber-950/20 py-4 px-4">
          <Link
            to={CHALLENGES_BASE_PATH as '/'}
            className="relative group flex items-center gap-3"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-amber-600 text-white shadow-sm shadow-amber-600/20 transition-all duration-200 group-hover:scale-105 group-hover:bg-amber-700">
              <Trophy className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight leading-none text-foreground truncate group-hover:text-amber-700 dark:group-hover:text-amber-400 transition-colors">
                {t`Challenges`}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1 font-medium tracking-wide uppercase truncate">
                {t`Local Budgets 2026`}
              </span>
            </div>
          </Link>
        </div>

        {/* Module Selector */}
        {modules.length > 1 && (
          <div className="border-b border-border/50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-all text-left outline-none group border-none bg-transparent">
                  <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] leading-none">
                      {t`Module`}
                    </span>
                    <span className="font-semibold text-sm truncate w-full text-foreground group-hover:text-primary transition-colors">
                      {activeModule
                        ? getTranslatedText(activeModule.title, locale)
                        : t`Select Module`}
                    </span>
                  </div>
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all ml-3 shrink-0">
                    <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-(--radix-dropdown-menu-trigger-width) rounded-lg p-1 shadow-2xl border-border/50"
              >
                {modules.map((module) => {
                  const isActive = module.id === activeModule?.id

                  return (
                    <DropdownMenuItem
                      key={module.id}
                      asChild
                      className={cn(
                        isActive &&
                          'bg-foreground text-background focus:bg-foreground focus:text-background data-highlighted:bg-foreground data-highlighted:text-background',
                      )}
                    >
                      <Link
                        to={`${CHALLENGES_BASE_PATH}/${module.slug}` as '/'}
                        className="flex flex-col items-start gap-0 py-2 px-2.5 rounded-md w-full"
                      >
                        <div className="flex items-center gap-2 w-full">
                          <span className="font-medium text-sm">
                            {getTranslatedText(module.title, locale)}
                          </span>
                          {isActive && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                        </div>
                        <span
                          className={cn(
                            'text-xs line-clamp-1',
                            isActive ? 'opacity-70' : 'text-muted-foreground',
                          )}
                        >
                          {getTranslatedText(module.description, locale)}
                        </span>
                      </Link>
                    </DropdownMenuItem>
                  )
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {completionStats && (
        <ModuleProgress percent={completionStats.completionPercentage} />
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <nav className="p-3 pr-4 space-y-4 overflow-hidden">
          {activeModule ? (
            activeModule.challenges.map((challenge) => {
              const isChallengeOpen =
                openChallengeSlugs[challenge.slug] ?? challenge.slug === challengeSlug

              return (
                <ChallengeNav
                  key={challenge.id}
                  challenge={challenge}
                  moduleSlug={activeModule.slug}
                  locale={locale}
                  currentStepSlug={stepSlug}
                  currentChallengeSlug={challengeSlug}
                  isOpen={isChallengeOpen}
                  onOpenChange={(isOpen) => setChallengeOpen(challenge.slug, isOpen)}
                  isStepCompleted={isStepCompleted}
                  activeStepRef={activeStepRef}
                />
              )
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                <Trophy className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground">{t`Select a module to begin`}</p>
            </div>
          )}
        </nav>
      </ScrollArea>
    </div>
  )
}

export function ChallengesLayout() {
  return (
    <LearningProgressProvider>
      <ChallengesLayoutInner />
    </LearningProgressProvider>
  )
}

function ChallengesLayoutInner() {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const locale = resolveCampaignLocale(location.search as CampaignRouteSearch | undefined)

  return (
    <div className="flex min-h-full w-full">
      {/* Mobile Sidebar Trigger */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden fixed left-6 md:left-16 bottom-24 md:bottom-6 z-50 h-14 w-14 rounded-full shadow-lg bg-background/95 backdrop-blur-sm border-border hover:bg-muted transition-all active:scale-95"
          >
            <Library className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <ChallengesSidebar pathname={location.pathname} locale={locale} />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 xl:w-80 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-svh">
        <ChallengesSidebar pathname={location.pathname} locale={locale} />
      </aside>

      {/* Main Content */}
      <div className="flex-1">
        <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
