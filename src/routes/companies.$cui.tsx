import { createFileRoute, notFound } from '@tanstack/react-router'
import { fetchPrivateCompanyProfile } from '@/features/private-companies/api/private-company-api'
import { normalizeCompanyCui } from '@/features/private-companies/lib/normalize-company-cui'
import { buildPrivateCompanyRouteHead } from '@/features/private-companies/seo/private-company-seo'
import {
  parsePrivateCompanySearch,
  type PrivateCompanyProfile,
} from '@/schemas/private-company'

export type PrivateCompanyRouteLoaderData = {
  readonly profile: PrivateCompanyProfile
  readonly cui: string
}

export const Route = createFileRoute('/companies/$cui')({
  validateSearch: parsePrivateCompanySearch,
  loader: async ({ params }) => {
    const cui = normalizeCompanyCui(params.cui)
    if (!cui) {
      throw notFound()
    }
    const profile = await fetchPrivateCompanyProfile(cui)
    if (!profile) {
      throw notFound()
    }
    return { profile, cui } satisfies PrivateCompanyRouteLoaderData
  },
  head: ({ loaderData }) => {
    const data = loaderData as PrivateCompanyRouteLoaderData | undefined
    if (!data?.profile) {
      return { meta: [{ title: 'Company not found' }] }
    }
    return buildPrivateCompanyRouteHead(data.profile)
  },
})
