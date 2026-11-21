import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalActDetail, LegalActDocumentVersion } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import {
  defaultReadingOf,
  isConsolidationVersion,
  isReadableVersion,
  orderVersionsNewestFirst,
  portalConsolidationNote,
  versionDateOf,
  versionKindLabel,
} from '../lib/legal-versions'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly act: LegalActDetail
}

/**
 * Rung 5 — the version timeline (`LegalAct.documents`), honesty-first.
 *
 * On the legacy source the corpus holds published-form expressions
 * (original/corp/republicare/stub-header) and `consolidare` rows arrive as
 * dates without bodies. On legal_v2 every row is a FORM — original,
 * republication or consolidation — and a consolidation may carry its text.
 * Either way a row links into the reader only when its text is readable
 * here; everything else says the text is not available yet, never implying
 * we hold a text we do not. A consolidation is always named as unofficial
 * (LEG-X3AV), and `newerNotAvailable` says how many versions of any kind
 * without a text we can show are dated on or after the latest readable one
 * (a same-day version counts).
 */
export function ActVersionsBand({ act }: Props) {
  const { i18n } = useLingui()
  const documents = act.documents
  if (documents.length === 0) return null

  const ordered = orderVersionsNewestFirst(documents)
  const defaultReading = defaultReadingOf(act)
  const newerNotAvailable = act.newerNotAvailable ?? 0
  const formatDate = (value: string) => formatLegalDate(value, i18n.locale)

  return (
    <ActAccordionItem
      id="act-versions-heading"
      title={t`Versiunile textului`}
      meta={
        <Plural
          value={documents.length}
          one="# expresie"
          few="# expresii"
          other="# de expresii"
        />
      }
      description={t`Expresiile de text pe care le ținem pentru acest act, cu data lor și ce anume putem afișa.`}
      footnote={
        <Trans>
          Consolidările portalului sunt reproduceri neoficiale; forma
          autentică este cea din Monitorul Oficial.
        </Trans>
      }
    >
      {newerNotAvailable > 0 && (
        <p className="border-b border-[var(--pnrr-subtle)] px-5 py-3 text-sm text-[var(--pnrr-muted)] sm:px-6">
          <Plural
            value={newerNotAvailable}
            one="O versiune fără text disponibil, de la aceeași dată sau mai nouă decât cea mai recentă versiune cu text."
            few="# versiuni fără text disponibil, de la aceeași dată sau mai noi decât cea mai recentă versiune cu text."
            other="# de versiuni fără text disponibil, de la aceeași dată sau mai noi decât cea mai recentă versiune cu text."
          />
        </p>
      )}
      <ul className="flex flex-col">
        {ordered.map((doc) => (
          <VersionRow
            key={doc.documentId}
            doc={doc}
            actId={act.actId}
            formatDate={formatDate}
            notCurrentDefault={
              defaultReading.basis === 'latest_available' &&
              doc.documentId === defaultReading.documentId
            }
            onlyReadableDefault={
              defaultReading.basis === 'only_readable' &&
              doc.documentId === defaultReading.documentId
            }
          />
        ))}
      </ul>
    </ActAccordionItem>
  )
}

function VersionRow({
  doc,
  actId,
  formatDate,
  notCurrentDefault,
  onlyReadableDefault,
}: {
  readonly doc: LegalActDocumentVersion
  readonly actId: string
  readonly formatDate: (value: string) => string
  /** The latest form with text, shown by default because the latest has none. */
  readonly notCurrentDefault: boolean
  /** Shown by default as the only readable version (the server names no default). */
  readonly onlyReadableDefault: boolean
}) {
  const readable = isReadableVersion(doc)
  const date = versionDateOf(doc)
  const note = isConsolidationVersion(doc) ? portalConsolidationNote(doc, formatDate) : null

  return (
    <li className="flex flex-col gap-1 border-b border-[var(--pnrr-subtle)] px-5 py-3 last:border-b-0 sm:px-6">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
          {versionKindLabel(doc.versionKind)}
        </span>
        {doc.isCanonical && (
          <span className="rounded border border-[var(--pnrr-subtle)] px-1.5 py-0.5 text-xs text-[var(--pnrr-muted)]">
            <Trans>forma afișată implicit</Trans>
          </span>
        )}
        {notCurrentDefault && (
          <span className="rounded border border-[var(--pnrr-subtle)] px-1.5 py-0.5 text-xs text-[var(--pnrr-muted)]">
            <Trans>afișată implicit — nu este versiunea curentă</Trans>
          </span>
        )}
        {onlyReadableDefault && (
          <span className="rounded border border-[var(--pnrr-subtle)] px-1.5 py-0.5 text-xs text-[var(--pnrr-muted)]">
            <Trans>afișată implicit</Trans>
          </span>
        )}
      </span>

      <span className="flex flex-wrap items-center gap-2 text-base">
        <span className="text-[var(--pnrr-fg)]">
          {date !== null ? formatDate(date) : <Trans>fără dată</Trans>}
          {doc.title !== null ? ` — ${doc.title}` : null}
        </span>
      </span>

      {note !== null && (
        <span className="text-sm text-[var(--pnrr-muted)]">
          <Trans>Portalul Legislativ indică „{note}”.</Trans>
        </span>
      )}

      {doc.held === true && (
        <span className="text-sm text-[var(--pnrr-muted)]">
          <Trans>
            O pagină a Portalului atribuită acestei forme este încă în
            verificare.
          </Trans>
        </span>
      )}

      {readable ? (
        <Link
          to="/legislation/acts/$actId"
          params={{ actId }}
          // The text lives on this same page — a non-canonical expression
          // swaps it via `?doc=`; the canonical row just jumps to the text.
          {...(doc.isCanonical || notCurrentDefault || onlyReadableDefault
            ? { hash: 'act-text' }
            : { search: { doc: doc.documentId }, hash: 'act-text' })}
          className="text-sm underline underline-offset-2"
        >
          <Trans>Citește această versiune</Trans>
        </Link>
      ) : (
        <span className="text-sm text-[var(--pnrr-muted)]">
          <Trans>textul nu este încă disponibil</Trans>
        </span>
      )}
    </li>
  )
}
