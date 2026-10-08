import { createLazyFileRoute } from '@tanstack/react-router'
import type { AuthorityPortfolioRouteLoaderData } from './$cui'
import { AuthorityPortfolioPage } from '@/features/public-enterprises/components/authority/authority-portfolio-page'
import { AuthorityPortfolioLoadError } from '@/features/public-enterprises/components/authority/authority-states'
import { PUBLIC_ENTERPRISE_PORTFOLIO_DEFAULTS, resolvePublicEnterprisePortfolioSearch, type PublicEnterprisePortfolioSearch } from '@/schemas/public-enterprises'

export const Route = createLazyFileRoute('/public-enterprises/authorities/$cui')({
  component: AuthorityPortfolioRoutePage,
  errorComponent: AuthorityPortfolioRouteError,
})

/**
 * A client-side read that failed: said, with a retry that loads the page as a
 * document. The server renders it whole from its own snapshot, so a read that
 * failed on a version another deploy holds is not asked again.
 */
function AuthorityPortfolioRouteError() {
  return <AuthorityPortfolioLoadError onRetry={() => window.location.reload()} />
}

function AuthorityPortfolioRoutePage() {
  const { portfolio } = Route.useLoaderData() as AuthorityPortfolioRouteLoaderData
  const search = resolvePublicEnterprisePortfolioSearch(Route.useSearch() as PublicEnterprisePortfolioSearch)
  const navigate = Route.useNavigate()
  // A choice is written to the address, its default left out; the page is not read again (the loader ignores the search).
  const onSearch = (patch: Partial<Required<PublicEnterprisePortfolioSearch>>) => {
    void navigate({
      search: (previous: Record<string, unknown>) => {
        const next: Record<string, unknown> = { ...previous }
        for (const [key, value] of Object.entries(patch)) next[key] = value === PUBLIC_ENTERPRISE_PORTFOLIO_DEFAULTS[key as keyof PublicEnterprisePortfolioSearch] ? undefined : value
        return next
      },
      replace: true,
      resetScroll: false,
    })
  }
  // Keyed by the authority: moving to another's portfolio starts afresh (open lists, the figures' count-up).
  return <AuthorityPortfolioPage key={portfolio.authority.cui} portfolio={portfolio} search={search} onSearch={onSearch} />
}
