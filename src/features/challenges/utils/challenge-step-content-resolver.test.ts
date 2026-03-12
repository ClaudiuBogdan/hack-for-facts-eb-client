import { Suspense, createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createDeferredPromise } from '@/test/helpers'
import {
  createChallengeStepContentIndex,
  createChallengeStepContentResource,
  type ChallengeStepMdxModule,
  type ChallengeStepMdxModuleLoader,
} from './challenge-step-content-resolver'

function ArticleComponent() {
  return createElement('div', null, 'Challenge article content')
}

function IntroSectionComponent() {
  return null
}

function FallbackSectionComponent() {
  return null
}

function createChallengeStepResource(
  moduleLoaders: Record<string, ChallengeStepMdxModuleLoader>,
) {
  return createChallengeStepContentResource(
    createChallengeStepContentIndex(moduleLoaders),
  )
}

describe('challenge-step-content-resolver', () => {
  it('returns precompiled section components without runtime hydration', async () => {
    const resource = createChallengeStepResource({
      '/src/content/challenges/steps/test-step/index.en.mdx': () =>
        Promise.resolve({
          default: ArticleComponent,
          frontmatter: { stepType: 'sectioned' },
          challengeSections: [
            {
              id: 'intro',
              title: 'Intro',
              bodySource: 'Intro copy',
              interactive: null,
              Component: IntroSectionComponent,
            },
          ],
        }),
    })

    const result = await resource.preloadContent({
      contentDir: 'test-step',
      locale: 'en',
    })

    expect(result.kind).toBe('sectioned')
    expect(result.sections).toHaveLength(1)
    expect(result.sections[0]?.Component).toBe(IntroSectionComponent)
  })

  it('falls back to the default locale when the requested locale is missing', async () => {
    const resource = createChallengeStepResource({
      '/src/content/challenges/steps/test-step/index.en.mdx': () =>
        Promise.resolve({
          default: ArticleComponent,
          frontmatter: {},
        }),
    })

    const result = await resource.preloadContent({
      contentDir: 'test-step',
      locale: 'ro',
    })

    expect(result.kind).toBe('article')
    expect(result.Component).toBe(ArticleComponent)
  })

  it('falls back to the default locale for sectioned steps without losing sections', async () => {
    const resource = createChallengeStepResource({
      '/src/content/challenges/steps/test-step/index.en.mdx': () =>
        Promise.resolve({
          default: ArticleComponent,
          frontmatter: { stepType: 'sectioned' },
          challengeSections: [
            {
              id: 'intro',
              title: 'Intro',
              bodySource: 'Intro copy',
              interactive: null,
              Component: FallbackSectionComponent,
            },
          ],
        }),
    })

    const result = await resource.preloadContent({
      contentDir: 'test-step',
      locale: 'ro',
    })

    expect(result.kind).toBe('sectioned')
    expect(result.Component).toBe(ArticleComponent)
    expect(result.sections).toHaveLength(1)
    expect(result.sections[0]?.Component).toBe(FallbackSectionComponent)
  })

  it('dedupes concurrent preloads and reuses the cached module for subsequent reads', async () => {
    const deferredModule =
      createDeferredPromise<ChallengeStepMdxModule>()
    const loadModule = vi.fn(() => deferredModule.promise)
    const resource = createChallengeStepResource({
      '/src/content/challenges/steps/test-step/index.en.mdx': loadModule,
    })

    const firstPreload = resource.preloadModule({
      contentDir: 'test-step',
      locale: 'en',
    })
    const secondPreload = resource.preloadModule({
      contentDir: 'test-step',
      locale: 'en',
    })

    expect(loadModule).toHaveBeenCalledTimes(1)

    deferredModule.resolve({
      default: ArticleComponent,
      frontmatter: {},
    })

    await expect(firstPreload).resolves.toMatchObject({
      resolvedLocale: 'en',
    })
    await expect(secondPreload).resolves.toMatchObject({
      resolvedLocale: 'en',
    })

    const firstRead = resource.readContent({
      contentDir: 'test-step',
      locale: 'en',
    })
    const secondRead = resource.readContent({
      contentDir: 'test-step',
      locale: 'en',
    })

    expect(loadModule).toHaveBeenCalledTimes(1)
    expect(firstRead.Component).toBe(ArticleComponent)
    expect(secondRead.Component).toBe(ArticleComponent)
  })

  it('reports missing section exports for sectioned steps', async () => {
    const resource = createChallengeStepResource({
      '/src/content/challenges/steps/test-step/index.en.mdx': () =>
        Promise.resolve({
          default: ArticleComponent,
          frontmatter: { stepType: 'sectioned' },
        }),
    })

    await expect(
      resource.preloadContent({
        contentDir: 'test-step',
        locale: 'en',
      }),
    ).rejects.toThrow('Missing sectioned step content export')
  })

  it('renders the real step body during SSR after preloading instead of the Suspense fallback', async () => {
    const resource = createChallengeStepResource({
      '/src/content/challenges/steps/test-step/index.en.mdx': () =>
        Promise.resolve({
          default: ArticleComponent,
          frontmatter: {},
        }),
    })

    await resource.preloadContent({
      contentDir: 'test-step',
      locale: 'en',
    })

    function ChallengeStepBody() {
      const content = resource.readContent({
        contentDir: 'test-step',
        locale: 'en',
      })
      return createElement(content.Component, {})
    }

    const renderedMarkup = renderToString(
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Challenge fallback') },
        createElement(ChallengeStepBody),
      ),
    )

    expect(renderedMarkup).toContain('Challenge article content')
    expect(renderedMarkup).not.toContain('Challenge fallback')
  })
})
