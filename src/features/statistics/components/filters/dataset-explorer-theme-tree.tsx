import { useRef, useState } from 'react'
import type { FocusEvent, KeyboardEvent, ReactNode } from 'react'
import { plural, t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { cn, formatNumber } from '@/lib/utils'
import { statisticsTheme } from '../../lib/statistics-theme'
import type {
  StatisticsContextIndex,
  StatisticsContextTreeNode,
} from '../../lib/context-tree'
import { contextAncestorCodes, isSelectableContextLevel } from '../../lib/context-tree'

/**
 * The code of the „all themes" row. INS context codes are numeric, so none can
 * collide with it, and keeping the row inside the tree keeps one keyboard model
 * for the whole rail.
 */
const ALL_ROW_CODE = '*'

type Props = {
  readonly roots: readonly StatisticsContextTreeNode[]
  readonly index: StatisticsContextIndex
  readonly selectedCode: string | undefined
  /** `undefined` clears the filter — the „all themes" row. */
  readonly onSelect: (code: string | undefined) => void
  /** Dataset counts per domain. INS publishes none below that level. */
  readonly counts?: ReadonlyMap<string, number>
  readonly allCount?: number
  readonly labelledBy: string
}

/** One node with everything the row needs to draw itself and answer a key. */
type Row = {
  readonly code: string
  readonly label: string
  readonly depth: number
  readonly parentCode: string | null
  readonly open: boolean
  readonly hasChildren: boolean
  readonly selectable: boolean
  readonly selected: boolean
  readonly count: number | undefined
  readonly children: readonly Row[]
}

/**
 * The INS domain hierarchy as the catalog's filter: domain → group →
 * subdomain, the three levels INS Tempo publishes.
 *
 * A domain and a subdomain each filter the list; the group between them only
 * opens, because the server has no filter for a context subtree (see
 * `isSelectableContextLevel`). It is a WAI-ARIA tree: one tab stop, the arrows
 * walk and open the branches, Enter picks.
 */
export function DatasetExplorerThemeTree({
  roots,
  index,
  selectedCode,
  onSelect,
  counts,
  allCount,
  labelledBy,
}: Props) {
  const treeRef = useRef<HTMLUListElement>(null)
  const [openCodes, setOpenCodes] = useState<ReadonlySet<string>>(
    () => new Set(branchCodes(index, selectedCode)),
  )
  const [focusedCode, setFocusedCode] = useState<string>(selectedCode ?? ALL_ROW_CODE)

  // The branch holding the selection opens itself — on a deep link, when the
  // tree arrives after the first paint, and when the URL moves under the rail
  // (a chip removed, the back button). Keyed on values, never on identity, so
  // a rebuilt tree cannot loop; `withCodes` keeps the set when nothing is new.
  const [anchor, setAnchor] = useState({ code: selectedCode, size: index.size })
  if (anchor.code !== selectedCode || anchor.size !== index.size) {
    setAnchor({ code: selectedCode, size: index.size })
    setOpenCodes((current) => withCodes(current, branchCodes(index, selectedCode)))
  }

  const rows: readonly Row[] = [
    {
      code: ALL_ROW_CODE,
      label: t`Toate temele`,
      depth: 0,
      parentCode: null,
      open: false,
      hasChildren: false,
      selectable: true,
      selected: selectedCode === undefined,
      count: allCount,
      children: [],
    },
    ...buildRows({ nodes: roots, openCodes, selectedCode, counts, depth: 0, parentCode: null }),
  ]
  const visible = flattenVisible(rows)

  // The roving tab stop follows the focus and falls back to the first row
  // whenever the row it pointed at left the screen.
  const activeCode = visible.some((row) => row.code === focusedCode)
    ? focusedCode
    : ALL_ROW_CODE

  const focus = (code: string) => {
    setFocusedCode(code)
    treeRef.current?.querySelector<HTMLLIElement>(`[data-code="${code}"]`)?.focus()
  }

  // DOM focus is the truth: the browser also moves it on its own — a click that
  // lands between two rows, a deep-linked row that only appears once the tree
  // arrives — and the arrows must answer for the row the reader is actually on.
  const handleFocus = (event: FocusEvent<HTMLUListElement>) => {
    const code = event.target.dataset.code
    if (code && code !== focusedCode) setFocusedCode(code)
  }

  const setOpen = (code: string, open: boolean) => {
    setOpenCodes((current) => {
      const next = new Set(current)
      if (open) next.add(code)
      else next.delete(code)
      return next
    })
  }

  const activate = (row: Row) => {
    setFocusedCode(row.code)
    const nextCode = row.code === ALL_ROW_CODE ? undefined : row.code
    // Re-selecting the current row would reset the page for a click whose only
    // intent is to collapse the branch.
    if (row.selectable && nextCode !== selectedCode) {
      onSelect(nextCode)
    }
    if (!row.hasChildren) return
    // A group toggles; a domain opens as it is picked and closes when the row
    // that is already selected is activated again.
    const close = row.open && (!row.selectable || row.selected)
    setOpen(row.code, !close)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    // Alt+Arrow is Back/Forward and Cmd+Arrow scrolls the document; a filter
    // rail has no business swallowing either.
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

    const current = visible.findIndex((row) => row.code === activeCode)
    const row = visible[current]
    if (!row) return

    switch (event.key) {
      case 'ArrowDown': {
        const next = visible[current + 1]
        if (next) focus(next.code)
        break
      }
      case 'ArrowUp': {
        const previous = visible[current - 1]
        if (previous) focus(previous.code)
        break
      }
      case 'ArrowRight': {
        if (!row.hasChildren) break
        if (!row.open) setOpen(row.code, true)
        else {
          const child = visible[current + 1]
          if (child) focus(child.code)
        }
        break
      }
      case 'ArrowLeft': {
        if (row.open) setOpen(row.code, false)
        else if (row.parentCode) focus(row.parentCode)
        break
      }
      case 'Home': {
        const first = visible[0]
        if (first) focus(first.code)
        break
      }
      case 'End': {
        const last = visible[visible.length - 1]
        if (last) focus(last.code)
        break
      }
      case 'Enter':
      case ' ': {
        activate(row)
        break
      }
      default:
        return
    }

    event.preventDefault()
  }

  const renderRows = (items: readonly Row[]): ReactNode =>
    items.map((row) => (
      <TreeRow
        key={row.code}
        row={row}
        active={activeCode === row.code}
        onActivate={() => activate(row)}
      >
        {row.hasChildren && row.open ? (
          <ul role="group" className="mt-0.5 space-y-0.5">
            {renderRows(row.children)}
          </ul>
        ) : null}
      </TreeRow>
    ))

  return (
    <ul
      ref={treeRef}
      role="tree"
      aria-labelledby={labelledBy}
      // No negative margin: the phone sheet scrolls this column, and a
      // scroller clips whatever hangs past its start edge — which took the
      // selected row's accent bar with it.
      className="mt-2 max-h-[min(60vh,32rem)] space-y-0.5 overflow-y-auto pl-0.5 pr-1.5"
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
    >
      {renderRows(rows)}
    </ul>
  )
}

function TreeRow({
  row,
  active,
  onActivate,
  children,
}: {
  readonly row: Row
  readonly active: boolean
  readonly onActivate: () => void
  readonly children?: ReactNode
}) {
  return (
    <li
      role="treeitem"
      // Name from content would swallow the open subtree under this row, so the
      // row states its own name — with the count, which is part of what it says.
      aria-label={rowAccessibleName(row)}
      data-code={row.code}
      aria-expanded={row.hasChildren ? row.open : undefined}
      aria-selected={row.selectable ? row.selected : undefined}
      tabIndex={active ? 0 : -1}
      className="cursor-pointer outline-none focus-visible:[&>span]:ring-2 focus-visible:[&>span]:ring-ring"
    >
      {/* The handler sits on the row, not on the item: the item also contains
          the nested list, whose gaps would otherwise activate this row. */}
      <span
        onClick={onActivate}
        className={cn(
          statisticsTheme.facetRow,
          row.depth === 0 ? 'text-sm' : 'text-xs',
          row.selected ? statisticsTheme.facetRowSelected : 'text-foreground/90',
          // A group opens rather than filters; it reads as a heading over its
          // subdomains, which is a weight difference, not a colour one.
          !row.selectable && 'font-medium text-muted-foreground',
        )}
        style={{ paddingLeft: `${0.5 + row.depth * 0.75}rem` }}
      >
        {row.hasChildren ? (
          <ChevronRight
            aria-hidden
            className={cn(
              'mt-0.5 h-3.5 w-3.5 shrink-0 self-start text-muted-foreground transition-transform',
              row.open && 'rotate-90',
            )}
          />
        ) : (
          <span aria-hidden className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="min-w-0 flex-1 leading-snug">{row.label}</span>
        {row.count !== undefined ? (
          <span className={cn(statisticsTheme.facetCount, row.selected && 'text-foreground')}>
            {formatNumber(row.count)}
          </span>
        ) : null}
      </span>
      {children}
    </li>
  )
}

function rowAccessibleName(row: Row): string {
  if (row.count === undefined) return row.label
  const datasets = plural(row.count, {
    one: 'un set cu date',
    few: '# seturi cu date',
    other: '# de seturi cu date',
  })
  return `${row.label}, ${datasets}`
}

/** The tree as rows. Counts are read at the top level, the only level INS counts. */
function buildRows(params: {
  readonly nodes: readonly StatisticsContextTreeNode[]
  readonly openCodes: ReadonlySet<string>
  readonly selectedCode: string | undefined
  readonly counts: ReadonlyMap<string, number> | undefined
  readonly depth: number
  readonly parentCode: string | null
}): readonly Row[] {
  const { nodes, openCodes, selectedCode, counts, depth, parentCode } = params

  return nodes.map((node) => {
    const selectable = isSelectableContextLevel(node.level)

    return {
      code: node.code,
      label: node.label,
      depth,
      parentCode,
      // Only a row with children can be open: `branchCodes` puts the selected
      // row in `openCodes` too, and a leaf that claimed to be open would make
      // ArrowLeft collapse nothing instead of walking to its parent.
      open: node.children.length > 0 && openCodes.has(node.code),
      hasChildren: node.children.length > 0,
      selectable,
      selected: selectable && node.code === selectedCode,
      count: depth === 0 ? counts?.get(node.code) : undefined,
      children: buildRows({
        nodes: node.children,
        openCodes,
        selectedCode,
        counts,
        depth: depth + 1,
        parentCode: node.code,
      }),
    }
  })
}

/** The rows on screen, parents before their open children — the DOM order. */
function flattenVisible(rows: readonly Row[]): readonly Row[] {
  return rows.flatMap((row) => (row.open ? [row, ...flattenVisible(row.children)] : [row]))
}

/**
 * The codes to open so a selection is on screen with its own children showing:
 * the node itself and every ancestor above it.
 */
function branchCodes(
  index: StatisticsContextIndex,
  code: string | undefined,
): readonly string[] {
  return code ? [code, ...contextAncestorCodes(index, code)] : []
}

/** The set plus `codes`, or the very same set when it already holds them all. */
function withCodes(
  current: ReadonlySet<string>,
  codes: readonly string[],
): ReadonlySet<string> {
  if (codes.every((code) => current.has(code))) return current
  return new Set([...current, ...codes])
}
