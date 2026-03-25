import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  Library,
  Compass,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
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
import { useCampaignProgress } from '@/features/campaigns/buget/hooks/use-campaign-progress'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import type { CampaignRouteSearch } from '@/features/campaigns/buget/types'
import { LearningProgressProvider } from '@/features/learning/hooks/use-learning-progress'
import { useScrollToActive } from '@/features/learning/hooks/use-scroll-to-active'
import { UatSwitchBadge } from '../hub/UatSwitchBadge'
import { useChallengeProgress } from '../../hooks/use-challenge-progress'
import {
  getChallengeModuleBySlug,
  getChallengeModules,
  getChallengeModuleStats,
  resolveActiveChallengeModule,
  getTranslatedText,
} from '../../utils/modules'
import {
  buildCampaignProvocariModulePath,
  buildCampaignProvocariPath,
  buildCampaignProvocariStepPath,
  CHALLENGE_SELECTED_ENTITY_PICKER_PATH,
  resolveCampaignEntityCuiFromPathname,
} from '../../constants'
import type { ChallengeDefinition, ChallengeLocale } from '../../types'

function parseChallengesRoute(pathname: string): {
  readonly moduleSlug: string | null
  readonly challengeSlug: string | null
  readonly stepSlug: string | null
} {
  const parts = pathname.split('/').filter(Boolean)
  // Route: /buget/$cui/provocari/$moduleSlug/$challengeSlug/$stepSlug
  const provocariIndex = parts.indexOf('provocari')
  const moduleSlug = provocariIndex >= 0 ? (parts[provocariIndex + 1] ?? null) : null
  const challengeSlug = provocariIndex >= 0 ? (parts[provocariIndex + 2] ?? null) : null
  const stepSlug = provocariIndex >= 0 ? (parts[provocariIndex + 3] ?? null) : null

  return { moduleSlug, challengeSlug, stepSlug }
}

function isChallengesExperiencePath(pathname: string): boolean {
  const parts = pathname.split('/').filter(Boolean)
  const budgetIndex = parts.indexOf('buget')

  if (budgetIndex < 0) {
    return false
  }

  const nextSegment = parts[budgetIndex + 1]
  return nextSegment === undefined || nextSegment === 'provocari'
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
  readonly entityCui?: string
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
  entityCui,
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
  const hubPath = entityCui
    ? buildCampaignProvocariPath(entityCui)
    : CHALLENGE_SELECTED_ENTITY_PICKER_PATH
  const fallbackPath = entityCui
    ? buildCampaignProvocariModulePath(entityCui, moduleSlug)
    : hubPath

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
                to={
                  entityCui
                    ? (buildCampaignProvocariStepPath(
                        entityCui,
                        moduleSlug,
                        challenge.slug,
                        step.slug,
                      ) as '/')
                    : (fallbackPath as '/')
                }
                preload="intent"
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
  entityCui,
  locale,
  storedActiveModuleSlug,
}: {
  readonly pathname: string
  readonly entityCui?: string
  readonly locale: ChallengeLocale
  readonly storedActiveModuleSlug: string | null
}) {
  const { isStepCompleted, getStepStatus } = useChallengeProgress({
    entityCui,
    locale,
  })
  const { moduleSlug, challengeSlug, stepSlug } = parseChallengesRoute(pathname)
  const activeStepRef = useScrollToActive<HTMLAnchorElement>(stepSlug)
  const [openChallengeSlugs, setOpenChallengeSlugs] = useState<Record<string, boolean>>({})

  const modules = useMemo(() => getChallengeModules(), [])
  const activeModule = useMemo(() => {
    return resolveActiveChallengeModule({
      modules,
      routeModuleSlug: moduleSlug,
      storedActiveModuleSlug,
      getStepStatus,
    })
  }, [getStepStatus, moduleSlug, modules, storedActiveModuleSlug])

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
  const hubPath = entityCui
    ? buildCampaignProvocariPath(entityCui)
    : CHALLENGE_SELECTED_ENTITY_PICKER_PATH

  return (
    <div className="flex h-full flex-col bg-background border-r border-border/50">
      <div className="shrink-0">
        {/* Header */}
        <div className="py-4 px-4">
          <Link to={hubPath as '/'} className="group flex items-center gap-2.5">
            <Compass className="h-7 w-7 shrink-0 text-primary" />
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm leading-none text-foreground truncate">
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
                      {t`Topic`}
                    </span>
                    <span className="font-semibold text-sm truncate w-full text-foreground group-hover:text-primary transition-colors">
                      {activeModule
                        ? getTranslatedText(activeModule.title, locale)
                        : t`Select topic`}
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
                        to={
                          (entityCui
                            ? buildCampaignProvocariModulePath(entityCui, module.slug)
                            : hubPath) as '/'
                        }
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

        {entityCui && (
          <div className="border-b border-border/50 px-4 py-3">
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {t`City hall`}
              </span>
              <UatSwitchBadge
                entityCui={entityCui}
                className="flex w-full items-center justify-between rounded-lg border-none bg-transparent px-0 py-0 text-left text-sm font-medium text-foreground hover:bg-transparent hover:text-primary"
              />
            </div>
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
                  entityCui={entityCui}
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
                <Compass className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground">{t`Select a topic to begin`}</p>
            </div>
          )}
        </nav>
      </ScrollArea>
    </div>
  )
}

type ChallengesLayoutProps = {
  readonly children?: ReactNode
}

export function ChallengesLayout({ children }: ChallengesLayoutProps) {
  return (
    <LearningProgressProvider>
      <ChallengesLayoutInner>{children}</ChallengesLayoutInner>
    </LearningProgressProvider>
  )
}

function ChallengesLayoutInner({ children }: ChallengesLayoutProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const isChallengeRoute = useMemo(
    () => isChallengesExperiencePath(location.pathname),
    [location.pathname],
  )
  const { moduleSlug } = useMemo(
    () => parseChallengesRoute(location.pathname),
    [location.pathname],
  )

  // Swipe from left edge to open sidebar
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0]
    if (touch.clientX < 30) {
      touchStartRef.current = { x: touch.clientX, y: touch.clientY }
    }
  }, [])

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!touchStartRef.current) return
      const touch = e.changedTouches[0]
      const dx = touch.clientX - touchStartRef.current.x
      const dy = Math.abs(touch.clientY - touchStartRef.current.y)
      touchStartRef.current = null
      if (dx > 50 && dy < dx) {
        setIsOpen(true)
      }
    },
    [],
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    if (!mq.matches) return

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchEnd])

  const locale = resolveCampaignLocale(location.search as CampaignRouteSearch | undefined)
  const modules = useMemo(() => getChallengeModules(), [])
  const {
    isReady,
    isInitialResolutionReady,
    progress,
    setSelectedEntity,
    setActiveChallengeModule,
  } = useCampaignProgress()
  const syncedEntityCuiRef = useRef<string | null>(null)
  const pathnameEntityCui = resolveCampaignEntityCuiFromPathname(location.pathname)
  const routeModule = useMemo(
    () => (moduleSlug ? getChallengeModuleBySlug(moduleSlug) : null),
    [moduleSlug],
  )
  const currentEntityCui =
    pathnameEntityCui ??
    progress.selectedEntityCui ??
    undefined
  const { getStepStatus } = useChallengeProgress({
    entityCui: currentEntityCui,
    locale,
  })
  const resolvedHubActiveModule = useMemo(
    () =>
      resolveActiveChallengeModule({
        modules,
        storedActiveModuleSlug: progress.activeChallengeModuleSlug,
        getStepStatus,
      }),
    [getStepStatus, modules, progress.activeChallengeModuleSlug],
  )

  useEffect(() => {
    if (
      !pathnameEntityCui ||
      !isReady ||
      !isInitialResolutionReady ||
      syncedEntityCuiRef.current === pathnameEntityCui ||
      progress.selectedEntityCui === pathnameEntityCui
    ) {
      return
    }

    syncedEntityCuiRef.current = pathnameEntityCui
    setSelectedEntity({ entityCui: pathnameEntityCui })
  }, [
    isInitialResolutionReady,
    isReady,
    pathnameEntityCui,
    progress.selectedEntityCui,
    setSelectedEntity,
  ])

  useEffect(() => {
    if (!isChallengeRoute || !isReady || !isInitialResolutionReady) {
      return
    }

    const desiredActiveModuleSlug =
      routeModule?.slug ??
      resolvedHubActiveModule?.slug ??
      null

    if (
      desiredActiveModuleSlug === null ||
      desiredActiveModuleSlug === progress.activeChallengeModuleSlug
    ) {
      return
    }

    setActiveChallengeModule({ moduleSlug: desiredActiveModuleSlug })
  }, [
    isChallengeRoute,
    isInitialResolutionReady,
    isReady,
    progress.activeChallengeModuleSlug,
    resolvedHubActiveModule,
    routeModule,
    setActiveChallengeModule,
  ])

  return (
    <div className="flex min-h-screen min-h-[100svh] supports-[min-height:100dvh]:min-h-[100dvh] w-full">
      {/* Mobile Sidebar Trigger */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            className="lg:hidden fixed left-0 md:left-16 bottom-16 md:bottom-6 z-50 h-14 rounded-l-none! rounded-r-full! md:rounded-full! border-l-0 md:border-l pl-2 pr-4 md:px-4 shadow-lg bg-background/95 backdrop-blur-sm border-border hover:bg-muted transition-all active:scale-95"
          >
            <Library className="h-5 w-5" />
            <ChevronRight className="h-4 w-4 -ml-1" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0" aria-describedby={undefined}>
          <SheetTitle className="sr-only">
            {t`Challenges`}
          </SheetTitle>
          <ChallengesSidebar
            pathname={location.pathname}
            entityCui={currentEntityCui}
            locale={locale}
            storedActiveModuleSlug={progress.activeChallengeModuleSlug}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 xl:w-80 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-svh">
        <ChallengesSidebar
          pathname={location.pathname}
          entityCui={currentEntityCui}
          locale={locale}
          storedActiveModuleSlug={progress.activeChallengeModuleSlug}
        />
      </aside>

      {/* Main Content */}
      <div className="flex min-h-screen min-h-[100svh] supports-[min-height:100dvh]:min-h-[100dvh] flex-1 flex-col">
        <div
          data-testid="challenges-main-content"
          className="mx-auto flex min-h-full w-full max-w-3xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10"
        >
          {children ?? <Outlet />}
        </div>
      </div>
    </div>
  )
}
