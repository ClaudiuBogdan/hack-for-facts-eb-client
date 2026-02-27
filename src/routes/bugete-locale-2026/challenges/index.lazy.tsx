import { createLazyFileRoute } from '@tanstack/react-router'
import { getCampaignChallengeList } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-content'
import { useCampaignProgress } from '@/features/campaigns/local-budget-2026/hooks/use-campaign-progress'
import { CampaignChallengeListSection } from '@/features/campaigns/local-budget-2026/components/hub/CampaignChallengeListSection'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/bugete-locale-2026/challenges/')({
  component: CampaignChallengesIndexPage,
})

function CampaignChallengesIndexPage() {
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)
  const challenges = getCampaignChallengeList()
  const { getChallengeStatus } = useCampaignProgress()

  const title = locale === 'en' ? 'Challenge Catalog' : 'Catalog provocări'
  const description =
    locale === 'en'
      ? 'All available challenges from the Local Budgets 2026 campaign.'
      : 'Toate provocările disponibile în campania Bugete Locale 2026.'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-300">{description}</p>
      </div>

      <CampaignChallengeListSection
        locale={locale}
        challenges={challenges}
        getChallengeStatus={getChallengeStatus}
      />
    </div>
  )
}
