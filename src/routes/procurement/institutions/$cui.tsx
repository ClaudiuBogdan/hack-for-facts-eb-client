import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'
import {
  fetchProcurementAuthoritySlice,
  fetchProcurementInstitutionOverview,
} from '@/features/procurement/api/procurement-api'
import { buildInstitutionScopes } from '@/features/procurement/lib/institution-scopes'

const cuiSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d{1,12}$/, 'CUI invalid')

/**
 * Quick-filter state — the page's own basic filters (year, CPV division),
 * kept in the URL so a filtered profile is shareable. Invalid values drop
 * individually rather than failing the route.
 */
const institutionSearchSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional().catch(undefined),
  cpv: z
    .string()
    .trim()
    .regex(/^\d{2}$/)
    .optional()
    .catch(undefined),
  month: z
    .string()
    .trim()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/procurement/institutions/$cui')({
  ssr: true,
  params: {
    parse: (params) => {
      const parsed = cuiSchema.safeParse(params.cui)
      if (!parsed.success) {
        throw notFound()
      }
      return { cui: parsed.data }
    },
  },
  validateSearch: (search: Record<string, unknown>) =>
    institutionSearchSchema.parse(search),
  loaderDeps: ({ search }) => ({
    year: search.year,
    cpv: search.cpv,
    month: search.month,
  }),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  // Both payloads are prefetched so the profile's spine is server-rendered:
  // the populations row and the signals are the page's content, and leaving
  // them to a client-only query would ship a skeleton to crawlers. The slice
  // prefetch stays UNFILTERED — it feeds the title and the quick-filter chip
  // options; the filtered slice loads client-side when filters are active.
  loader: async ({ params, deps }) => {
    const scope = {
      // A picked month wins over its year — it is the narrower selection.
      ...(deps.month
        ? { monthFrom: deps.month, monthTo: deps.month }
        : deps.year
          ? { monthFrom: `${deps.year}-01`, monthTo: `${deps.year}-12` }
          : {}),
      ...(deps.cpv ? { cpvDivision: deps.cpv } : {}),
    }
    const [slice, overview] = await Promise.all([
      fetchProcurementAuthoritySlice(params.cui),
      fetchProcurementInstitutionOverview({
        authorityCui: params.cui,
        scopes: buildInstitutionScopes(scope),
      }),
    ])
    return { slice, overview }
  },
  head: buildInstitutionHead,
})

function buildInstitutionHead({
  params,
  loaderData,
}: {
  readonly params: { readonly cui: string }
  readonly loaderData?: { readonly overview?: { readonly authorityName: string | null } }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/institutions/${params.cui}`
  // The loader already resolved the buyer's name — a CUI-only title is a
  // useless search result.
  const name = loaderData?.overview?.authorityName?.trim()
  const title = `${name || `Instituție CUI ${params.cui}`} — Achiziții publice — Transparenta.eu`
  return {
    meta: [
      { title },
      {
        name: 'description',
        content:
          'Profil de achiziții al instituției publice — furnizori, categorii CPV, contracte recente.',
      },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
