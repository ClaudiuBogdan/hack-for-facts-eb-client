import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  LEGACY_PUBLIC_ENTERPRISE_REDIRECT,
  legacyPublicEnterpriseSearch,
} from '@/features/public-enterprises/lib/legacy-redirect'

/** The retired public-enterprise front door: the companies hub, for now (see `legacy-redirect`). */
export const Route = createFileRoute('/intreprinderi-publice/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/companies',
      search: legacyPublicEnterpriseSearch(search as Record<string, unknown>) as never,
      replace: true,
      ...LEGACY_PUBLIC_ENTERPRISE_REDIRECT,
    })
  },
})
