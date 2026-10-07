import { msg, plural } from '@lingui/core/macro'

import { getSiteUrl } from '@/config/env'
import { translatorFor } from '@/lib/i18n'
import { serializeForInlineScript } from '@/lib/inline-script-json'
import type { PublicEnterpriseHubSnapshot } from './hub-snapshot-types'

export const PUBLIC_ENTERPRISE_HUB_PATH = '/public-enterprises'
const SHARE_IMAGE_PATH = '/assets/images/share-image.png'

/** The few figures the head quotes: small enough for the route's loader to hand over. */
export type PublicEnterpriseHubSeoFigures = {
  readonly members: number
  readonly local: number
  readonly central: number
  readonly authorities: number
  readonly generatedAt: string
  readonly financialYear: number
  readonly sources: readonly string[]
}

export function publicEnterpriseHubSeoFigures(snapshot: PublicEnterpriseHubSnapshot): PublicEnterpriseHubSeoFigures {
  return {
    members: snapshot.members.current,
    local: snapshot.control.local,
    central: snapshot.control.central,
    authorities: snapshot.control.s1001Authorities,
    generatedAt: snapshot.generatedAt,
    financialYear: snapshot.financials.year,
    sources: (['s1001', 'amepip'] as const).flatMap((family) => {
      const url = snapshot.sources.find((source) => source.family === family)?.sourceUrl
      return url ? [url] : []
    }),
  }
}

/**
 * `/public-enterprises`'s head: title, description, canonical and its
 * language alternates, social cards, and a schema.org `Dataset` naming its
 * sources. The description quotes the page's own figures, so a refresh of the
 * snapshot updates it too.
 *
 * Built in the request's language (`locale`), not the shared Lingui
 * instance's, which may hold another request's by the time a head runs. One
 * path serves both languages, so each gets its own canonical (`?lang=en` for
 * English) and names the other, as the NGO and companies hubs do.
 */
export function buildPublicEnterpriseHubHead(figures: PublicEnterpriseHubSeoFigures, locale: string, siteUrl: string = getSiteUrl()) {
  const english = locale === 'en'
  const translator = translatorFor(english ? 'en' : 'ro')
  const numbers = new Intl.NumberFormat(english ? 'en-GB' : 'ro-RO')
  const romanianUrl = `${siteUrl}${PUBLIC_ENTERPRISE_HUB_PATH}`
  const englishUrl = `${romanianUrl}?lang=en`
  const canonical = english ? englishUrl : romanianUrl
  const image = `${siteUrl}${SHARE_IMAGE_PATH}`
  const name = translator._(msg`Întreprinderile publice din România`)
  const title = `${name} — Transparenta.eu`
  const members = numbers.format(figures.members)
  const local = numbers.format(figures.local)
  const central = numbers.format(figures.central)
  const authorities = numbers.format(figures.authorities)
  const count = figures.members
  const description = translator._(
    msg`${plural(count, {
      one: `O întreprindere publică, a autorităților locale (${local}) sau a statului central (${central}). Cine o controlează, ce face, cât de mare e și în ce stare.`,
      few: `${members} întreprinderi publice: ${local} ale autorităților locale, ${central} ale statului central; autorități care le au în subordine: ${authorities}. Cine le controlează, ce fac, cât de mari sunt și în ce stare.`,
      other: `${members} de întreprinderi publice: ${local} ale autorităților locale, ${central} ale statului central; autorități care le au în subordine: ${authorities}. Cine le controlează, ce fac, cât de mari sunt și în ce stare.`,
    })}`,
  )
  const dataset = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name,
    description,
    url: canonical,
    isBasedOn: figures.sources,
    dateModified: figures.generatedAt,
    temporalCoverage: `${figures.financialYear}/${figures.generatedAt.slice(0, 4)}`,
    spatialCoverage: { '@type': 'Country', name: 'România' },
    variableMeasured: [
      translator._(msg`Întreprinderi publice`),
      translator._(msg`Întreprinderi pe autorități, tipuri de autoritate, județe și domenii`),
      translator._(msg`Starea întreprinderilor, după fiecare sursă`),
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
