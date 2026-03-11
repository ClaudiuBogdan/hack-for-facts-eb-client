import { useMemo } from 'react'
import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import type {
  ChallengeLocale,
  ChallengeStepFrontmatter,
  ChallengeStepType,
} from '../types'
import type {
  ChallengeStepSection,
  SerializedChallengeStepSection,
} from '../utils/sectioned-step-markdown'
import { hydrateChallengeStepSections } from '../utils/sectioned-step-markdown'

type MdxContentProps = {
  readonly components?: MDXComponents
}

type MdxModule = {
  readonly default: ComponentType<MdxContentProps>
  readonly frontmatter?: ChallengeStepFrontmatter
  readonly challengeSections?: readonly SerializedChallengeStepSection[]
}

type MdxLocaleComponents = Partial<Record<ChallengeLocale, MdxModule>>

export type ChallengeStepContentDescriptor = {
  readonly kind: ChallengeStepType
  readonly Component: ComponentType<MdxContentProps>
  readonly frontmatter: ChallengeStepFrontmatter
  readonly sections: readonly ChallengeStepSection[]
}

type UseChallengeStepContentResult = {
  readonly content: ChallengeStepContentDescriptor | null
  readonly isLoading: boolean
  readonly error: string | null
}

const DEFAULT_LOCALE: ChallengeLocale = 'en'

const MDX_MODULES = import.meta.glob<MdxModule>(
  '/src/content/challenges/steps/**/index.*.mdx',
  { eager: true },
)

const MDX_CONTENT_INDEX = Object.entries(MDX_MODULES).reduce(
  (acc, [path, module]) => {
    const match = path.match(/\/steps\/(.+)\/index\.(en|ro)\.mdx$/)
    if (!match) {
      if (import.meta.env.DEV) {
        console.warn(`[Challenges] Ignoring MDX file with unexpected path: ${path}`)
      }
      return acc
    }

    const contentDir = match[1]
    const locale = match[2] as ChallengeLocale
    const localeComponents = acc[contentDir] ?? {}
    localeComponents[locale] = module
    acc[contentDir] = localeComponents
    return acc
  },
  {} as Record<string, MdxLocaleComponents>,
)

const SECTIONED_CONTENT_CACHE = new Map<string, readonly ChallengeStepSection[]>()

function resolveMdxComponent(
  contentDir: string,
  locale: ChallengeLocale,
): {
  readonly module: MdxModule
  readonly resolvedLocale: ChallengeLocale
  readonly fallbackUsed: boolean
} | null {
  const localeComponents = MDX_CONTENT_INDEX[contentDir]
  if (!localeComponents) return null

  const requestedComponent = localeComponents[locale]
  if (requestedComponent) {
    return { module: requestedComponent, resolvedLocale: locale, fallbackUsed: false }
  }

  const fallbackComponent = localeComponents[DEFAULT_LOCALE]
  if (fallbackComponent) {
    return { module: fallbackComponent, resolvedLocale: DEFAULT_LOCALE, fallbackUsed: true }
  }

  return null
}

function getAvailableLocales(contentDir: string): string {
  const localeComponents = MDX_CONTENT_INDEX[contentDir]
  if (!localeComponents) return 'none'
  const locales = Object.keys(localeComponents)
  return locales.length ? locales.join(', ') : 'none'
}

function getSectionedContentCacheKey(contentDir: string, locale: ChallengeLocale): string {
  return `${contentDir}::${locale}`
}

function resolveSectionedSections(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
  readonly module: MdxModule
}): readonly ChallengeStepSection[] | null {
  const cacheKey = getSectionedContentCacheKey(params.contentDir, params.locale)
  const cachedSections = SECTIONED_CONTENT_CACHE.get(cacheKey)
  if (cachedSections) {
    return cachedSections
  }

  const serializedSections = params.module.challengeSections
  if (!serializedSections?.length) {
    return null
  }

  try {
    const sections = hydrateChallengeStepSections(serializedSections)

    SECTIONED_CONTENT_CACHE.set(cacheKey, sections)
    return sections
  } catch (error) {
    console.error('[Challenges] Failed to parse sectioned step content.', error)
    return null
  }
}

export function prefetchChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}) {
  const resolved = resolveMdxComponent(params.contentDir, params.locale)
  if (
    resolved &&
    (resolved.module.frontmatter?.stepType === 'sectioned' ||
      Boolean(resolved.module.challengeSections?.length))
  ) {
    resolveSectionedSections({
      contentDir: params.contentDir,
      locale: resolved.resolvedLocale,
      module: resolved.module,
    })
  }
  return Promise.resolve()
}

export function useChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): UseChallengeStepContentResult {
  return useMemo(() => {
    if (!params.contentDir) {
      return { content: null, isLoading: false, error: 'Missing step content directory.' }
    }

    const resolved = resolveMdxComponent(params.contentDir, params.locale)
    if (!resolved) {
      return {
        content: null,
        isLoading: false,
        error: `Missing step content: ${params.contentDir} (${params.locale}). Available locales: ${getAvailableLocales(params.contentDir)}`,
      }
    }

    const frontmatter = resolved.module.frontmatter ?? {}
    const kind: ChallengeStepType =
      frontmatter.stepType === 'sectioned' || resolved.module.challengeSections?.length
        ? 'sectioned'
        : 'article'
    const sections =
      kind === 'sectioned'
        ? resolveSectionedSections({
            contentDir: params.contentDir,
            locale: resolved.resolvedLocale,
            module: resolved.module,
          })
        : []

    if (kind === 'sectioned' && !sections) {
      return {
        content: null,
        isLoading: false,
        error: `Missing sectioned step content export: ${params.contentDir} (${resolved.resolvedLocale}).`,
      }
    }

    return {
      content: {
        kind,
        Component: resolved.module.default,
        frontmatter,
        sections: sections ?? [],
      },
      isLoading: false,
      error: null,
    }
  }, [params.contentDir, params.locale])
}
