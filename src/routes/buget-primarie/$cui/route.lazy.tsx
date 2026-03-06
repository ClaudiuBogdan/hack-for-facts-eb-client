import { createLazyFileRoute } from '@tanstack/react-router'
import { ChallengesLayout } from '@/features/challenges/components/layout/ChallengesLayout'

export const Route = createLazyFileRoute('/buget-primarie/$cui')({
  component: ChallengesLayout,
})
