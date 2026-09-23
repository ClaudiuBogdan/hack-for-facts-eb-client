import type { ReactElement } from 'react'
import { render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StatisticsDatasetExplorerSearch, StatisticsDatasetPage } from '@/schemas/statistics'

const pageSpy = vi.fn()
const route = vi.hoisted(() => ({
  search: {} as StatisticsDatasetExplorerSearch,
  loaderData: {} as { readonly page?: StatisticsDatasetPage; readonly pageKey: string },
}))

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: { readonly component: () => unknown }) => ({
    ...options,
    useSearch: () => route.search,
    useLoaderData: () => route.loaderData,
  }),
}))
vi.mock('@/features/statistics/pages/statistics-dataset-explorer-page', () => ({
  StatisticsDatasetExplorerPage: (props: unknown) => {
    pageSpy(props)
    return null
  },
}))

const page = { datasets: [], totalCount: 0 } as unknown as StatisticsDatasetPage

async function renderRoute() {
  const { Route } = await import('./index.lazy')
  const Component = (Route as unknown as { readonly component: () => ReactElement }).component
  render(<Component />)
  return pageSpy.mock.calls[pageSpy.mock.calls.length - 1]?.[0] as { readonly search: unknown; readonly initialPage?: unknown }
}

describe('/ins/seturi lazy route', () => {
  beforeEach(async () => {
    pageSpy.mockReset()
    const { explorerPageKey } = await import('@/features/statistics/hooks/use-dataset-explorer')
    route.search = { context: '1508' }
    route.loaderData = { page, pageKey: explorerPageKey({ context: '1508' }) }
  })

  it('seeds the page with the server’s read of this very address', async () => {
    const props = await renderRoute()
    expect(props.initialPage).toBe(page)
    expect(props.search).toEqual({ context: '1508' })
  })

  it('never seeds a page read for another address', async () => {
    route.search = { context: '1508', pagina: 2 }
    const props = await renderRoute()
    expect(props).not.toHaveProperty('initialPage')
  })

  it('has nothing to seed on a client-side navigation', async () => {
    route.loaderData = { pageKey: route.loaderData.pageKey }
    const props = await renderRoute()
    expect(props).not.toHaveProperty('initialPage')
  })
})
