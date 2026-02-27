import { Link, createLazyFileRoute } from '@tanstack/react-router'
import { CampaignChallengePage } from '@/features/campaigns/local-budget-2026/components/challenges/CampaignChallengePage'
import { CAMPAIGN_BASE_PATH } from '@/features/campaigns/local-budget-2026/constants'
import { resolveCampaignLocale } from '@/features/campaigns/local-budget-2026/schemas/campaign-route-search-schema'

export const Route = createLazyFileRoute('/bugete-locale-2026/challenges/$challengeSlug')({
  component: CampaignChallengeRoutePage,
  notFoundComponent: CampaignChallengeNotFoundPage,
})

function CampaignChallengeRoutePage() {
  const { challengeSlug } = Route.useLoaderData()
  const search = Route.useSearch()
  const locale = resolveCampaignLocale(search)

  return <CampaignChallengePage challengeSlug={challengeSlug} locale={locale} />
}

function CampaignChallengeNotFoundPage() {
  return (
    <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Provocare inexistentă</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        Provocarea căutată nu există în catalogul campaniei.
      </p>
      <Link to={`${CAMPAIGN_BASE_PATH}/challenges` as '/'} className="mt-4 inline-block text-sm font-medium text-blue-600">
        Înapoi la catalog
      </Link>
    </section>
  )
}
