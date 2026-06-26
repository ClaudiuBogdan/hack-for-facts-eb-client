import { t } from '@lingui/core/macro'
import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { fetchPublicEnterpriseProfile } from '@/features/public-enterprises/api/public-enterprise-api'
import {
  isNonCanonicalPublicEnterpriseCuiParam,
  normalizePublicEnterpriseCui,
} from '@/features/public-enterprises/lib/normalize-public-enterprise-cui'
import {
  parsePublicEnterpriseProfileSearch,
  type PublicEnterpriseProfile,
} from '@/schemas/public-enterprise'

export type PublicEnterpriseRouteLoaderData = {
  readonly profile: PublicEnterpriseProfile
  readonly cui: string
}

export const Route = createFileRoute('/intreprinderi-publice/$cui')({
  validateSearch: parsePublicEnterpriseProfileSearch,
  beforeLoad: ({ params, search }) => {
    const normalized = normalizePublicEnterpriseCui(params.cui)
    if (!normalized || !isNonCanonicalPublicEnterpriseCuiParam(params.cui)) {
      return
    }

    throw redirect({
      to: '/intreprinderi-publice/$cui',
      params: { cui: normalized },
      search,
      replace: true,
    })
  },
  loader: async ({ params }) => {
    const cui = normalizePublicEnterpriseCui(params.cui)
    if (!cui) {
      throw notFound()
    }
    const profile = await fetchPublicEnterpriseProfile(cui)
    if (!profile) {
      throw notFound()
    }
    return { profile, cui } satisfies PublicEnterpriseRouteLoaderData
  },
  head: ({ loaderData }) => {
    const data = loaderData as PublicEnterpriseRouteLoaderData | undefined
    if (!data?.profile) {
      return { meta: [{ title: t`Întreprindere publică negăsită` }] }
    }
    return {
      meta: [
        {
          title: `${data.profile.identity.legalName} (CUI ${data.profile.identity.cui}) — Întreprindere publică`,
        },
        {
          name: 'description',
          content: t`Profil AMEPIP pentru întreprindere publică: identitate, indicatori KPI pe ani și proveniență verificabilă.`,
        },
      ],
    }
  },
})
