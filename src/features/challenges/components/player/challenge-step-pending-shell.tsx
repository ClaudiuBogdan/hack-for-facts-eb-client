import { LessonSkeleton } from '@/features/learning/components/loading/LessonSkeleton'
import { CHALLENGE_ARTICLE_PROSE_CLASS_NAME } from './challenge-step-player.utils'

export function ChallengeStepPendingShell() {
  return (
    <div
      data-testid="challenge-step-pending-shell"
      className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
    >
      <div className={CHALLENGE_ARTICLE_PROSE_CLASS_NAME}>
        <LessonSkeleton />
      </div>
    </div>
  )
}
