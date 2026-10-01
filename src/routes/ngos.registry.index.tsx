import { createFileRoute } from '@tanstack/react-router'
import { msg } from '@lingui/core/macro'
import { createNoStoreHeaders, createPublicPageCacheHeaders } from '@/lib/http-cache'
import { translatorFor } from '@/lib/i18n'
import { shouldBlockLoaderForSsr } from '@/lib/ssr/loader-blocking'
import { validateRegistrySearch } from '@/features/ngos/registry/api'
import type { RegistryServerRead } from '@/features/ngos/registry/registry-ssr'
import { RegistryUnavailable } from '@/features/ngos/registry/components/registry-unavailable'

/**
 * `/ngos/registry` (design.md §15): the national NGO registry asked as the
 * procurement analytics page asks its records, the question in the
 * address. The server reads the selection's first page and counts it from
 * the whole registry's counts (`registry-ssr.ts`, which keeps them on the
 * server) and seeds the page; on a client-side navigation the loader
 * returns at once and the page reads in the browser.
 */
export const Route = createFileRoute('/ngos/registry/')({
  ssr: true,
  validateSearch: validateRegistrySearch,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ deps, abortController }): Promise<RegistryServerRead | { readonly seed: null; readonly complete: true }> => {
    // `import.meta.env.SSR` lets the client's bundle drop the server read (and the counts it carries) altogether.
    if (!import.meta.env.SSR || !shouldBlockLoaderForSsr()) return { seed: null, complete: true }
    const { readRegistryForSsr } = await import('@/features/ngos/registry/registry-ssr')
    return readRegistryForSsr(deps.search, abortController.signal)
  },
  errorComponent: RegistryUnavailable,
  // A render without its first page is served once and read again, never cached for everyone. The document follows the locale and theme cookies.
  headers: ({ loaderData }) =>
    !loaderData?.complete
      ? { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
      : createPublicPageCacheHeaders({ sharedMaxAgeSeconds: 600, staleWhileRevalidateSeconds: 3600, vary: ['Accept-Encoding', 'Cookie'] }),
  // In the request's own language: the shared Lingui instance may hold another request's by the time a head that waited on its loader runs.
  head: ({ match }) => {
    const translator = translatorFor(match.context.locale)
    return {
      meta: [
        { title: `${translator._(msg`Registrul ONG`)} — Transparenta.eu` },
        {
          name: 'description',
          content: translator._(
            msg`Organizațiile din registrul național ONG al Ministerului Justiției: câte sunt, unde, de ce formă și în ce stare, și fiecare intrare.`,
          ),
        },
        { name: 'robots', content: 'noindex,follow' },
      ],
    }
  },
})
