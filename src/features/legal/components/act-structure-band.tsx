import { useNavigate } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import type { LegalActDetail } from '@/schemas/legal'
import { useLegalOutline } from '../hooks/use-legal-outline'
import { formatLegalNumber } from '../lib/legal-format'
import { legalNodeKindLabel } from '../lib/legal-vocabulary'
import { ActAccordionItem } from './act-accordion'
import { LegalReaderToc } from './reader/legal-reader-toc'

type Props = {
  readonly act: LegalActDetail
}

/**
 * Rung 4 — the full skeleton of the act, navigable.
 *
 * The served outline (`legalDocumentOutline`, the same authority the reader's
 * TOC uses) renders as a collapsible tree down to article grain; selecting an
 * entry opens the READER at that exact provision (`?nod=` deep link). The
 * kind-count summary line says what the skeleton holds before you open it.
 *
 * Degradations: no canonical document or an empty outline (paragraph_stream
 * docs) → the band self-suppresses; an outline error renders one muted line
 * inside the band rather than a fake emptiness.
 */
export function ActStructureBand({ act }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const documentId = act.canonical?.documentId ?? null
  const outlineQuery = useLegalOutline(documentId)
  const entries = outlineQuery.data ?? []

  if (documentId === null) return null
  if (outlineQuery.isSuccess && entries.length === 0) return null
  if (outlineQuery.isLoading) return null

  const kindCounts = new Map<string, number>()
  for (const entry of entries) {
    kindCounts.set(entry.nodeKind, (kindCounts.get(entry.nodeKind) ?? 0) + 1)
  }
  const summaryLine = [...kindCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(
      ([kind, count]) =>
        `${formatLegalNumber(count, i18n.locale)} × ${legalNodeKindLabel(kind).toLowerCase()}`,
    )
    .join(' · ')

  return (
    <ActAccordionItem
      id="act-structure-heading"
      title={t`Cum e structurat`}
      meta={
        <Plural
          value={entries.length}
          one="# element"
          few="# elemente"
          other="# de elemente"
        />
      }
      description={t`Cuprinsul complet al actului — alege un element ca să îl citești direct în text.`}
      footnote={
        <Trans>
          Structura vine din arborele oficial al textului; fiecare element
          deschide cititorul exact la locul lui.
        </Trans>
      }
    >
      <div className="px-5 py-4 sm:px-6">
        {outlineQuery.isError ? (
          <p className="text-sm text-[var(--pnrr-muted)]">
            <Trans>Structura nu s-a putut încărca — textul rămâne disponibil în cititor.</Trans>
          </p>
        ) : (
          <>
            {summaryLine !== '' && (
              <p className="mb-3 text-xs text-[var(--pnrr-muted)]">{summaryLine}</p>
            )}
            <LegalReaderToc
              entries={entries}
              activePath={null}
              onSelect={(entry) => {
                void navigate({
                  to: '/legislation/acts/$actId/text',
                  params: { actId: act.actId },
                  search: { nod: entry.path },
                })
              }}
            />
          </>
        )}
      </div>
    </ActAccordionItem>
  )
}
