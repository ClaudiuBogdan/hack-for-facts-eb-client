import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  Printer,
} from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type {
  ParliamentStenogramReaderSearch,
  ParliamentStenogramSessionRef,
} from '@/schemas/parliament'
import {
  useParliamentSpeechContext,
  useParliamentTranscript,
} from '../hooks/use-parliament-data'
import { classifyStenogramFailure } from '../lib/parliament-stenogram-error'
import {
  buildStenogramSpeakerFacets,
  countStenogramContributions,
  filterSegmentsBySpeakers,
  isSegmentVisibleForSpeakers,
  normalizeSpeakerSelection,
} from '../lib/stenogram-speaker-filter'
import {
  formatSittingDate,
  formatSittingDateShort,
  sessionDateProvenanceNote,
  sessionDisplayTitle,
  sessionTimeSpan,
  sourceLinkLabel,
  sourcePrecisionNote,
  sourceSystemLabel,
  stenogramAvailabilityDescription,
  stenogramAvailabilityLabel,
  stenogramChamberLabel,
} from '../lib/stenogram-presentation'
import {
  buildFilteredStenogramToc,
  buildStenogramInterventions,
  buildStenogramToc,
  segmentDomId,
} from '../lib/stenogram-toc'
import {
  stenogramAvailabilityToneClassName,
  stenogramBadgeClassName,
  stenogramChamberToneClassName,
  stenogramLeftLaneClassName,
  stenogramLinkClassName,
  stenogramMutedTextClassName,
  stenogramNoticeClassName,
  stenogramPrintOnlyClassName,
  stenogramSectionTitleClassName,
} from '../lib/stenogram-theme'
import { ParliamentShell } from './parliament-shell'
import { ParliamentStenogramDocument } from './parliament-stenogram-document'
import { ParliamentStenogramFailureNotice } from './parliament-stenogram-failure'
import { ParliamentStenogramFilterNotice } from './parliament-stenogram-filter-notice'
import { ParliamentStenogramInterventionRail } from './parliament-stenogram-intervention-rail'
import { ParliamentStenogramScrollTop } from './parliament-stenogram-scroll-top'
import { ParliamentStenogramSpeakerFilter } from './parliament-stenogram-speaker-filter'
import { ParliamentStenogramToc } from './parliament-stenogram-toc'

type Props = {
  readonly sessionKey: string
  readonly search: ParliamentStenogramReaderSearch
}

/** Landmark id for the reading column — the skip link's target. */
const READING_REGION_ID = 'stenogram-reading'

/** The reader's own heading — where "back to top" returns focus. */
const READER_TOP_ID = 'stenogram-reader-top'

/**
 * Anything that can NAME a contribution: a reading block, or a tick on the
 * intervention rail. Both go through the one selection path, so the URL stays
 * the single source of "which contribution is highlighted".
 */
type SelectableContribution = { readonly speechKey?: string }

/** Skeleton shaped like the real reader (rail + column), so nothing jumps. */
function ReaderSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label={t`Se încarcă stenograma ședinței`}
    >
      <Skeleton className="h-24 w-full rounded-none" />
      <div className="flex flex-col gap-6 lg:flex-row">
        <Skeleton className="h-64 w-full rounded-none lg:w-72" />
        <div className="min-w-0 flex-1 space-y-3">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <Skeleton key={row} className="h-16 w-full rounded-none" />
          ))}
        </div>
      </div>
    </div>
  )
}

function BackToList() {
  return (
    <Link
      to="/parlament/stenograme"
      className={cn(
        stenogramLinkClassName,
        'inline-flex items-center gap-1 text-sm print:hidden',
      )}
    >
      <ChevronLeft className="h-4 w-4" aria-hidden />
      <Trans>Toate stenogramele</Trans>
    </Link>
  )
}

/**
 * `/parlament/stenograme/sedinte/$sessionKey` — one sitting, read as a document.
 *
 * THE COMPLETENESS INVARIANT. The transcript arrives as ONE complete response
 * from the REST endpoint. There is no paging state, no "load the rest" control
 * and no auto-fetch loop, because every one of those creates a window in which
 * the speaker filter, print and "previous/next contribution" silently operate
 * on a prefix — telling a reader "this speaker said nothing here" when their
 * turn is in a block that has not arrived is worse than being slow.
 *
 * THE ONE NARROWING. `?vorbitori=` filters the reading to named speakers, and
 * it is the only thing on this surface allowed to remove blocks. Because that
 * is a strong claim to make about an official record, it is loud: a printed,
 * counted "this is an excerpt" notice that STAYS beside the excerpt, an agenda
 * rebuilt over the visible subset rather than left pointing at blocks that are
 * gone, and one click back to the whole sitting. Everything downstream —
 * reading column, agenda, intervention rail, prev/next — reads the same VISIBLE
 * set, so no two of them can describe different documents.
 *
 * THE GEOMETRY IS FIXED. Three columns — a left lane, the reading measure, the
 * intervention rail — and filtering does not change any of them. The lane keeps
 * its width whether it holds an agenda, an excerpt notice or only the way back
 * to the top, because a document that jumps left and re-wraps the moment a
 * speaker is selected reads as a different document, which is precisely the
 * impression a filtered EXCERPT must not give.
 *
 * The layout is a reading column with rails, not a list of cards: the unit here
 * is the sitting, and the ordered blocks ARE the record. Everything else exists
 * to let a reader cite it — precise provenance, a copyable link carrying the
 * highlighted contribution and its filter, and a print form.
 */
export function ParliamentStenogramReaderPage({ sessionKey, search }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()
  const [pendingFocus, setPendingFocus] = useState<number | undefined>(undefined)

  const { data: transcript, isLoading, isError, error, refetch } =
    useParliamentTranscript(sessionKey)

  const segments = useMemo(() => transcript?.segments ?? [], [transcript])
  const session = transcript?.session

  // ── the speaker filter, from the URL ─────────────────────────────────────
  // The selection lives in `?vorbitori=` so a filtered reading is shareable as
  // what it is; the options come from THIS sitting's printed names, so a
  // speaker the source never resolved to a mandate stays filterable.
  const speakerSelection = useMemo(
    () => search.vorbitori ?? [],
    [search.vorbitori],
  )
  const filterActive = speakerSelection.length > 0
  const speakerFacets = useMemo(
    () => buildStenogramSpeakerFacets(segments),
    [segments],
  )
  const totalContributions = useMemo(
    () => countStenogramContributions(segments),
    [segments],
  )

  // Everything downstream — the reading column, the rail, prev/next — reads
  // the VISIBLE document, so the three can never disagree about what is on
  // screen. In full mode it is the sitting itself, untouched and in order.
  const visibleSegments = useMemo(
    () =>
      filterActive
        ? filterSegmentsBySpeakers({ segments, speakerNames: speakerSelection })
        : segments,
    [segments, speakerSelection, filterActive],
  )

  // The agenda follows the VISIBLE document too. In full mode it is the
  // sitting's own printed headings; under a filter it is those same headings
  // restricted to the sections that still hold a selected speaker, each
  // anchored at their first visible turn — so no entry can point at a block the
  // excerpt does not render. When the excerpt lands under no heading at all the
  // list is empty, and the reader shows no navigation rather than a wrong one.
  const toc = useMemo(
    () =>
      filterActive
        ? buildFilteredStenogramToc({
            segments,
            speakerNames: speakerSelection,
          })
        : buildStenogramToc(segments),
    [segments, speakerSelection, filterActive],
  )
  const showToc = !filterActive || toc.length > 0
  // The rail is derived from the document, so it gives the many captures that
  // printed NO agenda headings a navigable shape without inventing one.
  const interventions = useMemo(
    () => buildStenogramInterventions(visibleSegments),
    [visibleSegments],
  )

  // ── the highlighted contribution ─────────────────────────────────────────
  const selectedFromDocument = useMemo(
    () =>
      search.interventie
        ? segments.find((s) => s.speechKey === search.interventie)
        : undefined,
    [segments, search.interventie],
  )

  // A LEGACY key never appears as a block's `speechKey`. The document is
  // complete, so "not found here" is now conclusive — resolve the key through
  // the server's redirect map rather than waiting for more blocks.
  const needsContextLookup =
    Boolean(search.interventie) && !selectedFromDocument && Boolean(transcript)
  const context = useParliamentSpeechContext(
    needsContextLookup ? (search.interventie ?? '') : '',
  )
  const resolvedFromContext = useMemo(() => {
    const value = context.data
    if (!value || value.session.sessionKey !== sessionKey) return undefined
    const canonicalKey =
      value.redirect?.canonicalSpeechKey ?? value.segment?.speechKey
    return canonicalKey
      ? segments.find((s) => s.speechKey === canonicalKey)
      : undefined
  }, [context.data, sessionKey, segments])

  const selected = selectedFromDocument ?? resolvedFromContext
  // A deep link can name a contribution the CURRENT filter hides. That is not
  // an error and it is not silently ignored: the block keeps its highlight in
  // full mode, and in filtered mode the reader says the link is outside the
  // excerpt and offers the way back to the whole sitting.
  const selectedVisible = isSegmentVisibleForSpeakers({
    segment: selected,
    speakerNames: speakerSelection,
  })
  const selectedPosition = selectedVisible ? selected?.position : undefined
  const selectedHiddenByFilter = Boolean(selected) && !selectedVisible
  const unresolvedInterventie =
    Boolean(search.interventie) &&
    !selected &&
    Boolean(transcript) &&
    !context.isLoading

  // The contributions ON SCREEN — what the excerpt notice counts. The
  // previous/next pair that also read this is gone: the rail navigates the
  // sitting turn by turn, and a footer that appeared only once something was
  // selected was a second answer to a question already answered above.
  const contributions = useMemo(
    () => visibleSegments.filter((s) => s.kind === 'SPEECH' && s.speechKey),
    [visibleSegments],
  )

  // ── scroll + focus (client-only; never during render) ────────────────────
  const scrollToPosition = useCallback((position: number) => {
    const node = document.getElementById(segmentDomId(position))
    if (!node) return
    node.scrollIntoView({ block: 'center', behavior: 'smooth' })
    // Focus, not just scroll: a keyboard reader has to land where a sighted
    // reader is looking, and every block carries tabIndex={-1} for this.
    node.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    if (selectedPosition === undefined) return
    scrollToPosition(selectedPosition)
  }, [selectedPosition, scrollToPosition])

  useEffect(() => {
    if (pendingFocus === undefined) return
    scrollToPosition(pendingFocus)
    setPendingFocus(undefined)
  }, [pendingFocus, scrollToPosition])

  // ── the one write path to the URL ────────────────────────────────────────
  const applySearch = useCallback(
    (next: ParliamentStenogramReaderSearch) => {
      void navigate({
        to: '/parlament/stenograme/sedinte/$sessionKey',
        params: { sessionKey },
        search: next,
        replace: true,
        resetScroll: false,
      })
    },
    [navigate, sessionKey],
  )

  const selectContribution = useCallback(
    (segment: SelectableContribution) => {
      applySearch({
        interventie: segment.speechKey,
        ...(filterActive && { vorbitori: [...speakerSelection] }),
      })
    },
    [applySearch, filterActive, speakerSelection],
  )

  /**
   * Changing the filter is the moment the deep link is reconciled.
   *
   * If the contribution named by `?interventie=` would not survive the new
   * selection it is DROPPED rather than left pointing at a hidden block — but
   * only when we actually resolved which block it names. An unresolved legacy
   * key is kept: it may still resolve through the redirect map, and silently
   * dropping someone's shared link is the worse failure.
   */
  const handleSpeakersChange = useCallback(
    (values: string[]) => {
      const nextSelection = normalizeSpeakerSelection(values)
      const keepIntervention =
        Boolean(search.interventie) &&
        (!selected ||
          isSegmentVisibleForSpeakers({
            segment: selected,
            speakerNames: nextSelection,
          }))

      applySearch({
        ...(keepIntervention && { interventie: search.interventie }),
        ...(nextSelection.length > 0 && { vorbitori: nextSelection }),
      })
    },
    [applySearch, search.interventie, selected],
  )

  if (isLoading) {
    return (
      <ParliamentShell activeTab="stenograme">
        <ReaderSkeleton />
      </ParliamentShell>
    )
  }

  // ── failures, told apart ─────────────────────────────────────────────────
  // A SOURCE_ONLY sitting arrives HERE, as a typed TRANSCRIPT_UNAVAILABLE that
  // carries the sitting itself — it is not a 200 with an empty reading. That is
  // what keeps "the sitting is real but yields no text" distinct from "no such
  // sitting", and it is why the notice below can name the sitting and link its
  // official source without a second request.
  if (isError || !transcript || !session) {
    const failure = classifyStenogramFailure(error)
    const held = failure.session
    return (
      <ParliamentShell activeTab="stenograme">
        <div className="space-y-6">
          <BackToList />
          {held ? <UnavailableSittingHeader session={held} /> : null}
          <ParliamentStenogramFailureNotice
            failure={failure}
            onRetry={failure.retryable ? () => void refetch() : undefined}
            {...(held && {
              sourceUrl: held.sourceUrl,
              sourceLabel: sourceLinkLabel(
                undefined,
                held.sourceUrlKind,
                held.sourceUrl,
              ),
            })}
          >
            <Link to="/parlament/stenograme" className={stenogramLinkClassName}>
              <Trans>Vezi toate ședințele</Trans>
            </Link>
          </ParliamentStenogramFailureNotice>
        </div>
      </ParliamentShell>
    )
  }

  const title = sessionDisplayTitle(session, i18n.locale)
  const timeSpan = sessionTimeSpan(session)
  const precisionNote = sourcePrecisionNote(session.sourceUrlKind)
  const dateProvenance = sessionDateProvenanceNote(session.sessionDateSource)
  const { previous: previousSitting, next: nextSitting } =
    transcript.navigation

  return (
    <ParliamentShell activeTab="stenograme">
      <div className="space-y-6">
        {/* ── heading band ─────────────────────────────────────────────── */}
        <header className="space-y-3">
          {/* The availability badge is shown ONLY when it carries a warning.
              "Transcriere completă" on every readable sitting was a caveat
              printed where there is none, which is how readers learn to skip
              the ones that matter — but the reverse, dropping the badge
              entirely, hands a PARTIAL capture to a deep-linked reader dressed
              as the whole sitting. So: COMPLETE is silent, PARTIAL and
              SOURCE_ONLY still say so beside the date, and all three are stated
              in words in the provenance card at the foot. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className="text-sm font-semibold tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {formatSittingDate(session.sessionDate, i18n.locale)}
            </span>
            <span
              className={cn(
                stenogramBadgeClassName,
                stenogramChamberToneClassName[session.chamber ?? ''],
              )}
            >
              {stenogramChamberLabel(session.chamber)}
            </span>
            {session.availability === 'COMPLETE' ? null : (
              <span
                className={cn(
                  stenogramBadgeClassName,
                  'border-2',
                  stenogramAvailabilityToneClassName[session.availability],
                )}
              >
                {stenogramAvailabilityLabel(session.availability)}
              </span>
            )}
          </div>

          <h1
            id={READER_TOP_ID}
            tabIndex={-1}
            className={cn(stenogramSectionTitleClassName, 'scroll-mt-24')}
          >
            {title}
          </h1>

          {/* ONE row under the title: what this document IS on the left — its
              official address, where a reader checking what they are reading
              looks first — and what can be DONE with the page at the far right.
              Both actions are icons: a line of words for two one-glyph actions
              was wider than the sentence above it, and their names survive in
              full on `aria-label`, which is what a screen reader announces
              either way. */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 print:hidden">
            <a
              href={session.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                stenogramLinkClassName,
                'inline-flex items-center gap-1.5 text-sm',
              )}
            >
              {sourceLinkLabel(session.sourceSystem, session.sourceUrlKind)}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            </a>

            <div className="flex items-center gap-1 sm:ml-auto">
              <CopyButton
                ariaLabel={t`Copiază linkul acestei ședințe`}
                onCopy={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
              />

              {/* Print prints WHAT IS ON SCREEN — and its NAME says which: a
                  filtered reading prints as the excerpt it is, carrying the
                  amber notice onto paper, and printing the whole sitting from a
                  filtered view would hand back a document the reader never saw.
                  That distinction moves to the accessible name with the label. */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={
                  filterActive
                    ? t`Printează extrasul filtrat`
                    : t`Printează stenograma`
                }
                className="relative h-9 w-9 p-2 text-muted-foreground hover:bg-background"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" aria-hidden />
              </Button>
            </div>
          </div>

          {session.presidingText || timeSpan ? (
            <p className={stenogramMutedTextClassName}>
              {[session.presidingText, timeSpan].filter(Boolean).join(' · ')}
            </p>
          ) : null}
        </header>

        {unresolvedInterventie ? (
          <p className={stenogramNoticeClassName}>
            <Trans>
              Nu am putut localiza intervenția din link în această stenogramă.
              Textul integral al ședinței este mai jos, neschimbat.
            </Trans>
          </p>
        ) : null}

        {/* The one narrowing control — the TOOLBAR, above the reader row so it
            reads as an action on the document below it. What the selection
            MEANS is stated in the left lane, beside the excerpt it qualifies. */}
        <ParliamentStenogramSpeakerFilter
          facets={speakerFacets}
          selected={speakerSelection}
          onChange={handleSpeakersChange}
        />

        {/* The left lane precedes the document in source order (and stacks
            above it on mobile), so a keyboard reader would otherwise tab
            through every agenda item to reach the text. Visible on focus.
            The intervention rail needs no such escape: it FOLLOWS the reading
            column, and holds a single tab stop of its own. */}
        {showToc && toc.length > 0 ? (
          <a
            href={`#${READING_REGION_ID}`}
            onClick={(event) => {
              event.preventDefault()
              document.getElementById(READING_REGION_ID)?.focus()
            }}
            className="sr-only font-semibold underline underline-offset-4 focus:not-sr-only focus:inline-block focus:rounded-none focus:border-2 focus:border-[#1d70b8] focus:bg-white focus:px-3 focus:py-2 focus:text-[#0b0c0c] print:hidden"
          >
            <Trans>Sari la textul ședinței</Trans>
          </a>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start print:block">
          {/* ── the left lane ─────────────────────────────────────────────
              ONE sticky stack, same width in both modes. Filtering must not
              move the reading column: a document that jumps left and re-wraps
              the moment a speaker is selected reads as a different document.
              Separately sticky children were the previous shape and they piled
              onto the same offset; the STACK sticks, its contents do not. */}
          <div data-reader-lane className={stenogramLeftLaneClassName}>
            {showToc ? (
              <ParliamentStenogramToc
                entries={toc}
                activePosition={selectedPosition}
                onSelect={(position) => setPendingFocus(position)}
                excerpt={filterActive}
                /* Shrinks and scrolls INSIDE the lane rather than growing to
                   fill it: a short agenda must not draw a half-empty box, and
                   a long one must not push the notice and the "back to top"
                   below the fold of the sticky stack. */
                className="lg:min-h-0 lg:overflow-y-auto"
              />
            ) : null}

            {filterActive ? (
              <ParliamentStenogramFilterNotice
                selected={speakerSelection}
                visibleCount={contributions.length}
                totalCount={totalContributions}
                linkedOutsideExcerpt={selectedHiddenByFilter}
                onClear={() => handleSpeakersChange([])}
                className="shrink-0"
              />
            ) : null}

            {/* `lg` ONLY. From `xl` the intervention rail appears and this
                control moves to the foot of it, where the reader's navigation
                already lives; at `lg` there is no rail, so the lane keeps it —
                at its FOOT (`mt-auto`), never under the agenda box, which put a
                way back up at the top of the screen. Below `lg` the lane sits
                above the document and the twin at the end of the reading takes
                over. */}
            <ParliamentStenogramScrollTop
              targetId={READER_TOP_ID}
              className="hidden shrink-0 lg:mt-auto lg:inline-flex xl:hidden"
            />
          </div>

          {/* The reading column is capped at the prose measure from `xl` up, so
              the rail that follows it sits against the text it measures and the
              row's leftover width falls to the RIGHT of the rail — which is
              where the rail's hover previews open, clear of the prose. */}
          <section
            id={READING_REGION_ID}
            tabIndex={-1}
            aria-label={t`Textul ședinței`}
            className="min-w-0 flex-1 xl:max-w-3xl"
          >
            <ParliamentStenogramDocument
              segments={visibleSegments}
              selectedPosition={selectedPosition}
            />
          </section>

          {/* The reading-progress rail sits on the RIGHT edge of the reading
              column, where a scrollbar belongs — and after it in source order,
              so it never stands between a keyboard reader and the text. It
              appears only at `xl`: at `lg` the third column would eat into the
              reading measure, and the document plus the previous/next controls
              already navigate.

              "Back to the top" hangs off the FOOT of the rail: this column is
              the reader's navigation, so the one control that is pure
              navigation belongs at the end of it rather than in the lane that
              carries the agenda. The rail's own height leaves the room for it —
              see `RAIL_VIEWPORT_INSET_PX`. */}
          <div className="hidden shrink-0 flex-col items-start gap-3 xl:sticky xl:top-24 xl:flex print:hidden">
            <ParliamentStenogramInterventionRail
              interventions={interventions}
              selectedPosition={selectedPosition}
              onSelect={selectContribution}
            />
            <ParliamentStenogramScrollTop targetId={READER_TOP_ID} compact />
          </div>
        </div>

        {/* No previous/next CONTRIBUTION pair here any more. It was a second
            way to do what the intervention rail does better — every turn in the
            sitting is one click away on it, and the arrow keys walk them — and
            it only ever appeared once a contribution was selected, so it read
            as a footer that came and went. The document itself remains the
            fallback: the turns are in it, in order. */}

        {/* ── previous/next SITTING — served by the API, not derived ────── */}
        {previousSitting || nextSitting ? (
          <nav
            aria-label={t`Navigare între ședințe`}
            className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-[#b1b4b6] pt-4 dark:border-[var(--pnrr-border)] print:hidden"
          >
            {previousSitting ? (
              <SittingLink direction="previous" sitting={previousSitting} />
            ) : (
              <span />
            )}
            {nextSitting ? (
              <SittingLink direction="next" sitting={nextSitting} />
            ) : null}
          </nav>
        ) : null}

        {/* The narrow-screen "back to top". It is IN FLOW at the end of the
            reading rather than floating: below `lg` the bottom of the viewport
            belongs to the app's dock and its chat/feedback buttons, and a
            floating control there covers both them and the transcript. Out of
            view is a smaller cost than on top of the document — and this is
            exactly where a reader who has read to the end is looking. */}
        <div className="flex lg:hidden">
          <ParliamentStenogramScrollTop
            targetId={READER_TOP_ID}
            className="sm:w-auto"
          />
        </div>

        {/* Provenance, stated precisely — at the FOOT of the reading, which is
            where a citation belongs and where a reader who has read the thing
            goes to check what they read. Above the title it was four sentences
            of qualification standing between the reader and the document.
            Printed on paper too, where the outbound link is not clickable and
            the URL has to be readable. */}
        <div className={stenogramNoticeClassName}>
          <p>
            <Trans>Sursă: {sourceSystemLabel(session.sourceSystem)}.</Trans>{' '}
            {dateProvenance}
          </p>
          {precisionNote ? <p className="mt-1">{precisionNote}</p> : null}
          <p className="mt-1">
            {stenogramAvailabilityDescription(session.availability)}
          </p>
          {session.sourceUpdatedAt ? (
            <p className="mt-1">
              <Trans>
                Captura sursei, actualizată la{' '}
                {formatSittingDateShort(
                  session.sourceUpdatedAt.slice(0, 10),
                  i18n.locale,
                )}
                .
              </Trans>
            </p>
          ) : null}
          <p className={cn(stenogramPrintOnlyClassName, 'mt-1 break-all')}>
            {session.sourceUrl}
          </p>
        </div>
      </div>
    </ParliamentShell>
  )
}

/** One neighbouring-sitting link, labelled with its date. */
function SittingLink({
  direction,
  sitting,
}: {
  readonly direction: 'previous' | 'next'
  readonly sitting: ParliamentStenogramSessionRef
}) {
  const { i18n } = useLingui()
  const date = formatSittingDateShort(sitting.sessionDate, i18n.locale)
  return (
    <Link
      to="/parlament/stenograme/sedinte/$sessionKey"
      params={{ sessionKey: sitting.sessionKey }}
      className={cn(
        stenogramLinkClassName,
        'inline-flex items-center gap-2 text-sm',
      )}
    >
      {direction === 'previous' ? (
        <>
          <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
          <Trans>Ședința anterioară · {date}</Trans>
        </>
      ) : (
        <>
          <Trans>Ședința următoare · {date}</Trans>
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </>
      )}
    </Link>
  )
}

/**
 * The identity band for a sitting we HOLD but cannot serve a reading for.
 *
 * Rendered above the failure notice from the ref the error carries, so a
 * SOURCE_ONLY capture still shows its real date, chamber and title. Without it
 * the page would be a bare apology and would read like a broken link.
 */
function UnavailableSittingHeader({
  session,
}: {
  readonly session: ParliamentStenogramSessionRef
}) {
  const { i18n } = useLingui()
  return (
    <header className="space-y-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-semibold tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {formatSittingDate(session.sessionDate, i18n.locale)}
        </span>
        <span
          className={cn(
            stenogramBadgeClassName,
            stenogramChamberToneClassName[session.chamber ?? ''],
          )}
        >
          {stenogramChamberLabel(session.chamber)}
        </span>
        <span
          className={cn(
            stenogramBadgeClassName,
            'border-2',
            stenogramAvailabilityToneClassName[session.availability],
          )}
        >
          {stenogramAvailabilityLabel(session.availability)}
        </span>
      </div>
      <h1 className={stenogramSectionTitleClassName}>
        {sessionDisplayTitle(session, i18n.locale)}
      </h1>
    </header>
  )
}
