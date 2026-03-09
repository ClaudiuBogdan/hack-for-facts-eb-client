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

  it('routes typed search selections to the primarie page and preserves language', async () => {
    mockedSearch = { lang: 'en' }

    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    fireEvent.click(screen.getByRole('button', { name: 'Select entity' }))

    await waitFor(() => {
      expect(setSelectedEntityMock).toHaveBeenCalledWith({ entityCui: '4305857' })
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/$cui',
        params: { cui: '4305857' },
        search: { lang: 'en' },
        replace: true,
        resetScroll: false,
      })
    })
  })
})
