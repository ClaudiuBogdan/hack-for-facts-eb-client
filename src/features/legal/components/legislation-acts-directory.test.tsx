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
// The real module delegates to the fixture lane (which never pages:
// `endCursor: null`), so the load-more/reset path needs a controllable page
// source. Tests that don't override the mock get the original behavior.
vi.mock('../api/legal-acts-api', async (importOriginal) => {
  const original = await importOriginal<typeof import('../api/legal-acts-api')>()
  return {
    ...original,
    fetchLegalActsPage: vi.fn(original.fetchLegalActsPage),
  }
})
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

  it('filters the LIST with resolver candidates while a lookup query is typed', async () => {
    render(<LegislationActsDirectory filter={{}} />)
    await screen.findByLabelText(/Filtre/)

    fireEvent.change(screen.getByPlaceholderText(/Legea 227\/2015/), {
      target: { value: 'codul fiscal' },
    })

    // Ambiguity renders as rows the user picks from — never a silent pick.
    const rows = await screen.findAllByRole('link', { name: /Codul fiscal|fiscal/i })
    expect(rows).toHaveLength(2)
    // The browse machinery is out of the way while the lookup is active.
    expect(screen.queryByRole('button', { name: /Încarcă mai multe/ })).toBeNull()
    expect(screen.getByLabelText(/Tip act/)).toBeDisabled()

    // Clearing the box returns to the browse list.
    fireEvent.change(screen.getByPlaceholderText(/Legea 227\/2015/), {
      target: { value: '' },
    })
    expect(await screen.findAllByRole('link', { name: /nr\./ })).not.toHaveLength(0)
  })

  it('drops accumulated pages when the filter arrives via the URL (no setFilter)', async () => {
    const { fetchLegalActsPage } = await import('../api/legal-acts-api')
    const paged = vi.mocked(fetchLegalActsPage)
    const item = (actId: string, citation: string) => ({
      actId,
      displayCitation: citation,
      actType: 'lege',
      actNumber: null,
      actYear: 2015,
      issuerSlug: null,
      status: 'in-vigoare' as const,
      inDegree: 1,
    })
    paged.mockImplementation((filter) =>
      Promise.resolve(
        filter.year === 1999
          ? { items: [item('90', 'Legea nr. 9/1999')], endCursor: null, totalCount: 1 }
          : { items: [item('10', 'Legea nr. 1/2015')], endCursor: 'cur-1', totalCount: 2 },
      ),
    )

    const { rerender } = render(<LegislationActsDirectory filter={{}} />)
    fireEvent.click(await screen.findByRole('button', { name: /Încarcă mai multe/ }))
    await screen.findByText('Legea nr. 1/2015')

    // Back/forward or a bare tab link changes the URL — and only the prop.
    rerender(<LegislationActsDirectory filter={{ year: 1999 }} />)
    await screen.findByText('Legea nr. 9/1999')
    // The rows and cursor of the abandoned filter are gone, not appended.
    expect(screen.queryByText('Legea nr. 1/2015')).toBeNull()
    expect(screen.queryByRole('button', { name: /Încarcă mai multe/ })).toBeNull()

    paged.mockRestore()
  })

  it('hints the citation format on zero lookup hits', async () => {
    render(<LegislationActsDirectory filter={{}} />)
    await screen.findByLabelText(/Filtre/)

    fireEvent.change(screen.getByPlaceholderText(/Legea 227\/2015/), {
      target: { value: 'ceva inexistent' },
    })
    expect(
      await screen.findByText(/încearcă numărul și anul \(ex. 227\/2015\)/),
    ).toBeInTheDocument()
  })
})
