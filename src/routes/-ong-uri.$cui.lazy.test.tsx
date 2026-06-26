import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getMockNgoProfile,
  getMockPublicFunding,
} from '@/features/ngos/mocks/ngo-mocks'
import type { NgoProfileRouteLoaderData } from './ong-uri.$cui'

const ngoProfilePagePropsMock = vi.fn()

let mockedParams = { cui: '12345678' }
let mockedSearch: { tab?: string; evidence?: boolean } = {}
let mockedLoaderData: NgoProfileRouteLoaderData | undefined

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
    useLoaderData: () => mockedLoaderData,
  }),
}))

vi.mock('@/features/ngos/components/ngo-profile-page', () => ({
  NgoProfilePage: (props: Record<string, unknown>) => {
    ngoProfilePagePropsMock(props)
    return (
      <div data-testid="ngo-profile-page">
        {String(props.cui)}:{String(props.tab)}:{String(props.evidenceOpen)}
      </div>
    )
  },
  NgoProfileNotFound: () => (
    <div data-testid="ngo-profile-not-found">ONG negasit</div>
  ),
}))

describe('NgoProfileRoutePage', () => {
  beforeEach(() => {
    mockedParams = { cui: '12345678' }
    mockedSearch = { tab: 'dovezi', evidence: true }
    mockedLoaderData = {
      cui: '12345678',
      profile: getMockNgoProfile('12345678')!,
      funding: getMockPublicFunding('12345678'),
    }
    ngoProfilePagePropsMock.mockReset()
  })

  it('renders NgoProfilePage with loader data, tab, and evidence flag', async () => {
    const { Route } = await import('./ong-uri.$cui.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('ngo-profile-page')).toHaveTextContent(
      '12345678:dovezi:true',
    )
    expect(ngoProfilePagePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '12345678',
        initialProfile: mockedLoaderData?.profile,
        initialFunding: mockedLoaderData?.funding,
        tab: 'dovezi',
        evidenceOpen: true,
      }),
    )
  })

  it('renders NgoProfileNotFound when profile data is missing', async () => {
    mockedLoaderData = {
      cui: '00000000',
      profile: null as unknown as NgoProfileRouteLoaderData['profile'],
      funding: null,
    }

    const { Route } = await import('./ong-uri.$cui.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('ngo-profile-not-found')).toBeInTheDocument()
    expect(screen.getByText('ONG negasit')).toBeInTheDocument()
    expect(ngoProfilePagePropsMock).not.toHaveBeenCalled()
  })

  it('renders NgoProfileNotFound when loader data is undefined', async () => {
    mockedLoaderData = undefined

    const { Route } = await import('./ong-uri.$cui.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('ngo-profile-not-found')).toBeInTheDocument()
    expect(ngoProfilePagePropsMock).not.toHaveBeenCalled()
  })
})
