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
import { ActStructureBand } from './act-structure-band'
import { ActTimelineBand } from './act-timeline-band'
import { ActWarnings } from './act-warnings'
import { LegalActSkeleton } from './legal-act-skeleton'

type Props = {
  readonly actId: string
  /** `null` means the loader established the act does not exist — see `useLegalAct`. */
  readonly initialAct?: LegalActDetail | null
}

/**
 * `/legislation/acts/$actId` — one normative document.
 *
 * One scrolling column with progressive layers, decided 2026-08-01 over the
 * four-tab parliament twin: the median act has 0 citations, 1 timeline entry and
 * no article tree, so tabs would have given it three empty rooms
 * (`docs/design/legal/act-detail.md` §2).
 *
 * Order is the disclosure ladder from §3, and it is load-bearing:
 *
 *  0. header — what this is, is it alive, and the route to the text itself
 *  ⚠  warnings — *before* the summary, because they qualify it
 *  1. plain summary — the lead, and the page's only open block
 *  2-4. one accordion — relevance, the record, the mechanics, the limits
 *
 * Every accordion row self-suppresses when it has no data, so a thin act shows
 * three rows instead of eight and still reads as a finished page.
 *
 * **The summary is the only card.** Everything below rung 1 answers a question
 * the reader has to have asked first — who does this affect, when did it
 * happen, who cites it, what can you not tell me — and none of those is why
 * anyone opened the page. As eleven equally-weighted cards they were a list of
 * containers the reader had to rank personally; as rows of one container they
 * are a menu, and the lead has nothing competing with it. A row's closed state
 * still has to earn the click, so each carries a count, and rung 2 puts its
 * actual answer — the affected audiences — in the row itself.
 */
export function LegalActPage({ actId, initialAct }: Props) {
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

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <ActWarnings act={data} />

        {data.summary ? <ActPlainSummary summary={data.summary} /> : null}

        {/* Rows stay in ladder order — relevance, then the record, then the
            mechanics, then the limits — so opening them top to bottom is still
            the progressive disclosure the page was designed around. */}
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
          <ActStructureBand act={data} />
          <ActProvenanceNotes act={data} />
        </ActAccordion>
      </main>
    </div>
  )
}
