import { createFileRoute, redirect } from '@tanstack/react-router'
import {
  LEGACY_FRONT_DOOR_REDIRECT,
  legacyPublicEnterpriseSearch,
} from '@/features/public-enterprises/lib/legacy-redirect'

/** The retired public-enterprise front door: its address is now `/public-enterprises` (see `legacy-redirect`). */
export const Route = createFileRoute('/intreprinderi-publice/')({
  beforeLoad: ({ search }) => {
    throw redirect({
      to: '/public-enterprises',
      search: legacyPublicEnterpriseSearch(search as Record<string, unknown>) as never,
      replace: true,
      ...LEGACY_FRONT_DOOR_REDIRECT,
    })
  },
})
