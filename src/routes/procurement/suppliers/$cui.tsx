import { z } from 'zod'
import { createFileRoute, notFound } from '@tanstack/react-router'
import { getSiteUrl } from '@/config/env'
import { createPublicPageCacheHeaders } from '@/lib/http-cache'

const cuiSchema = z
  .string()
  .trim()
  .min(1)
  .regex(/^\d{1,12}$/, 'CUI invalid')

/**
 * Quick-filter state — the profile's own basic filters (year, CPV division),
 * kept in the URL so a filtered supplier view is shareable. Invalid values
 * drop individually rather than failing the route.
 */
const supplierSearchSchema = z.object({
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

export const Route = createFileRoute('/procurement/suppliers/$cui')({
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
    supplierSearchSchema.parse(search),
  headers: () =>
    createPublicPageCacheHeaders({
      sharedMaxAgeSeconds: 300,
      staleWhileRevalidateSeconds: 3600,
    }),
  head: buildSupplierHead,
})

function buildSupplierHead({
  params,
}: {
  readonly params: { readonly cui: string }
}) {
  const site = getSiteUrl()
  const canonical = `${site}/procurement/suppliers/${params.cui}`
  const title = `Furnizor CUI ${params.cui} — Achiziții publice — Transparenta.eu`
  return {
    meta: [
      { title },
      {
        name: 'description',
        content:
          'Profil de achiziții al furnizorului — instituții publice, categorii CPV, venituri din contracte.',
      },
      { property: 'og:title', content: title },
      { property: 'og:url', content: canonical },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
