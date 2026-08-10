import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import type { LegalActDetail } from '@/schemas/legal'
import { useLegalAct } from '../hooks/use-legal-act'
import { legislationLinkClassName } from '../lib/legislation-theme'
import { ActAccordion } from './act-accordion'
import { ActDetailHeader } from './act-detail-header'
import { ActKeyDates } from './act-key-dates'
import { ActPlainSummary } from './act-plain-summary'
import { ActProvenanceNotes } from './act-provenance-notes'
import { ActAnchorsBand } from './act-anchors-band'
import { ActPublicationBand } from './act-publication-band'
import { ActReferencesBand } from './act-references-band'
import { ActVersionsBand } from './act-versions-band'
import { ActRelevanceBand } from './act-relevance-band'
import { ActTimelineBand } from './act-timeline-band'
import { ActWarnings } from './act-warnings'
import { LegalActSkeleton } from './legal-act-skeleton'
import { ActReadingLayout } from './reader/legal-reader-page'

type Props = {
  readonly actId: string
  /** `null` means the loader established the act does not exist — see `useLegalAct`. */
  readonly initialAct?: LegalActDetail | null
  /** `?doc=` — read this expression instead of the canonical document. */
  readonly docOverride?: string
  /** `?nod=` — a document_nodes PATH deep link into the text. */
  readonly nod?: string
}

/**
 * `/legislation/acts/$actId` — one normative document, ONE page (user
 * decision 2026-08-10: the text is not a separate route). The shape is the
 * portal's, redesigned: a left nav carrying the page's sections and the
 * served Cuprins, and a main column that reads top to bottom as the
 * disclosure ladder —
 *
 *  0. header — what this is, is it alive, the exit to the official source
 *  ⚠  warnings — *before* the summary, because they qualify it
 *  1. plain summary — the lead, and the fișa's only open block
 *  2-4. one accordion — relevance, the record, the mechanics, the limits
 *  5. the text itself — full, chunk-streamed, `?nod=`-addressable
 *
 * Every accordion row self-suppresses when it has no data. The old
 * "Cum e structurat" row is gone: the Cuprins in the left nav is the same
 * served outline, always visible instead of folded into a band.
 */
export function LegalActPage({ actId, initialAct, docOverride, nod }: Props) {
  const { data, isLoading, isError } = useLegalAct(actId, initialAct)

  if (isLoading) return <LegalActSkeleton />

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-[var(--pnrr-fg)]">
          <Trans>Nu am găsit acest act</Trans>
        </h1>
        <p className="mt-3 max-w-prose text-[var(--pnrr-muted)]">
          <Trans>
            Actul nu există în Portal Legislativ sau identificatorul din adresă
            este greșit.
          </Trans>
        </p>
        <Link to="/legislation" className={`${legislationLinkClassName} mt-6 inline-block`}>
          <Trans>Înapoi la Legislație</Trans>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen min-w-0 bg-background">
      <ActDetailHeader act={data} />

      <ActReadingLayout
        act={data}
        {...(docOverride !== undefined && { docOverride })}
        {...(nod !== undefined && { nod })}
        lead={
          <div className="flex flex-col gap-6">
            <ActWarnings act={data} />
            {data.summary ? <ActPlainSummary summary={data.summary} /> : null}
          </div>
        }
        fisa={
          /* Rows stay in ladder order — relevance, then the record, then
             the mechanics, then the limits — so opening them top to bottom
             is still the progressive disclosure the page was designed
             around. */
          <ActAccordion label={t`Detalii despre acest act`}>
            {data.summary ? <ActRelevanceBand summary={data.summary} /> : null}
            {data.summary ? (
              <ActKeyDates keyDates={data.summary.keyDates} />
            ) : null}
            <ActPublicationBand act={data} />
            <ActTimelineBand timeline={data.timeline} />
            <ActVersionsBand act={data} />
            <ActReferencesBand group={data.outLinks} direction="out" />
            <ActReferencesBand group={data.inLinks} direction="in" />
            <ActAnchorsBand group={data.incomingAnchors} />
            <ActProvenanceNotes act={data} />
          </ActAccordion>
        }
      />
    </div>
  )
}
