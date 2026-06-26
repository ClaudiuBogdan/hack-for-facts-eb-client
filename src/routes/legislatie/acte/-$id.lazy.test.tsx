import { render, screen } from '@/test/test-utils'
import type { ComponentType } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { legea227_2015Act } from '@/features/legal/mocks/fixtures'

let mockedParams = { id: 'lege-227-2015' }

vi.mock('@tanstack/react-router', () => ({
  createLazyFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    options,
    useParams: () => mockedParams,
  }),
  Link: ({
    children,
    to,
    ...props
  }: {
    readonly children: React.ReactNode
    readonly to: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/features/legal/hooks/use-legal-act', () => ({
  useLegalAct: vi.fn(),
}))

import { useLegalAct } from '@/features/legal/hooks/use-legal-act'

describe('Legal act detail lazy route', () => {
  beforeEach(() => {
    mockedParams = { id: 'lege-227-2015' }
    vi.mocked(useLegalAct).mockReturnValue({
      data: legea227_2015Act,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useLegalAct>)
  })

  it('reads Route.useParams and renders LegalActPage for the requested id', async () => {
    const { Route } = await import('./$id.lazy')
    const RouteComponent = Route.options.component as ComponentType

    render(<RouteComponent />)

    expect(useLegalAct).toHaveBeenCalledWith('lege-227-2015')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Legea nr. 227/2015' }),
    ).toBeInTheDocument()
  })
})
