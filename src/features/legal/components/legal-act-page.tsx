import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import type { LegalActDetail } from '@/schemas/legal'
import { useLegalAct } from '../hooks/use-legal-act'
import { legislationLinkClassName } from '../lib/legislation-theme'
import { ActAccordion } from './act-accordion'
import { ActDetailHeader } from './act-detail-header'
import { bridgeCovers, hasSummaryContent } from '../lib/act-facts'
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
 * decision 2026-08-10: the text is not a separate route), with the TEXT as
 * the main content (user decision 2026-08-11). The shape is the portal's,
 * redesigned (owner, 26 November 2026): one grid for the head and the body —
 * the served Cuprins in a box at the left, the reading column, and from 88rem
 * a box at the right about the text shown — under a reading bar that stays in
 * view. The reading column reads top to bottom as —
 *
 *  0. header — what this is, is it alive, the act's own masthead
 *  1. the summary — the formal description, the clamped plain summary, and
 *     the AI-provenance line carrying the official-source link
 *  1b. what is to know about the text shown — the version, the consolidation
 *     notice, the act's ⚠ warnings (the right-hand box from 88rem)
 *  2. the text itself — full, chunk-streamed, `?nod=`-addressable
 *  3. fișa — one accordion at the bottom: relevance, the record, the
 *     mechanics, the limits (it replaced the FAQ, same decision)
 *
 * Every accordion row self-suppresses when it has no data. The old
 * "Cum e structurat" row is gone: the Cuprins in the left nav is the same
 * served outline, always visible instead of folded into a band.
 */
export function LegalActPage({ actId, initialAct, docOverride, nod }: Props) {
  const { data, isLoading, isError } = useLegalAct(actId, initialAct)

  // The masthead lift, reported by the reader once a text renders: the
  // subject ("privind achizițiile publice") completes the header's den line
  // — it exists nowhere in the metadata — and `lifted` makes the fișa's
  // provenance notes disclose that the body no longer repeats the official
  // opening lines.
  const [masthead, setMasthead] = useState<{
    readonly subject: string | null
    readonly lifted: boolean
  } | null>(null)

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
    <div className="min-h-screen min-w-0 bg-background text-foreground">
      <ActDetailHeader act={data} textSubject={masthead?.subject ?? null} />

      <ActReadingLayout
        act={data}
        onMasthead={setMasthead}
        {...(docOverride !== undefined && { docOverride })}
        {...(nod !== undefined && { nod })}
        // The warnings qualify the summary. With a version shown they are
        // worn by the box about the text shown (owner, 26 November 2026, the
        // act page's redesign); otherwise the summary carries them as footer
        // rows, or, with no summary, they stand alone. Never twice, never lost.
        warnings={<ActWarnings act={data} variant="row" />}
        lead={({ withWarnings }) =>
          // Gated on the CONTENT the card actually renders, not the summary
          // object: both its texts are independently nullable/blank, and a
          // summary that suppresses the card must not swallow the warnings.
          data.summary && hasSummaryContent(data.summary) ? (
            <ActPlainSummary
              summary={data.summary}
              officialTextUrl={data.officialTextUrl}
              qualifiers={withWarnings ? <ActWarnings act={data} variant="row" /> : undefined}
            />
          ) : withWarnings ? (
            // No summary to attach them to — the warnings stand alone.
            <ActWarnings act={data} />
          ) : null
        }
        fisa={({ ownDocumentId }) => (
          /* Rows stay in ladder order — relevance, then the record, then
             the mechanics, then the limits — so opening them top to bottom
             is still the progressive disclosure the page was designed
             around. */
          // Keyed by the act: a row opened or a list shown whole on one act
          // must not stay so on the next one reached by a link.
          <ActAccordion key={data.actId} label={t`Detalii despre acest act`}>
            {data.summary ? <ActRelevanceBand summary={data.summary} /> : null}
            {data.summary ? (
              <ActKeyDates keyDates={data.summary.keyDates} />
            ) : null}
            <ActPublicationBand act={data} />
            {/* Bridged on legal_v2: what the previous corpus does not
                hold for this act says "not available", never "none". */}
            <ActTimelineBand
              timeline={data.timeline}
              complete={data.timelineComplete}
              available={bridgeCovers(data, 'timeline')}
            />
            {/* The version asked for by the address, by the id the reader resolved it to (an old page id names a
                form by another id): its line is never behind the row's cut. */}
            <ActVersionsBand act={data} {...(ownDocumentId !== null && { shownDocumentId: ownDocumentId })} />
            <ActReferencesBand
              group={data.outLinks}
              direction="out"
              available={bridgeCovers(data, 'links')}
            />
            <ActReferencesBand
              group={data.inLinks}
              direction="in"
              available={bridgeCovers(data, 'links')}
            />
            <ActAnchorsBand
              group={data.incomingAnchors}
              available={bridgeCovers(data, 'incomingAnchors')}
            />
            <ActProvenanceNotes
              act={data}
              mastheadInHeader={masthead?.lifted ?? false}
            />
          </ActAccordion>
        )}
      />
    </div>
  )
}
