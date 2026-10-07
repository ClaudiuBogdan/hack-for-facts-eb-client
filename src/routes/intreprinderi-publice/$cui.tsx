import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  LEGACY_PROFILE_REDIRECT,
  legacyProfileCui,
  legacyPublicEnterpriseSearch,
} from '@/features/public-enterprises/lib/legacy-redirect'

/** The retired public-enterprise profile: the enterprise page, for good (see `legacy-redirect`). */
export const Route = createFileRoute('/intreprinderi-publice/$cui')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/public-enterprises/$cui',
      params: { cui: legacyProfileCui(params.cui) },
      search: legacyPublicEnterpriseSearch(search as Record<string, unknown>) as never,
      replace: true,
      ...LEGACY_PROFILE_REDIRECT,
    })
  },
})
