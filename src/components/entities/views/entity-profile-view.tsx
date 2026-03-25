import type { EntityDetailsData } from '@/lib/api/entities'
import { getUserLocale } from '@/lib/utils'
import { useEntityProfile } from '@/lib/hooks/useEntityDetails'
import { EntityProfilePresentation } from './entity-profile-view.presentation'

type EntityProfileViewProps = {
  readonly entity: EntityDetailsData | null | undefined
}

export function EntityProfileView({ entity }: EntityProfileViewProps) {
  const profileQuery = useEntityProfile(entity?.cui)
  const locale = getUserLocale()

  return (
    <EntityProfilePresentation
      profile={profileQuery.data ?? null}
      isLoading={profileQuery.isLoading}
      error={profileQuery.error}
      locale={locale}
    />
  )
}
