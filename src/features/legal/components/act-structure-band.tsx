import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { LegalStructureNode } from '@/schemas/legal'
import { formatLegalNumber } from '../lib/legal-format'
import { legalNodeKindLabel } from '../lib/legal-vocabulary'
import { ActDisclosure } from './act-disclosure'

type Props = {
  readonly structure: readonly LegalStructureNode[]
}

/** Below this the tree is a stub, not a table of contents (§5). */
const MIN_NODES = 10

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
  const { i18n } = useLingui()

  if (structure.length < MIN_NODES) return null

  return (
    <ActDisclosure
      id="act-structure-heading"
      title={t`Cum e structurat`}
      meta={
        <Trans>
          {formatLegalNumber(structure.length, i18n.locale)} elemente
        </Trans>
      }
      description={t`Cuprinsul actului, la primul nivel.`}
      footnote={
        <Trans>
          Afișăm doar titlurile elementelor. Textul articolelor nu este
          disponibil aici — folosește linkul către textul oficial.
        </Trans>
      }
    >
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {structure.map((node) => (
          <li
            key={node.nodeId}
            className="border-b border-r border-[var(--pnrr-track)] px-4 py-2.5"
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
      </ul>
    </ActDisclosure>
  )
}
