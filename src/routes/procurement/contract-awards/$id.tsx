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
export const Route = createFileRoute('/procurement/contract-awards/$id')({
  ssr: true,
  // Its winners' codes are kept by no router cache once the page is left.
  ...DA_ROUTE_CACHE,
  loader: async ({ context, params }): Promise<ProcurementContractAwardInitialData> => {
    if (!shouldBlockLoaderForSsr()) {
      const hooks = await import('@/features/procurement/hooks/use-procurement-contract-award')
      void context.queryClient.prefetchQuery(hooks.contractAwardQueryOptions(params.id)).catch(() => undefined)
      return { id: params.id }
    }
    const { readContractAwardForSsr } = await import('@/features/procurement/api/procurement-contract-award-ssr')
    const read = await readContractAwardForSsr(params.id)
    if (read.read?.kind === 'missing') throw notFound()
    if (read.read?.kind === 'found' && read.read.award.recordId !== params.id) {
      throw redirect({ to: '/procurement/contract-awards/$id', params: { id: read.read.award.recordId }, replace: true, statusCode: 302 })
    }
    return read
  },
  // The layout's cache headers merge key by key: a CDN directive of its own would outlive this one.
  headers: () => ({ ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }),
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
