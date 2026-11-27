import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalIncomingAnchor, LegalIncomingAnchorGroup } from '@/schemas/legal'
import { formatLegalNumber } from '../lib/legal-format'
import { LegalStatusBadge } from './legal-status-badge'
import { ActAccordionItem } from './act-accordion'
import { ACT_LINK, ACT_RECORD_LINE } from './reader/act-page-grid'

type Props = {
  /** Null when the anchors are not available for this act (bridged on legal_v2). */
  readonly group: LegalIncomingAnchorGroup | null
  /**
   * False when the anchors are not available for this act (legal_v2 bridges
   * them from the previous corpus, which may not hold the act).
   */
  readonly available?: boolean
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
export function ActAnchorsBand({ group, available = true }: Props) {
  const { i18n } = useLingui()

  // Unavailable, or an unknown total with nothing to show: say so — an
  // empty band would read as "no anchors".
  if (
    !available ||
    group === null ||
    (group.items.length === 0 && group.totalCount === null)
  ) {
    return (
      <ActAccordionItem id="act-anchors-heading" title={t`Trimiteri afirmate de portal`}>
        <p className="text-muted-foreground">
          <Trans>Trimiterile afirmate de portal nu sunt disponibile pentru acest act.</Trans>
        </p>
      </ActAccordionItem>
    )
  }

  if (group.items.length === 0 && group.totalCount === 0) return null

  const shownCount = group.items.length
  const totalCount = group.totalCount

  return (
    <ActAccordionItem
      id="act-anchors-heading"
      title={t`Trimiteri afirmate de portal`}
      meta={
        totalCount !== null ? (
          <Plural value={totalCount} one="# ancoră" few="# ancore" other="# de ancore" />
        ) : (
          <Plural
            value={shownCount}
            one="cel puțin # ancoră"
            few="cel puțin # ancore"
            other="cel puțin # de ancore"
          />
        )
      }
      description={t`Legături pe care portalul legislativ le afirmă în textul actelor care citează acest act — cu formularea exactă din pagina-sursă.`}
      footnote={
        <Trans>
          Sursa: ancorele marcate de portal în textul actelor, nu deduceri
          automate. Graful dedus din citări apare separat, la „Cine îl citează”.
        </Trans>
      }
    >
      <ul className="divide-y">
        {group.items.map((anchor, index) => (
          <AnchorRow key={`${anchor.sourceDocumentId}-${index}`} anchor={anchor} />
        ))}
      </ul>

      {totalCount !== null && shownCount < totalCount ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          <Trans>
            Se afișează {formatLegalNumber(shownCount, i18n.locale)} din{' '}
            {formatLegalNumber(totalCount, i18n.locale)}.
          </Trans>
        </p>
      ) : null}
    </ActAccordionItem>
  )
}

function AnchorRow({ anchor }: { readonly anchor: LegalIncomingAnchor }) {
  return (
    <li className={ACT_RECORD_LINE}>
      {/* The cell stays when the anchor names no provision, so the source keeps its column. */}
      <span className="text-muted-foreground">
        {anchor.targetFragment !== null && (
          <Trans>țintește {anchor.targetFragment}</Trans>
        )}
      </span>

      <span className="flex min-w-0 flex-col gap-0.5">
        {anchor.sourceAct !== null ? (
          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
            <Link
              to="/legislation/acts/$actId"
              params={{ actId: anchor.sourceAct.actId }}
              className={ACT_LINK}
            >
              {anchor.sourceAct.displayCitation}
            </Link>
            <LegalStatusBadge status={anchor.sourceAct.status} />
          </span>
        ) : (
          <span>
            <Trans>document {anchor.sourceDocumentId} — fără fișă de act la noi</Trans>
          </span>
        )}

        {anchor.linkText !== null && (
          <q className="text-muted-foreground">{anchor.linkText}</q>
        )}
      </span>
    </li>
  )
}
