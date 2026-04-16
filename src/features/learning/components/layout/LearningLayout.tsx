import { Link, Outlet, useLocation } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import {
  CheckCircle2,
  ChevronDown,
  Circle,
  Compass,
  Library,
  Layers,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { LearningProgressProvider, useLearningProgress } from '../../hooks/use-learning-progress'
import { useScrollToActive } from '../../hooks/use-scroll-to-active'
import { getAllLessons, getLearningPathById, getLearningPaths, getTranslatedText } from '../../utils/paths'
import type { LearningModuleDefinition } from '../../types'
import { LoginBanner } from './LoginBanner'

function parseLearningRoute(pathname: string): {
  readonly locale: 'en' | 'ro'
  readonly pathId: string | null
  readonly moduleId: string | null
  readonly lessonId: string | null
} {
  const parts = pathname.split('/').filter(Boolean)
  const locale: 'en' | 'ro' = parts[0] === 'ro' ? 'ro' : 'en'
  const learningIndex = parts.indexOf('learning')
  const pathId = learningIndex >= 0 ? (parts[learningIndex + 1] ?? null) : null
  const moduleId = learningIndex >= 0 ? (parts[learningIndex + 2] ?? null) : null
  const lessonId = learningIndex >= 0 ? (parts[learningIndex + 3] ?? null) : null
  return { locale, pathId, moduleId, lessonId }
}

type ModuleNavProps = {
  readonly module: LearningModuleDefinition
  readonly pathId: string
  readonly locale: 'en' | 'ro'
  readonly currentLessonId: string | null
  readonly lessonProgress: Readonly<Record<string, { readonly status: string } | undefined>>
  readonly activeLessonRef?: React.RefObject<HTMLAnchorElement | null>
}

function LessonStatusIcon({ isCompleted, isActive }: { readonly isCompleted: boolean; readonly isActive: boolean }) {
  if (isCompleted) {
    return <CheckCircle2 className="h-3.5 w-3.5 stroke-[2.5px] text-green-500" />
  }
  if (isActive) {
    return <div className="h-2.5 w-2.5 rounded-full bg-background" />
  }
  return <Circle className="h-3.5 w-3.5 text-muted-foreground/25 group-hover:text-muted-foreground/40 stroke-[2px]" />
}

function ModuleNav({ module, pathId, locale, currentLessonId, lessonProgress, activeLessonRef }: ModuleNavProps) {
  const completedLessons = module.lessons.filter((lesson) => {
    const status = lessonProgress[lesson.id]?.status
    return status === 'completed' || status === 'passed'
  }).length
  const isModuleComplete = completedLessons === module.lessons.length

  return (
    <div className="space-y-2 overflow-hidden">
      <div className="px-2 pr-1 flex items-center gap-2">
        <span className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider leading-tight flex-1 min-w-0">
          {getTranslatedText(module.title, locale)}
        </span>
        {isModuleComplete ? (
          <div className="h-4 w-4 rounded-full bg-green-500/10 flex items-center justify-center shrink-0">
            <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
          </div>
        ) : (
          <span className="text-[10px] font-medium text-muted-foreground/40 tabular-nums shrink-0">
            {completedLessons}/{module.lessons.length}
          </span>
        )}
      </div>

      <div className="space-y-0.5 overflow-hidden">
        {module.lessons.map((lesson) => {
          const status = lessonProgress[lesson.id]?.status
          const isCompleted = status === 'completed' || status === 'passed'
          const isActive = lesson.id === currentLessonId

          return (
            <Link
              key={lesson.id}
              ref={isActive ? activeLessonRef : undefined}
              to={`/${locale}/learning/${pathId}/${module.id}/${lesson.id}` as '/'}
              preload="intent"
              className={cn(
                'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-all duration-200 min-w-0 overflow-hidden',
                isActive
                  ? 'bg-foreground text-background font-medium'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                <LessonStatusIcon isCompleted={isCompleted} isActive={isActive} />
              </div>
              <span className="truncate flex-1 w-0 leading-snug">
                {getTranslatedText(lesson.title, locale)}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function PathProgress({ percent }: { readonly percent: number }) {
  return (
    <div className="px-4 py-4 border-b border-border/30">
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
          <span className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            {t`Course Progress`}
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

function LearningSidebar({ pathname }: { readonly pathname: string }) {
  const { progress, setActivePathId } = useLearningProgress()
  const { locale, pathId, lessonId } = parseLearningRoute(pathname)
  const activeLessonRef = useScrollToActive<HTMLAnchorElement>(lessonId)

  const paths = useMemo(() => getLearningPaths(), [])
  const activePath = useMemo(() => {
    if (pathId) return getLearningPathById(pathId)
    return paths.find((p) => p.id === progress.activePathId) ?? paths[0]
  }, [pathId, paths, progress.activePathId])

  const completionStats = useMemo(() => {
    if (!activePath) return null
    const allLessons = getAllLessons(activePath)
    const total = allLessons.length
    const lessonProgress = progress.content
    const completed = allLessons.filter((lesson) => {
      const status = lessonProgress[lesson.id]?.status
      return status === 'completed' || status === 'passed'
    }).length
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0
    return { completed, total, percent }
  }, [activePath, progress.content])

  return (
    <div className="flex h-full flex-col bg-background border-r border-border/50">
      <div className="shrink-0">
        {/* Hero Area - Light & Clean */}
        <div className="relative overflow-hidden bg-linear-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 py-4 px-4">
          <Link to={`/${locale}/learning` as '/'} className="relative group flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition-all duration-200 group-hover:scale-105 group-hover:bg-blue-700">
              <Compass className="h-5 w-5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm tracking-tight leading-none text-foreground truncate group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                {t`Budgetary Academy`}
              </span>
              <span className="text-[10px] text-muted-foreground mt-1 font-medium tracking-wide uppercase truncate">
                {t`Follow the money`}
              </span>
            </div>
          </Link>
        </div>

        {/* Path Selector - Full Width */}
        <div className="border-b border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between py-3 px-4 hover:bg-muted/50 transition-all text-left outline-none group border-none bg-transparent">
                <div className="flex flex-col items-start gap-0.5 min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.15em] leading-none">
                    {t`Learning Path`}
                  </span>
                  <span className="font-semibold text-sm truncate w-full text-foreground group-hover:text-primary transition-colors">
                    {activePath ? getTranslatedText(activePath.title, locale) : t`Select Path`}
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
              {paths.map((p) => {
                const isActive = p.id === activePath?.id

                return (
                  <DropdownMenuItem key={p.id} asChild className={cn(
                    isActive && "bg-foreground text-background focus:bg-foreground focus:text-background data-highlighted:bg-foreground data-highlighted:text-background"
                  )}>
                    <Link
                      to="/$lang/learning/$pathId"
                      params={{ lang: locale, pathId: p.id }}
                      onClick={() => setActivePathId(p.id)}
                      className="flex flex-col items-start gap-0 py-2 px-2.5 rounded-md w-full"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="font-medium text-sm">{getTranslatedText(p.title, locale)}</span>
                        {isActive && <CheckCircle2 className="h-3 w-3 ml-auto" />}
                      </div>
                      <span className={cn(
                        "text-xs line-clamp-1",
                        isActive ? "opacity-70" : "text-muted-foreground"
                      )}>
                        {getTranslatedText(p.description, locale)}
                      </span>
                    </Link>
                  </DropdownMenuItem>
                )
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {completionStats && <PathProgress percent={completionStats.percent} />}

      {/* Navigation */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <nav className="p-3 pr-4 space-y-6 overflow-hidden">
          {activePath ? (
            activePath.modules.map((module) => (
              <ModuleNav
                key={module.id}
                module={module}
                pathId={activePath.id}
                locale={locale}
                currentLessonId={lessonId}
                lessonProgress={progress.content}
                activeLessonRef={activeLessonRef}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <div className="h-14 w-14 rounded-xl bg-muted/50 flex items-center justify-center mb-4">
                <Layers className="h-7 w-7 text-muted-foreground/40" />
              </div>
              <p className="text-xs text-muted-foreground">{t`Ready to Begin?`}</p>
            </div>
          )}
        </nav>
      </ScrollArea>
    </div>
  )
}

type LearningLayoutProps = {
  readonly children?: ReactNode
}

export function LearningLayout({ children }: LearningLayoutProps) {
  return (
    <LearningProgressProvider>
      <LearningLayoutInner>{children}</LearningLayoutInner>
    </LearningProgressProvider>
  )
}

function LearningLayoutInner({ children }: LearningLayoutProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const isOnboardingRoute = location.pathname.includes('/learning/onboarding')

  return (
    <div className="flex min-h-full w-full">
      {/* Mobile Sidebar Trigger */}
      {!isOnboardingRoute && (
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
            <LearningSidebar pathname={location.pathname} />
          </SheetContent>
        </Sheet>
      )}

      {/* Desktop Sidebar */}
      {!isOnboardingRoute && (
        <aside className="hidden lg:flex lg:w-72 xl:w-80 lg:shrink-0 lg:flex-col lg:sticky lg:top-0 lg:h-svh">
          <LearningSidebar pathname={location.pathname} />
        </aside>
      )}

      {/* Main Content */}
      <div className="flex-1">
        <LoginBanner />
        <div className="mx-auto max-w-3xl px-6 py-8 lg:px-10 lg:py-10">
          {children ?? <Outlet />}
        </div>
      </div>
    </div>
  )
}
