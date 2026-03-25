import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const navigateMock = vi.fn()
const setSelectedEntityMock = vi.fn()
let mockedSearch: Record<string, unknown> = {}

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => mockedSearch,
  }),
  useNavigate: () => navigateMock,
}))

vi.mock('@/features/campaigns/buget/components/hub/buget-entity-selector-gate', () => ({
  BugetEntitySelectorGate: ({
    onEntitySelected,
  }: {
    readonly onEntitySelected: (entity: { cui: string }) => void
  }) => (
    <button
      type="button"
      onClick={() => onEntitySelected({ cui: '4305857' })}
    >
      Select entity
    </button>
  ),
}))

vi.mock('@/features/campaigns/buget/components/layout/campaign-page-frame', () => ({
  CampaignPageFrame: ({ children }: { readonly children: ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock('@/features/campaigns/buget/hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => ({
    setSelectedEntity: setSelectedEntityMock,
  }),
}))

describe('PrimarieSelectorRoutePage', () => {
  beforeEach(() => {
    mockedSearch = {}
    navigateMock.mockReset()
    setSelectedEntityMock.mockReset()
  })

  it('routes typed search selections to the challenges hub and preserves language', async () => {
    mockedSearch = { lang: 'en' }

    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Select entity' }))

    await waitFor(() => {
      expect(setSelectedEntityMock).toHaveBeenCalledWith({ entityCui: '4305857' })
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857/buget/provocari',
        search: { lang: 'en' },
        replace: true,
        resetScroll: false,
      })
    })
  })

  it('honors redirectUri templates when selecting a new entity', async () => {
    mockedSearch = {
      lang: 'en',
      redirectUri:
        '/primarie/$cui/buget/provocari/test-module/test-challenge/test-step?lang=en&view=section',
    }

    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Select entity' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857/buget/provocari/test-module/test-challenge/test-step',
        search: { lang: 'en', view: 'section' },
        replace: true,
        resetScroll: false,
      })
    })
  })

  it('falls back to the challenges hub for unsupported primarie redirectUri values', async () => {
    mockedSearch = {
      lang: 'en',
      redirectUri: '/primarie/$cui/not-a-route',
    }

    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Select entity' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857/buget/provocari',
        search: { lang: 'en' },
        replace: true,
        resetScroll: false,
      })
    })
  })
})
