import { Navigate, createLazyFileRoute } from '@tanstack/react-router'
import { useLearningProgress } from '@/features/learning/hooks/use-learning-progress'
import { LearningOnboarding } from '@/features/learning/components/onboarding/LearningOnboarding'
import { LearningHubLoading } from '@/features/learning/components/loading/LearningHubLoading'

export const Route = createLazyFileRoute('/$lang/learning/onboarding')({
  component: OnboardingPage,
})

function OnboardingPage() {
  const { lang } = Route.useParams()
  const { isReady, bootstrapPhase, progress } = useLearningProgress()

  // Show loading while checking status
  if (!isReady || bootstrapPhase === 'loading') {
    return <LearningHubLoading />
  }

  // Redirect to hub if onboarding is already completed
  if (progress.onboarding.completedAt) {
    return <Navigate to={`/${lang}/learning` as '/'} replace />
  }

  return <LearningOnboarding />
}
