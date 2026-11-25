import { useCallback, useMemo } from 'react'
import { createLazyFileRoute, getRouteApi } from '@tanstack/react-router'
import { PublicInstitutionsPage } from '@/features/public-institutions/components/public-institutions-page'
import { EntityAnalyticsAddressContext, type EntityAnalyticsAddress } from '@/hooks/useEntityAnalyticsFilter'

export const Route = createLazyFileRoute('/public-institutions')({
  component: PublicInstitutionsRoutePage,
})

const route = getRouteApi('/public-institutions')

type SearchRecord = Record<string, unknown>

/** The page on its own address: the old page's filter hook and panel read and write this route's search. */
function PublicInstitutionsRoutePage() {
  const search = route.useSearch() as SearchRecord
  const navigate = route.useNavigate()
  const { publicInstitutionsPreferences } = route.useRouteContext()
  const change = useCallback(
    (update: (prev: SearchRecord) => SearchRecord) => {
      void navigate({ search: ((prev: SearchRecord) => update(prev)) as never, replace: true, resetScroll: false })
    },
    [navigate],
  )
  const address = useMemo<EntityAnalyticsAddress>(() => ({ search, change }), [search, change])
  return (
    <EntityAnalyticsAddressContext value={address}>
      <PublicInstitutionsPage preferences={publicInstitutionsPreferences} />
    </EntityAnalyticsAddressContext>
  )
}
