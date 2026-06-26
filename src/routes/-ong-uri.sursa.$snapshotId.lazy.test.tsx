import { render, screen } from '@/test/test-utils'
import type { ComponentType, ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getMockSnapshotProvenance } from '@/features/ngos/mocks/ngo-mocks'
import type { NgoSnapshotRouteLoaderData } from './ong-uri.sursa.$snapshotId'

const ngoSnapshotPagePropsMock = vi.fn()

let mockedSearch: { from?: string } = {}
let mockedLoaderData: NgoSnapshotRouteLoaderData | undefined

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useSearch: () => mockedSearch,
    useLoaderData: () => mockedLoaderData,
  }),
  Link: ({
    children,
    to,
  }: {
    readonly children: ReactNode
    readonly to?: string
  }) => <a href={to ?? '#'}>{children}</a>,
}))

vi.mock('@/features/ngos/components/ngo-snapshot-page', () => ({
  NgoSnapshotPage: (props: Record<string, unknown>) => {
    ngoSnapshotPagePropsMock(props)
    return (
      <div data-testid="ngo-snapshot-page">
        {String(props.fromLabel)}
      </div>
    )
  },
}))

describe('NgoSnapshotRoutePage', () => {
  beforeEach(() => {
    const provenance = getMockSnapshotProvenance('mj_registry_2024_06')
    if (!provenance) throw new Error('Missing mock provenance')

    mockedSearch = { from: 'profil' }
    mockedLoaderData = { provenance }
    ngoSnapshotPagePropsMock.mockReset()
  })

  it('renders NgoSnapshotPage with provenance loader data and from label', async () => {
    const { Route } = await import('./ong-uri.sursa.$snapshotId.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(screen.getByTestId('ngo-snapshot-page')).toHaveTextContent('profil')
    expect(ngoSnapshotPagePropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        provenance: mockedLoaderData?.provenance,
        fromLabel: 'profil',
      }),
    )
  })

  it('renders not-found UX when loader data is missing', async () => {
    mockedLoaderData = undefined

    const { Route } = await import('./ong-uri.sursa.$snapshotId.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(
      screen.getByRole('heading', { name: 'Sursa ONG negăsită' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Înapoi la ONG-uri' }),
    ).toHaveAttribute('href', '/ong-uri')
    expect(ngoSnapshotPagePropsMock).not.toHaveBeenCalled()
  })
})
