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
  act,
  createTestQueryClient,
} from '@/test/test-utils'
import { parseAppSearch } from '@/lib/router-search-codec'
import { legalReaderSearchSchema } from '@/schemas/legal-search'
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
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  // The real module under the stand-ins: the contents' links are written by the app's own search serializer.
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useRouterState: () => addressSearch,
  Link: ({ children, to }: { readonly children: ReactNode; readonly to: string }) => <a href={to}>{children}</a>,
  useNavigate: () => navigateMock,
}))

/** What the address holds besides the reader's own keys (the router's parsed search). */
let addressSearch: Record<string, unknown> = {}

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
    // folded: the switch offers the whole list, in the words it shows
    const fold = screen.getByRole('button', { name: 'Arată tot' })
    expect(within(toc).getByRole('link', { name: 'Capitolul 2' })).toBeInTheDocument()
    expect(within(toc).queryByRole('link', { name: 'Articolul 30' })).toBeNull()

    fireEvent.click(fold)
    expect(screen.getByRole('button', { name: 'Restrânge' })).toBe(fold)
    expect(within(toc).getByRole('link', { name: 'Articolul 30' })).toBeInTheDocument()
  })

  it('writes each entry\'s address as the router reads it back: a path that looks like a number stays text', async () => {
    // `?nod=0.1` reads back as the number 0.1, which the route refuses (a 500 for a copied link).
    const paths = ['0.1', '1', '0.1.1', 'r10']
    outlineAnswer = async () => paths.map((path, index) => entry(path, 'capitol', 4, `Capitolul ${String(index + 1)}`, index * 10, index * 10 + 10))
    addressSearch = { lang: 'en' }
    try {
      render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
      const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
      const hrefs = within(toc).getAllByRole('link').map((link) => link.getAttribute('href') ?? '')
      expect(hrefs).toHaveLength(4)
      hrefs.forEach((href, index) => {
        expect(href.startsWith('?')).toBe(true)
        const read = parseAppSearch(href) as Record<string, unknown>
        // what the route's own validation makes of it: the same path, as text, in the document on show
        expect(legalReaderSearchSchema.parse(read)).toEqual({ doc: '100023', nod: paths[index] })
        // and what else the address held stays, as on a click
        expect(read.lang).toBe('en')
      })
    } finally {
      addressSearch = {}
    }
  })

  it('starts whole on an outline of 40 entries or fewer', async () => {
    // 2 chapters × 19 articles = 40 entries
    outlineAnswer = async () => outlineOf(2, 19)
    render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
    const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    expect(screen.getByRole('button', { name: 'Restrânge' })).toBeInTheDocument()
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
    // No version of the act is listed with a served render: never a choice. `100019` is shown by `?doc=`, and its text loads.
    const base = owning('100019')
    const act = { ...base, documents: base.documents.map((doc) => ({ ...doc, render: null })) }
    const { container } = render(<ActReadingLayout act={act} docOverride="100019" lead={null} fisa={null} />)
    await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
    const about = screen.getByRole('complementary', { name: 'Despre textul afișat' })
    expect(within(about).getByText(/^Versiunea afișată: republicare/)).toBeInTheDocument()
    expect(within(about).queryByRole('combobox')).toBeNull()
  })

  it('never calls a text that failed to load „shown": the box names the version asked for, the bar names none', async () => {
    outlineAnswer = async () => []
    // `999999` has no render on the mock lane: the read fails.
    const base = owning('999999')
    const act = { ...base, documents: base.documents.map((doc) => ({ ...doc, render: null })) }
    const { container } = render(<ActReadingLayout act={act} docOverride="999999" lead={null} fisa={null} />)
    await waitFor(() => expect(screen.queryByRole('status', { name: 'Se încarcă textul…' })).toBeNull())
    expect(readerText(container)).toBe('')
    const about = screen.getByRole('complementary', { name: 'Despre textul afișat' })
    expect(within(about).getByText(/^republicare/)).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/Versiunea afișată/)
    expect(container.textContent).not.toMatch(/Forma din/)
  })
})

describe('the reader\'s place', () => {
  type Seen = { readonly callback: IntersectionObserverCallback; readonly targets: Element[] }

  it('is the last block of the outline under the band, none once the reader has left the text, and none of another text', async () => {
    const observers: Seen[] = []
    class RecordingObserver {
      readonly root = null
      readonly rootMargin = ''
      readonly scrollMargin = ''
      readonly thresholds: readonly number[] = []
      private readonly record: Seen
      constructor(callback: IntersectionObserverCallback) {
        this.record = { callback, targets: [] }
        observers.push(this.record)
      }
      observe(target: Element) {
        this.record.targets.push(target)
      }
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
    const original = window.IntersectionObserver
    vi.stubGlobal('IntersectionObserver', RecordingObserver)
    window.IntersectionObserver = RecordingObserver as unknown as typeof IntersectionObserver
    try {
      let answer: (entries: LegalOutlineEntry[]) => void = () => {}
      outlineAnswer = () =>
        new Promise((resolve) => {
          answer = resolve
        })
      const { container, rerender } = render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
      await waitFor(() => expect(container.querySelectorAll('#reader-content [id^="tldf-"]').length).toBeGreaterThan(2))
      // an outline of two blocks really on the page: a chapter, then an article
      const [chapter, article] = Array.from(container.querySelectorAll('#reader-content [id^="tldf-"]'))
      if (chapter === undefined || article === undefined) throw new Error('the fixture has no blocks')
      const path = (block: Element) => block.id.replace(/^tldf-/, '')
      await act(async () => {
        answer([entry(path(chapter), 'capitol', 4, 'Capitolul I', 0, 100), entry(path(article), 'articol', 7, 'Articolul 1', 10, 40)])
        await Promise.resolve()
      })
      const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
      const lit = () => within(toc).queryAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'location').map((link) => link.getAttribute('aria-label') ?? link.textContent)
      const report = (changes: readonly (readonly [Element, boolean])[]) => {
        const watching = observers.filter((seen) => seen.targets.includes(chapter))
        const sync = watching[watching.length - 1]
        if (sync === undefined) throw new Error('no observer watches the outline\'s blocks')
        act(() => {
          sync.callback(changes.map(([target, isIntersecting]) => ({ target, isIntersecting }) as unknown as IntersectionObserverEntry), {} as IntersectionObserver)
        })
      }
      expect(lit()).toEqual([])
      // both under the band: the place is the article, inside its chapter
      report([[chapter, true], [article, true]])
      expect(lit()).toEqual(['Articolul 1'])
      // the article has left (only it reports): the chapter, still under the band, is the place
      report([[article, false]])
      expect(lit()).toEqual(['Capitolul I'])
      // nothing of the outline under the band: the reader is past the text, and no place is named
      report([[chapter, false]])
      expect(lit()).toEqual([])

      // another text: the place of the first one is not carried to it
      report([[article, true]])
      expect(lit()).toEqual(['Articolul 1'])
      outlineAnswer = async () => [entry(path(article), 'articol', 7, 'Articolul 1', 10, 40)]
      rerender(<ActReadingLayout act={owning('100019')} docOverride="100019" lead={null} fisa={null} />)
      await waitFor(() => expect(screen.queryByRole('navigation', { name: /Cuprinsul actului/ })).not.toBeNull())
      expect(within(screen.getByRole('navigation', { name: /Cuprinsul actului/ })).queryAllByRole('link').filter((link) => link.getAttribute('aria-current') === 'location')).toEqual([])
    } finally {
      vi.unstubAllGlobals()
      window.IntersectionObserver = original
    }
  })
})

describe('the page\'s landmarks and targets', () => {
  it('has one complementary region (the box about the text); the contents are a navigation in a plain cell', async () => {
    outlineAnswer = async () => outlineOf(1, 3)
    const { container } = render(<ActReadingLayout act={owning('100023')} docOverride="100023" lead={null} fisa={null} />)
    const toc = await screen.findByRole('navigation', { name: /Cuprinsul actului/ })
    expect(toc.closest('aside')).toBeNull()
    await waitFor(() => expect(readerText(container).length).toBeGreaterThan(100))
    expect(screen.getAllByRole('complementary')).toHaveLength(1)
    // the skip link's target stops under the sticky bar, not behind it
    expect(container.querySelector('#reader-content')).toHaveClass('scroll-mt-16')
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
  const bar = (props: { readonly activePath: string | null; readonly shownName: string | null; readonly shownDated: boolean }) => (
    <ActReadingBar
      citation="Legea nr. 1/2000"
      outline={[entry('0.1', 'capitol', 1, 'Capitolul II — Dispoziții privind atribuirea contractelor de achiziție publică', 0, 100), entry('0.1.9', 'articol', 2, 'Articolul 8^1', 10, 40)]}
      about={false}
      away={false}
      onToStart={vi.fn()}
      collapsed={false}
      onToggleFold={vi.fn()}
      sheetOpen={false}
      onSheetOpenChange={vi.fn()}
      sheetContents={null}
      {...props}
    />
  )

  it('cuts a place too long for its room instead of running over the controls beside it', () => {
    render(bar({ activePath: '0.1', shownName: null, shownDated: false }))
    const place = screen.getByText(/^Capitolul II — Dispoziții/)
    expect(place).toHaveClass('min-w-0', 'truncate')
    expect(place).not.toHaveClass('shrink-0')
  })

  it('lets the chapter give way before the place', () => {
    render(bar({ activePath: '0.1.9', shownName: null, shownDated: false }))
    expect(screen.getByText(/^Capitolul II — Dispoziții/)).toHaveClass('shrink-[999]', 'truncate')
  })

  it('says „Forma din" only before a date: an undated version is named alone', () => {
    const { rerender } = render(bar({ activePath: null, shownName: '23 mai 2016, forma publicată', shownDated: true }))
    expect(screen.getByText('Forma din 23 mai 2016, forma publicată')).toBeInTheDocument()
    rerender(bar({ activePath: null, shownName: 'forma publicată', shownDated: false }))
    expect(screen.getByText('forma publicată')).toBeInTheDocument()
    expect(screen.queryByText(/Forma din/)).toBeNull()
  })

  it('draws the raised index of the place it names, as the contents do', () => {
    const outline = [entry('0.1', 'capitol', 1, 'Capitolul I', 0, 100), entry('0.1.9', 'articol', 2, 'Articolul 8^1', 10, 40)]
    const { container } = render(
      <ActReadingBar
        citation="Legea nr. 1/2000"
        outline={outline}
        activePath="0.1.9"
        shownName={null}
        shownDated={false}
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
