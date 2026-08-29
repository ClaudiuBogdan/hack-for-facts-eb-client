import { render, screen, fireEvent } from '@/test/test-utils'
import { describe, expect, it, vi } from 'vitest'
import type { LegalOutlineEntry } from '@/schemas/legal'
import { LegalReaderToc } from './legal-reader-toc'

const entry = (
  path: string,
  nodeKind: string,
  depth: number,
  label: string | null,
  numberKey: string | null = null,
): LegalOutlineEntry => ({
  documentId: '100023',
  path,
  nodeKind,
  label,
  numberKey,
  numberStatus: null,
  depth,
  orderIndex: 0,
  charStart: 0,
  charEnd: 10,
})

const entries: LegalOutlineEntry[] = [
  entry('0.1', 'capitol', 4, 'Capitolul I — Dispoziții generale'),
  entry('0.1.2', 'articol', 7, 'Articolul 1'),
  entry('0.1.3', 'articol', 7, null, '2'),
  entry('0.2', 'capitol', 4, 'Capitolul II'),
]

describe('LegalReaderToc', () => {
  it('renders an ARIA tree with the document hierarchy', () => {
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={vi.fn()} />)

    expect(screen.getByRole('navigation', { name: /Cuprinsul actului/ })).toBeInTheDocument()
    expect(screen.getByRole('tree')).toBeInTheDocument()
    const chapter = screen.getByRole('treeitem', { name: /Dispoziții generale/ })
    expect(chapter).toHaveAttribute('aria-expanded', 'true')
  })

  it('never renders a blank row: label-less entries compose kind + number', () => {
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={vi.fn()} />)
    // entry 0.1.3 has label null + numberKey 2.
    expect(screen.getByRole('button', { name: /Articol 2|articol 2/i })).toBeInTheDocument()
  })

  it('reports selection to the parent without navigating itself', () => {
    const onSelect = vi.fn()
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={onSelect} />)

    fireEvent.click(screen.getByRole('button', { name: 'Articolul 1' }))
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ path: '0.1.2' }))
  })

  it('marks the active entry for scroll sync', () => {
    render(<LegalReaderToc entries={entries} activePath="0.1.2" onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Articolul 1' })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('collapses a branch on toggle', () => {
    render(<LegalReaderToc entries={entries} activePath={null} onSelect={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Articolul 1' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Restrânge Capitolul I/ }))
    expect(screen.queryByRole('button', { name: 'Articolul 1' })).toBeNull()
  })

  it('renders nothing for an empty outline (paragraph_stream shape)', () => {
    const { container } = render(
      <LegalReaderToc entries={[]} activePath={null} onSelect={vi.fn()} />,
    )
    expect(container.firstChild).toBeNull()
  })
})
