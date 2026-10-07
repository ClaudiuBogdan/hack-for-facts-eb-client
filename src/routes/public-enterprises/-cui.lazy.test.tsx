import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enterpriseReadFixture } from '@/features/public-enterprises/lib/test/enterprise-fixture'

type QueryState = { data: unknown; isError: boolean; refetch: () => void }
const pageProps = vi.fn()
let loaderData: Record<string, unknown> | undefined
const queries: { enterprise: QueryState; company: QueryState; buyer: QueryState } = {
  enterprise: { data: undefined, isError: false, refetch: vi.fn() },
  company: { data: undefined, isError: false, refetch: vi.fn() },
  buyer: { data: undefined, isError: false, refetch: vi.fn() },
}
const seeded = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => ({ cui: '789401' }),
    useLoaderData: () => loaderData,
  }),
  useParams: () => ({ cui: '789401' }),
  Link: ({ children }: { readonly children: unknown }) => children,
}))
vi.mock('@/features/public-enterprises/hooks/use-public-enterprise', () => ({
  usePublicEnterprise: (cui: string, initial: unknown) => {
    seeded('enterprise', cui, initial)
    return queries.enterprise
  },
  useEnterpriseCompany: (cui: string, initial: unknown) => {
    seeded('company', cui, initial)
    return queries.company
  },
  useEnterpriseBuyer: (cui: string, initial: unknown) => {
    seeded('buyer', cui, initial)
    return queries.buyer
  },
}))
vi.mock('@/features/public-enterprises/components/enterprise/public-enterprise-page', () => ({
  PublicEnterprisePage: (props: Record<string, unknown>) => {
    pageProps(props)
    return <div data-testid="public-enterprise-page" />
  },
}))
vi.mock('@/features/public-enterprises/components/enterprise/enterprise-states', () => ({
  PublicEnterpriseNotFound: ({ cui }: { readonly cui: string | null }) => <div data-testid="not-found">{cui}</div>,
  PublicEnterpriseLoadError: () => <div data-testid="load-error" />,
}))
vi.mock('@/features/public-enterprises/components/enterprise/enterprise-pending', () => ({
  PublicEnterprisePending: () => <div data-testid="pending" />,
}))

async function renderRoute() {
  const { Route } = await import('./$cui.lazy')
  const Component = (Route as unknown as { readonly options: { readonly component: ComponentType } }).options.component
  return render(<Component />)
}

describe('/public-enterprises/$cui route page', () => {
  beforeEach(() => {
    loaderData = undefined
    pageProps.mockReset()
    seeded.mockReset()
    queries.enterprise = { data: undefined, isError: false, refetch: vi.fn() }
    queries.company = { data: undefined, isError: false, refetch: vi.fn() }
    queries.buyer = { data: undefined, isError: false, refetch: vi.fn() }
  })

  it('seeds each read with the server’s answer and renders the page with each part’s state', async () => {
    const read = enterpriseReadFixture()
    loaderData = { cui: '789401', complete: true, enterprise: read, company: null }
    queries.enterprise.data = read
    queries.company.data = null
    queries.buyer.isError = true
    await renderRoute()
    expect(seeded).toHaveBeenCalledWith('enterprise', '789401', read)
    expect(seeded).toHaveBeenCalledWith('company', '789401', null)
    expect(screen.getByTestId('public-enterprise-page')).toBeInTheDocument()
    const props = pageProps.mock.lastCall?.[0] as { readonly company: unknown; readonly buyer: { readonly status: string } }
    expect(props.company).toEqual({ status: 'ready', value: null })
    expect(props.buyer.status).toBe('failed')
    expect(document.title).toBe('Tursib SA — Întreprinderi publice — Transparenta.eu')
  })

  it('shows the head’s shape while the enterprise reads, and says when the read failed', async () => {
    await renderRoute()
    expect(screen.getByTestId('pending')).toBeInTheDocument()
    queries.enterprise.isError = true
    await renderRoute()
    expect(screen.getByTestId('load-error')).toBeInTheDocument()
  })

  it('says a CUI no list holds is not a public enterprise', async () => {
    queries.enterprise.data = enterpriseReadFixture({ profile: null })
    await renderRoute()
    expect(screen.getByTestId('not-found')).toHaveTextContent('789401')
    expect(document.title).toBe('CUI 789401 — Transparenta.eu')
  })
})
