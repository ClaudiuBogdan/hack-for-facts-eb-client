import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'

/**
 * The route's page picks one of four states off the profile query: loading, a
 * failed read, a company no source knows, and the company. A failed read is
 * not a missing company, and the page is keyed by company so a move to
 * another starts it over.
 */

const query = vi.hoisted(() => ({
  current: {
    data: undefined as unknown,
    isLoading: false,
    isSuccess: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}))
const loaderData = vi.hoisted(() => ({ current: { cui: '2816464' } as { cui: string; profile?: unknown } | undefined }))
const pageProps = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    options,
    useParams: () => ({ cui: 'RO2816464' }),
    useSearch: () => ({ masura: 'profit' }),
    useLoaderData: () => loaderData.current,
  }),
  useParams: () => ({ cui: 'RO2816464' }),
}))

vi.mock('@/features/private-companies/hooks/use-private-company-profile', () => ({
  usePrivateCompanyProfile: () => query.current,
}))

vi.mock('@/hooks/use-client-document-title', () => ({ useClientDocumentTitle: vi.fn() }))

vi.mock('@/features/private-companies/components/profile/company-profile-page', () => ({
  CompanyProfilePage: (props: Record<string, unknown>) => {
    pageProps(props)
    return <div>Company page</div>
  },
}))

vi.mock('@/features/private-companies/components/profile/company-profile-states', () => ({
  CompanyProfileSkeleton: () => <div>Loading</div>,
  CompanyProfileError: ({ onRetry }: { readonly onRetry: () => void }) => (
    <button type="button" onClick={onRetry}>
      Read failed
    </button>
  ),
  CompanyProfileNotFound: ({ cui }: { readonly cui: string | null }) => <div>No company {cui ?? 'at all'}</div>,
}))

const PROFILE = { cui: '2816464', legalName: 'DEDEMAN SRL' }

async function routePage() {
  const { Route } = await import('./companies.$cui.lazy')
  return Route as unknown as { options: { component: ComponentType; notFoundComponent: ComponentType } }
}

describe('/companies/$cui page', () => {
  beforeEach(() => {
    pageProps.mockClear()
    loaderData.current = { cui: '2816464' }
    query.current = { data: undefined, isLoading: false, isSuccess: false, isError: false, isFetching: false, refetch: vi.fn() }
  })

  it('waits for the profile on its skeleton', async () => {
    query.current = { ...query.current, isLoading: true }
    const { options } = await routePage()
    render(<options.component />)
    expect(screen.getByText('Loading')).toBeInTheDocument()
  })

  it('tells a failed read from a missing company, and retries it', async () => {
    const refetch = vi.fn()
    query.current = { ...query.current, isError: true, refetch }
    const { options } = await routePage()
    render(<options.component />)
    screen.getByRole('button', { name: 'Read failed' }).click()
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('says a company no source knows is not there, by its normalised CUI', async () => {
    query.current = { ...query.current, isSuccess: true, data: null }
    const { options } = await routePage()
    render(<options.component />)
    expect(screen.getByText('No company 2816464')).toBeInTheDocument()
  })

  it('renders the company from the server’s profile before the query settles, with the URL’s choices', async () => {
    loaderData.current = { cui: '2816464', profile: PROFILE }
    const { options } = await routePage()
    render(<options.component />)
    expect(screen.getByText('Company page')).toBeInTheDocument()
    expect(pageProps).toHaveBeenCalledWith({ profile: PROFILE, cui: '2816464', search: { masura: 'profit' } })
  })

  it('answers the server path’s not-found in the page’s frame, naming the CUI only when it is one', async () => {
    const { options } = await routePage()
    render(<options.notFoundComponent />)
    expect(screen.getByText('No company 2816464')).toBeInTheDocument()
  })
})
