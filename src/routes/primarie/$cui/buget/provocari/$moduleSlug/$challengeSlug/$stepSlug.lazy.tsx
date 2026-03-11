import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { resolveCampaignLocale } from '@/features/campaigns/buget/schemas/campaign-route-search-schema'
import { ChallengeStepPlayer } from '@/features/challenges/components/player/ChallengeStepPlayer'
import { resolveChallengeStepRouteSearch } from '@/features/challenges/utils/challenge-step-route-search'

export const Route = createLazyFileRoute(
  '/primarie/$cui/buget/provocari/$moduleSlug/$challengeSlug/$stepSlug',
)({
  component: ChallengeStepPlayerRoute,
})

function ChallengeStepPlayerRoute() {
  const { cui, moduleSlug, challengeSlug, stepSlug } = Route.useParams()
  const search = Route.useSearch()
  const loaderData = Route.useLoaderData()
  const navigate = useNavigate({
    from: '/primarie/$cui/buget/provocari/$moduleSlug/$challengeSlug/$stepSlug',
  })
  const locale = resolveCampaignLocale(search)
  const resolvedRouteSearch = resolveChallengeStepRouteSearch({
    search: {
      section: search.section,
      view: search.view,
    },
    loaderData,
  })

  return (
    <ChallengeStepPlayer
      entityCui={cui}
      locale={locale}
      moduleSlug={moduleSlug}
      challengeSlug={challengeSlug}
      stepSlug={stepSlug}
      activeSectionId={resolvedRouteSearch.section}
      activeViewMode={resolvedRouteSearch.view}
      onSectionChange={(sectionId, options) =>
        void navigate({
          search: (previousSearch) => ({
            ...previousSearch,
            section: sectionId,
          }),
          replace: options?.replace ?? false,
          resetScroll: false,
        })
      }
      onViewModeChange={(viewMode, options) =>
        void navigate({
          search: (previousSearch) => ({
            ...previousSearch,
            view: viewMode,
          }),
          replace: options?.replace ?? false,
          resetScroll: false,
        })
      }
    />
  )
}
