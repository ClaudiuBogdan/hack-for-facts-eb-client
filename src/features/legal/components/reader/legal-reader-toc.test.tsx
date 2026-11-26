import { render, screen, fireEvent, within } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { LegalOutlineEntry } from '@/schemas/legal'
import { ARTICLE_TYPED_MAX, articleNumberAsKey, contentsRows, findArticle, outlineAncestors } from '../../lib/legal-outline'
import { ContentsRecordLink, ContentsToggle, LegalReaderToc } from './legal-reader-toc'

const entry = (
  path: string,
  nodeKind: string,
  depth: number,
  label: string | null,
  numberKey: string | null = null,
  span: readonly [number | null, number | null] = [0, 10],
): LegalOutlineEntry => ({
  documentId: '100023',
  path,
  nodeKind,
  label,
  numberKey,
  numberStatus: null,
  depth,
  orderIndex: 0,
  charStart: span[0],
  charEnd: span[1],
})

const entries: LegalOutlineEntry[] = [
  entry('0.1', 'capitol', 4, 'Capitolul I — Dispoziții generale', null, [0, 100]),
  entry('0.1.2', 'articol', 7, 'Articolul 1', '1', [10, 40]),
  entry('0.1.3', 'articol', 7, null, '2', [40, 100]),
  entry('0.2', 'capitol', 4, 'Capitolul II', null, [100, 200]),
]

/** A chapter holding a section with its articles, then a second chapter with its own: two levels to fold. */
const nested: LegalOutlineEntry[] = [
  entry('c1', 'capitol', 4, 'Capitolul I', null, [0, 500]),
  entry('c1.s1', 'sectiune', 5, 'Secțiunea 1', null, [0, 300]),
  ...Array.from({ length: 6 }, (_, i) => entry(`c1.s1.a${String(i + 1)}`, 'articol', 7, `Articolul ${String(i + 1)}`, String(i + 1), [i * 50, i * 50 + 50])),
  entry('c1.a7', 'articol', 7, 'Articolul 7', '7', [300, 500]),
  entry('c2', 'capitol', 4, 'Capitolul II', null, [500, 900]),
  ...Array.from({ length: 3 }, (_, i) => entry(`c2.a${String(i + 8)}`, 'articol', 7, `Articolul ${String(i + 8)}`, String(i + 8), [500 + i * 100, 600 + i * 100])),
]

describe('LegalReaderToc', () => {
  it('renders the served outline as headings and a grid of article numbers', () => {
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={vi.fn()} />)

    const toc = screen.getByRole('navigation', { name: /Cuprinsul actului/ })
    expect(within(toc).getByRole('link', { name: /Dispoziții generale/ })).toBeInTheDocument()
    // the chapter's articles are one list of numbers, named for a screen reader
    const articles = within(toc).getByRole('list', { name: 'Articole' })
    expect(within(articles).getAllByRole('link').map((link) => link.textContent)).toEqual(['1', '2'])
  })

  it('never renders a blank row: label-less entries compose kind + number', () => {
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={vi.fn()} />)
    // entry 0.1.3 has label null + numberKey 2.
    expect(screen.getByRole('link', { name: /Articol 2|articol 2/i })).toBeInTheDocument()
  })

  it('reports selection to the parent without navigating itself', () => {
    const onSelect = vi.fn()
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={onSelect} />)

    const link = screen.getByRole('link', { name: 'Articolul 1' })
    // a real address for a new tab, but a click is the parent's to answer
    expect(link).toHaveAttribute('href', '#tldf-0.1.2')
    expect(fireEvent.click(link)).toBe(false)
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ path: '0.1.2' }))
  })

  it('gives each entry the address its parent names, and leaves a new-tab click to the browser', () => {
    const onSelect = vi.fn()
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={onSelect} hrefFor={(entry) => `#nod-${entry.path}`} />)
    const link = screen.getByRole('link', { name: 'Articolul 1' })
    expect(link).toHaveAttribute('href', '#nod-0.1.2')
    // with a modifier the click is not prevented and not answered in the page
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true)
    expect(fireEvent.click(link, { metaKey: true })).toBe(true)
    expect(onSelect).not.toHaveBeenCalled()
    expect(fireEvent.click(link)).toBe(false)
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('marks the active entry for scroll sync', () => {
    render(<LegalReaderToc entries={entries} activePath="0.1.2" onSelect={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Articolul 1' })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('folded, shows the first level and opens only the branch the reader is in', () => {
    const { rerender } = render(<LegalReaderToc entries={nested} activePath={null} onSelect={vi.fn()} collapsed openPath={null} />)

    // nowhere yet: the chapters alone
    expect(screen.getByRole('link', { name: 'Capitolul I' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Capitolul II' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Secțiunea 1' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Articolul 3' })).toBeNull()

    // in article 3: its chapter and its section open, the other chapter stays folded
    rerender(<LegalReaderToc entries={nested} activePath="c1.s1.a3" onSelect={vi.fn()} collapsed openPath="c1.s1.a3" />)
    expect(screen.getByRole('link', { name: 'Secțiunea 1' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Articolul 3' })).toHaveAttribute('aria-current', 'location')
    expect(screen.getByRole('link', { name: 'Articolul 7' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Articolul 9' })).toBeNull()

    // whole: everything
    rerender(<LegalReaderToc entries={nested} activePath="c1.s1.a3" onSelect={vi.fn()} openPath="c1.s1.a3" />)
    expect(screen.getByRole('link', { name: 'Articolul 9' })).toBeInTheDocument()
  })

  it('goes to an article by its number, and says when the version shown has none', () => {
    const onSelect = vi.fn()
    render(<LegalReaderToc entries={nested} activePath={null} onSelect={onSelect} />)

    const field = screen.getByRole('textbox', { name: 'Mergi la articolul cu numărul' })
    fireEvent.change(field, { target: { value: 'art. 9' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mergi la articol' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ path: 'c2.a9' }))

    fireEvent.change(field, { target: { value: '99' } })
    fireEvent.click(screen.getByRole('button', { name: 'Mergi la articol' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Forma afișată nu are un articol 99.')).toBeInTheDocument()
  })

  it('leaves the jump field to its container when bare', () => {
    render(<LegalReaderToc entries={nested} activePath={null} onSelect={vi.fn()} bare />)
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('renders nothing for an empty outline (paragraph_stream shape)', () => {
    const { container } = render(
      <LegalReaderToc entries={[]} activePath={null} onSelect={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})

describe('the outline nests by span, not by rank alone (LEG-CEJT)', () => {
  // An annex served between two titles, ranked like a title's section: by rank the next title would nest under it.
  const flat: LegalOutlineEntry[] = [
    entry('t1', 'titlu', 2, 'Titlul I', null, [0, 100]),
    entry('anx', 'anexa', 3, 'Anexa 1', null, [40, 60]),
    entry('t1.a1', 'articol', 7, 'Articolul 1', '1', [70, 90]),
  ]

  it('closes a heading once the next entry falls outside its span', () => {
    const rows = contentsRows(flat)
    expect(rows.map((row) => [row.kind, row.level])).toEqual([
      ['heading', 0],
      ['heading', 1],
      // after the annex's span: back under the title, not under the annex
      ['articles', 1],
    ])
  })

  it('names the place\'s ancestors by span as well as rank', () => {
    expect(outlineAncestors(flat, 't1.a1').map((ancestor) => ancestor.path)).toEqual(['t1'])
  })

  // An annex LISTED before its place in the text: its span lies after the articles that follow it in the list, so
  // „starts before the annex ends" is true of every one of them. Only „starts inside it" keeps them out.
  const early: LegalOutlineEntry[] = [
    entry('t1', 'titlu', 2, 'Titlul I', null, [0, 1000]),
    entry('anx', 'anexa', 3, 'Anexa 1', null, [900, 950]),
    entry('t1.a6', 'articol', 7, 'Articolul 6', '6', [300, 320]),
    entry('t1.a7', 'articol', 7, 'Articolul 7', '7', [320, 340]),
  ]

  it('holds nothing that starts before the heading does: an annex listed early does not take the articles after it', () => {
    expect(contentsRows(early).map((row) => [row.kind, row.level])).toEqual([
      ['heading', 0],
      ['heading', 1],
      // under the title, beside the annex: not at level 2, inside it
      ['articles', 1],
    ])
    expect(outlineAncestors(early, 't1.a6').map((ancestor) => ancestor.path)).toEqual(['t1'])
    // an entry really inside the annex is still held by it
    const inside = [...early, entry('anx.p1', 'paragraf', 5, 'Punctul 1', null, [910, 920])]
    expect(outlineAncestors(inside, 'anx.p1').map((ancestor) => ancestor.path)).toEqual(['t1', 'anx'])
  })
})

describe('an article number as a reader types it', () => {
  it.each([
    ['8^1', '8^1'],
    ['8¹', '8^1'],
    ['8 ¹', '8^1'],
    ['8 1', '8^1'],
    ['8.1', '8^1'],
    ['8-1', '8^1'],
    ['Art. 8', '8'],
    ['articolul 08', '8'],
    ['0', '0'],
    ['III', 'iii'],
    ['12¹²', '12^12'],
  ])('reads „%s" as %s', (typed, key) => {
    expect(articleNumberAsKey(typed)).toBe(key)
  })

  const articles: LegalOutlineEntry[] = [
    entry('a8', 'articol', 7, 'Articolul 8', '8'),
    entry('a81', 'articol', 7, 'Articolul 8^1', '8^1'),
    entry('a80', 'articol', 7, 'Articolul 81', '81'),
    entry('c1', 'capitol', 4, 'Capitolul 8', '8'),
  ]

  it('finds the article however its index is written, and never a heading or another number', () => {
    for (const typed of ['8^1', '8¹', '8 1', '8.1', 'art. 8¹']) expect(findArticle(articles, typed)?.path).toBe('a81')
    expect(findArticle(articles, '08')?.path).toBe('a8')
    expect(findArticle(articles, '81')?.path).toBe('a80')
    expect(findArticle(articles, '9')).toBeUndefined()
    expect(findArticle(articles, '  ')).toBeUndefined()
    // a long paste names no article, and is not searched (Codex review, round 2): up to the limit it still is
    expect(findArticle(articles, `8${' '.repeat(5000)}x`)).toBeUndefined()
    expect(findArticle(articles, `${' '.repeat(ARTICLE_TYPED_MAX - 1)}8`)?.path).toBe('a8')
    expect(findArticle(articles, `${' '.repeat(ARTICLE_TYPED_MAX)}8`)).toBeUndefined()
  })

  it('takes a number as the outline writes it before reading it another way', () => {
    const dotted = [entry('x', 'articol', 7, 'Articolul 8.1', '8.1'), entry('y', 'articol', 7, 'Articolul 8^1', '8^1')]
    expect(findArticle(dotted, '8.1')?.path).toBe('x')
    expect(findArticle(dotted, '8¹')?.path).toBe('y')
  })
})

describe('the contents\' small controls', () => {
  it('names the fold switch by the words it shows (what it does)', () => {
    const onToggle = vi.fn()
    const { rerender } = render(<ContentsToggle collapsed onToggle={onToggle} />)
    fireEvent.click(screen.getByRole('button', { name: 'Arată tot' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
    rerender(<ContentsToggle collapsed={false} onToggle={onToggle} />)
    expect(screen.getByRole('button', { name: 'Restrânge' })).toBeInTheDocument()
  })

  it('leaves a new-tab click on the way to the record to the browser', () => {
    const onGo = vi.fn()
    render(<ContentsRecordLink onGo={onGo} />)
    const link = screen.getByRole('link', { name: 'Fișa actului' })
    // fireEvent returns false when the handler prevented the default
    expect(fireEvent.click(link, { ctrlKey: true })).toBe(true)
    expect(fireEvent.click(link, { metaKey: true })).toBe(true)
    expect(onGo).not.toHaveBeenCalled()
    expect(fireEvent.click(link)).toBe(false)
    expect(onGo).toHaveBeenCalledTimes(1)
  })
})
