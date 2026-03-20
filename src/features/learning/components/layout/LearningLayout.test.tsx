import type { PropsWithChildren } from 'react'
import { render, screen } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LearningLayout } from './LearningLayout'
import { LessonRoutePending } from '../player/lesson-player-shell'

const mockLocation = {
  pathname: '/en/learning/test-path/test-module/test-lesson',
}

const setActivePathIdMock = vi.fn()

function buildHref(to: unknown) {
  return typeof to === 'string' ? to : '#'
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, ...props }: any) => (
    <a href={buildHref(to)} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="learning-layout-outlet" />,
  useLocation: () => mockLocation,
}))

vi.mock('../../hooks/use-learning-progress', () => ({
  LearningProgressProvider: ({ children }: PropsWithChildren) => <>{children}</>,
  useLearningProgress: () => ({
    progress: {
      activePathId: 'test-path',
      content: {},
    },
    setActivePathId: setActivePathIdMock,
  }),
}))

vi.mock('../../hooks/use-scroll-to-active', () => ({
  useScrollToActive: () => ({ current: null }),
}))

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: PropsWithChildren<Record<string, unknown>>) => (
    <button type="button" {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children }: PropsWithChildren) => <div>{children}</div>,
  SheetContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  SheetTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('./LoginBanner', () => ({
  LoginBanner: () => <div data-testid="login-banner" />,
}))

const learningPathDefinition = {
  id: 'test-path',
  title: { en: 'Test path', ro: 'Test path' },
  description: { en: 'Test description', ro: 'Test description' },
  modules: [
    {
      id: 'test-module',
      title: { en: 'Test module', ro: 'Test module' },
      description: { en: 'Module description', ro: 'Module description' },
      lessons: [
        {
          id: 'test-lesson',
          title: { en: 'Test lesson', ro: 'Test lesson' },
        },
      ],
    },
  ],
}

vi.mock('../../utils/paths', () => ({
  getLearningPaths: () => [learningPathDefinition],
  getLearningPathById: (pathId: string) =>
    pathId === learningPathDefinition.id ? learningPathDefinition : null,
  getAllLessons: () => learningPathDefinition.modules.flatMap((module) => module.lessons),
  getTranslatedText: (value: { en: string; ro: string }) => value.en,
}))

describe('LearningLayout', () => {
  beforeEach(() => {
    mockLocation.pathname = '/en/learning/test-path/test-module/test-lesson'
    setActivePathIdMock.mockClear()
  })

  it('adds intent preloading to sidebar lesson links', () => {
    render(
      <LearningLayout>
        <div>content</div>
      </LearningLayout>,
    )

    const lessonLinks = screen.getAllByRole('link', { name: /Test lesson/i })

    expect(lessonLinks.length).toBeGreaterThan(0)

    for (const lessonLink of lessonLinks) {
      expect(lessonLink).toHaveAttribute(
        'href',
        '/en/learning/test-path/test-module/test-lesson',
      )
      expect(lessonLink).toHaveAttribute('preload', 'intent')
    }
  })

  it('keeps the sidebar visible while the lesson outlet is pending', () => {
    render(
      <LearningLayout>
        <LessonRoutePending />
      </LearningLayout>,
    )

    expect(screen.getByTestId('learning-lesson-pending-shell')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Test lesson/i }).length).toBeGreaterThan(0)
  })
})
