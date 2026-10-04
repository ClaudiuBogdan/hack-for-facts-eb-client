import { t } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { getUserLocale } from '@/lib/utils'
import { serializeForInlineScript } from '@/lib/inline-script-json'

const HUB_PATH = '/companies'
const SHARE_IMAGE_PATH = '/assets/images/share-image.png'

/**
 * The hub's head: title, description, canonical and its language
 * alternates, social cards and a schema.org `Dataset`, all in the page's
 * language. It quotes no figure: the hub's figures are bound to the ONRC
 * edition the browser pins, and a search result or a cached head must never
 * carry a count the page cannot vouch for (the former snapshot counts —
 * companies in business, new companies, turnover, employees — are retired).
 *
 * The page renders in the reader's language at one path, so each language
 * gets its own canonical (`?lang=en` for English) and names the other, as the
 * campaign pages do; a shared English link then previews in English.
 */
export function buildCompanyHubHead(siteUrl: string = getSiteUrl()) {
  const english = getUserLocale() === 'en'
  const romanianUrl = `${siteUrl}${HUB_PATH}`
  const englishUrl = `${siteUrl}${HUB_PATH}?lang=en`
  const canonical = english ? englishUrl : romanianUrl
  const title = `${t`Firmele din România`} — Transparenta.eu`
  const description = t`Caută orice firmă din România după nume sau CUI: starea, județul și activitățile din ediția publicată a registrului comerțului (ONRC), datele fiscale ANAF și bilanțurile depuse, fiecare cu sursa și data ei.`
  const image = `${siteUrl}${SHARE_IMAGE_PATH}`

  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: t`Firmele din România`,
    description,
    url: canonical,
    spatialCoverage: { '@type': 'Place', name: 'Romania' },
    isBasedOn: ['https://www.onrc.ro', 'https://www.anaf.ro'],
    variableMeasured: [t`stare în registrul comerțului`, t`județ`, t`activitate CAEN`],
    publisher: { '@type': 'Organization', '@id': `${siteUrl}#organization`, name: 'Transparenta.eu', url: siteUrl },
  }
  const webPage = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: title,
    description,
    url: canonical,
    inLanguage: english ? 'en' : 'ro',
    isPartOf: { '@type': 'WebSite', name: 'Transparenta.eu', url: siteUrl },
    about: dataset,
  }

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
      { property: 'og:locale', content: english ? 'en_US' : 'ro_RO' },
      { property: 'og:image', content: image },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ro', href: romanianUrl },
      { rel: 'alternate', hrefLang: 'en', href: englishUrl },
      { rel: 'alternate', hrefLang: 'x-default', href: romanianUrl },
    ],
    scripts: [
      { type: 'application/ld+json', children: serializeForInlineScript(dataset) },
      { type: 'application/ld+json', children: serializeForInlineScript(webPage) },
    ],
  }
}
