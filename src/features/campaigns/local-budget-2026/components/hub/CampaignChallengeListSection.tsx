import { CampaignChallengeCard } from '../challenges/CampaignChallengeCard'
import type {
  CampaignChallengeDefinition,
  CampaignChallengeStatus,
  CampaignLocale,
} from '../../types'

type CampaignChallengeListSectionProps = {
  readonly locale: CampaignLocale
  readonly challenges: readonly CampaignChallengeDefinition[]
  readonly getChallengeStatus: (challengeSlug: string) => CampaignChallengeStatus
}

export function CampaignChallengeListSection({
  locale,
  challenges,
  getChallengeStatus,
}: CampaignChallengeListSectionProps) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Lista provocărilor</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {challenges.map((challenge) => (
          <CampaignChallengeCard
            key={challenge.slug}
            locale={locale}
            challenge={challenge}
            status={getChallengeStatus(challenge.slug)}
          />
        ))}
      </div>
    </section>
  )
}
