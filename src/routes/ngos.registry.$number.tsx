import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { registryNumberFromPath, registryNumberToPath } from '@/features/ngos/lib/ngo-address'
import { fetchNgoRegistryProfile } from '@/features/ngos/organization/api'
import { buildNgoProfileHead } from '@/features/ngos/organization/head'
import { parseNgoProfileSearch } from '@/schemas/ngos'

/**
 * `/ngos/registry/$number` — the profile of an organisation by its registry
 * number (`1471-A-2012` for `1471/A/2012`, `docs/design/ngos/design.md`,
 * „Profiles without a CUI"): one address per organisation, so one the
 * platform admits a CUI for answers with a 301 to `/ngos/$cui`; one without
 * is drawn here and indexed. A number the registry gives to several
 * organisations lists them, unindexed, for the reader to choose; one the
 * current export does not hold is not found.
 */
export const Route = createFileRoute('/ngos/registry/$number')({
  validateSearch: parseNgoProfileSearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ params, deps, abortController }) => {
    const registryNumber = registryNumberFromPath(params.number)
    if (!registryNumber) throw notFound()
    const read = await fetchNgoRegistryProfile(registryNumber, { signal: abortController.signal })
    if (!read) throw notFound()
    if (read.status === 'resolved' && read.organization.cui) {
      throw redirect({ to: '/ngos/$cui', params: { cui: read.organization.cui }, search: deps.search, replace: true, statusCode: 301 })
    }
    // One address per organisation: `3117%2FA%2F2026` or a padded number answers with the registry's own writing.
    const canonical = read.status === 'resolved' ? registryNumberToPath(read.organization.registryNumber) : null
    if (canonical !== null && canonical !== params.number) {
      throw redirect({ to: '/ngos/registry/$number', params: { number: canonical }, search: deps.search, replace: true, statusCode: 301 })
    }
    return { registryNumber, read }
  },
  head: ({ loaderData, match }) => {
    if (!loaderData) return {}
    if (loaderData.read.status === 'resolved') return buildNgoProfileHead({ organization: loaderData.read.organization, statements: [] }, match.context.locale)
    // A choice between organisations is no page of its own for a search engine.
    return { meta: [{ title: `${loaderData.registryNumber} — Transparenta.eu` }, { name: 'robots', content: 'noindex,follow' }] }
  },
})
