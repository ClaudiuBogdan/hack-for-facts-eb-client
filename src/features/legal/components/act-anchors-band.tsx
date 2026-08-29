import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalIncomingAnchor, LegalIncomingAnchorGroup } from '@/schemas/legal'
import { formatLegalNumber } from '../lib/legal-format'
import { LegalStatusBadge } from './legal-status-badge'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly group: LegalIncomingAnchorGroup
}

/**
 * Rung 4b — incoming anchors: links the PORTAL ITSELF asserts in citing
 * documents' text (`document_link_edges`).
 *
 * A different graph from `ActReferencesBand`'s citation edges, which are
 * LLM-inferred normative relations: the two disagree by construction, and
 * both disagreements are informative — so each band names its provenance and
 * they are never merged. Anchors carry the citing page's own words
 * (`linkText`) and, when the anchor points at a provision, the fragment
 * (`art. 5`). Unlike the citation connection, `totalCount` here is REAL.
 */
export function ActAnchorsBand({ group }: Props) {
  const { i18n } = useLingui()

  if (group.items.length === 0 && group.totalCount === 0) return null

  const shownCount = group.items.length

  return (
    <ActAccordionItem
      id="act-anchors-heading"
      title={t`Trimiteri afirmate de portal`}
      meta={
        <Plural
          value={group.totalCount}
          one="# ancoră"
          few="# ancore"
          other="# de ancore"
        />
      }
      description={t`Legături pe care portalul legislativ le afirmă în textul actelor care citează acest act — cu formularea exactă din pagina-sursă.`}
      footnote={
        <Trans>
          Sursa: ancorele marcate de portal în textul actelor, nu deduceri
          automate. Graful dedus din citări apare separat, la „Cine îl citează”.
        </Trans>
      }
    >
      <ul className="flex flex-col">
        {group.items.map((anchor, index) => (
          <AnchorRow key={`${anchor.sourceDocumentId}-${index}`} anchor={anchor} />
        ))}
      </ul>

      {shownCount < group.totalCount ? (
        <p className="border-t border-[var(--pnrr-subtle)] px-5 py-3 text-sm text-[var(--pnrr-muted)] sm:px-6">
          <Trans>
            Se afișează {formatLegalNumber(shownCount, i18n.locale)} din{' '}
            {formatLegalNumber(group.totalCount, i18n.locale)}.
          </Trans>
        </p>
      ) : null}
    </ActAccordionItem>
  )
}

function AnchorRow({ anchor }: { readonly anchor: LegalIncomingAnchor }) {
  return (
    <li className="flex flex-col gap-1.5 border-b border-[var(--pnrr-subtle)] px-5 py-3 last:border-b-0 sm:px-6">
      {anchor.targetFragment !== null && (
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
          <Trans>țintește {anchor.targetFragment}</Trans>
        </span>
      )}

      {anchor.sourceAct !== null ? (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to="/legislation/acts/$actId"
            params={{ actId: anchor.sourceAct.actId }}
            className="text-base font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 hover:text-[var(--pnrr-muted)]"
          >
            {anchor.sourceAct.displayCitation}
          </Link>
          <LegalStatusBadge status={anchor.sourceAct.status} />
        </span>
      ) : (
        <span className="text-base text-[var(--pnrr-fg)]">
          <Trans>document {anchor.sourceDocumentId} — fără fișă de act la noi</Trans>
        </span>
      )}

      {anchor.linkText !== null && (
        <q className="text-sm text-[var(--pnrr-muted)]">{anchor.linkText}</q>
      )}
    </li>
  )
}
