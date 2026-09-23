import { plural, t } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { getUserLocale } from '@/lib/utils'
import { formatHubNumber } from '../lib/hub-format'
import type { CompanyHubSnapshot } from '../lib/hub-snapshot-types'

const HUB_PATH = '/companies'
const SHARE_IMAGE_PATH = '/assets/images/share-image.png'

/** The few snapshot figures the head quotes: small enough for the route's loader to hand over. */
export type CompanyHubSeoFigures = {
  readonly activeFirms: number
  readonly newFirms: number
  readonly fiscalYear: number
  readonly capturedAt: string
}

export function companyHubSeoFigures(snapshot: CompanyHubSnapshot): CompanyHubSeoFigures {
  return {
    activeFirms: snapshot.national.activeFirms,
    newFirms: snapshot.national.newFirms,
    fiscalYear: snapshot.fiscalYear,
    capturedAt: snapshot.capturedAt,
  }
}

/** One sentence, its count agreeing in Romanian („de" before 20–99, not before 01–19). */
function describe(figures: CompanyHubSeoFigures): string {
  const founded = formatHubNumber(figures.newFirms)
  const year = figures.fiscalYear
  return plural(figures.activeFirms, {
    one: `O firmă în funcțiune, ${founded} înființate în ${year}, cele mai mari firme, domeniile și județele economiei. Caută orice firmă după nume sau CUI.`,
    few: `# firme în funcțiune, ${founded} înființate în ${year}, cele mai mari firme, domeniile și județele economiei. Caută orice firmă după nume sau CUI.`,
    other: `# de firme în funcțiune, ${founded} înființate în ${year}, cele mai mari firme, domeniile și județele economiei. Caută orice firmă după nume sau CUI.`,
  })
}

/**
 * The hub's head: title, description, canonical and its language
 * alternates, social cards and a schema.org `Dataset`, all in the page's
 * language and from the snapshot the page draws, so a search result never
 * quotes a figure the page does not show.
 *
 * The page renders in the reader's language at one path, so each language
 * gets its own canonical (`?lang=en` for English) and names the other, as the
 * campaign pages do; a shared English link then previews in English.
 */
export function buildCompanyHubHead(figures: CompanyHubSeoFigures | undefined, siteUrl: string = getSiteUrl()) {
  const english = getUserLocale() === 'en'
  const romanianUrl = `${siteUrl}${HUB_PATH}`
  const englishUrl = `${siteUrl}${HUB_PATH}?lang=en`
  const canonical = english ? englishUrl : romanianUrl
  const title = `${t`Firmele din România`} — Transparenta.eu`
  const description = figures ? describe(figures) : t`Cele mai mari firme, domeniile și județele economiei. Caută orice firmă după nume sau CUI.`
  const image = `${siteUrl}${SHARE_IMAGE_PATH}`

  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: figures ? t`Firmele din România, ${figures.fiscalYear}` : t`Firmele din România`,
    description,
    url: canonical,
    ...(figures ? { temporalCoverage: String(figures.fiscalYear), dateModified: figures.capturedAt } : {}),
    spatialCoverage: { '@type': 'Place', name: 'Romania' },
    isBasedOn: ['https://www.onrc.ro', 'https://www.anaf.ro', 'https://insse.ro'],
    variableMeasured: [t`firme în funcțiune`, t`firme înființate`, t`cifra de afaceri`, t`număr mediu de salariați`],
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
      { type: 'application/ld+json', children: JSON.stringify(dataset) },
      { type: 'application/ld+json', children: JSON.stringify(webPage) },
    ],
  }
}
