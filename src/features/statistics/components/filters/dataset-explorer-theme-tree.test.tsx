import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@/test/test-utils'
import type { StatisticsContextNode } from '@/schemas/statistics'
import {
  buildStatisticsContextTree,
  indexStatisticsContextTree,
} from '../../lib/context-tree'
import { DatasetExplorerThemeTree } from './dataset-explorer-theme-tree'

const NODES: readonly StatisticsContextNode[] = [
  { code: '1', level: 0, parentCode: null, nameRo: 'A. STATISTICA SOCIALA', nameEn: null },
  { code: '2', level: 0, parentCode: null, nameRo: 'B. STATISTICA ECONOMICA', nameEn: null },
  {
    code: '10',
    level: 1,
    parentCode: '1',
    nameRo: 'A.1 POPULATIE SI STRUCTURA DEMOGRAFICA Comunicate de presa',
    nameEn: null,
  },
  { code: '1010', level: 2, parentCode: '10', nameRo: '1. POPULATIA REZIDENTA', nameEn: null },
  { code: '1012', level: 2, parentCode: '10', nameRo: '2. POPULATIA DUPA DOMICILIU', nameEn: null },
]

const roots = buildStatisticsContextTree(NODES, 'ro')
const index = indexStatisticsContextTree(roots)

/** The rail before the context read lands: the eight domains, childless. */
const emptyRoots = buildStatisticsContextTree([], 'ro')
const emptyIndex = indexStatisticsContextTree(emptyRoots)

function tree(props: Partial<React.ComponentProps<typeof DatasetExplorerThemeTree>>) {
  return (
    <>
      <span id="legend">Temă</span>
      <DatasetExplorerThemeTree
        roots={roots}
        index={index}
        selectedCode={undefined}
        onSelect={() => {}}
        counts={new Map([['1', 844]])}
        allCount={1916}
        labelledBy="legend"
        {...props}
      />
    </>
  )
}

function renderTree(
  props: Partial<React.ComponentProps<typeof DatasetExplorerThemeTree>> = {},
) {
  const onSelect = vi.fn()
  const view = render(tree({ onSelect, ...props }))
  return { onSelect, view }
}

/** Assertions go through the role; clicks go through the label a reader sees. */
const item = (name: string | RegExp) => screen.getByRole('treeitem', { name })
const label = (text: string | RegExp) => screen.getByText(text)

describe('DatasetExplorerThemeTree', () => {
  it('shows the domains closed, with their counts, under one tab stop', () => {
    renderTree()

    expect(screen.getByRole('tree', { name: 'Temă' })).toBeInTheDocument()
    expect(item(/^Social/)).toHaveAttribute('aria-expanded', 'false')
    expect(item(/^Social/)).toHaveAccessibleName('Social, 844 de seturi cu date')
    expect(item(/^Social/)).toHaveTextContent('844')
    expect(screen.queryByRole('treeitem', { name: /POPULATIE SI STRUCTURA/ })).toBeNull()

    const stops = screen
      .getAllByRole('treeitem')
      .filter((node) => node.getAttribute('tabindex') === '0')
    expect(stops).toHaveLength(1)
  })

  it('selects a domain and opens it in the same click', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree()

    await user.click(label(/^Social/))

    expect(onSelect).toHaveBeenCalledWith('1')
    expect(item(/^A\.1 POPULATIE SI STRUCTURA DEMOGRAFICA/)).toBeInTheDocument()
  })

  it('opens a group without filtering by it, since the server cannot', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree({ selectedCode: '1' })

    await user.click(label(/^A\.1 POPULATIE/))

    expect(onSelect).not.toHaveBeenCalled()
    expect(item(/^A\.1 POPULATIE/)).not.toHaveAttribute('aria-selected')
    expect(item('1. POPULATIA REZIDENTA')).toBeInTheDocument()
  })

  it('filters on a subdomain', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree({ selectedCode: '1' })

    await user.click(label(/^A\.1 POPULATIE/))
    await user.click(label('2. POPULATIA DUPA DOMICILIU'))

    expect(onSelect).toHaveBeenCalledWith('1012')
  })

  it('opens the branch a deep-linked subdomain sits in', () => {
    renderTree({ selectedCode: '1012' })

    expect(item('2. POPULATIA DUPA DOMICILIU')).toHaveAttribute('aria-selected', 'true')
    expect(item(/^A\.1 POPULATIE/)).toHaveAttribute('aria-expanded', 'true')
  })

  it('walks and opens the tree with the arrow keys', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree()

    await user.tab()
    expect(item(/^Toate temele/)).toHaveFocus()

    await user.keyboard('{ArrowDown}')
    expect(item(/^Social/)).toHaveFocus()

    await user.keyboard('{ArrowRight}')
    expect(item(/^Social/)).toHaveAttribute('aria-expanded', 'true')
    expect(onSelect).not.toHaveBeenCalled()

    await user.keyboard('{ArrowRight}')
    expect(item(/^A\.1 POPULATIE/)).toHaveFocus()

    await user.keyboard('{ArrowLeft}')
    expect(item(/^Social/)).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onSelect).toHaveBeenCalledWith('1')
  })

  it('walks from a selected subdomain to its group on the first ArrowLeft', async () => {
    const user = userEvent.setup()
    renderTree({ selectedCode: '1012' })

    await user.tab()
    expect(item('2. POPULATIA DUPA DOMICILIU')).toHaveFocus()

    await user.keyboard('{ArrowLeft}')

    expect(item(/^A\.1 POPULATIE/)).toHaveFocus()
  })

  it('collapses a selected domain without re-applying the filter', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree({ selectedCode: '1' })

    // A selected domain arrives open; clicking it again tidies the rail.
    expect(item(/^A\.1 POPULATIE/)).toBeInTheDocument()

    await user.click(label(/^Social/))

    expect(screen.queryByRole('treeitem', { name: /^A\.1 POPULATIE/ })).toBeNull()
    // Re-selecting would have reset the page under the reader.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('ignores a click that lands between two rows of a branch', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree({ selectedCode: '1' })

    // The gap belongs to the nested list, which sits inside the domain row's
    // item: a click there used to collapse the branch it was aimed at.
    await user.click(screen.getAllByRole('group')[0]!)

    expect(onSelect).not.toHaveBeenCalled()
    expect(item(/^Social/)).toHaveAttribute('aria-expanded', 'true')
    expect(item(/^A\.1 POPULATIE/)).toBeInTheDocument()
  })

  it('follows the focus the browser moves on its own', async () => {
    const user = userEvent.setup()
    renderTree({ selectedCode: '1012' })

    // The reader tabs in, then the pointer puts focus on another row without
    // activating it; the arrows must answer for the row that has focus.
    await user.tab()
    item(/^A\.1 POPULATIE/).focus()
    await user.keyboard('{ArrowDown}')

    expect(item('1. POPULATIA REZIDENTA')).toHaveFocus()
  })

  it('leaves browser chords alone', async () => {
    const user = userEvent.setup()
    renderTree()

    await user.tab()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')

    expect(item(/^Toate temele/)).toHaveFocus()
  })

  it('opens the deep-linked branch when the tree arrives after the first paint', () => {
    const onSelect = vi.fn()
    const { rerender } = render(
      tree({ roots: emptyRoots, index: emptyIndex, selectedCode: '1012', onSelect }),
    )

    expect(screen.queryByRole('treeitem', { name: '2. POPULATIA DUPA DOMICILIU' })).toBeNull()

    rerender(tree({ selectedCode: '1012', onSelect }))

    expect(item('2. POPULATIA DUPA DOMICILIU')).toHaveAttribute('aria-selected', 'true')
    expect(item(/^A\.1 POPULATIE/)).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens the branch when the URL moves under the rail', () => {
    const onSelect = vi.fn()
    const { rerender } = render(tree({ selectedCode: undefined, onSelect }))

    rerender(tree({ selectedCode: '1010', onSelect }))

    expect(item('1. POPULATIA REZIDENTA')).toHaveAttribute('aria-selected', 'true')
  })

  it('clears the filter from the „all themes" row', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTree({ selectedCode: '1012' })

    await user.click(label(/^Toate temele/))

    expect(onSelect).toHaveBeenCalledWith(undefined)
  })
})
