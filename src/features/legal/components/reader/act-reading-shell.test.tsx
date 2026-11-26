/**
 * The act page's shell around the reader (owner, 26 November 2026, the act
 * page's redesign): the contents' box and its fold, and the reader keeping
 * its loaded parts when the outline arrives late. The outline transport is
 * mocked so each test controls what and when it answers; the text comes from
 * the mock lane's real fixtures.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  render as renderShared,
  screen,
  fireEvent,
  waitFor,
  within,
  createTestQueryClient,
} from '@/test/test-utils'
import type { LegalOutlineEntry } from '@/schemas/legal'
import {
  LEGACY_FORM_FIELDS,
  legalActDetailFixture,
} from '../../mocks/fixtures/legal-act-detail'
import { foldTldfBlocks } from '../../lib/tldf/fold'
import type { TldfChunkPayload } from '../../lib/tldf/types'
import { ActReadingBar } from './act-reading-bar'
import { ActReadingLayout } from './legal-reader-page'

const navigateMock = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => navigateMock,
}))

/** What the outline transport answers next: a value, or a promise the test settles. */
let outlineAnswer: () => Promise<LegalOutlineEntry[]> = async () => []
vi.mock('../../api/legal-outline-api', () => ({
  fetchLegalOutline: vi.fn(() => outlineAnswer()),
}))

const render = (ui: Parameters<typeof renderShared>[0]) =>
  renderShared(ui, { queryClient: createTestQueryClient() })

const rows100019 = JSON.parse(
  readFileSync(join(process.cwd(), 'src/features/legal/mocks/fixtures/tldf/render-rows-100019.json'), 'utf8'),
) as { tldf: unknown }[]
const chunk1 = rows100019[1]?.tldf as TldfChunkPayload
const chunk2 = rows100019[2]?.tldf as TldfChunkPayload

const owning = (documentId: string): typeof legalActDetailFixture => ({
  ...legalActDetailFixture,
  documents: [
    ...legalActDetailFixture.documents,
    {
      documentId,
      versionKind: 'republicare',
      versionDate: null,
      isCanonical: false,
      title: null,
      firstPublicationDate: null,
      render: null,
      ...LEGACY_FORM_FIELDS,
    },
  ],
})

const entry = (path: string, nodeKind: string, depth: number, label: string, start: number, end: number): LegalOutlineEntry => ({
  documentId: '100023',
  path,
  nodeKind,
  label,
  numberKey: null,
  numberStatus: null,
  depth,
  orderIndex: 0,
  charStart: start,
  charEnd: end,
})

/** Chapters of `perChapter` articles each. */
const outlineOf = (chapters: number, perChapter: number): LegalOutlineEntry[] =>
  Array.from({ length: chapters }, (_, c) => [
    entry(`c${String(c + 1)}`, 'capitol', 4, `Capitolul ${String(c + 1)}`, c * 1000, c * 1000 + 1000),
    ...Array.from({ length: perChapter }, (_, a) => {
      const n = c * perChapter + a + 1
      return entry(`c${String(c + 1)}.a${String(n)}`, 'articol', 7, `Articolul ${String(n)}`, c * 1000 + a * 10, c * 1000 + a * 10 + 10)
    }),
  ]).flat()

const readerText = (container: HTMLElement): string => container.querySelector('#reader-content')?.textContent ?? ''

describe('the contents\' box', () => {
  beforeEach(() => {
    navigateMock.mockClear()
  })

  it('starts folded on an outline of more than 40 entries, and the switch shows all of it', async () => {
    // 2 chapters × 21 articles = 44 entries
    outlineAnswer = async () => outlineOf(2, 21)
    render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
    const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    const fold = screen.getByRole('button', { name: 'Cuprins restrâns' })
    expect(fold).toHaveAttribute('aria-pressed', 'true')
    expect(within(toc).getByRole('link', { name: 'Capitolul 2' })).toBeInTheDocument()
    expect(within(toc).queryByRole('link', { name: 'Articolul 30' })).toBeNull()

    fireEvent.click(fold)
    expect(fold).toHaveAttribute('aria-pressed', 'false')
    expect(within(toc).getByRole('link', { name: 'Articolul 30' })).toBeInTheDocument()
  })

  it('starts whole on an outline of 40 entries or fewer', async () => {
    // 2 chapters × 19 articles = 40 entries
    outlineAnswer = async () => outlineOf(2, 19)
    render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
    const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    expect(screen.getByRole('button', { name: 'Cuprins restrâns' })).toHaveAttribute('aria-pressed', 'false')
    expect(within(toc).getByRole('link', { name: 'Articolul 30' })).toBeInTheDocument()
  })

  it('folded, opens the branch of the place chosen, and writes it as ?nod=', async () => {
    outlineAnswer = async () => outlineOf(2, 21)
    render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
    const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    // the jump field is the box's first row: article 30 is in the folded chapter 2
    fireEvent.change(screen.getByRole('textbox', { name: 'Mergi la articolul cu numărul' }), { target: { value: '30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mergi la articol' }))
    const options = navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0] as {
      readonly search: (previous: Record<string, unknown>) => Record<string, unknown>
    }
    expect(options.search({ doc: '100023' })).toEqual({ doc: '100023', nod: 'c2.a30' })
    // the reader's place is in chapter 2 now: its branch opens, and the place is lit
    expect(within(toc).getByRole('link', { name: 'Articolul 30' })).toHaveAttribute('aria-current', 'location')
    expect(within(toc).queryByRole('link', { name: 'Articolul 3' })).toBeNull()
  })
})

describe('the contents on a phone', () => {
  it('opens in a sheet from the bar; a choice writes ?nod= at once and closes the sheet', async () => {
    navigateMock.mockClear()
    outlineAnswer = async () => outlineOf(1, 3)
    render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
    await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    fireEvent.click(screen.getByRole('button', { name: 'Cuprins' }))
    const sheet = await screen.findByRole('dialog', { name: 'Cuprins' })
    // the same contents, and the same last row to the record
    expect(within(sheet).getByRole('link', { name: 'Fișa actului' })).toBeInTheDocument()
    fireEvent.click(within(sheet).getByRole('link', { name: 'Articolul 2' }))
    const options = navigateMock.mock.calls[navigateMock.mock.calls.length - 1]?.[0] as {
      readonly search: (previous: Record<string, unknown>) => Record<string, unknown>
    }
    expect(options.search({ doc: '100023' })).toEqual({ doc: '100023', nod: 'c1.a2' })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})

describe('the box about the text shown', () => {
  it('names the version shown even when there is no version to choose', async () => {
    outlineAnswer = async () => []
    // No version of the act has a served render: listed, never a choice. `999999` is shown by `?doc=`.
    const base = owning('999999')
    const act = { ...base, documents: base.documents.map((doc) => ({ ...doc, render: null })) }
    render(<ActReadingLayout act={act} docOverride="999999" lead={null} fisa={null} />)
    const about = await screen.findByRole('complementary', { name: 'Despre textul afișat' })
    expect(within(about).getByText(/Versiunea afișată: .*republicare/)).toBeInTheDocument()
    expect(within(about).queryByRole('combobox')).toBeNull()
  })
})

describe('the reader under the shell', () => {
  it('keeps the parts already loaded when the outline arrives late', async () => {
    let answer: (entries: LegalOutlineEntry[]) => void = () => {}
    outlineAnswer = () =>
      new Promise((resolve) => {
        answer = resolve
      })
    const { container } = render(<ActReadingLayout act={owning('100019')} docOverride="100019" lead={null} fisa={null} />)
    await waitFor(() => expect(readerText(container)).toBe(foldTldfBlocks(chunk1.blocks)), { timeout: 15_000 })
    fireEvent.click(await screen.findByRole('button', { name: /Încarcă partea următoare/ }, { timeout: 15_000 }))
    const both = foldTldfBlocks(chunk1.blocks) + foldTldfBlocks(chunk2.blocks)
    await waitFor(() => expect(readerText(container)).toBe(both), { timeout: 15_000 })
    const article = container.querySelector('#reader-content')

    // No contents yet; then the outline lands mid-read.
    expect(screen.queryByRole('navigation', { name: /Cuprinsul actului/ })).toBeNull()
    answer(outlineOf(1, 3))
    await screen.findByRole('navigation', { name: /Cuprinsul actului/ })

    // The same reader, both parts still on screen: nothing was remounted.
    expect(container.querySelector('#reader-content')).toBe(article)
    expect(readerText(container)).toBe(both)
  }, 60_000)
})

describe('the reading bar', () => {
  it('draws the raised index of the place it names, as the contents do', () => {
    const outline = [entry('0.1', 'capitol', 1, 'Capitolul I', 0, 100), entry('0.1.9', 'articol', 2, 'Articolul 8^1', 10, 40)]
    const { container } = render(
      <ActReadingBar
        citation="Legea nr. 1/2000"
        outline={outline}
        activePath="0.1.9"
        shownName={null}
        about={false}
        away={false}
        onToStart={vi.fn()}
        collapsed={false}
        onToggleFold={vi.fn()}
        sheetOpen={false}
        onSheetOpenChange={vi.fn()}
        sheetContents={null}
      />,
    )
    const place = container.querySelector('p span.font-medium')
    expect(place?.textContent).toBe('Articolul 81')
    expect(place?.querySelector('sup')?.textContent).toBe('1')
    expect(place?.textContent).not.toContain('^')
  })
})
