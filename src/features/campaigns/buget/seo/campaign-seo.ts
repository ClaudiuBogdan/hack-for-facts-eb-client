import { getSiteUrl } from '@/config/env'
import {
  buildCampaignBudgetPath,
  buildCampaignCalendarPath,
  buildCampaignResourcesPath,
  CAMPAIGN_ENTITY_SELECTOR_MAP_PATH,
  CAMPAIGN_ENTITY_SELECTOR_PATH,
  CAMPAIGN_LANDING_PATH,
} from '../constants'
import {
  buildCampaignPrimariePath,
  buildCampaignProvocariModulePath,
  buildCampaignProvocariPath,
  buildCampaignProvocariStepPath,
} from '@/features/challenges/constants'
import {
  getCampaignDefinition,
  getCampaignText,
} from '../hooks/use-campaign-content'
import { buildCampaignShareImage } from './campaign-share-images'
import { buildCampaignStructuredData } from './campaign-structured-data'
import type {
  CampaignLocale,
  CampaignSeoMetadata,
  CampaignSeoPageKind,
} from '../types'

type LocalizedText = {
  readonly ro: string
  readonly en: string
}

const CAMPAIGN_COPY: Record<
  CampaignSeoPageKind,
  { readonly title: LocalizedText; readonly description: LocalizedText }
> = {
  landing: {
    title: {
      ro: 'Cu ochii pe bugetele locale: Te ajutăm să înțelegi bugetul primăriei tale',
      en: 'Eyes on Local Budgets: Explore the data shaping your city',
    },
    description: {
      ro: 'Înțelege rapid unde merg banii publici locali și intră în provocarea civică Cu ochii pe bugetele locale.',
      en: 'Quickly understand where local public money goes and join the Eyes on Local Budgets civic challenge.',
    },
  },
  hub: {
    title: {
      ro: 'Cu ochii pe bugetele locale: Calendar, Resurse și Provocări',
      en: 'Eyes on Local Budgets: Timeline, Resources, and Challenges',
    },
    description: {
      ro: 'Accesează calendarul bugetar, resursele utile și traseul complet al provocărilor civice.',
      en: 'Access the budget timeline, useful resources, and the full civic challenge journey.',
    },
  },
  'principal-selector': {
    title: {
      ro: 'Caută Primăria Ta: Cu ochii pe bugetele locale',
      en: 'Find Your City Hall: Eyes on Local Budgets',
    },
    description: {
      ro: 'Selectează primăria ta pentru a continua provocarea Cu ochii pe bugetele locale.',
      en: 'Select your city hall to continue the Eyes on Local Budgets challenge.',
    },
  },
  challenges: {
    title: {
      ro: 'Catalog Provocări: Cu ochii pe bugetele locale',
      en: 'Challenge Catalog: Eyes on Local Budgets',
    },
    description: {
      ro: 'Vezi toate provocările civice Cu ochii pe bugetele locale și alege următorul pas de implicare.',
      en: 'Browse all Eyes on Local Budgets civic challenges and pick your next action.',
    },
  },
  primarie: {
    title: {
      ro: 'Primăria mea: Cu ochii pe bugetele locale',
      en: 'My City Hall: Eyes on Local Budgets',
    },
    description: {
      ro: 'Analizează veniturile, cheltuielile și principalele semnale pentru primăria selectată.',
      en: 'Explore revenue, spending, and key signals for the selected city hall.',
    },
  },
  'principal-map': {
    title: {
      ro: 'Alege Primăria de pe Hartă: Cu ochii pe bugetele locale',
      en: 'Select City Hall on Map: Eyes on Local Budgets',
    },
    description: {
      ro: 'Selectează primăria direct de pe harta UAT pentru a continua în pagina principală a campaniei.',
      en: 'Select your city hall directly from the UAT map to continue to the campaign main page.',
    },
  },
  calendar: {
    title: {
      ro: 'Calendar Cu ochii pe bugetele locale: Termene legale și etape',
      en: 'Eyes on Local Budgets Calendar: Legal deadlines and milestones',
    },
    description: {
      ro: 'Consultă calendarul complet al bugetelor locale cu termenele legale prevăzute de Art. 39, Legea 273/2006.',
      en: 'View the full local budget calendar with legal deadlines per Art. 39, Law 273/2006.',
    },
  },
  resources: {
    title: {
      ro: 'Ghiduri și modele: Cu ochii pe bugetele locale',
      en: 'Guides & Templates: Eyes on Local Budgets',
    },
    description: {
      ro: 'Ghiduri despre bugetele locale, modele de cereri pentru acces la informații publice și dezbateri publice.',
      en: 'Local budget guides, request templates for public information access and public debates.',
    },
  },
}

function withSiteName(title: string): string {
  return `${title} | Transparenta.eu`
}

function resolvePagePath(params: {
  readonly pageKind: CampaignSeoPageKind
  readonly entityCui?: string
  readonly moduleSlug?: string
  readonly challengeSlug?: string
  readonly stepSlug?: string
}): string {
  if (params.pageKind === 'landing') return CAMPAIGN_LANDING_PATH
  if (params.pageKind === 'principal-selector') return CAMPAIGN_ENTITY_SELECTOR_PATH
  if (params.pageKind === 'principal-map') return CAMPAIGN_ENTITY_SELECTOR_MAP_PATH
  if (params.pageKind === 'calendar') {
    return params.entityCui
      ? buildCampaignCalendarPath(params.entityCui)
      : CAMPAIGN_ENTITY_SELECTOR_PATH
  }
  if (params.pageKind === 'resources') {
    return params.entityCui
      ? buildCampaignResourcesPath(params.entityCui)
      : CAMPAIGN_ENTITY_SELECTOR_PATH
  }
  if (params.pageKind === 'hub') {
    return params.entityCui
      ? buildCampaignBudgetPath(params.entityCui)
      : CAMPAIGN_ENTITY_SELECTOR_PATH
  }
  if (params.pageKind === 'primarie') {
    return params.entityCui
      ? buildCampaignPrimariePath(params.entityCui)
      : CAMPAIGN_ENTITY_SELECTOR_PATH
  }
  if (params.pageKind === 'challenges') {
    if (params.entityCui && params.moduleSlug && params.challengeSlug && params.stepSlug) {
      return buildCampaignProvocariStepPath(
        params.entityCui,
        params.moduleSlug,
        params.challengeSlug,
        params.stepSlug,
      )
    }

    if (params.entityCui && params.moduleSlug) {
      return buildCampaignProvocariModulePath(params.entityCui, params.moduleSlug)
    }

    return params.entityCui
      ? buildCampaignProvocariPath(params.entityCui)
      : CAMPAIGN_ENTITY_SELECTOR_PATH
  }

  return params.entityCui ? buildCampaignProvocariPath(params.entityCui) : CAMPAIGN_ENTITY_SELECTOR_PATH
}

function buildUrl(params: {
  readonly siteUrl: string
  readonly path: string
  readonly locale: CampaignLocale
}): string {
  if (params.locale === 'en') {
    return `${params.siteUrl}${params.path}?lang=en`
  }

  return `${params.siteUrl}${params.path}`
}

export function buildCampaignSeoMetadata(params: {
  readonly pageKind: CampaignSeoPageKind
  readonly locale: CampaignLocale
  readonly entityCui?: string
  readonly moduleSlug?: string
  readonly challengeSlug?: string
  readonly stepSlug?: string
}): CampaignSeoMetadata {
  const campaign = getCampaignDefinition()
  const siteUrl = getSiteUrl()
  const path = resolvePagePath({
    pageKind: params.pageKind,
    entityCui: params.entityCui,
    moduleSlug: params.moduleSlug,
    challengeSlug: params.challengeSlug,
    stepSlug: params.stepSlug,
  })

  const copy = CAMPAIGN_COPY[params.pageKind]
  const pageTitle = campaign.seo?.title
    ? getCampaignText(campaign.seo.title, params.locale)
    : copy.title[params.locale]
  const pageDescription = campaign.seo?.description
    ? getCampaignText(campaign.seo.description, params.locale)
    : copy.description[params.locale]

  const canonicalUrl = buildUrl({
    siteUrl,
    path,
    locale: params.locale,
  })

  const alternateUrls = {
    ro: `${siteUrl}${path}`,
    en: `${siteUrl}${path}?lang=en`,
    xDefault: `${siteUrl}${path}`,
  }

  const image = buildCampaignShareImage({
    siteUrl,
    locale: params.locale,
    pageKind: params.pageKind,
  })

  const jsonLd = buildCampaignStructuredData({
    siteUrl,
    locale: params.locale,
    canonicalUrl,
    title: withSiteName(pageTitle),
    description: pageDescription,
    campaign,
  })

  return {
    title: withSiteName(pageTitle),
    description: pageDescription,
    canonicalUrl,
    robots:
      params.pageKind === 'hub' ||
      params.pageKind === 'primarie' ||
      params.pageKind === 'resources' ||
      params.pageKind === 'principal-selector' ||
      params.pageKind === 'principal-map'
        ? 'noindex,follow'
        : 'index,follow',
    alternateUrls,
    image,
    jsonLd,
  }
}

export function buildCampaignRouteHead(params: {
  readonly pageKind: CampaignSeoPageKind
  readonly locale: CampaignLocale
  readonly entityCui?: string
  readonly moduleSlug?: string
  readonly challengeSlug?: string
  readonly stepSlug?: string
}) {
  const metadata = buildCampaignSeoMetadata(params)
  const ogLocale = params.locale === 'en' ? 'en_US' : 'ro_RO'

  return {
    meta: [
      { title: metadata.title },
      { name: 'description', content: metadata.description },
      { name: 'robots', content: metadata.robots },
      { name: 'canonical', content: metadata.canonicalUrl },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: metadata.title },
      { property: 'og:description', content: metadata.description },
      { property: 'og:url', content: metadata.canonicalUrl },
      { property: 'og:locale', content: ogLocale },
      { property: 'og:image', content: metadata.image.url },
      { property: 'og:image:width', content: String(metadata.image.width) },
      { property: 'og:image:height', content: String(metadata.image.height) },
      { property: 'og:image:alt', content: metadata.image.alt },
      { name: 'twitter:card', content: 'summary_large_image' },
      { name: 'twitter:title', content: metadata.title },
      { name: 'twitter:description', content: metadata.description },
      { name: 'twitter:image', content: metadata.image.url },
      { name: 'twitter:image:alt', content: metadata.image.alt },
    ],
    links: [
      { rel: 'canonical', href: metadata.canonicalUrl },
      { rel: 'alternate', hrefLang: 'ro', href: metadata.alternateUrls.ro },
      { rel: 'alternate', hrefLang: 'en', href: metadata.alternateUrls.en },
      { rel: 'alternate', hrefLang: 'x-default', href: metadata.alternateUrls.xDefault },
    ],
    scripts: metadata.jsonLd.map((item) => ({
      type: 'application/ld+json',
      children: JSON.stringify(item),
    })),
  }
}
