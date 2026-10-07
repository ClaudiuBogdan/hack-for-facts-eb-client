import { msg } from '@lingui/core/macro'

import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { serializeForInlineScript } from '@/lib/inline-script-json'

/**
 * `/public-enterprises/$cui`'s head, light enough for the route's eager file:
 * it reads only the few facts the loader works out on the server
 * (`enterprise-seo.ts`), never the page's model.
 */

const SHARE_IMAGE_PATH = '/assets/images/share-image.png'

export function publicEnterprisePath(cui: string): string {
  return `/public-enterprises/${cui}`
}

/** What the head says of the enterprise: its name, the authority a list gives, whether a list still holds it. */
export type PublicEnterpriseSeo = {
  readonly cui: string
  /** Null when no source names it: the page says its CUI, and is not indexed. */
  readonly name: string | null
  /** The authorities ANAF's list names, else the announcements'; null when neither names one. */
  readonly authority: string | null
  readonly authoritySource: 's1001' | 'json_apt' | null
  /** No list holds it any more. */
  readonly historical: boolean
}

/** The title while nothing is read yet: the CUI alone. */
export function neutralEnterpriseTitle(cui: string): string {
  return `CUI ${cui} — Transparenta.eu`
}

/**
 * Title, description, canonical and its language alternates, social cards,
 * and a schema.org `Organization` with its tax id. An enterprise no list
 * holds any more is not indexed. Built in the request's language, not the
 * shared Lingui instance's, which may hold another request's by the time a
 * head runs.
 */
export function buildPublicEnterpriseHead(seo: PublicEnterpriseSeo, locale: string, siteUrl: string = getSiteUrl()) {
  const english = locale === 'en'
  const translator = translatorFor(english ? 'en' : 'ro')
  const romanianUrl = `${siteUrl}${publicEnterprisePath(seo.cui)}`
  const englishUrl = `${romanianUrl}?lang=en`
  const canonical = english ? englishUrl : romanianUrl
  const image = `${siteUrl}${SHARE_IMAGE_PATH}`
  const { authority, cui } = seo
  const name = seo.name ?? translator._(msg`Întreprinderea cu CUI ${cui}`)
  const title = `${name} — ${translator._(msg`Întreprinderi publice`)} — Transparenta.eu`
  const description = seo.historical
    ? translator._(msg`${name} a fost întreprindere publică; nu mai apare în listele întreprinderilor publice.`)
    : authority
      ? seo.authoritySource === 's1001'
        ? translator._(msg`${name}, întreprindere publică controlată de ${authority}, după lista ANAF. Ce spun sursele publice despre ea, pe o pagină.`)
        : translator._(msg`${name}, întreprindere publică controlată de ${authority}, după anunțurile AMEPIP. Ce spun sursele publice despre ea, pe o pagină.`)
      : translator._(msg`${name}, întreprindere publică. Ce spun sursele publice despre ea, pe o pagină.`)
  // A tax id is a fact; a name no source gave is not: the CUI is never put forward as one.
  const organization = { '@context': 'https://schema.org', '@type': 'Organization', ...(seo.name ? { name: seo.name } : {}), taxID: seo.cui, url: canonical }
  const indexed = !seo.historical && seo.name !== null
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'robots', content: indexed ? 'index,follow' : 'noindex,follow' },
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
