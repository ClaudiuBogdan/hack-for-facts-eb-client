/**
 * The meta tags an INS page names itself with — for the tab, a search
 * result and the card a shared link unfurls into alike.
 *
 * The root route sets generic English `og:*` and `twitter:*` tags for the
 * whole site, and the router keeps a parent's tag unless a deeper route
 * sets the same name or property. A page that overrode only `title` and
 * `description` therefore shared as „Transparenta.eu - Romania Public
 * Finance Data" in Slack, WhatsApp and Facebook, whatever it showed.
 */
export function insPageMeta({
  title,
  description,
}: {
  readonly title: string
  readonly description?: string
}) {
  return [
    { title },
    { property: 'og:title', content: title },
    { name: 'twitter:title', content: title },
    ...(description
      ? [
          { name: 'description', content: description },
          { property: 'og:description', content: description },
          { name: 'twitter:description', content: description },
        ]
      : []),
  ]
}
