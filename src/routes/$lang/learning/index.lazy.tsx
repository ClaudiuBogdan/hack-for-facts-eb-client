import { Link, Navigate, useNavigate, createLazyFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, MoreVertical, RotateCcw, Trash2, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  getAllLessons,
  getLearningPaths,
  getPathProgressStats,
} from '@/features/learning/utils/paths'
import type { PathProgressStats } from '@/features/learning/utils/paths'
import type { LearningPathDefinition } from '@/features/learning/types'
import { getDisplayStreak, formatStreak } from '@/features/learning/utils/streak'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import { LearningHubLoading } from '@/features/learning/components/loading/LearningHubLoading'
import { LearningPathCard } from '@/features/learning/components/cards/LearningPathCard'

export const Route = createLazyFileRoute('/$lang/learning/')({
  component: LearningHubPage,
})

function LearningHubPage() {
  const { lang } = Route.useParams()
  const locale = lang as 'ro' | 'en'
  const paths = getLearningPaths()
  const navigate = useNavigate()
  const {
    isReady,
    isSyncedWithAuthState,
    progress,
    resetOnboarding,
    clearProgress,
    setActivePathId,
  } = useLearningProgress()
  const [isRestartDialogOpen, setIsRestartDialogOpen] = useState(false)
  const [isWipeDialogOpen, setIsWipeDialogOpen] = useState(false)
  const [isOtherPathsOpen, setIsOtherPathsOpen] = useState(false)

  const activePath = useMemo(() => {
    return paths.find((p) => p.id === progress.activePathId) ?? paths[0]
  }, [paths, progress.activePathId])

  const stats = useMemo(() => {
    if (!activePath) return null
    const allLessons = getAllLessons(activePath)
    const completedCount = allLessons.filter((l) => {
      const status = progress.content[l.id]?.status
      return status === 'completed' || status === 'passed'
    }).length
    const percentage = allLessons.length > 0 ? Math.round((completedCount / allLessons.length) * 100) : 0

    // Calculate total time for all lessons
    const totalMinutes = allLessons.reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0)

    // Calculate remaining time from incomplete lessons
    const remainingMinutes = allLessons
      .filter((l) => {
        const status = progress.content[l.id]?.status
        return status !== 'completed' && status !== 'passed'
      })
      .reduce((sum, l) => sum + (l.durationMinutes ?? 0), 0)

    // Find next lesson
    const nextLesson = allLessons.find((l) => {
      const status = progress.content[l.id]?.status
      return status !== 'completed' && status !== 'passed'
    })

    const module = nextLesson ? activePath.modules.find((m) => m.lessons.some((l) => l.id === nextLesson.id)) : null

    return {
      completedCount,
      totalCount: allLessons.length,
      percentage,
      remainingMinutes,
      totalMinutes,
      nextLesson,
      moduleId: module?.id,
    }
  }, [activePath, progress.content])

  // Auto-expand "Explore more paths" when current path is completed
  useEffect(() => {
    if (stats?.percentage === 100) {
      setIsOtherPathsOpen(true)
    }
  }, [stats?.percentage])

  // Compute other paths with their stats, sorted by last interaction then progress
  const otherPathsWithStats = useMemo(() => {
    type PathWithStats = {
      readonly path: LearningPathDefinition
      readonly stats: PathProgressStats
    }

    const otherPaths = paths.filter((p) => p.id !== activePath?.id)

    const pathsWithStats: readonly PathWithStats[] = otherPaths.map((path) => ({
      path,
      stats: getPathProgressStats({ path, progress }),
    }))

    // Sort by: in_progress → completed → new (with relevance scoring for new paths)
    const getCategory = (pct: number): number => {
      if (pct > 0 && pct < 100) return 0 // in_progress - highest priority
      if (pct === 100) return 1 // completed
      return 2 // new (0%)
    }

    const relatedPathsSet = new Set(progress.onboarding.relatedPaths ?? [])

    return [...pathsWithStats].sort((a, b) => {
      const aPercentage = a.stats.completionPercentage
      const bPercentage = b.stats.completionPercentage
      const aCategory = getCategory(aPercentage)
      const bCategory = getCategory(bPercentage)

      // Sort by category first
      if (aCategory !== bCategory) return aCategory - bCategory

      // Within in_progress or completed: sort by most recent interaction, then by progress
      if (aCategory === 0 || aCategory === 1) {
        if (a.stats.lastInteractionAt && b.stats.lastInteractionAt) {
          const timeCompare = b.stats.lastInteractionAt.localeCompare(a.stats.lastInteractionAt)
          if (timeCompare !== 0) return timeCompare
        }
        return bPercentage - aPercentage
      }

      // New paths: sort by onboarding relevance (from stored relatedPaths)
      const aRelevance = relatedPathsSet.has(a.path.id) ? 1 : 0
      const bRelevance = relatedPathsSet.has(b.path.id) ? 1 : 0
      return bRelevance - aRelevance
    })
  }, [paths, activePath?.id, progress])

  // Show loading while auth/progress is loading
  if (!isReady || !isSyncedWithAuthState) {
    return <LearningHubLoading />
  }

  // Redirect to onboarding if not completed
  if (!progress.onboarding.completedAt) {
    return <Navigate to={`/${lang}/learning/onboarding` as '/'} replace />
  }

  const nextLessonUrl = stats?.nextLesson && stats.moduleId
    ? `/${lang}/learning/${activePath?.id}/${stats.moduleId}/${stats.nextLesson.id}`
    : undefined

  const displayStreak = getDisplayStreak(progress.streak)

  const handleNavigateAndSwitch = async (pathId: string, lessonUrl: string) => {
    await setActivePathId(pathId)
    void navigate({ to: lessonUrl as '/' })
  }

  return (
    <div className=" max-w-4xl mx-auto space-y-10 animate-in fade-in duration-1000 py-6 px-4">
      {/* Header Row: Title + Menu */}
      <div className="flex items-start justify-between pl-9">
        <div className="space-y-3">
          <h1 className="text-5xl font-black tracking-tight text-foreground leading-tight">
            {(stats?.completedCount ?? 0) > 0 ? t`Welcome back.` : t`Ready to learn?`}
          </h1>
          <p className="text-muted-foreground font-medium text-lg opacity-60">
            {(stats?.completedCount ?? 0) > 0
              ? t`You're doing great. Keep up the momentum.`
              : t`Start your first lesson and track your progress.`}
          </p>
        </div>
        {/* Settings Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl">
            <DropdownMenuItem
              onClick={() => setIsRestartDialogOpen(true)}
              className="flex items-center gap-2.5 py-2.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{t`Restart Onboarding`}</span>
            </DropdownMenuItem>
            {import.meta.env.DEV && (
              <DropdownMenuItem
                onClick={() => setIsWipeDialogOpen(true)}
                className="flex items-center gap-2.5 py-2.5 text-destructive cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span className="text-sm">{t`Wipe All Data`}</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Active Path Card */}
      <div className="space-y-6">
        {activePath && (stats?.percentage ?? 0) < 100 ? (
          <LearningPathCard
            path={activePath}
            stats={{
              completedCount: stats?.completedCount ?? 0,
              totalCount: stats?.totalCount ?? 0,
              percentage: stats?.percentage ?? 0,
              remainingMinutes: stats?.remainingMinutes ?? 0,
              totalMinutes: stats?.totalMinutes ?? 0,
            }}
            locale={locale}
            lang={lang}
            variant="active"
            nextLessonUrl={nextLessonUrl}
            streak={{
              display: displayStreak,
              formatted: formatStreak(displayStreak),
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-muted/20 rounded-[40px] border-2 border-dashed border-muted">
            <Trophy className="h-16 w-16 text-primary/40 mb-6" />
            <h3 className="text-2xl font-black tracking-tight mb-2">{t`Congratulations!`}</h3>
            <p className="text-muted-foreground font-medium mb-8">{t`You've completed this learning path.`}</p>
            <Button asChild variant="outline" className="rounded-2xl px-8 h-12 font-bold">
              <Link to={`/${lang}/learning/${activePath?.id}` as '/'}>{t`Review Path`}</Link>
            </Button>
          </div>
        )}
      </div>

      {/* Other Learning Paths Section - Collapsible */}
      {otherPathsWithStats.length > 0 && (
        <Collapsible open={isOtherPathsOpen} onOpenChange={setIsOtherPathsOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-3 py-4 px-6 rounded-2xl bg-muted/30 hover:bg-muted/50 transition-colors group cursor-pointer"
            >
              <span className="text-sm font-bold text-muted-foreground group-hover:text-foreground transition-colors">
                {t`Explore more paths`}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground group-hover:text-foreground transition-all duration-300 ${
                  isOtherPathsOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-6 space-y-6 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0">
            {otherPathsWithStats.map(({ path, stats: pathStats }) => {
              const otherNextLessonUrl = pathStats.nextLesson && pathStats.nextModuleId
                ? `/${lang}/learning/${path.id}/${pathStats.nextModuleId}/${pathStats.nextLesson.id}`
                : undefined

              return (
                <LearningPathCard
                  key={path.id}
                  path={path}
                  stats={{
                    completedCount: pathStats.completedCount,
                    totalCount: pathStats.totalCount,
                    percentage: pathStats.completionPercentage,
                    remainingMinutes: pathStats.remainingMinutes,
                    totalMinutes: pathStats.totalMinutes,
                  }}
                  locale={locale}
                  lang={lang}
                  variant="other"
                  nextLessonUrl={otherNextLessonUrl}
                  onNavigateAndSwitch={
                    otherNextLessonUrl
                      ? () => void handleNavigateAndSwitch(path.id, otherNextLessonUrl)
                      : undefined
                  }
                />
              )
            })}
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Restart Onboarding Confirmation Dialog */}
      <AlertDialog open={isRestartDialogOpen} onOpenChange={setIsRestartDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t`Restart Onboarding?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {t`This will reset your onboarding preferences and show the welcome flow again. Your lesson progress will be preserved.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t`Cancel`}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void resetOnboarding()}
              className="rounded-xl"
            >
              {t`Restart`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Wipe All Data Confirmation Dialog (DEV only) */}
      {import.meta.env.DEV && (
        <AlertDialog open={isWipeDialogOpen} onOpenChange={setIsWipeDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-destructive">{t`Wipe All Data?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {t`This will permanently delete all your learning progress, including completed lessons, quiz scores, and onboarding preferences. This action cannot be undone.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">{t`Cancel`}</AlertDialogCancel>
              <AlertDialogAction
                onClick={clearProgress}
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t`Wipe All Data`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}
