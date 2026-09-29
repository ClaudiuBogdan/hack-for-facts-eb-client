import { msg, plural } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { serializeForInlineScript } from '@/lib/inline-script-json'
import type { NgoFinanceSummary } from './finance-summary-types'
import { registrationsIn } from './registry-figures'
import type { NgoRegistrySummary } from './registry-summary-types'

const HUB_PATH = '/ong-uri'
const SHARE_IMAGE_PATH = '/assets/images/share-image.png'

/** The few figures the head quotes: small enough for the route's loader to hand over. */
export type NgoHubSeoFigures = {
  readonly registered: number
  readonly added: number
  /** The registry's year of new entries. */
  readonly year: number
  /** Total revenue of the latest year's statements, lei, and that year. */
  readonly revenue: number
  readonly financeYear: number
  readonly capturedAt: string
  readonly firstYear: number
  readonly registryUrl: string
  readonly financeUrl: string
}

export function ngoHubSeoFigures(summary: NgoRegistrySummary, finance: NgoFinanceSummary): NgoHubSeoFigures {
  return {
    registered: summary.status.registered,
    added: registrationsIn(summary, summary.year),
    year: summary.year,
    revenue: finance.revenue,
    financeYear: finance.year,
    capturedAt: summary.capturedAt,
    firstYear: summary.registrations[0]?.year ?? summary.year,
    registryUrl: summary.sourceUrl,
    financeUrl: finance.source.dataset,
  }
}

/**
 * `/ong-uri`'s head: title, description, canonical and its language
 * alternates, social cards, and a schema.org `Dataset` naming both sources.
 * The description quotes the page's own figures, so a refresh of either
 * summary updates it too.
 *
 * Built in the request's language (`locale`), not the shared Lingui
 * instance's, which may hold another request's by the time a head runs. The
 * page renders in the reader's language at one path, so each language gets
 * its own canonical (`?lang=en` for English) and names the other, as the
 * companies hub does.
 */
export function buildNgoHubHead(figures: NgoHubSeoFigures, locale: string, siteUrl: string = getSiteUrl()) {
  const english = locale === 'en'
  const translator = translatorFor(english ? 'en' : 'ro')
  const numbers = new Intl.NumberFormat(english ? 'en-GB' : 'ro-RO')
  const romanianUrl = `${siteUrl}${HUB_PATH}`
  const englishUrl = `${siteUrl}${HUB_PATH}?lang=en`
  const canonical = english ? englishUrl : romanianUrl
  const image = `${siteUrl}${SHARE_IMAGE_PATH}`
  const name = translator._(msg`ONG-urile din România`)
  const title = `${name} — Transparenta.eu`
  const added = numbers.format(figures.added)
  const revenue = new Intl.NumberFormat(english ? 'en-GB' : 'ro-RO', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(figures.revenue / 1e9)
  const year = figures.year
  const financeYear = figures.financeYear
  const registered = figures.registered
  const description = translator._(
    msg`${plural(registered, {
      one: `Un ONG înregistrat și ${added} noi în ${year}; ${revenue} mld. lei venituri ale sectorului non-profit în ${financeYear}. Cele mai mari ONG-uri, domeniile, banii sectorului și județele.`,
      few: `# ONG-uri înregistrate și ${added} noi în ${year}; ${revenue} mld. lei venituri ale sectorului non-profit în ${financeYear}. Cele mai mari ONG-uri, domeniile, banii sectorului și județele.`,
      other: `# de ONG-uri înregistrate și ${added} noi în ${year}; ${revenue} mld. lei venituri ale sectorului non-profit în ${financeYear}. Cele mai mari ONG-uri, domeniile, banii sectorului și județele.`,
    })}`,
  )

  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url: canonical,
    isBasedOn: [figures.registryUrl, figures.financeUrl, 'https://insse.ro'],
    dateModified: figures.capturedAt,
    temporalCoverage: `${figures.firstYear}/${financeYear}`,
    spatialCoverage: { '@type': 'Country', name: 'România' },
    variableMeasured: [
      translator._(msg`ONG-uri înregistrate`),
      translator._(msg`ONG-uri noi în registru, pe an`),
      translator._(msg`ONG-uri la 10.000 de locuitori`),
      translator._(msg`Veniturile sectorului non-profit`),
    ],
    creator: { '@type': 'Organization', name: 'Transparenta.eu', url: siteUrl },
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
      { property: 'og:image:alt', content: title },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      { name: 'twitter:image:alt', content: title },
    ],
    links: [
      { rel: 'canonical', href: canonical },
      { rel: 'alternate', hrefLang: 'ro', href: romanianUrl },
      { rel: 'alternate', hrefLang: 'en', href: englishUrl },
      { rel: 'alternate', hrefLang: 'x-default', href: romanianUrl },
    ],
    scripts: [{ type: 'application/ld+json', children: serializeForInlineScript(dataset) }],
  }
}
