import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ngoDomainCoverage } from '@/features/ngos/mocks/ngo-mocks'
import type { NgoLandingRouteLoaderData } from './index'

const ngoLandingPagePropsMock = vi.fn()

let mockedLoaderData: NgoLandingRouteLoaderData | undefined = {
  coverage: ngoDomainCoverage,
}

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useLoaderData: () => mockedLoaderData,
  }),
}))

vi.mock('@/features/ngos/components/ngo-landing-page', () => ({
  NgoLandingPage: (props: {
    readonly initialCoverage: NgoLandingRouteLoaderData['coverage']
  }) => {
    ngoLandingPagePropsMock(props)
    return (
      <div data-testid="ngo-landing-page">
        {props.initialCoverage?.lastFullLoad.runId ?? 'none'}
      </div>
    )
  },
}))

describe('NgoLandingRoutePage', () => {
  beforeEach(() => {
    mockedLoaderData = { coverage: ngoDomainCoverage }
    ngoLandingPagePropsMock.mockReset()
  })

  it('passes loader coverage into NgoLandingPage', async () => {
    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('ngo-landing-page')).toHaveTextContent('4931')
    expect(ngoLandingPagePropsMock).toHaveBeenCalledWith({
      initialCoverage: ngoDomainCoverage,
    })
  })

  it('falls back to null coverage when loader data is missing', async () => {
    mockedLoaderData = undefined

    const { Route } = await import('./index.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(ngoLandingPagePropsMock).toHaveBeenCalledWith({
      initialCoverage: null,
    })
  })
})
