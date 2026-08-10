import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalReference, LegalReferenceGroup } from '@/schemas/legal'
import { formatLegalNumber } from '../lib/legal-format'
import { legalRelationLabel } from '../lib/legal-vocabulary'
import { LegalStatusBadge } from './legal-status-badge'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly group: LegalReferenceGroup
  readonly direction: 'out' | 'in'
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
export function ActReferencesBand({ group, direction }: Props) {
  const { i18n } = useLingui()

  if (group.items.length === 0 && (group.totalCount ?? 0) === 0) return null

  const isOut = direction === 'out'
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
          sigure sunt legături. Din 1.103.595 de trimiteri între acte, 400.368
          (36,3%) nu se rezolvă la un act anume și rămân text citat.
        </Trans>
      }
    >
      <ul className="flex flex-col">
        {group.items.map((reference, index) => (
          <ReferenceRow
            key={`${reference.relation}-${reference.act?.actId ?? reference.targetRaw ?? index}`}
            reference={reference}
          />
        ))}
      </ul>

      {group.hasMore ? (
        <p className="border-t border-[var(--pnrr-subtle)] px-5 py-3 text-sm text-[var(--pnrr-muted)] sm:px-6">
          {group.totalCount !== null ? (
            <Trans>
              Se afișează {formatLegalNumber(shownCount, i18n.locale)} din{' '}
              {formatLegalNumber(group.totalCount, i18n.locale)}. Lista completă
              apare odată cu directorul de acte.
            </Trans>
          ) : (
            <Trans>
              Se afișează primele {formatLegalNumber(shownCount, i18n.locale)}.
              Lista completă apare odată cu directorul de acte.
            </Trans>
          )}
        </p>
      ) : null}
    </ActAccordionItem>
  )
}

function ReferenceRow({ reference }: { readonly reference: LegalReference }) {
  const isFirm = reference.resolution === 'unique' && reference.act !== null

  return (
    <li className="flex flex-col gap-1.5 border-b border-[var(--pnrr-subtle)] px-5 py-3 last:border-b-0 sm:px-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
        {legalRelationLabel(reference.relation)}
      </span>

      {isFirm && reference.act ? (
        <span className="flex flex-wrap items-center gap-2">
          <Link
            to="/legislation/acts/$actId"
            params={{ actId: reference.act.actId }}
            className="text-base font-semibold text-[var(--pnrr-fg)] underline underline-offset-2 hover:text-[var(--pnrr-muted)]"
          >
            {reference.act.displayCitation}
          </Link>
          <LegalStatusBadge status={reference.act.status} />
        </span>
      ) : (
        <span className="flex flex-col gap-0.5">
          <span className="text-base text-[var(--pnrr-fg)]">
            {reference.targetRaw ?? <Trans>trimitere nerezolvată</Trans>}
          </span>
          <span className="text-xs text-[var(--pnrr-muted)]">
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
