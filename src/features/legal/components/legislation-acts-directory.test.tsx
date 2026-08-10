import {
  render as renderShared,
  screen,
  fireEvent,
  createTestQueryClient,
} from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { LegislationActsDirectory } from './legislation-acts-directory'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
  }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to}>{children}</a>
  ),
  useNavigate: () => navigateMock,
}))

const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

describe('LegislationActsDirectory', () => {
  it('lists acts with citation links and honest counts', async () => {
    render(<LegislationActsDirectory filter={{}} />)

    // The mock lane serves the overview fixture's ranked acts.
    const links = await screen.findAllByRole('link', { name: /nr\.|Codul/ })
    expect(links.length).toBeGreaterThan(0)
    // Mock totalCount is exact → the count line asserts a number, not "cel puțin".
    expect(screen.queryByText(/cel puțin/)).toBeNull()
  })

  it('writes filter changes to the URL (shareable link)', async () => {
    render(<LegislationActsDirectory filter={{}} />)
    await screen.findByLabelText(/Filtre/)

    fireEvent.change(screen.getByLabelText(/Tip act/), {
      target: { value: 'lege' },
    })
    expect(navigateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: '/legislation/acts',
        search: { actType: 'lege' },
        replace: true,
      }),
    )
  })

  it('shows the empty state when no act matches', async () => {
    render(<LegislationActsDirectory filter={{ year: 1901 }} />)
    expect(
      await screen.findByText(/Niciun act nu corespunde filtrelor/),
    ).toBeInTheDocument()
  })
})
