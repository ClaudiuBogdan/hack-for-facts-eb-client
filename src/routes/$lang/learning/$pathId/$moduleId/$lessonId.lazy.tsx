import { createLazyFileRoute } from '@tanstack/react-router'
import { LessonPlayer } from '@/features/learning/components/player/LessonPlayer'
import { LessonRoutePending } from '@/features/learning/components/player/lesson-player-shell'
import { useAutoOnboarding } from '@/features/learning/hooks/use-auto-onboarding'

export const Route = createLazyFileRoute('/$lang/learning/$pathId/$moduleId/$lessonId')({
  component: LessonRouteComponent,
  pendingComponent: LessonRoutePending,
})

function LessonRouteComponent() {
  const { lang, pathId, moduleId, lessonId } = Route.useParams()

  // Auto-complete onboarding for new users arriving via shared URL
  useAutoOnboarding({ pathId })

  return <LessonPlayer locale={lang as 'ro' | 'en'} pathId={pathId} moduleId={moduleId} lessonId={lessonId} />
}
