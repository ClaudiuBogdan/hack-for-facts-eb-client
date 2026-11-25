import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { createNoStoreHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import type { ProcurementContractAwardInitialData } from '@/features/procurement/components/contract-award/procurement-contract-award-page'
import type { ContractAwardRead } from '@/features/procurement/api/procurement-contract-award-api'
import { DA_ROUTE_CACHE } from '@/features/procurement/lib/disclosure-cache'
import { procurementContractAwardKeys } from '@/features/procurement/lib/contract-award-keys'
import { authorityNameOf } from '@/features/procurement/lib/contract-award-model'
import { buildContractAwardDocumentTitle } from '@/features/procurement/lib/procurement-page-titles'

/**
 * One contract award served from procurement v3 (PROC-KB0Z step 1). Read on
 * the server and seeded into the page's query; on a client-side navigation
 * the loader starts the read and returns at once.
 *
 * - An earlier build's id the API resolves: a 302 to the current id on the
 *   server (the id can move again with a later build), a replaced URL in the
 *   browser.
 * - No such award: a 404.
 * - An award from before 2021: the page says it is not published yet.
 * - The API's switch off: the page says it is not available now.
 *
 * Every render is no-store: the API marks every contract-award answer so.
 */
// The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
const NO_STORE = { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }

export const Route = createFileRoute('/procurement/contract-awards/$id')({
  ssr: true,
  // Its winners' codes are kept by no router cache once the page is left.
  ...DA_ROUTE_CACHE,
  loader: async ({ params }): Promise<ProcurementContractAwardInitialData> => {
    // In the browser nothing is read ahead (a hover preloads the route): an award read before its page shows it would be
    // kept unshown, and a winner withdrawn meanwhile could still be shown. The page reads it when it mounts.
    if (!shouldBlockLoaderForSsr()) return { id: params.id }
    const { readContractAwardForSsr } = await import('@/features/procurement/api/procurement-contract-award-ssr')
    // Read under the direct acquisitions' publication, which a winner's naming follows: a tab that has seen a newer one
    // since does not seed from this render (`isSeedCurrent`), and reads the award afresh.
    const { seededUnder } = await import('@/features/procurement/api/procurement-da-release-status')
    const read = await seededUnder(() => readContractAwardForSsr(params.id))
    if (read.read?.kind === 'missing') throw notFound()
    if (read.read?.kind === 'found' && read.read.award.recordId !== params.id) {
      // The redirect leaves before the route's headers apply: it carries its own no-store (the id can move with a later build).
      throw redirect({ to: '/procurement/contract-awards/$id', params: { id: read.read.award.recordId }, replace: true, statusCode: 302, headers: NO_STORE })
    }
    return read
  },
  headers: () => NO_STORE,
  head: ({ params, loaderData, match }) => {
    const translator = translatorFor(match.context.locale)
    const canonical = `${getSiteUrl()}/procurement/contract-awards/${encodeURIComponent(params.id)}`
    const read = loaderData?.read ?? match.context.queryClient.getQueryData<ContractAwardRead>(procurementContractAwardKeys.award(params.id))
    const award = read?.kind === 'found' ? read.award : null
    const authority = authorityNameOf(award)
    const title = buildContractAwardDocumentTitle(translator, { title: award?.title, authorityName: authority })
    const description = award?.title
      ? authority
        ? translator._(msg`${award.title}: contractul atribuit de ${authority}, din SEAP — cui, cu cât și când.`)
        : translator._(msg`${award.title}: un contract atribuit, din SEAP — cui, cu cât și când.`)
      : translator._(msg`Un contract de achiziție publică atribuit, din SEAP: ce s-a atribuit, cui, cu cât și când.`)
    return {
      meta: [
        { title },
        // An award not shown (not published yet, not available now, a failed read) is no page for a search engine.
        ...(award ? [] : [{ name: 'robots', content: 'noindex' }]),
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonical },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
      ],
      links: [{ rel: 'canonical', href: canonical }],
    }
  },
})
