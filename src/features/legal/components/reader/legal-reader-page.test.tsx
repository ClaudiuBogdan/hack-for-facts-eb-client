/**
 * The reader page over the REAL mock lane (fixtures through the live Zod
 * contract): the envelope path renders the complete proven text, the chunked
 * path declares its extent and loads groups progressively with an explicit
 * button fallback, and every failure state renders as content, not apology.
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
import { LegalReaderPage } from './legal-reader-page'
import type { TldfChunkPayload, TldfEnvelope } from '../../lib/tldf/types'

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

const readerText = (container: HTMLElement): string =>
  container.querySelector('#reader-content')?.textContent ?? ''

describe('LegalReaderPage (mock lane end-to-end)', () => {
  it('renders the complete envelope text, character-identical to the fold', async () => {
    const { container } = render(
      <LegalReaderPage actId="424242" initialAct={legalActDetailFixture} docOverride="100023" />,
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
    const { container } = render(<LegalReaderPage actId="424242" initialAct={act} />)
    await waitFor(() => {
      expect(container.querySelector('#reader-content')).not.toBeNull()
    })
    expect(readerText(container).length).toBeGreaterThan(1000)
  })

  it('declares the extent of a chunked document and loads groups on demand', async () => {
    const { container } = render(
      <LegalReaderPage actId="424242" initialAct={legalActDetailFixture} docOverride="100019" />,
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
      <LegalReaderPage actId="424242" initialAct={legalActDetailFixture} docOverride="999999" />,
    )
    expect(
      await screen.findByText(/Nu avem un text servibil pentru acest act/),
    ).toBeInTheDocument()
    // Terminal fact → no retry offer.
    expect(screen.queryByRole('button', { name: /Încearcă din nou/ })).toBeNull()
  })

  it('renders not-found for an unknown act without an override', () => {
    render(<LegalReaderPage actId="0" initialAct={null} />)
    expect(screen.getByText(/Actul nu a fost găsit/)).toBeInTheDocument()
  })
})
