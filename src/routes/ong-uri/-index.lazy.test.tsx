import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NGO_REGISTRY_SUMMARY } from '@/features/ngos/hub/registry-summary'
import type { NgoLandingSearch } from '@/schemas/ngos'

const pageProps = vi.fn()
let search: NgoLandingSearch = {}
let registryEnabled = true

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => search,
    useLoaderData: () => ({ summary: NGO_REGISTRY_SUMMARY }),
  }),
}))

vi.mock('@/config/env', () => ({
  isNgoRegistryEnabled: () => registryEnabled,
}))

vi.mock('@/features/ngos/hub/ngo-hub-page', () => ({
  NgoHubPage: (props: Record<string, unknown>) => {
    pageProps(props)
    return <div data-testid="ngo-hub-page" />
  },
}))

async function renderRoute() {
  const { Route } = await import('./index.lazy')
  const RouteComponent = Route.options.component as ComponentType
  render(<RouteComponent />)
}

describe('/ong-uri route page', () => {
  beforeEach(() => {
    search = {}
    registryEnabled = true
    pageProps.mockReset()
  })

  it('renders the hub from the summary the loader brings, with the URL layer', async () => {
    search = { indicator: 'noi' }
    await renderRoute()
    expect(screen.getByTestId('ngo-hub-page')).toBeInTheDocument()
    expect(pageProps).toHaveBeenCalledWith({ summary: NGO_REGISTRY_SUMMARY, search: { indicator: 'noi' }, registry: true })
  })

  it('passes the registry flag through, so the page can leave its links out', async () => {
    registryEnabled = false
    await renderRoute()
    expect(pageProps).toHaveBeenCalledWith(expect.objectContaining({ registry: false }))
  })
})
