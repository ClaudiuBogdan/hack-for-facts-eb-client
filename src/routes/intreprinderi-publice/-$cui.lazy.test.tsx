import { render, screen } from '@testing-library/react'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockPublicEnterpriseProfile } from '@/features/public-enterprises/mocks/fixtures'

let mockedParams = { cui: '10020943' }
let mockedSearch: Record<string, unknown> = { tab: 'profil' }
let mockedLoaderData:
  | {
      profile?: ReturnType<typeof getMockPublicEnterpriseProfile>
      cui?: string
    }
  | undefined

const profileRouteSpy = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => mockedParams,
    useSearch: () => mockedSearch,
    useLoaderData: () => mockedLoaderData,
  }),
}))

vi.mock('@/features/public-enterprises/components/public-enterprises-pages', () => ({
  PublicEnterpriseProfileRoute: (props: {
    readonly profile: unknown
    readonly cui: string
    readonly search: unknown
  }) => {
    profileRouteSpy(props)
    return (
      <div
        data-testid="public-enterprise-profile"
        data-cui={props.cui}
        data-search={JSON.stringify(props.search)}
      />
    )
  },
  PublicEnterprisePageSkeleton: () => (
    <div data-testid="public-enterprise-skeleton" />
  ),
  PublicEnterpriseNotFound: () => (
    <div data-testid="public-enterprise-not-found" />
  ),
}))

describe('PublicEnterpriseProfileRoutePage', () => {
  beforeEach(() => {
    mockedParams = { cui: '10020943' }
    mockedSearch = { tab: 'profil' }
    mockedLoaderData = undefined
    profileRouteSpy.mockReset()
  })

  async function renderRoute() {
    const { Route } = await import('./$cui.lazy')
    const RouteComponent = Route.options.component as ComponentType
    render(<RouteComponent />)
  }

  it('renders a skeleton while loader data is missing', async () => {
    mockedLoaderData = undefined

    await renderRoute()

    expect(screen.getByTestId('public-enterprise-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('public-enterprise-profile')).not.toBeInTheDocument()
  })

  it('renders the profile route from loader data', async () => {
    const profile = getMockPublicEnterpriseProfile('10020943')
    mockedLoaderData = { profile: profile ?? undefined, cui: '10020943' }

    await renderRoute()

    expect(screen.getByTestId('public-enterprise-profile')).toBeInTheDocument()
    expect(profileRouteSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        cui: '10020943',
        search: { tab: 'profil' },
        profile,
      }),
    )
  })

  it('exposes the not-found component for missing enterprises', async () => {
    const { Route } = await import('./$cui.lazy')
    const NotFoundComponent = Route.options.notFoundComponent as ComponentType

    render(<NotFoundComponent />)

    expect(screen.getByTestId('public-enterprise-not-found')).toBeInTheDocument()
  })
})
