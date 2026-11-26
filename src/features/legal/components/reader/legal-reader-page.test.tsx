/**
 * The act reading layout over the REAL mock lane (fixtures through the live
 * Zod contract): the envelope path renders the complete proven text, the
 * chunked path declares its extent and loads groups progressively with an
 * explicit button fallback, and every failure state renders as content, not
 * apology. Since 2026-08-10 this layout is the body of the act page itself
 * (fisa + text on one page), so every render passes a `fisa` slot.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import {
  render as renderShared,
  screen,
  fireEvent,
  waitFor,
  within,
  createTestQueryClient,
} from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'

/** Isolated QueryClient per render: the act/render caches must not leak across tests. */
const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

import {
  LEGACY_FORM_FIELDS,
  legalActDetailFixture,
} from '../../mocks/fixtures/legal-act-detail'
import { foldTldfBlocks } from '../../lib/tldf/fold'
import { resolveDocOverride } from '../../lib/legal-versions'
import { ActReadingLayout } from './legal-reader-page'
import type { TldfChunkPayload, TldfEnvelope } from '../../lib/tldf/types'

const navigateMock = vi.fn()
import { parseAppSearch } from '@/lib/router-search-codec'
import { legalReaderSearchSchema } from '@/schemas/legal-search'

vi.mock('@tanstack/react-router', async (importOriginal) => ({
  // The real module under the stand-ins: the contents' links are written by the app's own search serializer.
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouterState: () => ({}),
  Link: ({
    children,
    to,
    params,
    ...props
  }: {
    readonly children: ReactNode
    readonly to: string
    readonly params?: Record<string, string>
  }) => (
    <a href={params?.actId ? to.replace('$actId', params.actId) : to} {...props}>
      {children}
    </a>
  ),
  useNavigate: () => navigateMock,
}))

const fixtureDir = join(process.cwd(), 'src/features/legal/mocks/fixtures/tldf')
const rows100023 = JSON.parse(
  readFileSync(join(fixtureDir, 'render-rows-100023.json'), 'utf8'),
) as { tldf: unknown }[]
const rows100019 = JSON.parse(
  readFileSync(join(fixtureDir, 'render-rows-100019.json'), 'utf8'),
) as { tldf: unknown }[]
const envelope = rows100023[0]?.tldf as TldfEnvelope
const chunk1 = rows100019[1]?.tldf as TldfChunkPayload
const chunk2 = rows100019[2]?.tldf as TldfChunkPayload

/**
 * The fixture act extended to OWN the given expressions: `?doc=` is honoured
 * only for one of `act.documents` (I-17), and these fixture texts belong to
 * other documents.
 */
const owning = (...documentIds: string[]): typeof legalActDetailFixture => ({
  ...legalActDetailFixture,
  documents: [
    ...legalActDetailFixture.documents,
    ...documentIds.map((documentId) => ({
      documentId,
      versionKind: 'republicare',
      versionDate: null,
      isCanonical: false,
      title: null,
      firstPublicationDate: null,
      render: null,
      ...LEGACY_FORM_FIELDS,
    })),
  ],
})

const readerText = (container: HTMLElement): string =>
  container.querySelector('#reader-content')?.textContent ?? ''

describe('ActReadingLayout (mock lane end-to-end)', () => {
  it('renders the complete envelope text, character-identical to the fold', async () => {
    const { container } = render(
      <ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />,
    )
    await waitFor(() => {
      expect(container.querySelector('#reader-content')).not.toBeNull()
    })
    expect(readerText(container)).toBe(foldTldfBlocks(envelope.blocks))
  })

  it('resolves the canonical document when no ?doc= override is given', async () => {
    const act = {
      ...legalActDetailFixture,
      canonical:
        legalActDetailFixture.canonical === null
          ? null
          : { ...legalActDetailFixture.canonical, documentId: '100023' },
    }
    const { container } = render(<ActReadingLayout act={act} lead={null} fisa={null} />)
    await waitFor(() => {
      expect(container.querySelector('#reader-content')).not.toBeNull()
    })
    expect(readerText(container).length).toBeGreaterThan(1000)
  })

  it("refuses another act's document and reads this act's own text (I-17)", async () => {
    // Canonical 100023 is this act's; 100019 belongs to some other act.
    const act = {
      ...legalActDetailFixture,
      canonical:
        legalActDetailFixture.canonical === null
          ? null
          : { ...legalActDetailFixture.canonical, documentId: '100023' },
    }
    const queryClient = createTestQueryClient()
    const { container } = renderShared(
      <ActReadingLayout act={act} docOverride="100019" lead={null} fisa={null} />,
      { queryClient },
    )
    await waitFor(() => {
      expect(container.querySelector('#reader-content')).not.toBeNull()
    })
    expect(readerText(container)).toBe(foldTldfBlocks(envelope.blocks))
    expect(screen.getByRole('status')).toHaveTextContent(/nu aparține acestui act/)
    expect(screen.queryByText(/Afișezi o versiune anume a textului/)).toBeNull()
    // Neither the render nor the outline is ever requested for the foreign id.
    const keys = queryClient
      .getQueryCache()
      .getAll()
      .map((query) => JSON.stringify(query.queryKey))
    expect(keys.some((key) => key.includes('100023'))).toBe(true)
    expect(keys.filter((key) => key.includes('100019'))).toEqual([])
  })

  it('takes no ?nod= into the default text when the ?doc= it was meant for is refused (astra-client-11)', async () => {
    // A provision link into another act's document: the default text (100023) has a node at the same path.
    const nod = envelope.blocks[3]?.id ?? ''
    const act = {
      ...legalActDetailFixture,
      canonical:
        legalActDetailFixture.canonical === null
          ? null
          : { ...legalActDetailFixture.canonical, documentId: '100023' },
    }
    const scrollIntoView = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      const { container } = render(
        <ActReadingLayout act={act} docOverride="100019" nod={nod} lead={null} fisa={null} />,
      )
      await waitFor(() => {
        expect(container.querySelector('#reader-content')).not.toBeNull()
      })
      expect(container.querySelector(`[id="tldf-${nod}"]`)).not.toBeNull()
      expect(screen.getByRole('status')).toHaveTextContent(/nu aparține acestui act/)
      // Settled: the outline answered and the text is on screen; nothing was scrolled to or marked as the match.
      await new Promise((resolve) => setTimeout(resolve, 50))
      expect(scrollIntoView).not.toHaveBeenCalled()
      expect(container.querySelector('.bg-foreground\\/10\\!')).toBeNull()
      // nor is the provision said to be missing from a text it was never meant for
      expect(screen.queryByText(/Nu am găsit fragmentul cerut/)).toBeNull()
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('writes the text on show with a provision chosen in the contents after a refused ?doc= (astra-client-12)', async () => {
    // the default text is one of the act's own documents, as on a real act
    const act = {
      ...owning('100023'),
      canonical:
        legalActDetailFixture.canonical === null
          ? null
          : { ...legalActDetailFixture.canonical, documentId: '100023' },
    }
    navigateMock.mockClear()
    render(<ActReadingLayout act={act} docOverride="100019" nod="r10" lead={null} fisa={null} />)
    const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    // the contents' entries are links now (an address for a new tab; a click is the reader's to answer)
    const entry = within(toc).getAllByRole('link')[0] as HTMLElement
    // the entry's own address, for a new tab or a copied link, names the text actually shown too
    // read as the router reads it and as the route validates it
    const address = legalReaderSearchSchema.parse(parseAppSearch(entry.getAttribute('href') ?? ''))
    expect(address.doc).toBe('100023')
    expect(address.nod).toBeTruthy()
    fireEvent.click(entry)
    const options = navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0] as { readonly search: (previous: Record<string, unknown>) => Record<string, unknown> }
    // the refused document leaves the address with the provision chosen in the text actually shown
    const next = options.search({ doc: '100019', nod: 'r10' })
    expect(next.doc).toBe('100023')
    expect(typeof next.nod).toBe('string')
    expect(next.nod).not.toBe('r10')
    expect(address.nod).toBe(next.nod)
    // and the address written is one the reader accepts on the next render: the act's own text, not refused again
    expect(resolveDocOverride(act, String(next.doc)).kind).toBe('own')
  })

  it('ends the contents with a fixed way to the act\'s record', async () => {
    const scrollIntoView = vi.fn()
    const original = Element.prototype.scrollIntoView
    Element.prototype.scrollIntoView = scrollIntoView
    try {
      const { container } = render(
        <ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={<p>fișa</p>} />,
      )
      await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
      const toRecord = screen.getByRole('link', { name: 'Fișa actului' })
      expect(toRecord).toHaveAttribute('href', '#act-fisa')
      // outside the contents' own list, so folding the list never takes it away
      expect(toRecord.closest('nav')).toBeNull()
      scrollIntoView.mockClear()
      fireEvent.click(toRecord)
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toBe(container.querySelector('#act-fisa'))
    } finally {
      Element.prototype.scrollIntoView = original
    }
  })

  it('marks a deep-linked block for a moment, over any note style', async () => {
    const nod = envelope.blocks[3]?.id ?? ''
    const { container } = render(
      <ActReadingLayout act={owning('100023')} docOverride="100023" nod={nod} lead={null} fisa={null} />,
    )
    await waitFor(() => {
      expect(container.querySelector(`[id="tldf-${nod}"]`)).toHaveClass('bg-foreground/10!', 'text-foreground!')
    })
    // for a moment only: both classes are gone after 1.6 s
    await new Promise((resolve) => setTimeout(resolve, 1700))
    const block = container.querySelector(`[id="tldf-${nod}"]`)
    expect(block).not.toHaveClass('bg-foreground/10!')
    expect(block).not.toHaveClass('text-foreground!')
  })

  it('honours an override that is one of the act\'s own expressions', async () => {
    const { container } = render(
      <ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />,
    )
    await waitFor(() => {
      expect(container.querySelector('#reader-content')).not.toBeNull()
    })
    expect(screen.getByText(/Afișezi o versiune anume a textului/)).toBeInTheDocument()
    expect(screen.queryByText(/nu aparține acestui act/)).toBeNull()
  })

  it('declares the extent of a chunked document and loads groups on demand', async () => {
    const { container } = render(
      <ActReadingLayout act={owning('100019')} docOverride="100019" lead={null} fisa={null} />,
    )
    // Group 1 loads eagerly. Generous timeouts: the 1.5 MB fixture's dynamic
    // import is transformed on first use and can exceed the 1 s default.
    await waitFor(
      () => {
        expect(readerText(container)).toBe(foldTldfBlocks(chunk1.blocks))
      },
      { timeout: 15_000 },
    )
    // jsdom has no IntersectionObserver → the explicit button is the path.
    const nextButton = await screen.findByRole(
      'button',
      { name: /Încarcă partea următoare/ },
      { timeout: 15_000 },
    )
    fireEvent.click(nextButton)
    await waitFor(
      () => {
        expect(readerText(container)).toBe(
          foldTldfBlocks(chunk1.blocks) + foldTldfBlocks(chunk2.blocks),
        )
      },
      { timeout: 15_000 },
    )
    expect(screen.getByText(/părți afișate integral/)).toBeInTheDocument()
  }, 60_000)

  it('answers the honest unavailable state for a document without servable text', async () => {
    render(
      <ActReadingLayout act={owning('999999')} docOverride="999999" lead={null} fisa={null} />,
    )
    expect(
      await screen.findByText(/Nu avem un text servibil pentru acest act/),
    ).toBeInTheDocument()
    // Terminal fact → no retry offer.
    expect(screen.queryByRole('button', { name: /Încearcă din nou/ })).toBeNull()
  })

  it('renders the TOC from the served outline and keeps the text intact', async () => {
    const { container } = render(
      <ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />,
    )
    await waitFor(() => {
      expect(container.querySelector('#reader-content')).not.toBeNull()
    })
    // The mock outline derives from the same fixture blocks; the fixture has
    // six heading kinds, so a TOC must appear.
    const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    expect(toc).toBeInTheDocument()
    // The fidelity invariant survives the split layout.
    expect(readerText(container)).toBe(foldTldfBlocks(envelope.blocks))
  })

  it('deep-links ?nod= on a chunked document by chaining groups in order', async () => {
    const { container } = render(
      <ActReadingLayout
        act={owning('100019')}
        docOverride="100019"
        nod={chunk2.blocks[0]?.id ?? ''}
        lead={null} fisa={null}
      />,
    )
    // The target lives in group 2: BOTH groups must arrive without any click,
    // in order (group 1's text always precedes group 2's).
    await waitFor(
      () => {
        expect(readerText(container)).toBe(
          foldTldfBlocks(chunk1.blocks) + foldTldfBlocks(chunk2.blocks),
        )
      },
      { timeout: 15_000 },
    )
  }, 60_000)

  it('says so when a ?nod= cannot be found instead of guessing a scroll', async () => {
    render(
      <ActReadingLayout
        act={owning('100023')}
        docOverride="100023"
        nod="9999.9999"
        lead={null} fisa={null}
      />,
    )
    expect(
      await screen.findByText(/Nu am găsit fragmentul cerut în acest text/),
    ).toBeInTheDocument()
  })
})
