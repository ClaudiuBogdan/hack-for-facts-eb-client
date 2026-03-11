import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import {
  createModuleLoaderCache,
  type ModuleLoader,
} from '@/lib/module-loader-cache'
import type { LearningLocale } from '../types'

export type LearningMdxContentProps = {
  readonly components?: MDXComponents
}

export type LearningMdxModule = {
  readonly default: ComponentType<LearningMdxContentProps>
}

export type LearningMdxModuleLoader = ModuleLoader<LearningMdxModule>

type LearningMdxLocaleLoaders = Partial<
  Record<LearningLocale, LearningMdxModuleLoader>
>

type LearningModuleReference = {
  readonly cacheKey: string
  readonly loader: LearningMdxModuleLoader
  readonly resolvedLocale: LearningLocale
}

export type LearningModuleContentIndex = Record<
  string,
  LearningMdxLocaleLoaders
>

const DEFAULT_LOCALE: LearningLocale = 'en'

export function createLearningModuleContentIndex(
  moduleLoaders: Record<string, LearningMdxModuleLoader>,
): LearningModuleContentIndex {
  return Object.entries(moduleLoaders).reduce(
    (contentIndex, [filePath, loader]) => {
      const matchedContentFile = filePath.match(
        /\/modules\/(.+)\/index\.(en|ro)\.mdx$/,
      )
      if (!matchedContentFile) {
        if (import.meta.env.DEV) {
          console.warn(
            `[Learning] Ignoring MDX file with unexpected path: ${filePath}`,
          )
        }
        return contentIndex
      }

      const contentDirectory = matchedContentFile[1]
      const locale = matchedContentFile[2] as LearningLocale
      const localeLoaders = contentIndex[contentDirectory] ?? {}
      localeLoaders[locale] = loader
      contentIndex[contentDirectory] = localeLoaders
      return contentIndex
    },
    {} as LearningModuleContentIndex,
  )
}

function getAvailableLocales(
  contentDirectory: string,
  contentIndex: LearningModuleContentIndex,
): string {
  const localeLoaders = contentIndex[contentDirectory]
  if (!localeLoaders) {
    return 'none'
  }

  const locales = Object.keys(localeLoaders)
  return locales.length > 0 ? locales.join(', ') : 'none'
}

function createMissingContentError(
  contentDirectory: string,
  locale: LearningLocale,
  contentIndex: LearningModuleContentIndex,
): Error {
  return new Error(
    `Missing module content: ${contentDirectory} (${locale}). Available locales: ${getAvailableLocales(
      contentDirectory,
      contentIndex,
    )}`,
  )
}

export function resolveLearningModuleReference(params: {
  readonly contentDir: string
  readonly locale: LearningLocale
  readonly contentIndex: LearningModuleContentIndex
}): LearningModuleReference | null {
  const localeLoaders = params.contentIndex[params.contentDir]
  if (!localeLoaders) {
    return null
  }

  const requestedLoader = localeLoaders[params.locale]
  if (requestedLoader) {
    return {
      cacheKey: `${params.contentDir}:${params.locale}`,
      loader: requestedLoader,
      resolvedLocale: params.locale,
    }
  }

  const fallbackLoader = localeLoaders[DEFAULT_LOCALE]
  if (!fallbackLoader) {
    return null
  }

  return {
    cacheKey: `${params.contentDir}:${DEFAULT_LOCALE}`,
    loader: fallbackLoader,
    resolvedLocale: DEFAULT_LOCALE,
  }
}

export function createLearningModuleContentResource(
  contentIndex: LearningModuleContentIndex,
) {
  const moduleCache = createModuleLoaderCache<LearningMdxModule>()

  return {
    async preload(params: {
      readonly contentDir: string
      readonly locale: LearningLocale
    }): Promise<{
      readonly module: LearningMdxModule
      readonly resolvedLocale: LearningLocale
    }> {
      const moduleReference = resolveLearningModuleReference({
        contentDir: params.contentDir,
        locale: params.locale,
        contentIndex,
      })
      if (!moduleReference) {
        throw createMissingContentError(
          params.contentDir,
          params.locale,
          contentIndex,
        )
      }

      return {
        module: await moduleCache.preload(
          moduleReference.cacheKey,
          moduleReference.loader,
        ),
        resolvedLocale: moduleReference.resolvedLocale,
      }
    },
    read(params: {
      readonly contentDir: string
      readonly locale: LearningLocale
    }): {
      readonly module: LearningMdxModule
      readonly resolvedLocale: LearningLocale
    } {
      const moduleReference = resolveLearningModuleReference({
        contentDir: params.contentDir,
        locale: params.locale,
        contentIndex,
      })
      if (!moduleReference) {
        throw createMissingContentError(
          params.contentDir,
          params.locale,
          contentIndex,
        )
      }

      return {
        module: moduleCache.read(
          moduleReference.cacheKey,
          moduleReference.loader,
        ),
        resolvedLocale: moduleReference.resolvedLocale,
      }
    },
    peek(params: {
      readonly contentDir: string
      readonly locale: LearningLocale
    }): {
      readonly module: LearningMdxModule
      readonly resolvedLocale: LearningLocale
    } | null {
      const moduleReference = resolveLearningModuleReference({
        contentDir: params.contentDir,
        locale: params.locale,
        contentIndex,
      })
      if (!moduleReference) {
        return null
      }

      const resolvedModule = moduleCache.peek(moduleReference.cacheKey)
      if (!resolvedModule) {
        return null
      }

      return {
        module: resolvedModule,
        resolvedLocale: moduleReference.resolvedLocale,
      }
    },
    clear(): void {
      moduleCache.clear()
    },
  }
}

const learningModuleLoaders = import.meta.glob<LearningMdxModule>(
  '/src/content/learning/modules/**/index.*.mdx',
)

const learningModuleContentIndex = createLearningModuleContentIndex(
  learningModuleLoaders,
)

const learningModuleContentResource = createLearningModuleContentResource(
  learningModuleContentIndex,
)

export function preloadModuleContent(params: {
  readonly contentDir: string
  readonly locale: LearningLocale
}): Promise<void> {
  return learningModuleContentResource.preload(params).then(() => undefined)
}

export function readModuleContent(params: {
  readonly contentDir: string
  readonly locale: LearningLocale
}): LearningMdxModule {
  return learningModuleContentResource.read(params).module
}

export function peekModuleContent(params: {
  readonly contentDir: string
  readonly locale: LearningLocale
}): LearningMdxModule | null {
  return learningModuleContentResource.peek(params)?.module ?? null
}

export function getModuleContentErrorMessage(params: {
  readonly contentDir: string
  readonly locale: LearningLocale
}): string | null {
  if (!params.contentDir) {
    return 'Missing module content directory.'
  }

  const moduleReference = resolveLearningModuleReference({
    contentDir: params.contentDir,
    locale: params.locale,
    contentIndex: learningModuleContentIndex,
  })
  if (moduleReference) {
    return null
  }

  return createMissingContentError(
    params.contentDir,
    params.locale,
    learningModuleContentIndex,
  ).message
}

export function clearModuleContentResourceCacheForTests(): void {
  learningModuleContentResource.clear()
}
