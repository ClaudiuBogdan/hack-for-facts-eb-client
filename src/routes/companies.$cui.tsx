import { createFileRoute, notFound } from '@tanstack/react-router'
import { fetchPrivateCompanyProfile } from '@/features/private-companies/api/private-company-api'
import { privateCompanyProfileQueryOptions } from '@/features/private-companies/hooks/use-private-company-profile'
import { normalizeCompanyCui } from '@/features/private-companies/lib/normalize-company-cui'
import { buildPrivateCompanyRouteHead } from '@/features/private-companies/seo/private-company-seo'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import {
  parsePrivateCompanySearch,
  type PrivateCompanyProfile,
} from '@/schemas/private-company'

export type PrivateCompanyRouteLoaderData = {
  /** Absent on a client-side navigation — the page's own query supplies it. */
  readonly profile?: PrivateCompanyProfile
  readonly cui: string
}

export const Route = createFileRoute('/companies/$cui')({
  validateSearch: parsePrivateCompanySearch,
  // Awaited on the SSR path only, so crawlers still get a full document with
  // the company's name in the head. In the browser the same await cost a dead
  // click of ~0.3–0.6s on the previous page; `PrivateCompanyRoutePage` already
  // renders `PrivateCompanyPageSkeleton` / `PrivateCompanyNotFound` off its own
  // query, so the client path returns immediately and lets it do the work.
  loader: async ({ context, params }) => {
    const cui = normalizeCompanyCui(params.cui)
    if (!cui) {
      throw notFound()
    }

    if (!shouldBlockLoaderForSsr()) {
      void context.queryClient.prefetchQuery(
        privateCompanyProfileQueryOptions(cui),
      )
      return { cui } satisfies PrivateCompanyRouteLoaderData
    }

    // Fetched directly, not through the query client — see the note on the
    // institution loader: seeding the server cache dehydrates the server's
    // `dataUpdatedAt`, which would make every CDN hit refetch on mount.
    const profile = await fetchPrivateCompanyProfile(cui)
    if (!profile) {
      throw notFound()
    }
    return { profile, cui } satisfies PrivateCompanyRouteLoaderData
  },
  head: ({ params, loaderData }) => {
    const data = loaderData as PrivateCompanyRouteLoaderData | undefined
    if (!data?.profile) {
      // Reached on a client-side navigation, where the profile has not been
      // fetched yet — a CUI placeholder, not "not found". The page corrects it
      // via `useClientDocumentTitle` once the query resolves. The SSR path
      // always has the profile, so crawlers never see this.
      return { meta: [{ title: `CUI ${data?.cui ?? params.cui}` }] }
    }
    return buildPrivateCompanyRouteHead(data.profile)
  },
})
