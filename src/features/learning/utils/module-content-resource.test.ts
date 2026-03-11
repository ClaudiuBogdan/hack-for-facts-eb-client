import { Suspense, createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { createDeferredPromise } from '@/test/helpers'
import {
  createLearningModuleContentIndex,
  createLearningModuleContentResource,
  type LearningMdxModule,
  type LearningMdxModuleLoader,
} from './module-content-resource'

function LessonComponent() {
  return createElement('div', null, 'Lesson body content')
}

function createLearningResource(
  moduleLoaders: Record<string, LearningMdxModuleLoader>,
) {
  return createLearningModuleContentResource(
    createLearningModuleContentIndex(moduleLoaders),
  )
}

describe('module-content-resource', () => {
  it('loads the requested locale when it exists', async () => {
    const resource = createLearningResource({
      '/src/content/learning/modules/test-lesson/index.ro.mdx': () =>
        Promise.resolve({
          default: LessonComponent,
        }),
    })

    const result = await resource.preload({
      contentDir: 'test-lesson',
      locale: 'ro',
    })

    expect(result.resolvedLocale).toBe('ro')
    expect(result.module.default).toBe(LessonComponent)
  })

  it('falls back to the default locale when the requested locale is missing', async () => {
    const resource = createLearningResource({
      '/src/content/learning/modules/test-lesson/index.en.mdx': () =>
        Promise.resolve({
          default: LessonComponent,
        }),
    })

    const result = await resource.preload({
      contentDir: 'test-lesson',
      locale: 'ro',
    })

    expect(result.resolvedLocale).toBe('en')
    expect(result.module.default).toBe(LessonComponent)
  })

  it('dedupes concurrent preloads and serves subsequent reads from cache', async () => {
    const deferredModule = createDeferredPromise<LearningMdxModule>()
    const loadModule = vi.fn(() => deferredModule.promise)
    const resource = createLearningResource({
      '/src/content/learning/modules/test-lesson/index.en.mdx': loadModule,
    })

    const firstPreload = resource.preload({
      contentDir: 'test-lesson',
      locale: 'en',
    })
    const secondPreload = resource.preload({
      contentDir: 'test-lesson',
      locale: 'en',
    })

    expect(loadModule).toHaveBeenCalledTimes(1)

    deferredModule.resolve({
      default: LessonComponent,
    })

    await firstPreload
    await secondPreload

    const firstRead = resource.read({
      contentDir: 'test-lesson',
      locale: 'en',
    })
    const secondRead = resource.read({
      contentDir: 'test-lesson',
      locale: 'en',
    })

    expect(loadModule).toHaveBeenCalledTimes(1)
    expect(firstRead.module.default).toBe(LessonComponent)
    expect(secondRead.module.default).toBe(LessonComponent)
  })

  it('throws a descriptive error when the module content is missing', async () => {
    const resource = createLearningResource({})

    await expect(
      resource.preload({
        contentDir: 'missing-lesson',
        locale: 'en',
      }),
    ).rejects.toThrow('Missing module content')
  })

  it('renders the real lesson body during SSR after preloading instead of the Suspense fallback', async () => {
    const resource = createLearningResource({
      '/src/content/learning/modules/test-lesson/index.en.mdx': () =>
        Promise.resolve({
          default: LessonComponent,
        }),
    })

    await resource.preload({
      contentDir: 'test-lesson',
      locale: 'en',
    })

    function LessonBody() {
      const lessonModule = resource.read({
        contentDir: 'test-lesson',
        locale: 'en',
      })
      return createElement(lessonModule.module.default, {})
    }

    const renderedMarkup = renderToString(
      createElement(
        Suspense,
        { fallback: createElement('div', null, 'Lesson fallback') },
        createElement(LessonBody),
      ),
    )

    expect(renderedMarkup).toContain('Lesson body content')
    expect(renderedMarkup).not.toContain('Lesson fallback')
  })
})
