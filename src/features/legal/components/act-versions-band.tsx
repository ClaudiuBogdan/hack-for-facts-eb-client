import { useState, type ReactNode } from 'react'
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
  listedVersionDate,
  orderVersionsNewestFirst,
  portalConsolidationNote,
  versionKindLabel,
} from '../lib/legal-versions'
import { ActAccordionItem } from './act-accordion'
import { ACT_LINK, ACT_RECORD_LINE, ACT_RECORD_MORE } from './reader/act-page-grid'

type Props = {
  readonly act: LegalActDetail
}

/**
 * The row opens on its newest versions; the rest come on demand (owner,
 * 26 November 2026: an act with 21 versions made the open row some 3,000 px
 * tall). A list only a line or two longer is shown whole: a control that
 * hides two lines saves nothing.
 */
const FIRST_VERSIONS = 5
const WHOLE_UP_TO = FIRST_VERSIONS + 2

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
      // One of the rows a reader most often needs: open from the first render
      // (owner, 26 November 2026, the act page's redesign).
      defaultOpen
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
        <p className="pb-2 text-muted-foreground">
          <Plural
            value={newerNotAvailable}
            one="O versiune fără text disponibil, de la aceeași dată sau mai nouă decât cea mai recentă versiune cu text."
            few="# versiuni fără text disponibil, de la aceeași dată sau mai noi decât cea mai recentă versiune cu text."
            other="# de versiuni fără text disponibil, de la aceeași dată sau mai noi decât cea mai recentă versiune cu text."
          />
        </p>
      )}
      <VersionLines
        count={ordered.length}
        lines={ordered.map((doc) => (
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
      />
    </ActAccordionItem>
  )
}

/** The versions' lines: the newest ones, and one control for the rest. */
function VersionLines({ count, lines }: { readonly count: number; readonly lines: readonly ReactNode[] }) {
  const [all, setAll] = useState(false)
  const cut = count > WHOLE_UP_TO
  return (
    <>
      <ul id="act-versions-lines" className="divide-y">
        {cut && !all ? lines.slice(0, FIRST_VERSIONS) : lines}
      </ul>
      {cut ? (
        <button
          type="button"
          onClick={() => setAll((value) => !value)}
          aria-expanded={all}
          aria-controls="act-versions-lines"
          className={ACT_RECORD_MORE}
        >
          {all ? (
            <Trans>Arată mai puține</Trans>
          ) : (
            <Plural value={count} one="Arată versiunea" few="Arată toate cele # versiuni" other="Arată toate cele # de versiuni" />
          )}
        </button>
      ) : null}
    </>
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
  // The date the version is named and ordered by, as everywhere else on the
  // page: the Portal's for a consolidation, its own for any other.
  const date = listedVersionDate(doc)
  const note = isConsolidationVersion(doc) ? portalConsolidationNote(doc, formatDate) : null

  return (
    <li className={ACT_RECORD_LINE}>
      <span className="tabular-nums text-muted-foreground">
        {date !== null ? formatDate(date) : <Trans>fără dată</Trans>}
      </span>

      <div className="min-w-0">
        <span className="flex flex-wrap items-baseline gap-x-3">
          <span className="font-medium">{versionKindLabel(doc.versionKind)}</span>
          {doc.isCanonical && (
            <span className="text-muted-foreground">
              <Trans>forma afișată implicit</Trans>
            </span>
          )}
          {notCurrentDefault && (
            <span className="text-muted-foreground">
              <Trans>afișată implicit — nu este versiunea curentă</Trans>
            </span>
          )}
          {onlyReadableDefault && (
            <span className="text-muted-foreground">
              <Trans>afișată implicit</Trans>
            </span>
          )}
        </span>

        {doc.title !== null ? <span className="block">{doc.title}</span> : null}

        {note !== null && (
          <span className="block text-muted-foreground">
            <Trans>Portalul Legislativ indică „{note}”.</Trans>
          </span>
        )}

        {doc.held === true && (
          <span className="block text-muted-foreground">
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
            className={ACT_LINK}
          >
            <Trans>Citește această versiune</Trans>
          </Link>
        ) : (
          <span className="block text-muted-foreground">
            <Trans>textul nu este încă disponibil</Trans>
          </span>
        )}
      </div>
    </li>
  )
}
