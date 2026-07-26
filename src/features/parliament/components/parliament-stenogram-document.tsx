import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { ParliamentStenogramSegment } from '@/schemas/parliament'
import {
  groupMatchesBySegment,
  splitByMatches,
  type DocumentMatch,
} from '../lib/stenogram-document-search'
import { segmentKindLabel } from '../lib/stenogram-presentation'
import { segmentDomId } from '../lib/stenogram-toc'
import {
  estimateBlockSize,
  stenogramAgendaHeadingClassName,
  stenogramBadgeClassName,
  stenogramBlockClassName,
  stenogramBlockSelectedClassName,
  stenogramMatchClassName,
  stenogramMatchCurrentClassName,
  stenogramReadingColumnClassName,
  stenogramSpeakerNameClassName,
} from '../lib/stenogram-theme'

type Props = {
  readonly segments: readonly ParliamentStenogramSegment[]
  /** The block named by `?interventie=` — highlighted, never isolated. */
  readonly selectedPosition: number | undefined
  readonly matches: readonly DocumentMatch[]
  readonly currentMatch: number
}

/**
 * The transcript itself, in the official printed order.
 *
 * THE CONTEXT RULE. A selected contribution is HIGHLIGHTED in place — the
 * blocks before and after it stay on screen, unchanged. Filtering the document
 * down to one turn is the tempting implementation and the wrong one: a
 * stenogram's meaning lives in the exchange, and a quote lifted out of the
 * debate around it is exactly the failure mode this surface exists to prevent.
 *
 * Every block is an `<article>` with a stable DOM id derived from its POSITION
 * (the document's identity, enforced unique with the session key server-side),
 * so anchors survive re-renders and paging.
 */
export function ParliamentStenogramDocument({
  segments,
  selectedPosition,
  matches,
  currentMatch,
}: Props) {
  const grouped = groupMatchesBySegment(matches)

  return (
    <div className={stenogramReadingColumnClassName}>
      {segments.map((segment) => {
        const selected = segment.position === selectedPosition
        const group = grouped.get(segment.segmentKey)

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
              <SegmentText
                text={segment.text}
                group={group}
                currentMatch={currentMatch}
              />
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

            <p className="whitespace-pre-wrap">
              <SegmentText
                text={segment.text}
                group={group}
                currentMatch={currentMatch}
              />
            </p>
          </article>
        )
      })}
    </div>
  )
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
function SegmentSpeakerLine({
  segment,
}: {
  readonly segment: ParliamentStenogramSegment
}) {
  const showKind = segment.kind !== 'SPEECH'

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
      {segment.mandateKey ? (
        <Link
          to="/parlament/membri/$memberId/interventii"
          params={{ memberId: segment.mandateKey }}
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
      {!segment.mandateKey ? (
        <span className="sr-only">
          {t`Sursa nu a identificat acest vorbitor ca membru al Parlamentului.`}
        </span>
      ) : null}
    </p>
  )
}

/** Block text with in-document search hits marked; the current hit gets a ring. */
function SegmentText({
  text,
  group,
  currentMatch,
}: {
  readonly text: string
  readonly group: { matches: DocumentMatch[]; offset: number } | undefined
  readonly currentMatch: number
}) {
  if (!group) return <>{text}</>

  return (
    <>
      {splitByMatches(text, group.matches, group.offset).map((part, index) =>
        part.isMatch ? (
          <mark
            key={index}
            data-match-index={part.matchIndex}
            className={cn(
              stenogramMatchClassName,
              part.matchIndex === currentMatch && stenogramMatchCurrentClassName,
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  )
}
