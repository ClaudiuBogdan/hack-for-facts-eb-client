import { render } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const entitySearchInputMock = vi.fn((_: Record<string, unknown>) => <div>Search input</div>)

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
  }),
}))

vi.mock('@/components/entities/EntitySearch', () => ({
  EntitySearchInput: (props: Record<string, unknown>) => entitySearchInputMock(props),
}))

vi.mock('@/components/entities/QuickEntityAccess', () => ({
  QuickEntityAccess: () => <div>Quick access</div>,
}))

vi.mock('@/components/landing/PageCard', () => ({
  PageCard: () => <div>Page card</div>,
}))

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
}))

describe('Index route', () => {
  beforeEach(() => {
    entitySearchInputMock.mockClear()
  })

  it('uses preferred-entity navigation for the landing search', async () => {
    const { Route } = await import('./index')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(entitySearchInputMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectionBehavior: 'navigate-to-preferred-entity',
      }),
    )
  })
})
