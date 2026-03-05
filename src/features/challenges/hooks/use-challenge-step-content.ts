import { useMemo } from 'react'
import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import type { ChallengeLocale } from '../types'

type MdxContentProps = {
  readonly components?: MDXComponents
}

type MdxModule = {
  readonly default: ComponentType<MdxContentProps>
}

type MdxLocaleComponents = Partial<Record<ChallengeLocale, ComponentType<MdxContentProps>>>

type UseChallengeStepContentResult = {
  readonly Component: ComponentType<MdxContentProps> | null
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
    localeComponents[locale] = module.default
    acc[contentDir] = localeComponents
    return acc
  },
  {} as Record<string, MdxLocaleComponents>,
)

function resolveMdxComponent(
  contentDir: string,
  locale: ChallengeLocale,
): {
  readonly Component: ComponentType<MdxContentProps>
  readonly resolvedLocale: ChallengeLocale
  readonly fallbackUsed: boolean
} | null {
  const localeComponents = MDX_CONTENT_INDEX[contentDir]
  if (!localeComponents) return null

  const requestedComponent = localeComponents[locale]
  if (requestedComponent) {
    return { Component: requestedComponent, resolvedLocale: locale, fallbackUsed: false }
  }

  const fallbackComponent = localeComponents[DEFAULT_LOCALE]
  if (fallbackComponent) {
    return { Component: fallbackComponent, resolvedLocale: DEFAULT_LOCALE, fallbackUsed: true }
  }

  return null
}

function getAvailableLocales(contentDir: string): string {
  const localeComponents = MDX_CONTENT_INDEX[contentDir]
  if (!localeComponents) return 'none'
  const locales = Object.keys(localeComponents)
  return locales.length ? locales.join(', ') : 'none'
}

export function prefetchChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}) {
  resolveMdxComponent(params.contentDir, params.locale)
  return Promise.resolve()
}

export function useChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): UseChallengeStepContentResult {
  return useMemo(() => {
    if (!params.contentDir) {
      return { Component: null, isLoading: false, error: 'Missing step content directory.' }
    }

    const resolved = resolveMdxComponent(params.contentDir, params.locale)
    if (!resolved) {
      return {
        Component: null,
        isLoading: false,
        error: `Missing step content: ${params.contentDir} (${params.locale}). Available locales: ${getAvailableLocales(params.contentDir)}`,
      }
    }

    return { Component: resolved.Component, isLoading: false, error: null }
  }, [params.contentDir, params.locale])
}
