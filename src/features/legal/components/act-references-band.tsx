import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalReference, LegalReferenceGroup } from '@/schemas/legal'
import { formatLegalNumber } from '../lib/legal-format'
import { legalRelationLabel } from '../lib/legal-vocabulary'
import { LegalStatusBadge } from './legal-status-badge'
import { ActAccordionItem } from './act-accordion'
import { ACT_LINK, ACT_RECORD_LINE } from './reader/act-page-grid'

type Props = {
  /** Null when the links are not available for this act (bridged on legal_v2). */
  readonly group: LegalReferenceGroup | null
  readonly direction: 'out' | 'in'
  /**
   * False when the links are not available for this act (legal_v2 bridges
   * them from the previous corpus, which may not hold the act): the band
   * says so instead of reading as "no references".
   */
  readonly available?: boolean
}

/**
 * Rung 4 — the citation graph, in one direction.
 *
 * **Only `resolution === 'unique'` renders as a link.** `cluster` and
 * `unresolved` edges keep the raw cited text and say "potrivire posibilă": we
 * matched a citation string, not an act. 400.368 of 1.103.595 references (36,3%)
 * never resolve, so treating them as firm links would manufacture a graph that
 * does not exist. `external` edges point outside the corpus (EU directives,
 * treaties) and have nowhere to go.
 *
 * The list is capped at what the query returned; `totalCount` leads so the scale
 * is honest even when only 12 of 2.621 rows are on screen.
 */
export function ActReferencesBand({ group, direction, available = true }: Props) {
  const { i18n } = useLingui()
  const isOut = direction === 'out'

  // Unavailable, or an unknown total with nothing to show: say so — an
  // empty band would read as "no references".
  if (
    !available ||
    group === null ||
    (group.items.length === 0 && group.totalCount === null)
  ) {
    return (
      <ActAccordionItem
        id={`act-references-${direction}-heading`}
        title={isOut ? t`Ce face acest act` : t`Cine îl citează`}
      >
        <p className="text-muted-foreground">
          <Trans>Legăturile nu sunt disponibile pentru acest act.</Trans>
        </p>
      </ActAccordionItem>
    )
  }

  // A known zero says nothing; an unknown total with no rows is not a zero.
  if (group.items.length === 0 && group.totalCount === 0) return null

  const shownCount = group.items.length

  // "12 trimiteri" on an act with 2.621 of them is the exact over-claim this
  // page exists to avoid, so an unknown total says so rather than guessing.
  const meta =
    group.totalCount !== null ? (
      <Plural
        value={group.totalCount}
        one="# trimitere"
        few="# trimiteri"
        other="# de trimiteri"
      />
    ) : (
      <Plural
        value={shownCount}
        one="cel puțin # trimitere"
        few="cel puțin # trimiteri"
        other="cel puțin # de trimiteri"
      />
    )

  return (
    <ActAccordionItem
      id={`act-references-${direction}-heading`}
      title={isOut ? t`Ce face acest act` : t`Cine îl citează`}
      meta={meta}
      description={
        isOut
          ? t`Actele pe care acesta le modifică, abrogă, aprobă sau la care face referire.`
          : t`Actele care fac trimitere la acesta.`
      }
      footnote={
        <Trans>
          Relații deduse automat din textul actelor — nu afirmate de portal
          (acelea apar la „Trimiteri afirmate de portal”). Doar potrivirile
          sigure sunt legături. O trimitere care nu se rezolvă la un act
          anume rămâne text citat.
        </Trans>
      }
    >
      <ul className="divide-y">
        {group.items.map((reference, index) => (
          <ReferenceRow
            key={`${reference.relation}-${reference.act?.actId ?? reference.targetRaw ?? index}`}
            reference={reference}
          />
        ))}
      </ul>

      {group.hasMore ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {group.totalCount !== null ? (
            <Trans>
              Se afișează {formatLegalNumber(shownCount, i18n.locale)} din{' '}
              {formatLegalNumber(group.totalCount, i18n.locale)}.
            </Trans>
          ) : (
            <Trans>Se afișează primele {formatLegalNumber(shownCount, i18n.locale)}.</Trans>
          )}
        </p>
      ) : null}
    </ActAccordionItem>
  )
}

function ReferenceRow({ reference }: { readonly reference: LegalReference }) {
  const isFirm = reference.resolution === 'unique' && reference.act !== null

  return (
    <li className={ACT_RECORD_LINE}>
      <span className="text-muted-foreground">
        {legalRelationLabel(reference.relation)}
      </span>

      {isFirm && reference.act ? (
        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
          <Link
            to="/legislation/acts/$actId"
            params={{ actId: reference.act.actId }}
            className={ACT_LINK}
          >
            {reference.act.displayCitation}
          </Link>
          <LegalStatusBadge status={reference.act.status} />
        </span>
      ) : (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span>
            {reference.targetRaw ?? <Trans>trimitere nerezolvată</Trans>}
          </span>
          <span className="text-xs text-muted-foreground">
            {reference.resolution === 'external' ? (
              <Trans>act din afara corpusului — fără pagină la noi</Trans>
            ) : (
              <Trans>potrivire posibilă — nu am identificat actul exact</Trans>
            )}
          </span>
        </span>
      )}
    </li>
  )
}
