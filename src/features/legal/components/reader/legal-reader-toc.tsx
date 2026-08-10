import { useMemo, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalOutlineEntry } from '@/schemas/legal'
import { legalNodeKindLabel } from '../../lib/legal-vocabulary'

type Props = {
  readonly entries: readonly LegalOutlineEntry[]
  /** The outline path of the heading currently in view (scroll sync). */
  readonly activePath: string | null
  readonly onSelect: (entry: LegalOutlineEntry) => void
  readonly className?: string
}

interface TocNode {
  readonly entry: LegalOutlineEntry
  readonly children: TocNode[]
}

/**
 * Flat document-order entries → a tree by depth rank. Depth is the server's
 * fixed grammar rank, NEVER parsed from the path (`unmarked:N` keys carry no
 * hierarchy), so the stack walk is purely "deeper than the top ⇒ child".
 */
function buildTree(entries: readonly LegalOutlineEntry[]): TocNode[] {
  const roots: TocNode[] = []
  const stack: TocNode[] = []
  for (const entry of entries) {
    const node: TocNode = { entry, children: [] }
    while (stack.length > 0) {
      const top = stack[stack.length - 1]
      if (top !== undefined && top.entry.depth >= entry.depth) stack.pop()
      else break
    }
    const parent = stack[stack.length - 1]
    if (parent === undefined) roots.push(node)
    else parent.children.push(node)
    stack.push(node)
  }
  return roots
}

/** Above this many entries, article-level branches start collapsed. */
const AUTO_COLLAPSE_THRESHOLD = 120

function tocLabel(entry: LegalOutlineEntry): string {
  if (entry.label !== null && entry.label.trim() !== '') return entry.label
  const kind = legalNodeKindLabel(entry.nodeKind)
  if (entry.numberKey !== null) return `${kind} ${entry.numberKey}`
  // Never a blank row: the POR class is filtered server-side, but any other
  // label-less heading still gets an honest placeholder.
  return `${kind} — ${t`fără titlu`}`
}

/**
 * The reader's table of contents — an ARIA tree over the served outline.
 *
 * Modeled on `ParliamentStenogramToc` (real `<nav>`, buttons that move focus,
 * honest empty state) with collapsible branches. Selection is the parent's
 * concern: the TOC never scrolls or navigates itself.
 */
export function LegalReaderToc({ entries, activePath, onSelect, className }: Props) {
  const tree = useMemo(() => buildTree(entries), [entries])
  const autoCollapse = entries.length > AUTO_COLLAPSE_THRESHOLD

  // Paths the user explicitly toggled; everything else follows the default.
  const [toggled, setToggled] = useState<ReadonlySet<string>>(new Set())

  if (entries.length === 0) return null

  const isExpanded = (node: TocNode): boolean => {
    const defaultExpanded = !autoCollapse || node.entry.nodeKind !== 'capitol'
    return toggled.has(node.entry.path) ? !defaultExpanded : defaultExpanded
  }

  const toggle = (path: string) => {
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const renderNodes = (nodes: TocNode[]) => (
    <ul role="group" className="space-y-0.5">
      {nodes.map((node) => {
        const expanded = isExpanded(node)
        const hasChildren = node.children.length > 0
        const active = node.entry.path === activePath
        return (
          <li
            key={node.entry.path}
            role="treeitem"
            aria-expanded={hasChildren ? expanded : undefined}
            aria-selected={active}
          >
            <div className="flex min-w-0 items-center">
              {hasChildren ? (
                <button
                  type="button"
                  onClick={() => toggle(node.entry.path)}
                  aria-label={
                    expanded
                      ? t`Restrânge ${tocLabel(node.entry)}`
                      : t`Extinde ${tocLabel(node.entry)}`
                  }
                  className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronRight
                    aria-hidden
                    className={cn('size-3.5 transition-transform', expanded && 'rotate-90')}
                  />
                </button>
              ) : (
                <span className="w-[19px] shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onSelect(node.entry)}
                aria-current={active ? 'location' : undefined}
                // Active = 3px left rule + semibold, not a filled pill: the
                // pill was the darkest object on the page, heavier than the
                // H1, pulling the eye out of the reading column.
                className={cn(
                  'min-w-0 flex-1 truncate rounded-none py-1 text-left text-sm leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'border-l-[3px] border-[var(--pnrr-fg)] pl-[5px] pr-2 font-semibold text-[var(--pnrr-fg)]'
                    : 'px-2 text-foreground hover:bg-muted',
                )}
                title={tocLabel(node.entry)}
              >
                {tocLabel(node.entry)}
              </button>
            </div>
            {hasChildren && expanded && (
              <div className="ml-4 border-l pl-1">{renderNodes(node.children)}</div>
            )}
          </li>
        )
      })}
    </ul>
  )

  return (
    <nav aria-label={t`Cuprinsul actului`} className={className}>
      {/* Same eyebrow style as "Pe această pagină" — one rail, one voice. */}
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
        <Trans>Cuprins</Trans>
      </h2>
      {/* A plain overflow div, NOT ScrollArea: Radix's viewport lays the tree
          out at content width (display:table), which defeated `truncate` and
          produced a 2.800px-wide horizontally scrolling rail. */}
      <div className="max-h-[calc(100vh-10rem)] overflow-y-auto overflow-x-hidden pr-2">
        <div role="tree" aria-label={t`Structura actului`}>
          {renderNodes(tree)}
        </div>
      </div>
    </nav>
  )
}
