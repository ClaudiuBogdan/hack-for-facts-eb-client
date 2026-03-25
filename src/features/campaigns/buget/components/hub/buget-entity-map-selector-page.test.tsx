import { fireEvent, render, screen, waitFor } from '@/test/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BugetEntityMapSelectorPage } from './buget-entity-map-selector-page'

const navigateMock = vi.fn()
const setSelectedEntityMock = vi.fn()
const toastWarningMock = vi.fn()

const natcodeToCuiMap = new Map<string, string>([
  ['1017', '4305857'],
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
  })

  it('links the back action to the canonical selector route', () => {
    render(<BugetEntityMapSelectorPage locale="ro" />)

    expect(
      screen.getByRole('link', { name: /Înapoi la căutare/i }),
    ).toHaveAttribute('href', '/primarie')
  })

  it('routes map selections to the challenges hub and preserves language', async () => {
    render(<BugetEntityMapSelectorPage locale="ro" languageQuery="en" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Select mapped UAT' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(setSelectedEntityMock).toHaveBeenCalledWith({ entityCui: '4305857' })
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857/buget/provocari',
        search: { lang: 'en' },
        replace: true,
      })
    })
  })

  it('preserves redirectUri on the back link and confirmed selection', async () => {
    const redirectUri =
      '/primarie/$cui/buget/provocari/test-module/test-challenge/test-step?lang=en&view=section'

    render(
      <BugetEntityMapSelectorPage
        locale="ro"
        languageQuery="en"
        redirectUri={redirectUri}
      />,
    )

    const backLink = screen.getByRole('link', { name: /Înapoi la căutare/i })
    const backLinkUrl = new URL(backLink.getAttribute('href') ?? '', 'https://example.com')

    expect(backLinkUrl.pathname).toBe('/primarie')
    expect(backLinkUrl.searchParams.get('lang')).toBe('en')
    expect(backLinkUrl.searchParams.get('redirectUri')).toBe(redirectUri)

    fireEvent.click(await screen.findByRole('button', { name: 'Select mapped UAT' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857/buget/provocari/test-module/test-challenge/test-step',
        search: { lang: 'en', view: 'section' },
        replace: true,
      })
    })
  })

  it('falls back to the challenges hub when redirectUri points to an unsupported primarie route', async () => {
    render(
      <BugetEntityMapSelectorPage
        locale="ro"
        languageQuery="en"
        redirectUri="/primarie/$cui/not-a-route"
      />,
    )

    fireEvent.click(await screen.findByRole('button', { name: 'Select mapped UAT' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/primarie/4305857/buget/provocari',
        search: { lang: 'en' },
        replace: true,
      })
    })
  })

  it('warns and does not navigate when natcode mapping is missing', async () => {
    render(<BugetEntityMapSelectorPage locale="ro" />)

    fireEvent.click(await screen.findByRole('button', { name: 'Select missing mapping' }))
    fireEvent.click(await screen.findByRole('button', { name: /Selectează primăria/i }))

    await waitFor(() => {
      expect(toastWarningMock).toHaveBeenCalled()
    })

    expect(setSelectedEntityMock).not.toHaveBeenCalled()
    expect(navigateMock).not.toHaveBeenCalled()
  })
})
