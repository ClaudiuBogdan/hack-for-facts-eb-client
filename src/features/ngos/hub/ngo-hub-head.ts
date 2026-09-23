import { t } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { formatNgoNumber } from './ngo-format'
import { nationalDensity, registrationsIn } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

/**
 * `/ong-uri`'s head: title, description, canonical, Open Graph and Twitter
 * cards, and a schema.org `Dataset` naming the registry it is built from.
 * The description carries the page's own figures, read from the summary,
 * so a refresh of the registry updates it too.
 */
export function buildNgoHubHead(summary: NgoRegistrySummary) {
  const site = getSiteUrl()
  const canonical = `${site}/ong-uri`
  const image = `${site}/assets/images/share-image.png`
  const title = `${t`ONG-urile din România`} — Transparenta.eu`
  const registered = formatNgoNumber(summary.status.registered)
  const added = formatNgoNumber(registrationsIn(summary, summary.year))
  const density = formatNgoNumber(nationalDensity(summary), 1)
  const year = summary.year
  const description = t`${registered} de ONG-uri înregistrate în Registrul național, ${added} noi în ${year} și ${density} la 10.000 de locuitori: asociațiile, fundațiile și federațiile din fiecare județ.`
  const firstYear = summary.registrations[0]?.year ?? year

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: 'index,follow' },
      { property: 'og:type', content: 'website' },
      { property: 'og:site_name', content: 'Transparenta.eu' },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonical },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'og:image:alt', content: title },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: title },
    ],
    links: [{ rel: 'canonical', href: canonical }],
    scripts: [
      {
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Dataset',
          name: t`ONG-urile din România`,
          description,
          url: canonical,
          isBasedOn: summary.sourceUrl,
          dateModified: summary.capturedAt,
          temporalCoverage: `${firstYear}/${year}`,
          spatialCoverage: { '@type': 'Country', name: 'România' },
          variableMeasured: [t`ONG-uri înregistrate`, t`ONG-uri noi în registru, pe an`, t`ONG-uri la 10.000 de locuitori`],
          creator: { '@type': 'Organization', name: 'Transparenta.eu', url: site },
        }),
      },
    ],
  }
}
