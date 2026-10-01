import type { ComponentType } from 'react'
import { render, screen } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { FUNKY, FUNKY_STATEMENTS } from '@/features/ngos/organization/test/fixtures'

const pageProps = vi.fn()
const navigate = vi.fn()
const invalidate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useLoaderData: () => ({ organization: FUNKY, statementsRead: { status: 'ready', statements: FUNKY_STATEMENTS } }),
    useSearch: () => ({ an: 2023 }),
  }),
  useNavigate: () => navigate,
  useRouter: () => ({ invalidate }),
  useRouterState: () => false,
}))
vi.mock('@/features/ngos/organization/components/ngo-organization-page', () => ({
  NgoOrganizationPage: (props: Record<string, unknown>) => {
    pageProps(props)
    return <div>Profile</div>
  },
}))
vi.mock('@/features/ngos/organization/components/profile-fallbacks', () => ({
  NgoProfileNotFound: () => <div>No such NGO</div>,
  NgoProfileUnavailable: () => <div>Read unavailable</div>,
}))

describe('the NGO profile route', () => {
  it('hands the page the loader’s three reads and the year in the address', async () => {
    const { Route } = await import('./ngos.$cui.lazy')
    const Component = Route.options.component as ComponentType
    render(<Component />)
    expect(screen.getByText('Profile')).toBeInTheDocument()
    const props = pageProps.mock.calls[0]![0] as { organization: unknown; year: number; onYear: (year: number) => void; onRetry: () => void }
    expect(props.organization).toBe(FUNKY)
    expect(props.year).toBe(2023)
    props.onYear(2021)
    const call = navigate.mock.calls[0]![0] as { search: (previous: Record<string, unknown>) => Record<string, unknown>; replace: boolean }
    expect(call.search({ lang: 'en' })).toEqual({ lang: 'en', an: 2021 })
    expect(call.replace).toBe(true)
    props.onRetry()
    expect(invalidate).toHaveBeenCalled()
  })

  it('keeps „no such organisation" apart from a failed read', async () => {
    const { Route } = await import('./ngos.$cui.lazy')
    const Missing = Route.options.notFoundComponent as ComponentType
    const Failed = Route.options.errorComponent as ComponentType
    render(
      <>
        <Missing />
        <Failed />
      </>,
    )
    expect(screen.getByText('No such NGO')).toBeInTheDocument()
    expect(screen.getByText('Read unavailable')).toBeInTheDocument()
  })
})
