import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  LEGACY_PUBLIC_ENTERPRISE_REDIRECT,
  legacyProfileCui,
  legacyPublicEnterpriseSearch,
} from '@/features/public-enterprises/lib/legacy-redirect'

/**
 * The retired public-enterprise profile: the enterprise's company page, for
 * now (see `legacy-redirect`). Global search still links here.
 */
export const Route = createFileRoute('/intreprinderi-publice/$cui')({
  beforeLoad: ({ params, search }) => {
    throw redirect({
      to: '/companies/$cui',
      params: { cui: legacyProfileCui(params.cui) },
      search: legacyPublicEnterpriseSearch(search as Record<string, unknown>) as never,
      replace: true,
      ...LEGACY_PUBLIC_ENTERPRISE_REDIRECT,
    })
  },
})
