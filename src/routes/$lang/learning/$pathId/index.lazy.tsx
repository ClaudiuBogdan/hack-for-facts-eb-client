import { Link, createLazyFileRoute } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useMemo } from 'react'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Layers,
  Play,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import { LearningHubLoading } from '@/features/learning/components/loading/LearningHubLoading'
import {
  getAllLessons,
  getLearningPathById,
  getLearningPathCompletionStats,
  getTranslatedText,
} from '@/features/learning/utils/paths'
import { cn } from '@/lib/utils'

export const Route = createLazyFileRoute('/$lang/learning/$pathId/')({
  component: PathOverviewPage,
})

function PathOverviewPage() {
  const { lang, pathId } = Route.useParams()
  const locale = lang as 'ro' | 'en'
  const { isReady, progress } = useLearningProgress()

  const path = useMemo(() => getLearningPathById(pathId), [pathId])

  if (!isReady) {
    return <LearningHubLoading />
  }

  if (!path) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center min-h-[50vh]">
        <div className="h-20 w-20 rounded-3xl bg-muted/30 flex items-center justify-center mb-6">
          <BookOpen className="h-10 w-10 text-muted-foreground/50" aria-hidden="true" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">{t`Path not found`}</h2>
        <p className="text-lg text-muted-foreground font-medium mt-2 max-w-md mx-auto">{t`The learning path you're looking for doesn't exist or has been moved.`}</p>
        <Button asChild className="mt-8 rounded-2xl h-12 px-8 font-bold" variant="outline">
          <Link to={`/${lang}/learning` as '/'}>{t`Back to Learning Hub`}</Link>
        </Button>
      </div>
    )
  }

  const stats = getLearningPathCompletionStats({ path, progress })
  const isComplete = stats.completionPercentage === 100
  const allLessons = getAllLessons(path)
  const contentProgress = progress.content

  // Find the next incomplete lesson
  const nextLesson = allLessons.find((lesson) => {
    const status = contentProgress[lesson.id]?.status
    return status !== 'completed' && status !== 'passed'
  })

  // Find module for lesson
  const findModuleForLesson = (lessonId: string) => {
    for (const m of path.modules) {
      if (m.lessons.some((l) => l.id === lessonId)) {
        return m.id
      }
    }
    return path.modules[0]?.id
  }

  const startHref = nextLesson
    ? `/${lang}/learning/${path.id}/${findModuleForLesson(nextLesson.id)}/${nextLesson.id}`
    : `/${lang}/learning/${path.id}/${path.modules[0]?.id}/${path.modules[0]?.lessons[0]?.id}`

  const totalMinutes = allLessons.reduce((sum, l) => sum + l.durationMinutes, 0)

  // Calculate remaining time
  const remainingMinutes = allLessons
    .filter((l) => {
      const status = contentProgress[l.id]?.status
      return status !== 'completed' && status !== 'passed'
    })
    .reduce((sum, l) => sum + l.durationMinutes, 0)

  const formatTime = (minutes: number) => {
    if (minutes <= 0) return t`Done`
    if (minutes < 60) return t`${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (mins === 0) return t`${hours}h`
    return t`${hours}h ${mins}m`
  }

  return (
    <div className="max-w-4xl mx-auto space-y-16 animate-in fade-in duration-700 pb-20 pt-8 px-4 md:px-6">
      {/* Header Section */}
      <div className="space-y-8">
        {/* Back Link */}
        <Link
          to={`/${lang}/learning` as '/'}
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group"
          aria-label={t`Back to Learning Hub`}
        >
          <ArrowRight className="h-4 w-4 rotate-180 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
          {t`Back to Hub`}
        </Link>

        <div className="space-y-6">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter text-foreground leading-[1.1]">
              {getTranslatedText(path.title, locale)}
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
              {getTranslatedText(path.description, locale)}
            </p>
          </div>

          {/* Controls & Stats Bar */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6 md:gap-8 pt-4">
            <Button asChild size="lg" className="rounded-full h-14 px-8 text-base font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
              <Link to={startHref as '/'}>
                {isComplete ? (
                  <>
                    <BookOpen className="mr-2 h-5 w-5" aria-hidden="true" />
                    {t`Review Path`}
                  </>
                ) : stats.completedCount > 0 ? (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" aria-hidden="true" />
                    {t`Continue`}
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5 fill-current" aria-hidden="true" />
                    {t`Start Learning`}
                  </>
                )}
              </Link>
            </Button>

            {/* Divider for desktop */}
            <div className="hidden md:block h-10 w-px bg-border/60" aria-hidden="true" />

            {/* Compact Stats */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2" title={t`Modules`}>
                <Layers className="h-4 w-4" aria-hidden="true" />
                <span>{path.modules.length} {t`Modules`}</span>
              </div>

              <div className="flex items-center gap-2" title={t`Total Duration`}>
                <Clock className="h-4 w-4" aria-hidden="true" />
                <span>{formatTime(stats.completedCount > 0 && !isComplete ? remainingMinutes : totalMinutes)}</span>
              </div>

              <div className="flex items-center gap-2" title={t`Lessons Completed`}>
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                <span className="tabular-nums">{stats.completedCount}/{stats.totalCount} {t`Lessons`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="space-y-8">
        <h2 className="text-2xl font-black tracking-tight">{t`Course Content`}</h2>

        <div className="grid gap-6">
          {path.modules.map((module, moduleIndex) => {
            const completedLessons = module.lessons.filter((lesson) => {
              const status = contentProgress[lesson.id]?.status
              return status === 'completed' || status === 'passed'
            }).length
            const totalLessons = module.lessons.length
            const isModuleComplete = completedLessons === totalLessons

            return (
              <Card
                key={module.id}
                className={cn(
                  'relative overflow-hidden border-none transition-all duration-300 shadow-lg shadow-primary/5 bg-card'
                )}
              >
                {/* Module Header */}
                <div className={cn(
                  "p-5 md:p-6 flex items-start gap-5 transition-colors",
                  isModuleComplete ? "bg-green-500/5" : "bg-muted/30"
                )}>
                  <div
                    className={cn(
                      'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-bold transition-all shadow-sm',
                      isModuleComplete
                        ? 'bg-green-500 text-white shadow-green-500/20'
                        : 'bg-primary text-primary-foreground shadow-primary/20'
                    )}
                  >
                    {isModuleComplete ? (
                      <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                    ) : (
                      moduleIndex + 1
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5 pt-0.5">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h3 className="text-lg font-black tracking-tight leading-tight">
                        {getTranslatedText(module.title, locale)}
                      </h3>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "rounded-md px-2 py-0.5 text-xs font-bold transition-colors",
                          isModuleComplete && "bg-green-500/10 text-green-700 hover:bg-green-500/20"
                        )}
                      >
                        {completedLessons}/{totalLessons} {t`Lessons`}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed">
                      {getTranslatedText(module.description, locale)}
                    </p>
                  </div>
                </div>

                {/* Lessons List */}
                <CardContent className="p-0 bg-card">
                  <div className="divide-y divide-border/40">
                    {module.lessons.map((lesson, lessonIndex) => {
                      const status = contentProgress[lesson.id]?.status
                      const isCompleted = status === 'completed' || status === 'passed'
                      const isNextUp =
                        !isCompleted &&
                        lessonIndex ===
                        module.lessons.findIndex((l) => {
                          const s = contentProgress[l.id]?.status
                          return s !== 'completed' && s !== 'passed'
                        })

                      const lessonContent = (
                        <>
                          <div className="flex w-12 shrink-0 justify-center">
                            <div className={cn(
                              "flex h-8 w-8 items-center justify-center rounded-full border-[1.5px] transition-all",
                              isCompleted
                                ? "border-green-500 bg-green-500 text-white"
                                : isNextUp
                                  ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                                  : "border-muted-foreground/30 text-muted-foreground"
                            )}>
                              {isCompleted ? (
                                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                              ) : isNextUp ? (
                                <Play className="h-3 w-3 fill-current ml-0.5" aria-hidden="true" />
                              ) : (
                                <span className="text-[10px] font-bold">{lessonIndex + 1}</span>
                              )}
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-bold text-base transition-colors",
                              isCompleted ? "text-muted-foreground line-through decoration-border/50" : "text-foreground",
                              isNextUp && "text-primary"
                            )}>
                              {getTranslatedText(lesson.title, locale)}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs font-medium text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" aria-hidden="true" />
                                {lesson.durationMinutes} {t`min`}
                              </span>
                            </div>
                          </div>

                          <div className={cn(
                            "h-8 w-8 rounded-full flex items-center justify-center transition-all",
                            isNextUp ? "bg-primary text-primary-foreground scale-100 opacity-100 shadow-md shadow-primary/20" : "bg-muted text-muted-foreground scale-75 opacity-0 group-hover:opacity-100 group-hover:scale-100"
                          )}>
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </div>
                        </>
                      )

                      const commonClasses = cn(
                        'group flex items-center gap-5 p-5 md:p-6 transition-all duration-200',
                        'hover:bg-muted/40',
                        isNextUp && 'bg-primary/[0.03]'
                      )

                      return (
                        <Link
                          key={lesson.id}
                          to={`/${lang}/learning/${path.id}/${module.id}/${lesson.id}` as '/'}
                          className={commonClasses}
                        >
                          {lessonContent}
                        </Link>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
