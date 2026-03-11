import { beforeEach, describe, expect, it, vi } from 'vitest'

const routeStub = vi.fn((options: Record<string, unknown>) => options)
const notFoundMock = vi.fn(() => new Error('NOT_FOUND'))
const getLearningPathByIdMock = vi.fn()
const preloadModuleContentMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => routeStub,
  notFound: notFoundMock,
}))

vi.mock('@/features/learning/utils/paths', () => ({
  getLearningPathById: getLearningPathByIdMock,
}))

vi.mock('@/features/learning/utils/module-content-resource', () => ({
  preloadModuleContent: preloadModuleContentMock,
}))

describe('learning lesson route loader', () => {
  beforeEach(() => {
    vi.resetModules()
    routeStub.mockClear()
    notFoundMock.mockClear()
    getLearningPathByIdMock.mockReset()
    preloadModuleContentMock.mockReset()
    preloadModuleContentMock.mockResolvedValue(undefined)
  })

  it('preloads the selected lesson content for SSR', async () => {
    getLearningPathByIdMock.mockReturnValue({
      modules: [
        {
          id: 'module-a',
          lessons: [
            {
              id: 'lesson-a',
              contentDir: 'citizen-foundations/lesson-a',
            },
          ],
        },
      ],
    })

    const { Route } = await import('./$lessonId')
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<null>
    }

    await expect(
      routeWithLoader.loader({
        params: {
          lang: 'ro',
          pathId: 'path-a',
          moduleId: 'module-a',
          lessonId: 'lesson-a',
        },
      }),
    ).resolves.toBeNull()

    expect(getLearningPathByIdMock).toHaveBeenCalledWith('path-a')
    expect(preloadModuleContentMock).toHaveBeenCalledWith({
      contentDir: 'citizen-foundations/lesson-a',
      locale: 'ro',
    })
  })

  it('throws notFound when the path, module, or lesson is missing', async () => {
    const { Route } = await import('./$lessonId')
    const routeWithLoader = Route as unknown as {
      loader: (input: Record<string, unknown>) => Promise<null>
    }

    getLearningPathByIdMock.mockReturnValue(null)
    await expect(
      routeWithLoader.loader({
        params: {
          lang: 'en',
          pathId: 'missing-path',
          moduleId: 'module-a',
          lessonId: 'lesson-a',
        },
      }),
    ).rejects.toThrow('NOT_FOUND')

    getLearningPathByIdMock.mockReturnValue({ modules: [] })
    await expect(
      routeWithLoader.loader({
        params: {
          lang: 'en',
          pathId: 'path-a',
          moduleId: 'missing-module',
          lessonId: 'lesson-a',
        },
      }),
    ).rejects.toThrow('NOT_FOUND')

    getLearningPathByIdMock.mockReturnValue({
      modules: [
        {
          id: 'module-a',
          lessons: [],
        },
      ],
    })
    await expect(
      routeWithLoader.loader({
        params: {
          lang: 'en',
          pathId: 'path-a',
          moduleId: 'module-a',
          lessonId: 'missing-lesson',
        },
      }),
    ).rejects.toThrow('NOT_FOUND')

    expect(preloadModuleContentMock).not.toHaveBeenCalled()
  })
})
