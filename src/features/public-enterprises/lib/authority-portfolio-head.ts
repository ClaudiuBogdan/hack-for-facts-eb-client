import { msg } from '@lingui/core/macro'

import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { serializeForInlineScript } from '@/lib/inline-script-json'

/**
 * `/public-enterprises/authorities/$cui`'s addresses and head, light enough
 * for the route's eager file: the head reads only the few facts the loader
 * works out (`authority-portfolio-seo.ts`), never the page's model.
 */

const SHARE_IMAGE_PATH = '/assets/images/share-image.png'

export function authorityPortfolioPath(cui: string): string {
  return `/public-enterprises/authorities/${cui}`
}

/** What the head says of the authority. */
export type AuthorityPortfolioSeo = {
  readonly cui: string
  /** As ANAF's list spells it, else the announcements, else its budget record; null when no source names it (not indexed). */
  readonly name: string | null
  /** The enterprises ANAF's list puts under it. */
  readonly listed: number
  /** The enterprises only AMEPIP's selection announcements name it for. */
  readonly announcedOnly: number
  /** The figures' year. */
  readonly year: number
}

/** The title while nothing is read: the CUI alone. */
export function neutralAuthorityTitle(cui: string): string {
  return `CUI ${cui} — Transparenta.eu`
}

/**
 * Title, description, canonical and its language alternates, social cards,
 * and a schema.org `Organization` with its tax id. Built in the request's
 * language, not the shared Lingui instance's, which may hold another
 * request's by the time a head runs.
 */
export function buildAuthorityPortfolioHead(seo: AuthorityPortfolioSeo, locale: string, siteUrl: string = getSiteUrl()) {
  const english = locale === 'en'
  const translator = translatorFor(english ? 'en' : 'ro')
  const romanianUrl = `${siteUrl}${authorityPortfolioPath(seo.cui)}`
  const englishUrl = `${romanianUrl}?lang=en`
  const canonical = english ? englishUrl : romanianUrl
  const image = `${siteUrl}${SHARE_IMAGE_PATH}`
  const { cui, listed, announcedOnly, year } = seo
  const name = seo.name ?? translator._(msg`Autoritatea cu CUI ${cui}`)
  const title = `${translator._(msg`${name}: întreprinderile publice`)} — Transparenta.eu`
  const description =
    listed > 0
      ? translator._(msg`Întreprinderile publice pe care lista ANAF le pune sub ${name} (${listed}), cu starea fiecăreia după fiecare sursă și cifrele din ${year}.`)
      : translator._(msg`Întreprinderile publice pentru care anunțurile de selecție AMEPIP numesc autoritatea ${name} (${announcedOnly}), cu starea fiecăreia după fiecare sursă și cifrele din ${year}.`)
  // A tax id is a fact; a name no source gave is not: the CUI is never put forward as one.
  const organization = { '@context': 'https://schema.org', '@type': 'Organization', ...(seo.name ? { name: seo.name } : {}), taxID: seo.cui, url: canonical }
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: seo.name !== null ? 'index,follow' : 'noindex,follow' },
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
    scripts: [{ type: 'application/ld+json', children: serializeForInlineScript(organization) }],
  }
}
