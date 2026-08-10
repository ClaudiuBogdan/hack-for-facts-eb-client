import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalActDetail, LegalActDocumentVersion } from '@/schemas/legal'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly act: LegalActDetail
}

const VERSION_KIND_LABEL: Record<string, string> = {
  original: 'forma publicată',
  corp: 'corpul actului',
  republicare: 'republicare',
  'stub-header': 'antetul actului',
  consolidare: 'reper de consolidare',
}

function versionKindLabel(kind: string): string {
  return VERSION_KIND_LABEL[kind] ?? kind
}

/**
 * Rung 5 — the version timeline (`LegalAct.documents`), honesty-first.
 *
 * Two worlds render identically here: today the corpus holds published-form
 * expressions only (original/corp/republicare/stub-header), and when the
 * consolidation-timeline lane loads its dated anchors, `consolidare` rows
 * arrive as DATES WITHOUT BODIES. A row links into the reader only when its
 * render is actually served; everything else says "text indisponibil încă"
 * with the portal as the escape hatch — the UI never implies we hold a text
 * we do not.
 */
export function ActVersionsBand({ act }: Props) {
  const documents = act.documents
  if (documents.length === 0) return null

  // Newest first; undated rows sink to the end rather than faking an epoch.
  const ordered = [...documents].sort((a, b) => {
    const aDate = a.versionDate ?? a.firstPublicationDate
    const bDate = b.versionDate ?? b.firstPublicationDate
    if (aDate === null && bDate === null) return 0
    if (aDate === null) return 1
    if (bDate === null) return -1
    return bDate.localeCompare(aDate)
  })

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
      <ul className="flex flex-col">
        {ordered.map((doc) => (
          <VersionRow key={doc.documentId} doc={doc} actId={act.actId} />
        ))}
      </ul>
    </ActAccordionItem>
  )
}

function VersionRow({
  doc,
  actId,
}: {
  readonly doc: LegalActDocumentVersion
  readonly actId: string
}) {
  const served = doc.render?.renderStatus === 'served'
  const date = doc.versionDate ?? doc.firstPublicationDate

  return (
    <li className="flex flex-col gap-1 border-b border-[var(--pnrr-subtle)] px-5 py-3 last:border-b-0 sm:px-6">
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
          {versionKindLabel(doc.versionKind)}
        </span>
        {doc.isCanonical && (
          <span className="rounded border border-[var(--pnrr-subtle)] px-1.5 py-0.5 text-xs text-[var(--pnrr-muted)]">
            <Trans>forma afișată</Trans>
          </span>
        )}
      </span>

      <span className="flex flex-wrap items-center gap-2 text-base">
        <span className="text-[var(--pnrr-fg)]">
          {date ?? <Trans>fără dată</Trans>}
          {doc.title !== null ? ` — ${doc.title}` : null}
        </span>
      </span>

      {served ? (
        <Link
          to="/legislation/acts/$actId/text"
          params={{ actId }}
          {...(doc.isCanonical ? {} : { search: { doc: doc.documentId } })}
          className="text-sm underline underline-offset-2"
        >
          <Trans>Citește această versiune</Trans>
        </Link>
      ) : (
        <span className="text-sm text-[var(--pnrr-muted)]">
          {doc.versionKind === 'consolidare' ? (
            <Trans>
              text indisponibil încă — reper de consolidare, fără corp de text
            </Trans>
          ) : (
            <Trans>text indisponibil pentru această expresie</Trans>
          )}
        </span>
      )}
    </li>
  )
}
