import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PUBLIC_ENTERPRISE_HUB_SNAPSHOT } from '@/features/public-enterprises/lib/hub-snapshot'
import type { PublicEnterpriseHubSearch } from '@/schemas/public-enterprises'

const pageProps = vi.fn()
let search: PublicEnterpriseHubSearch = {}

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => search,
  }),
}))

vi.mock('@/features/public-enterprises/components/hub/public-enterprise-hub-page', () => ({
  PublicEnterpriseHubPage: (props: Record<string, unknown>) => {
    pageProps(props)
    return <div data-testid="public-enterprise-hub-page" />
  },
}))

describe('/public-enterprises route page', () => {
  beforeEach(() => {
    search = {}
    pageProps.mockReset()
  })

  it('renders the hub from the snapshot kept in the client, with the URL state', async () => {
    search = { autoritati: 'local', marime: 'pierdere' }
    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType
    render(<RouteComponent />)
    expect(screen.getByTestId('public-enterprise-hub-page')).toBeInTheDocument()
    expect(pageProps).toHaveBeenCalledWith({ snapshot: PUBLIC_ENTERPRISE_HUB_SNAPSHOT, search: { autoritati: 'local', marime: 'pierdere' } })
  })
})
