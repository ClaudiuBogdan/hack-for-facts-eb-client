import type { PropsWithChildren } from 'react'
import { render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengesLayout } from './ChallengesLayout'

const mockLocation = {
  pathname: '/buget/87654321/provocari/test-module/test-challenge/test-step',
  search: {},
}

let mockCampaignProgressReady = true
let mockCampaignInitialResolutionReady = true
let mockChallengeProgressReady = true

const setSelectedEntityMock = vi.fn()

function buildHref(
  to: unknown,
  params?: Record<string, string>,
  search?: Record<string, unknown>,
) {
  if (typeof to !== 'string') {
    return '#'
  }

  const resolvedPath = Object.entries(params ?? {}).reduce(
    (currentValue, [key, value]) =>
      currentValue.replace(`$${key}`, encodeURIComponent(String(value))),
    to,
  )

  if (!search || Object.keys(search).length === 0) {
    return resolvedPath
  }

  const query = new URLSearchParams(
    Object.entries(search).reduce<Record<string, string>>((result, [key, value]) => {
      if (value !== undefined) {
        result[key] = String(value)
      }

      return result
    }, {}),
  )

  const serializedQuery = query.toString()
  return serializedQuery ? `${resolvedPath}?${serializedQuery}` : resolvedPath
}

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, params, search, ...props }: any) => (
    <a href={buildHref(to, params, search)} {...props}>
      {children}
    </a>
  ),
  Outlet: () => <div data-testid="outlet" />,
  useLocation: () => mockLocation,
}))

vi.mock('@/features/learning/hooks/use-learning-progress', () => ({
  LearningProgressProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}))

vi.mock('@/features/learning/hooks/use-scroll-to-active', () => ({
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
  SheetTitle: ({ children }: PropsWithChildren) => <div>{children}</div>,
  SheetTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: PropsWithChildren) => <div>{children}</div>,
}))

vi.mock('@/components/ui/collapsible', () => ({
  Collapsible: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CollapsibleContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CollapsibleTrigger: ({ children }: PropsWithChildren) => <button type="button">{children}</button>,
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => ({
    isReady: mockCampaignProgressReady,
    isInitialResolutionReady: mockCampaignInitialResolutionReady,
    progress: {
      selectedEntityCui: '12345678',
    },
    setSelectedEntity: setSelectedEntityMock,
  }),
}))

vi.mock('../../hooks/use-challenge-progress', () => ({
  useChallengeProgress: () => ({
    isReady: mockChallengeProgressReady,
    isStepCompleted: () => false,
    getStepStatus: () => 'not_started',
  }),
}))

const moduleDefinition = {
  id: 'module-1',
  slug: 'test-module',
  title: { ro: 'Test module', en: 'Test module' },
  description: { ro: 'Test description', en: 'Test description' },
  challenges: [
    {
      id: 'challenge-1',
      slug: 'test-challenge',
      title: { ro: 'Test challenge', en: 'Test challenge' },
      steps: [
        {
          id: 'step-1',
          slug: 'test-step',
          title: { ro: 'Test step', en: 'Test step' },
        },
      ],
    },
  ],
}

vi.mock('../../utils/modules', () => ({
  getChallengeModules: () => [moduleDefinition],
  getChallengeModuleBySlug: () => moduleDefinition,
  getChallengeModuleStats: () => ({
    completionPercentage: 0,
  }),
  getTranslatedText: (value: { ro: string; en: string }) => value.ro,
}))

describe('ChallengesLayout', () => {
  beforeEach(() => {
    mockLocation.pathname =
      '/buget/87654321/provocari/test-module/test-challenge/test-step'
    mockLocation.search = {}
    mockCampaignProgressReady = true
    mockCampaignInitialResolutionReady = true
    mockChallengeProgressReady = true
    setSelectedEntityMock.mockClear()
  })

  it('syncs the pathname CUI back into campaign progress', async () => {
    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    await waitFor(() => {
      expect(setSelectedEntityMock).toHaveBeenCalledWith({
        entityCui: '87654321',
      })
    })
  })

  it('keeps sidebar step links on the current challenge route', async () => {
    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    await waitFor(() => {
      const stepLinks = screen.getAllByRole('link', { name: /Test step/i })

      expect(stepLinks.length).toBeGreaterThan(0)

      for (const stepLink of stepLinks) {
        expect(stepLink).toHaveAttribute(
          'href',
          '/buget/87654321/provocari/test-module/test-challenge/test-step',
        )
      }
    })
  })

  it('keeps rendering the layout while progress is still resolving', () => {
    mockCampaignInitialResolutionReady = false

    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    expect(screen.getByText('content')).toBeInTheDocument()
  })

  it('does not block the shell while challenge progress is still bootstrapping', () => {
    mockChallengeProgressReady = false

    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    expect(screen.getByText('content')).toBeInTheDocument()
  })
})
