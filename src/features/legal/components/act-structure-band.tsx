import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { LegalStructureNode } from '@/schemas/legal'
import { legalNodeKindLabel } from '../lib/legal-vocabulary'
import {
  getGridFillerClassNames,
  legislationGridClassName,
  legislationGridFillerClassName,
} from '../lib/legislation-theme'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly structure: readonly LegalStructureNode[]
}

/** Below this the tree is a stub, not a table of contents (§5). */
const MIN_NODES = 10

/** Column count per breakpoint, matching the grid classes below. */
const STRUCTURE_GRID_COLUMNS = [1, 2, 3] as const

/**
 * Rung 4 — the skeleton of the act.
 *
 * **This band shows labels only, and that is permanent, not provisional.** The
 * server serves `charStart`/`charEnd` as forward-compatible locators and no node
 * text at all (SDL §3.4), so there is nothing to expand into. Making the rows
 * look clickable would promise a reading experience that does not exist; they
 * are plain text, and the band says where the text actually lives.
 *
 * Only renders above `MIN_NODES` — 152.603 documents have *some* structure but
 * only 24.502 have enough to be worth browsing.
 */
export function ActStructureBand({ structure }: Props) {
  if (structure.length < MIN_NODES) return null

  return (
    <ActAccordionItem
      id="act-structure-heading"
      title={t`Cum e structurat`}
      meta={
        <Plural
          value={structure.length}
          one="# element"
          few="# elemente"
          other="# de elemente"
        />
      }
      description={t`Cuprinsul actului, la primul nivel.`}
      footnote={
        <Trans>
          Afișăm doar titlurile elementelor. Textul articolelor nu este
          disponibil aici — folosește linkul către textul oficial.
        </Trans>
      }
    >
      <ul
        className={cn(
          legislationGridClassName,
          'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        )}
      >
        {structure.map((node) => (
          <li
            key={node.nodeId}
            className="border-l border-t border-[var(--pnrr-subtle)] px-5 py-2.5 sm:px-6"
          >
            <span className="block text-sm font-medium text-[var(--pnrr-fg)]">
              {node.label ?? legalNodeKindLabel(node.nodeKind)}
            </span>
            {node.label !== null ? (
              <span className="block text-xs text-[var(--pnrr-muted)]">
                {legalNodeKindLabel(node.nodeKind)}
              </span>
            ) : null}
          </li>
        ))}
        {getGridFillerClassNames({
          itemCount: structure.length,
          columns: STRUCTURE_GRID_COLUMNS,
        }).map((visibility, index) => (
          <li
            key={`filler-${index}`}
            aria-hidden
            className={cn(legislationGridFillerClassName, visibility)}
          />
        ))}
      </ul>
    </ActAccordionItem>
  )
}
