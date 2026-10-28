/**
 * A page's own title, description and canonical URL, for its route `head`.
 *
 * TanStack reads `head` only from the route file (`createFileRoute`), never
 * from a `.lazy.tsx` one, so a page whose head sat in its lazy file was served
 * as "Transparenta.eu". The root route sets generic `og:*` and `twitter:*`
 * tags for the whole site, and a deeper route keeps them unless it sets the
 * same name, so the page names itself in all three.
 */
export function buildPageHead({ title, description, canonical }: { readonly title: string; readonly description: string; readonly canonical: string }) {
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
    ],
    links: [{ rel: 'canonical', href: canonical }],
  }
}
