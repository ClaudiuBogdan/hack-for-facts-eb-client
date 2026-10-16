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
  createTestQueryClient,
} from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'

/** Isolated QueryClient per render: the act/render caches must not leak across tests. */
const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

import { legalActDetailFixture } from '../../mocks/fixtures/legal-act-detail'
import { foldTldfBlocks } from '../../lib/tldf/fold'
import { ActReadingLayout } from './legal-reader-page'
import type { TldfChunkPayload, TldfEnvelope } from '../../lib/tldf/types'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
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
