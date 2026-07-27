import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { ParliamentStenogramSegment } from '@/schemas/parliament'
import { segmentKindLabel } from '../lib/stenogram-presentation'
import { segmentDomId } from '../lib/stenogram-toc'
import {
  estimateBlockSize,
  stenogramAgendaHeadingClassName,
  stenogramBadgeClassName,
  stenogramBlockClassName,
  stenogramBlockSelectedClassName,
  stenogramReadingColumnClassName,
  stenogramSpeakerNameClassName,
} from '../lib/stenogram-theme'

type Props = {
  /**
   * The blocks to render, in source order. The reader passes the WHOLE sitting
   * in full mode, and only the selected speakers' contributions when its
   * speaker filter is on — this component renders exactly what it is given and
   * never decides to omit anything itself.
   */
  readonly segments: readonly ParliamentStenogramSegment[]
  /** The block named by `?interventie=` — highlighted, never isolated. */
  readonly selectedPosition: number | undefined
}

/**
 * The transcript itself, in the official printed order.
 *
 * THE CONTEXT RULE. A selected contribution is HIGHLIGHTED in place — the
 * blocks before and after it stay on screen, unchanged. Isolating one turn is
 * the tempting implementation and the wrong one: a stenogram's meaning lives in
 * the exchange, and a quote lifted out of the debate around it is exactly the
 * failure mode this surface exists to prevent. When the reader's speaker filter
 * narrows what is passed here, that is a deliberate, named and reversible
 * EXCERPT — stated as such next to this column, never a silent selection.
 *
 * Every block is an `<article>` with a stable DOM id derived from its POSITION
 * (the document's identity, enforced unique with the session key server-side),
 * so anchors survive re-renders and paging.
 */
export function ParliamentStenogramDocument({
  segments,
  selectedPosition,
}: Props) {
  return (
    <div className={stenogramReadingColumnClassName}>
      {segments.map((segment) => {
        const selected = segment.position === selectedPosition

        if (segment.kind === 'AGENDA_HEADING') {
          return (
            <h2
              key={segment.segmentKey}
              id={segmentDomId(segment.position)}
              tabIndex={-1}
              className={cn(
                stenogramAgendaHeadingClassName,
                'scroll-mt-32 print:scroll-mt-0',
              )}
            >
              {segment.text}
            </h2>
          )
        }

        return (
          <article
            key={segment.segmentKey}
            id={segmentDomId(segment.position)}
            tabIndex={-1}
            aria-current={selected ? 'true' : undefined}
            className={cn(
              stenogramBlockClassName,
              selected && stenogramBlockSelectedClassName,
            )}
            style={{ containIntrinsicSize: estimateBlockSize(segment) }}
          >
            {selected ? (
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-[#1d70b8] print:hidden">
                <Trans>Intervenția din link</Trans>
              </p>
            ) : null}

            <SegmentSpeakerLine segment={segment} />

            <p className="whitespace-pre-wrap">{segment.text}</p>
          </article>
        )
      })}
    </div>
  )
}

/**
 * The member this block was RESOLVED to, if the source resolved it at all.
 *
 * A block can carry the mandate in either of two places, and which one depends
 * on the transport rather than on the speaker: the REST transcript and the
 * segment GraphQL selection put it on `mandateKey`, while anything that
 * resolves the block through the lazy `member` resolver (speech context, and
 * any future selection that asks for it) carries it on `member.mandateKey`.
 * Reading only the first is why linked names silently went plain.
 *
 * The printed NAME is never an input here. Deriving a member route from
 * `speakerName` would be guessing an identity from a string the stenographer
 * typed — which is the one thing this surface must not do.
 */
function resolveSpeakerMandateKey(
  segment: ParliamentStenogramSegment,
): string | undefined {
  return segment.mandateKey ?? segment.member?.mandateKey
}

/**
 * What to SAY about a printed name we did not link.
 *
 * The three no-identity states are different facts and must not read the same. A
 * minister addressing the chamber is a complete answer; "we could not tell who this
 * was" is an admission; "several members share this name" is a third thing. Before
 * the data layer typed them (scrapper migration 20260727T140000) all three arrived
 * as one silent absence, so the reader could only stay quiet.
 *
 * Returns null when the server sent no resolution at all — an older server, where
 * we still have nothing to say and say nothing, exactly as before.
 */
function speakerAbsenceLabel(
  segment: ParliamentStenogramSegment,
): { readonly badge: string | null; readonly detail: string } | null {
  switch (segment.speakerResolution) {
    case 'NON_MEMBER_CAPACITY':
      return {
        badge: t`invitat`,
        detail: t`Sursa a consemnat această intervenție în afara unui mandat parlamentar (membru al Guvernului, oficial sau invitat).`,
      }
    case 'AMBIGUOUS':
      return {
        badge: null,
        detail: t`Mai mulți parlamentari poartă acest nume în legislatura respectivă; sursa nu permite alegerea între ei.`,
      }
    case 'UNRESOLVED':
      return {
        badge: null,
        detail: t`Vorbitorul nu a putut fi identificat pe baza a ceea ce publică sursa.`,
      }
    default:
      return null
  }
}

/**
 * The speaker line.
 *
 * The NAME shown is always the one the transcript PRINTED — never a roster
 * identity substituted for it. When the source also carried a roster-resolved
 * mandate, the printed name additionally becomes a link to that member; when it
 * did not (guests, ministers, anyone the source printed no id for) the name
 * stands on its own, which is the honest, expected outcome and not a gap.
 */
/**
 * The visible reason a printed name is not a link. A `NON_MEMBER_CAPACITY` speaker
 * gets a badge — it is an ANSWER, not a gap — while the two genuine unknowns stay
 * screen-reader-only so the reading is not littered with apologies.
 */
function SpeakerAbsenceNote({
  segment,
}: {
  readonly segment: ParliamentStenogramSegment
}) {
  const absence = speakerAbsenceLabel(segment)
  if (!absence) {
    return (
      <span className="sr-only">
        {t`Sursa nu a identificat acest vorbitor ca membru al Parlamentului.`}
      </span>
    )
  }
  return (
    <>
      {absence.badge ? (
        <span className={cn(stenogramBadgeClassName, 'print:hidden')}>
          {absence.badge}
        </span>
      ) : null}
      <span className="sr-only">{absence.detail}</span>
    </>
  )
}

function SegmentSpeakerLine({
  segment,
}: {
  readonly segment: ParliamentStenogramSegment
}) {
  const showKind = segment.kind !== 'SPEECH'
  const mandateKey = resolveSpeakerMandateKey(segment)

  if (!segment.speakerName) {
    return showKind ? (
      <p className="mb-1">
        <span className={cn(stenogramBadgeClassName, 'print:hidden')}>
          {segmentKindLabel(segment.kind)}
        </span>
      </p>
    ) : null
  }

  return (
    <p className="mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
      {mandateKey ? (
        <Link
          to="/parlament/membri/$memberId/interventii"
          params={{ memberId: mandateKey }}
          className={cn(
            stenogramSpeakerNameClassName,
            'underline underline-offset-4 hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
          )}
        >
          {segment.speakerName}
        </Link>
      ) : (
        <span className={stenogramSpeakerNameClassName}>
          {segment.speakerName}
        </span>
      )}
      {showKind ? (
        <span className={cn(stenogramBadgeClassName, 'print:hidden')}>
          {segmentKindLabel(segment.kind)}
        </span>
      ) : null}
      {!mandateKey ? <SpeakerAbsenceNote segment={segment} /> : null}
    </p>
  )
}
