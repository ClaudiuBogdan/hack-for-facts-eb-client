import { useMemo } from 'react'
import type { ComponentType } from 'react'
import { z } from 'zod'
import campaignContent from '@/content/campaigns/bugete-locale-2026/campaign.json'
import resourcesContent from '@/content/campaigns/bugete-locale-2026/resources.json'
import timelineContent from '@/content/campaigns/bugete-locale-2026/timeline.json'
import { campaignChallengeMdxModules } from './campaign-challenge-mdx-index'
import { CAMPAIGN_DEFAULT_LOCALE } from '../constants'
import { parseCampaignDefinition, CampaignTranslatedStringSchema } from '../schemas/campaign-schema'
import { parseCampaignChallengeDefinition } from '../schemas/challenge-schema'
import { parseCampaignTimelineDefinition } from '../schemas/timeline-schema'
import type {
  CampaignChallengeDefinition,
  CampaignDefinition,
  CampaignLocale,
  CampaignResourceDefinition,
  CampaignTranslatedString,
  CampaignTimelineDefinition,
} from '../types'

type MdxContentProps = {
  readonly components?: Record<string, ComponentType<any>>
}

type ChallengeJsonModule = {
  readonly default: unknown
}

type ChallengeContentResult = {
  readonly Component: ComponentType<MdxContentProps> | null
  readonly isLoading: boolean
  readonly error: string | null
}

type ChallengeMdxComponentsByLocale = Partial<Record<CampaignLocale, ComponentType<MdxContentProps>>>

const CampaignResourceSchema = z.object({
  id: z.string().min(1),
  title: CampaignTranslatedStringSchema,
  url: z.string().url(),
  kind: z.enum(['guide', 'tutorial', 'template', 'reference']),
})

const CampaignResourcesFileSchema = z.object({
  resources: z.array(CampaignResourceSchema),
})

const CHALLENGE_JSON_MODULES = import.meta.glob<ChallengeJsonModule>(
  '/src/content/campaigns/bugete-locale-2026/challenges/*/challenge.json',
  { eager: true },
)

const CHALLENGE_JSON_PATH_PATTERN = /\/challenges\/([^/]+)\/challenge\.json$/
const CHALLENGE_MDX_PATH_PATTERN = /\/challenges\/([^/]+)\/index\.(ro|en)\.mdx$/

const campaignDefinition = parseCampaignDefinition(campaignContent)
const campaignTimelineDefinition = parseCampaignTimelineDefinition(timelineContent)
const campaignResources = CampaignResourcesFileSchema.parse(resourcesContent).resources

const campaignChallengeDefinitions = Object.entries(CHALLENGE_JSON_MODULES)
  .map(([path, module]) => {
    const pathMatch = path.match(CHALLENGE_JSON_PATH_PATTERN)
    if (!pathMatch) {
      if (import.meta.env.DEV) {
        console.warn(`[Campaign] Ignoring challenge file with unexpected path: ${path}`)
      }
      return null
    }

    const parsedChallenge = parseCampaignChallengeDefinition(module.default)

    if (parsedChallenge.slug !== pathMatch[1] && import.meta.env.DEV) {
      console.warn(
        `[Campaign] Challenge slug mismatch for ${path}. File slug: ${pathMatch[1]}, JSON slug: ${parsedChallenge.slug}`,
      )
    }

    return parsedChallenge
  })
  .filter((challenge): challenge is CampaignChallengeDefinition => Boolean(challenge))
  .sort((a, b) => a.slug.localeCompare(b.slug))

const campaignChallengeBySlug = new Map(campaignChallengeDefinitions.map((challenge) => [challenge.slug, challenge]))

const challengeMdxComponentsBySlug = (() => {
  const accumulator: Record<string, ChallengeMdxComponentsByLocale> = {}

  const addLocaleComponent = (path: string, component: ComponentType<MdxContentProps>) => {
    const pathMatch = path.match(CHALLENGE_MDX_PATH_PATTERN)
    if (!pathMatch) {
      if (import.meta.env.DEV) {
        console.warn(`[Campaign] Ignoring MDX file with unexpected path: ${path}`)
      }
      return
    }

    const challengeSlug = pathMatch[1]
    const locale = pathMatch[2] as CampaignLocale
    const localeComponents = accumulator[challengeSlug] ?? {}
    localeComponents[locale] = component
    accumulator[challengeSlug] = localeComponents
  }

  for (const [path, module] of Object.entries(campaignChallengeMdxModules)) {
    addLocaleComponent(path, module.default)
  }

  return accumulator
})()

function getAvailableLocales(challengeSlug: string): string {
  const localeComponents = challengeMdxComponentsBySlug[challengeSlug]
  if (!localeComponents) return 'none'

  const availableLocales = Object.keys(localeComponents)
  return availableLocales.length ? availableLocales.join(', ') : 'none'
}

function resolveChallengeMdxComponent(params: {
  readonly challengeSlug: string
  readonly locale: CampaignLocale
}): ComponentType<MdxContentProps> | null {
  const localeComponents = challengeMdxComponentsBySlug[params.challengeSlug]
  if (!localeComponents) return null

  return localeComponents[params.locale] ?? localeComponents[CAMPAIGN_DEFAULT_LOCALE] ?? localeComponents.en ?? null
}

if (import.meta.env.DEV && import.meta.env.MODE !== 'test') {
  for (const challenge of campaignChallengeDefinitions) {
    const locales = challengeMdxComponentsBySlug[challenge.slug]
    if (!locales?.[CAMPAIGN_DEFAULT_LOCALE]) {
      console.warn(`[Campaign] Missing ${CAMPAIGN_DEFAULT_LOCALE} MDX content for challenge: ${challenge.slug}`)
    }
  }
}

export function getCampaignDefinition(): CampaignDefinition {
  return campaignDefinition
}

export function getCampaignTimelineDefinition(): CampaignTimelineDefinition {
  return campaignTimelineDefinition
}

export function getCampaignResources(): readonly CampaignResourceDefinition[] {
  return campaignResources
}

export function getCampaignChallengeList(): readonly CampaignChallengeDefinition[] {
  return campaignChallengeDefinitions
}

export function getCampaignChallengeBySlug(challengeSlug: string): CampaignChallengeDefinition | null {
  return campaignChallengeBySlug.get(challengeSlug) ?? null
}

export function getCampaignText(value: CampaignTranslatedString, locale: CampaignLocale): string {
  if (locale === 'en') {
    return value.en ?? value.ro
  }

  return value.ro || value.en || ''
}

export function prefetchCampaignChallengeContent(_params: {
  readonly challengeSlug: string
  readonly locale: CampaignLocale
}): Promise<void> {
  return Promise.resolve()
}

export function useCampaignChallengeContent(params: {
  readonly challengeSlug: string
  readonly locale: CampaignLocale
}): ChallengeContentResult {
  return useMemo(() => {
    const challenge = getCampaignChallengeBySlug(params.challengeSlug)
    if (!challenge) {
      return {
        Component: null,
        isLoading: false,
        error: `Unknown challenge slug: ${params.challengeSlug}.`,
      }
    }

    const component = resolveChallengeMdxComponent({
      challengeSlug: challenge.slug,
      locale: params.locale,
    })

    if (!component) {
      return {
        Component: null,
        isLoading: false,
        error: `Missing challenge content for ${challenge.slug} (${params.locale}). Available locales: ${getAvailableLocales(
          challenge.slug,
        )}`,
      }
    }

    return {
      Component: component,
      isLoading: false,
      error: null,
    }
  }, [params.challengeSlug, params.locale])
}
