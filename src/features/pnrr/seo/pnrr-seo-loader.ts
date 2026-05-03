import { createIsomorphicFn } from '@tanstack/react-start'
import type { Currency } from '@/schemas/charts'
import type { PnrrSearchState } from '@/schemas/pnrr'
import {
  DEFAULT_CURRENCY,
  readClientCurrencyPreference,
  readUserCurrencyPreference,
} from '@/lib/user-preferences'
import type { PnrrSeoSnapshot } from './pnrr-seo'

export type PnrrSeoLoaderData = {
  readonly initialCurrency: Currency
  readonly seoSnapshot: PnrrSeoSnapshot | null
  readonly seoSnapshotSearchKey: string
  readonly requestSiteUrl?: string
}

export type PnrrSeoLoaderInput = {
  readonly search: Partial<PnrrSearchState>
  readonly searchKey: string
}

export const loadPnrrSeoData = createIsomorphicFn()
  .client(async (input: PnrrSeoLoaderInput): Promise<PnrrSeoLoaderData> => {
    return {
      initialCurrency: readClientCurrencyPreference() ?? DEFAULT_CURRENCY,
      seoSnapshot: null,
      seoSnapshotSearchKey: input.searchKey,
      requestSiteUrl: typeof window === 'undefined' ? undefined : window.location.origin,
    }
  })
  .server(
    async (input: PnrrSeoLoaderInput): Promise<PnrrSeoLoaderData> => {
      const { getRequestUrl } = await import('@tanstack/react-start/server')
      const { fetchPnrrRawProjects } = await import(
        '@/server/handlers/pnrr-data-proxy'
      )
      const { buildPnrrSeoSnapshotFromRawProjects } = await import('./pnrr-seo')
      const requestUrl = getRequestUrl()
      const result = await fetchPnrrRawProjects()
      const initialCurrency = await readUserCurrencyPreference()

      return {
        initialCurrency,
        seoSnapshot: buildPnrrSeoSnapshotFromRawProjects({
          rawProjects: result.data,
          search: input.search,
        }),
        seoSnapshotSearchKey: input.searchKey,
        requestSiteUrl: requestUrl.origin,
      }
    },
  )
