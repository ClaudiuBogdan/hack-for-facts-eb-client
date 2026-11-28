import { createNoStoreHeaders } from '@/lib/http-cache'

/**
 * The elections pages' document head and cache headers, one shape for the
 * three routes.
 *
 * The root route sets generic `og:*` and `twitter:*` tags for the whole
 * site, and a deeper route keeps them unless it sets the same name, so each
 * page names itself in all three.
 */
export function electionsPageHead({
  title,
  description,
  canonical,
  indexed = true,
}: {
  readonly title: string
  readonly description: string
  readonly canonical: string
  /** False for a reader's own question (an analysis page with a key set): kept out of the index, with no canonical. */
  readonly indexed?: boolean
}) {
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      ...(indexed ? [] : [{ name: 'robots', content: 'noindex, follow' }]),
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      ...(indexed ? [{ property: 'og:url', content: canonical }] : []),
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: indexed ? [{ rel: 'canonical', href: canonical }] : [],
  }
}

/**
 * Every elections render is served once and never kept: the catalog is a
 * first metadata release, read fresh on each request. The layout's cache
 * headers merge key by key, so the CDN directive is set here too, or the
 * layout's own would outlive this one.
 */
export function electionsNoStoreHeaders(): Record<string, string> {
  return { ...createNoStoreHeaders(), 'CDN-Cache-Control': 'no-store' }
}
