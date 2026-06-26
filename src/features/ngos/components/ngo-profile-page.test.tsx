import { fireEvent, render, screen, waitFor, within } from '@/test/test-utils'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMockNgoProfile,
  getMockPublicFunding,
} from '@/features/ngos/mocks/ngo-mocks'
import { NgoProfilePage } from './ngo-profile-page'

const navigateMock = vi.fn()

const profileQueryState = {
  data: undefined as ReturnType<typeof getMockNgoProfile> | undefined,
  isLoading: false,
  isError: false,
}

const fundingQueryState = {
  data: undefined as ReturnType<typeof getMockPublicFunding> | undefined,
  isLoading: false,
}

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
  Link: ({
    children,
    to,
    params,
  }: {
    readonly children: ReactNode
    readonly to?: string
    readonly params?: Record<string, string>
  }) => {
    const resolvedTo = to?.replace(/\$(\w+)/g, (_, key: string) => params?.[key] ?? `$${key}`)
    return <a href={resolvedTo ?? '#'}>{children}</a>
  },
}))

vi.mock('../hooks/use-ngos', () => ({
  useNgoProfile: () => profileQueryState,
  useNgoPublicFunding: () => fundingQueryState,
}))

function renderProfile(
  cui: string,
  tab: Parameters<typeof NgoProfilePage>[0]['tab'] = 'identitate',
  evidenceOpen = false,
) {
  const profile = getMockNgoProfile(cui)
  if (!profile) throw new Error(`Missing mock profile for ${cui}`)

  return render(
    <NgoProfilePage
      cui={cui}
      initialProfile={profile}
      initialFunding={getMockPublicFunding(cui)}
      tab={tab}
      evidenceOpen={evidenceOpen}
    />,
  )
}

describe('NgoProfilePage', () => {
  beforeEach(() => {
    profileQueryState.data = undefined
    profileQueryState.isLoading = false
    profileQueryState.isError = false
    fundingQueryState.data = undefined
    fundingQueryState.isLoading = false
    navigateMock.mockReset()
  })

  it('renders confirmed direct-CUI identity and trust rules on the identity tab', () => {
    renderProfile('12345678', 'identitate')

    expect(
      screen.getByRole('status', { name: 'Identitate confirmată prin CUI' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Identitate confirmata')).toBeInTheDocument()
    expect(screen.getByText('Reguli de incredere')).toBeInTheDocument()
    expect(
      screen.getByText(/Datele ANOFM si MMuncii au CUI direct/),
    ).toBeInTheDocument()
    expect(screen.getByText('Surse directe pentru CUI')).toBeInTheDocument()
  })

  it('navigates with the selected tab when a tab is clicked', async () => {
    renderProfile('12345678', 'identitate')

    fireEvent.click(screen.getByRole('tab', { name: 'Financiar' }))

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalled()
    })

    const updateCall = navigateMock.mock.calls[0]?.[0]
    expect(updateCall).toMatchObject({
      to: '/ong-uri/$cui',
      params: { cui: '12345678' },
    })
    expect(updateCall.search({ tab: 'identitate' })).toMatchObject({
      tab: 'financiar',
    })
  })

  it('renders explicit zero-row financial in-progress state', () => {
    renderProfile('12345678', 'financiar')

    expect(
      screen.getByText('Indicatorii financiari sunt in curs de incarcare'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Tabela ngo.financial_indicators are 0 randuri/),
    ).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('shows unconfirmed MJ/SGG guardrails on the registru tab, not as confirmed identity', () => {
    renderProfile('9990003', 'registru')

    expect(screen.getByText('Referințe neconfirmate')).toBeInTheDocument()
    expect(
      screen.getByText(/nu au fost asociate unui CUI confirmat/),
    ).toBeInTheDocument()
    expect(screen.getByText('Asociația Lumina pentru Copii')).toBeInTheDocument()
    expect(
      screen.getAllByRole('status', {
        name: 'Identitate neconfirmată — referință din registru',
      }).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText('Posibila potrivire')).toBeInTheDocument()
    expect(
      screen.getByText(/Potrivire probabilă pe nume; CUI lipsă în sursa MJ/),
    ).toBeInTheDocument()
  })

  it('shows SGG utility references as unconfirmed on the utilitate tab', () => {
    renderProfile('9990003', 'utilitate')

    expect(screen.getByText('Referințe neconfirmate')).toBeInTheDocument()
    expect(
      screen.getByText('Utilitate publica mentionata de SGG'),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('status', {
        name: 'Identitate neconfirmată — referință din registru',
      }).length,
    ).toBeGreaterThan(0)
  })

  it('opens provenance drawer details when a source citation is activated', async () => {
    renderProfile('12345678', 'identitate')

    const citationButtons = screen.getAllByRole('button', { name: /^Vezi sursa:/ })
    fireEvent.click(citationButtons[0]!)

    await waitFor(() => {
      expect(screen.getByText('Sursa datelor')).toBeInTheDocument()
    })

    const drawer = screen.getByRole('dialog')
    expect(within(drawer).getByText('URL sursă')).toBeInTheDocument()
    expect(
      within(drawer).getByRole('link', { name: /rueis\.anofm\.ro/i }),
    ).toBeInTheDocument()
    expect(within(drawer).getByText('Vezi sursa completă')).toBeInTheDocument()
  })
})
