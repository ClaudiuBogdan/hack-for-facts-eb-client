import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import type {
  ChallengeLocale,
  ChallengeStepFrontmatter,
  ChallengeStepType,
} from '../types'
import type { ChallengeStepSection } from './sectioned-step-markdown'

type MdxContentProps = {
  readonly components?: MDXComponents
}

export type ChallengeStepMdxModule = {
  readonly default: ComponentType<MdxContentProps>
  readonly frontmatter?: ChallengeStepFrontmatter
  readonly challengeSections?: readonly ChallengeStepSection[]
}

type MdxLocaleComponents = Partial<Record<ChallengeLocale, ChallengeStepMdxModule>>

export type ChallengeStepContentIndex = Record<string, MdxLocaleComponents>

export type ChallengeStepContentDescriptor = {
  readonly kind: ChallengeStepType
  readonly Component: ComponentType<MdxContentProps>
  readonly frontmatter: ChallengeStepFrontmatter
  readonly sections: readonly ChallengeStepSection[]
}

export type ChallengeStepContentResolveResult = {
  readonly content: ChallengeStepContentDescriptor | null
  readonly isLoading: boolean
  readonly error: string | null
}

const DEFAULT_LOCALE: ChallengeLocale = 'en'

export function createChallengeStepContentIndex(
  modules: Record<string, ChallengeStepMdxModule>,
): ChallengeStepContentIndex {
  return Object.entries(modules).reduce(
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
    {} as ChallengeStepContentIndex,
  )
}

export function resolveChallengeStepModule(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
  readonly contentIndex: ChallengeStepContentIndex
}): {
  readonly module: ChallengeStepMdxModule
  readonly resolvedLocale: ChallengeLocale
} | null {
  const localeComponents = params.contentIndex[params.contentDir]
  if (!localeComponents) return null

  const requestedComponent = localeComponents[params.locale]
  if (requestedComponent) {
    return { module: requestedComponent, resolvedLocale: params.locale }
  }

  const fallbackComponent = localeComponents[DEFAULT_LOCALE]
  if (fallbackComponent) {
    return { module: fallbackComponent, resolvedLocale: DEFAULT_LOCALE }
  }

  return null
}

function getAvailableLocales(
  contentDir: string,
  contentIndex: ChallengeStepContentIndex,
): string {
  const localeComponents = contentIndex[contentDir]
  if (!localeComponents) return 'none'
  const locales = Object.keys(localeComponents)
  return locales.length ? locales.join(', ') : 'none'
}

export function resolveChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
  readonly contentIndex: ChallengeStepContentIndex
}): ChallengeStepContentResolveResult {
  if (!params.contentDir) {
    return { content: null, isLoading: false, error: 'Missing step content directory.' }
  }

  const resolved = resolveChallengeStepModule({
    contentDir: params.contentDir,
    locale: params.locale,
    contentIndex: params.contentIndex,
  })
  if (!resolved) {
    return {
      content: null,
      isLoading: false,
      error: `Missing step content: ${params.contentDir} (${params.locale}). Available locales: ${getAvailableLocales(params.contentDir, params.contentIndex)}`,
    }
  }

  const frontmatter = resolved.module.frontmatter ?? {}
  const kind: ChallengeStepType =
    frontmatter.stepType === 'sectioned' || resolved.module.challengeSections?.length
      ? 'sectioned'
      : 'article'
  const sections =
    kind === 'sectioned'
      ? resolved.module.challengeSections ?? null
      : []

  if (kind === 'sectioned' && sections === null) {
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
}
