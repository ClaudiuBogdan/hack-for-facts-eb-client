import type { PropsWithChildren } from 'react'
import { render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ChallengesLayout } from './ChallengesLayout'
import { ChallengeStepPendingShell } from '../player/challenge-step-pending-shell'

const mockLocation = {
  pathname: '/primarie/87654321/buget/provocari/test-module/test-challenge/test-step',
  search: {},
  searchStr: '',
}

let mockCampaignProgressReady = true
let mockCampaignInitialResolutionReady = true
let mockChallengeProgressReady = true
let challengeStepStatuses: Record<string, 'completed' | 'not_started'> = {}

const setSelectedEntityMock = vi.fn()
const setActiveChallengeModuleMock = vi.fn()
const getEntityLabelsMock = vi.fn()
let activeChallengeModuleSlug: string | null = null

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

vi.mock('@/lib/api/labels', () => ({
  getEntityLabels: (...args: unknown[]) => getEntityLabelsMock(...args),
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
      activeChallengeModuleSlug,
    },
    setSelectedEntity: setSelectedEntityMock,
    setActiveChallengeModule: setActiveChallengeModuleMock,
  }),
}))

vi.mock('../../hooks/use-challenge-progress', () => ({
  useChallengeProgress: () => ({
    isReady: mockChallengeProgressReady,
    isStepCompleted: (stepId: string) => challengeStepStatuses[stepId] === 'completed',
    getStepStatus: (stepId: string) => challengeStepStatuses[stepId] ?? 'not_started',
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

const secondModuleDefinition = {
  id: 'module-2',
  slug: 'second-module',
  title: { ro: 'Second module', en: 'Second module' },
  description: { ro: 'Second description', en: 'Second description' },
  challenges: [
    {
      id: 'challenge-2',
      slug: 'second-challenge',
      title: { ro: 'Second challenge', en: 'Second challenge' },
      steps: [
        {
          id: 'step-2',
          slug: 'second-step',
          title: { ro: 'Second step', en: 'Second step' },
        },
      ],
    },
  ],
}

vi.mock('../../utils/modules', () => ({
  getChallengeModules: () => [moduleDefinition, secondModuleDefinition],
  getChallengeModuleBySlug: (slug: string) =>
    [moduleDefinition, secondModuleDefinition].find((module) => module.slug === slug) ?? null,
  getChallengeModuleStats: () => ({
    completionPercentage: 0,
  }),
  resolveActiveChallengeModule: ({
    modules,
    routeModuleSlug,
    storedActiveModuleSlug,
  }: {
    modules: readonly typeof moduleDefinition[]
    routeModuleSlug?: string | null
    storedActiveModuleSlug?: string | null
  }) => {
    const isIncomplete = (module: typeof moduleDefinition) =>
      module.challenges.some((challenge) =>
        challenge.steps.some((step) => challengeStepStatuses[step.id] !== 'completed'),
      )

    const routeModule =
      modules.find((module) => module.slug === routeModuleSlug) ?? null
    if (routeModule) {
      return routeModule
    }

    const storedModuleIndex = storedActiveModuleSlug
      ? modules.findIndex((module) => module.slug === storedActiveModuleSlug)
      : -1

    if (storedModuleIndex >= 0) {
      const storedModule = modules[storedModuleIndex]
      if (isIncomplete(storedModule)) {
        return storedModule
      }

      return (
        modules.slice(storedModuleIndex + 1).find(isIncomplete) ??
        modules.slice(0, storedModuleIndex).find(isIncomplete) ??
        storedModule
      )
    }

    return modules.find(isIncomplete) ?? modules[modules.length - 1] ?? null
  },
  getTranslatedText: (value: { ro: string; en: string }) => value.ro,
}))

describe('ChallengesLayout', () => {
  beforeEach(() => {
    const encodedAnalytics = encodeURIComponent(
      JSON.stringify({
        target: {
          path: [{ type: 'fn', code: 'A.01' }],
        },
      }),
    )

    mockLocation.pathname =
      '/primarie/87654321/buget/provocari/test-module/test-challenge/test-step'
    mockLocation.search = {
      lang: 'en',
      view: 'section',
      section: 'overview',
      analytics: {
        target: {
          path: [{ type: 'fn', code: 'A.01' }],
        },
      },
    }
    mockLocation.searchStr =
      `?lang=en&view=section&section=overview&analytics=${encodedAnalytics}`
    mockCampaignProgressReady = true
    mockCampaignInitialResolutionReady = true
    mockChallengeProgressReady = true
    challengeStepStatuses = {}
    activeChallengeModuleSlug = null
    getEntityLabelsMock.mockReset()
    getEntityLabelsMock.mockResolvedValue([
      { id: '87654321', label: 'Cluj-Napoca' },
    ])
    setSelectedEntityMock.mockClear()
    setActiveChallengeModuleMock.mockClear()
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

  it('uses the stored active challenge module on hub routes without a module slug', async () => {
    mockLocation.pathname = '/primarie/87654321/buget/provocari'
    activeChallengeModuleSlug = 'second-module'

    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Second module').length).toBeGreaterThan(0)
    })
  })

  it('persists the route module slug when visiting a challenge route', async () => {
    mockLocation.pathname =
      '/primarie/87654321/buget/provocari/second-module/second-challenge/second-step'

    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    await waitFor(() => {
      expect(setActiveChallengeModuleMock).toHaveBeenCalledWith({
        moduleSlug: 'second-module',
      })
    })
  })

  it('advances the stored active module on hub routes when it has been completed', async () => {
    mockLocation.pathname = '/primarie/87654321/buget/provocari'
    activeChallengeModuleSlug = 'test-module'
    challengeStepStatuses = {
      'step-1': 'completed',
      'step-2': 'not_started',
    }

    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    await waitFor(() => {
      expect(setActiveChallengeModuleMock).toHaveBeenCalledWith({
        moduleSlug: 'second-module',
      })
    })
  })

  it('does not persist an active challenge module on non-challenge routes', async () => {
    mockLocation.pathname = '/primarie/87654321/buget/calendar'

    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    await waitFor(() => {
      expect(screen.getAllByText('Test module').length).toBeGreaterThan(0)
    })

    expect(setActiveChallengeModuleMock).not.toHaveBeenCalled()
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
          '/primarie/87654321/buget/provocari/test-module/test-challenge/test-step',
        )
        expect(stepLink).toHaveAttribute('preload', 'intent')
      }
    })
  })

  it('renders the sidebar switch badge with a redirectUri back to the current challenge page', async () => {
    const encodedAnalytics = encodeURIComponent(
      JSON.stringify({
        target: {
          path: [{ type: 'fn', code: 'A.01' }],
        },
      }),
    )

    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    const [switchLink] = await screen.findAllByTitle('Switch city hall')
    const switchLinkUrl = new URL(
      switchLink.getAttribute('href') ?? '',
      'https://example.com',
    )

    expect(switchLinkUrl.pathname).toBe('/primarie')
    expect(switchLinkUrl.searchParams.get('lang')).toBe('en')
    expect(switchLinkUrl.searchParams.get('redirectUri')).toBe(
      `/primarie/$cui/buget/provocari/test-module/test-challenge/test-step?lang=en&view=section&section=overview&analytics=${encodedAnalytics}`,
    )
  })

  it('keeps the sidebar visible while the step outlet is pending', () => {
    render(
      <ChallengesLayout>
        <ChallengeStepPendingShell />
      </ChallengesLayout>,
    )

    expect(screen.getByTestId('challenge-step-pending-shell')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Test step/i }).length).toBeGreaterThan(0)
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

  it('keeps the main content column at full viewport height', () => {
    render(
      <ChallengesLayout>
        <div>content</div>
      </ChallengesLayout>,
    )

    expect(screen.getByTestId('challenges-main-content')).toHaveClass(
      'min-h-full',
      'flex-1',
      'flex-col',
    )
  })
})
