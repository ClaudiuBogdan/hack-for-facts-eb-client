import type { MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import { getSiteUrl } from '@/config/env'
import { ngoProfileHref } from '@/features/ngos/lib/ngo-address'
import { translatorFor } from '@/lib/i18n'
import type { NgoOrganization, NgoStatement } from './api'
import { keyFigures, latestStatement, placeOf } from './model'
import { categoryLabel, isMasked, organizationName, purposeText } from './words'

const SHARE_IMAGE_PATH = '/assets/images/share-image.png'
/** Where a search engine cuts a description. */
const DESCRIPTION_LENGTH = 160

/**
 * An NGO profile's head — `/ngos/$cui`, or `/ngos/registry/$number` for one
 * without an admitted CUI — in the request's language (`locale`), not the shared
 * Lingui instance's: the organisation's name, and a description that says
 * what it is for where the registry's purpose is published — the reader's
 * first question — or what it is, where, and its latest revenue. A purpose
 * the registry masked (`<PERSON>`, `<LOCATION>`…) stays on the page as
 * published but is no search snippet: the made description stands in. Each
 * language has its canonical (`?lang=en`) and names the other.
 */
export function buildNgoProfileHead(
  {
    organization,
    statements,
  }: { readonly organization: NgoOrganization; readonly statements: readonly NgoStatement[] },
  locale: string,
  siteUrl: string = getSiteUrl(),
) {
  const english = locale === 'en'
  const translator = translatorFor(english ? 'en' : 'ro')
  // Its one address: the CUI's where one is admitted, else the registry number's.
  const path = ngoProfileHref({ cui: organization.cui, registryNumber: organization.registryNumber }) ?? '/ngos'
  const romanianUrl = `${siteUrl}${path}`
  const englishUrl = `${siteUrl}${path}?lang=en`
  const canonical = english ? englishUrl : romanianUrl
  const image = `${siteUrl}${SHARE_IMAGE_PATH}`

  const translate = (descriptor: MessageDescriptor) => translator._(descriptor)
  const name = organizationName(organization, translate)
  const title = `${name} — Transparenta.eu`
  const category = categoryLabel(organization.category, translate)
  const place = placeOf(organization)
  const cui = organization.cui
  const registryNumber = organization.registryNumber
  const latest = latestStatement(statements)
  const revenue = latest ? keyFigures(latest).revenue?.value : null
  const year = latest?.fiscalYear
  const amount =
    revenue != null
      ? `${new Intl.NumberFormat(english ? 'en-GB' : 'ro-RO', { maximumFractionDigits: 1 }).format(revenue >= 1e6 ? revenue / 1e6 : revenue)} ${revenue >= 1e6 ? translator._(msg`mil. lei`) : translator._(msg`lei`)}`
      : null
  const purpose = purposeText(organization)
  const described =
    purpose && !isMasked(purpose)
      ? purpose.replace(/\s+/gu, ' ').trim()
      : [
          place ? translator._(msg`${category} din ${place}.`) : `${category}.`,
          amount && year ? translator._(msg`Venituri de ${amount} în ${year}, din situațiile financiare publicate.`) : null,
          cui
            ? translator._(msg`CUI ${cui}, din Registrul național ONG și ANAF.`)
            : translator._(msg`Nr. registru ${registryNumber}, din Registrul național ONG.`),
        ]
          .filter(Boolean)
          .join(' ')
  const description = described.length > DESCRIPTION_LENGTH ? `${described.slice(0, DESCRIPTION_LENGTH - 1).replace(/\s+\S*$/u, '')}…` : described

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
  }
}
