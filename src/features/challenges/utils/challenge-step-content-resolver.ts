import type { ComponentType } from 'react'
import type { MDXComponents } from 'mdx/types'
import {
  createModuleLoaderCache,
  type ModuleLoader,
} from '@/lib/module-loader-cache'
import challengeStepSectionMetadataManifest from 'virtual:challenge-step-section-metadata'
import type {
  ChallengeLocale,
  ChallengeStepFrontmatter,
  ChallengeStepType,
} from '../types'
import type {
  ChallengeStepSection,
  ChallengeStepSectionMetadata,
  ChallengeStepSectionMetadataIndex,
} from './sectioned-step-markdown'

type MdxContentProps = {
  readonly components?: MDXComponents
}

export type ChallengeStepMdxModule = {
  readonly default: ComponentType<MdxContentProps>
  readonly frontmatter?: ChallengeStepFrontmatter
  readonly challengeSections?: readonly ChallengeStepSection[]
}

export type ChallengeStepMdxModuleLoader =
  ModuleLoader<ChallengeStepMdxModule>

type ChallengeStepLocaleLoaders = Partial<
  Record<ChallengeLocale, ChallengeStepMdxModuleLoader>
>

type ChallengeStepModuleReference = {
  readonly cacheKey: string
  readonly loader: ChallengeStepMdxModuleLoader
  readonly resolvedLocale: ChallengeLocale
}

export type ChallengeStepContentIndex = Record<
  string,
  ChallengeStepLocaleLoaders
>

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

const FALLBACK_LOCALES: Record<ChallengeLocale, readonly ChallengeLocale[]> = {
  en: ['ro'],
  ro: ['en'],
}

export function createChallengeStepContentIndex(
  moduleLoaders: Record<string, ChallengeStepMdxModuleLoader>,
): ChallengeStepContentIndex {
  return Object.entries(moduleLoaders).reduce(
    (contentIndex, [filePath, loader]) => {
      const matchedContentFile = filePath.match(
        /\/steps\/(.+)\/index\.(en|ro)\.mdx$/,
      )
      if (!matchedContentFile) {
        if (import.meta.env.DEV) {
          console.warn(
            `[Challenges] Ignoring MDX file with unexpected path: ${filePath}`,
          )
        }
        return contentIndex
      }

      const contentDirectory = matchedContentFile[1]
      const locale = matchedContentFile[2] as ChallengeLocale
      const localeLoaders = contentIndex[contentDirectory] ?? {}
      localeLoaders[locale] = loader
      contentIndex[contentDirectory] = localeLoaders
      return contentIndex
    },
    {} as ChallengeStepContentIndex,
  )
}

function getAvailableLocales(
  contentDirectory: string,
  contentIndex: ChallengeStepContentIndex,
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
  locale: ChallengeLocale,
  contentIndex: ChallengeStepContentIndex,
): Error {
  return new Error(
    `Missing step content: ${contentDirectory} (${locale}). Available locales: ${getAvailableLocales(
      contentDirectory,
      contentIndex,
    )}`,
  )
}

function createMissingSectionsError(
  contentDirectory: string,
  locale: ChallengeLocale,
): Error {
  return new Error(
    `Missing sectioned step content export: ${contentDirectory} (${locale}).`,
  )
}

function createChallengeStepContentDescriptor(params: {
  readonly contentDir: string
  readonly resolvedLocale: ChallengeLocale
  readonly module: ChallengeStepMdxModule
}): ChallengeStepContentDescriptor {
  const frontmatter = params.module.frontmatter ?? {}
  const kind: ChallengeStepType =
    frontmatter.stepType === 'sectioned' ||
    Boolean(params.module.challengeSections?.length)
      ? 'sectioned'
      : 'article'

  if (kind === 'sectioned' && !params.module.challengeSections) {
    throw createMissingSectionsError(
      params.contentDir,
      params.resolvedLocale,
    )
  }

  return {
    kind,
    Component: params.module.default,
    frontmatter,
    sections:
      kind === 'sectioned'
        ? (params.module.challengeSections ?? [])
        : [],
  }
}

export function resolveChallengeStepModule(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
  readonly contentIndex: ChallengeStepContentIndex
}): ChallengeStepModuleReference | null {
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

  for (const fallbackLocale of FALLBACK_LOCALES[params.locale]) {
    const fallbackLoader = localeLoaders[fallbackLocale]
    if (fallbackLoader) {
      return {
        cacheKey: `${params.contentDir}:${fallbackLocale}`,
        loader: fallbackLoader,
        resolvedLocale: fallbackLocale,
      }
    }
  }

  return null
}

export function createChallengeStepContentResource(
  contentIndex: ChallengeStepContentIndex,
) {
  const moduleCache = createModuleLoaderCache<ChallengeStepMdxModule>()

  const preloadModule = async (params: {
    readonly contentDir: string
    readonly locale: ChallengeLocale
  }): Promise<{
    readonly module: ChallengeStepMdxModule
    readonly resolvedLocale: ChallengeLocale
  }> => {
    const moduleReference = resolveChallengeStepModule({
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
  }

  const readModule = (params: {
    readonly contentDir: string
    readonly locale: ChallengeLocale
  }): {
    readonly module: ChallengeStepMdxModule
    readonly resolvedLocale: ChallengeLocale
  } => {
    const moduleReference = resolveChallengeStepModule({
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
  }

  const peekModule = (params: {
    readonly contentDir: string
    readonly locale: ChallengeLocale
  }): {
    readonly module: ChallengeStepMdxModule
    readonly resolvedLocale: ChallengeLocale
  } | null => {
    const moduleReference = resolveChallengeStepModule({
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
  }

  const preloadContent = async (params: {
    readonly contentDir: string
    readonly locale: ChallengeLocale
  }): Promise<ChallengeStepContentDescriptor> => {
    const resolvedModule = await preloadModule(params)
    return createChallengeStepContentDescriptor({
      contentDir: params.contentDir,
      resolvedLocale: resolvedModule.resolvedLocale,
      module: resolvedModule.module,
    })
  }

  const readContent = (params: {
    readonly contentDir: string
    readonly locale: ChallengeLocale
  }): ChallengeStepContentDescriptor => {
    const resolvedModule = readModule(params)
    return createChallengeStepContentDescriptor({
      contentDir: params.contentDir,
      resolvedLocale: resolvedModule.resolvedLocale,
      module: resolvedModule.module,
    })
  }

  const peekContent = (params: {
    readonly contentDir: string
    readonly locale: ChallengeLocale
  }): ChallengeStepContentDescriptor | null => {
    const resolvedModule = peekModule(params)
    if (!resolvedModule) {
      return null
    }

    return createChallengeStepContentDescriptor({
      contentDir: params.contentDir,
      resolvedLocale: resolvedModule.resolvedLocale,
      module: resolvedModule.module,
    })
  }

  return {
    preloadModule,
    readModule,
    peekModule,
    preloadContent,
    readContent,
    peekContent,
    clear(): void {
      moduleCache.clear()
    },
  }
}

const challengeStepModuleLoaders = import.meta.glob<ChallengeStepMdxModule>(
  '/src/content/challenges/steps/**/index.*.mdx',
)

const challengeStepContentIndex = createChallengeStepContentIndex(
  challengeStepModuleLoaders,
)

const challengeStepContentResource = createChallengeStepContentResource(
  challengeStepContentIndex,
)

export function resolveChallengeStepSectionsFromMetadataIndex(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
  readonly metadataIndex: ChallengeStepSectionMetadataIndex
}): readonly ChallengeStepSectionMetadata[] | null {
  const localeSections = params.metadataIndex[params.contentDir]
  if (!localeSections) {
    return null
  }

  return (
    localeSections[params.locale]
    ?? localeSections[FALLBACK_LOCALES[params.locale][0]]
    ?? null
  )
}

export function preloadChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): Promise<void> {
  return challengeStepContentResource.preloadModule(params).then(
    () => undefined,
  )
}

export function readChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): ChallengeStepContentDescriptor {
  return challengeStepContentResource.readContent(params)
}

export function peekChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): ChallengeStepContentDescriptor | null {
  return challengeStepContentResource.peekContent(params)
}

export function getChallengeStepSections(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): readonly ChallengeStepSectionMetadata[] | null {
  return resolveChallengeStepSectionsFromMetadataIndex({
    ...params,
    metadataIndex: challengeStepSectionMetadataManifest,
  })
}

export function getChallengeStepContentErrorMessage(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): string | null {
  if (!params.contentDir) {
    return 'Missing step content directory.'
  }

  const moduleReference = resolveChallengeStepModule({
    contentDir: params.contentDir,
    locale: params.locale,
    contentIndex: challengeStepContentIndex,
  })
  if (moduleReference) {
    return null
  }

  return createMissingContentError(
    params.contentDir,
    params.locale,
    challengeStepContentIndex,
  ).message
}

export function resolveChallengeStepContent(params: {
  readonly contentDir: string
  readonly locale: ChallengeLocale
}): ChallengeStepContentResolveResult {
  const errorMessage = getChallengeStepContentErrorMessage(params)
  if (errorMessage) {
    return {
      content: null,
      isLoading: false,
      error: errorMessage,
    }
  }

  try {
    return {
      content: readChallengeStepContent(params),
      isLoading: false,
      error: null,
    }
  } catch (error) {
    if (error instanceof Promise) {
      throw error
    }

    return {
      content: null,
      isLoading: false,
      error:
        error instanceof Error
          ? error.message
          : 'Unable to load step content.',
    }
  }
}

export function clearChallengeStepContentResourceCacheForTests(): void {
  challengeStepContentResource.clear()
}
