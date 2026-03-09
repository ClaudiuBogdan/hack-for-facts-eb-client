import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestQueryClient } from '@/test/test-utils'
import { BugetEntityMapSelectorPage } from './buget-entity-map-selector-page'

const navigateMock = vi.fn()
const setSelectedEntityMock = vi.fn()
const toastWarningMock = vi.fn()
const entityRoutingSummaryQueryFnMock = vi.fn()

const natcodeToCuiMap = new Map<string, string>([
  ['1017', '4305857'],
  ['179132', '4267117'],
])

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to, search, ...props }: any) => {
    const query = search ? new URLSearchParams(search).toString() : ''
    const href = typeof to === 'string'
      ? `${to}${query ? `?${query}` : ''}`
      : '#'

    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  },
  useNavigate: () => navigateMock,
}))

vi.mock('sonner', () => ({
  toast: {
    warning: (...args: unknown[]) => toastWarningMock(...args),
  },
}))

vi.mock('@/lib/analytics', () => ({
  Analytics: {
    EVENTS: {
      CampaignEntityMapSelectorOpened: 'CampaignEntityMapSelectorOpened',
      CampaignEntitySelectedFromMap: 'CampaignEntitySelectedFromMap',
    },
    capture: vi.fn(),
  },
}))

vi.mock('../../hooks/use-campaign-progress', () => ({
  useCampaignProgress: () => ({
    setSelectedEntity: setSelectedEntityMock,
  }),
}))

vi.mock('@/hooks/useGeoJson', () => ({
  useGeoJsonData: () => ({
    data: { type: 'FeatureCollection', features: [] },
    isLoading: false,
    error: null,
  }),
}))

vi.mock('../../hooks/use-uat-cui-map', () => ({
  useUatCuiMap: () => ({
    data: {
      natcodeToCuiMap,
      validRows: natcodeToCuiMap.size,
      invalidRows: 0,
      duplicateNatcodeRows: 0,
    },
    isLoading: false,
    error: null,
  }),
}))

vi.mock('@/lib/hooks/useEntityDetails', () => ({
  entityRoutingSummaryQueryOptions: ({ cui }: { readonly cui: string }) => ({
    queryKey: ['entityRoutingSummary', cui],
    queryFn: () => entityRoutingSummaryQueryFnMock(cui),
    staleTime: 1000 * 60 * 5,
  }),
}))

vi.mock('./buget-entity-map-selector-map', () => ({
  BugetEntityMapSelectorMap: ({
    onUatSelect,
  }: {
    readonly onUatSelect: (input: { natcode: string; name: string }) => void
  }) => (
    <div>
      <button
        type="button"
        onClick={() => onUatSelect({ natcode: '1017', name: 'Cluj-Napoca' })}
      >
        Select mapped UAT
      </button>
      <button
        type="button"
        onClick={() => onUatSelect({ natcode: '179132', name: 'Judet test' })}
      >
        Select county
      </button>
      <button
        type="button"
        onClick={() => onUatSelect({ natcode: '9999', name: 'Missing mapping' })}
      >
        Select missing mapping
      </button>
    </div>
  ),
}))

describe('BugetEntityMapSelectorPage', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    setSelectedEntityMock.mockReset()
    toastWarningMock.mockReset()
    entityRoutingSummaryQueryFnMock.mockReset()
  })

  it('links the back action to the canonical selector route', () => {
    render(<BugetEntityMapSelectorPage locale="ro" />)

    expect(
      screen.getByRole('link', { name: /Înapoi la căutare/i }),
    ).toHaveAttribute('href', '/primarie')
  })

  it('routes non-county selections to the primarie page and preserves language', async () => {
    entityRoutingSummaryQueryFnMock.mockResolvedValue({
      cui: '4305857',
      entity_type: 'admin_municipality',
      is_uat: true,
    })

    render(<BugetEntityMapSelectorPage locale="ro" languageQuery="en" />, {
      queryClient: createTestQueryClient(),
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Select mapped UAT' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(setSelectedEntityMock).toHaveBeenCalledWith({ entityCui: '4305857' })
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857',
        search: { lang: 'en' },
        replace: true,
      })
    })
  })

  it('keeps county selections on the current challenge route', async () => {
    entityRoutingSummaryQueryFnMock.mockResolvedValue({
      cui: '4267117',
      entity_type: 'admin_county_council',
      is_uat: false,
    })

    render(<BugetEntityMapSelectorPage locale="ro" />, {
      queryClient: createTestQueryClient(),
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Select county' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4267117/buget/provocari',
        search: {},
        replace: true,
      })
    })
  })

  it('warns and does not navigate when natcode mapping is missing', async () => {
    render(<BugetEntityMapSelectorPage locale="ro" />, {
      queryClient: createTestQueryClient(),
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Select missing mapping' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(toastWarningMock).toHaveBeenCalled()
    })

    expect(setSelectedEntityMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })

  it('falls back to the current challenge route when entity routing lookup fails', async () => {
    entityRoutingSummaryQueryFnMock.mockRejectedValue(new Error('lookup failed'))

    render(<BugetEntityMapSelectorPage locale="ro" />, {
      queryClient: createTestQueryClient(),
    })

    fireEvent.click(await screen.findByRole('button', { name: 'Select mapped UAT' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857/buget/provocari',
        search: {},
        replace: true,
      })
    })
  })
})
