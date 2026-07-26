import { BookOpen, ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type { ParliamentMemberSpeech } from '@/schemas/parliament'
import { formatVoteDayLong } from '../lib/formatting'

type Props = {
  readonly speech: ParliamentMemberSpeech
  /**
   * Speaker line (global stenograme list) — links to the member's interventii
   * tab. Omitted on the member tab, where the speaker is the page subject.
   */
  readonly speaker?: {
    readonly name: string
    readonly memberId?: string
    readonly groupName?: string
  }
  /**
   * Fallback detail target for a LEGACY row (`$speechKey`). A canonical row
   * ignores it and links into its sitting instead — that page shows the same
   * words with the surrounding debate, which is strictly more useful.
   */
  readonly detailTo?: string
  /**
   * Suppress the date line. Set when the card sits under a sitting heading
   * that already carries the date — repeating it on every card is noise.
   */
  readonly showDate?: boolean
}

/** Longest summary snippet shown on the card before the transcript expander. */
const SNIPPET_MAX = 500

/** Human label for the sitting badge — own chamber vs a joint sitting. */
function sittingBadge(chamber: string | undefined): {
  readonly label: string
  readonly joint: boolean
} {
  if (chamber === 'comun') return { label: 'Ședință comună', joint: true }
  if (chamber === 'senat') return { label: 'Cameră proprie · Senat', joint: false }
  if (chamber === 'camera_deputatilor')
    return { label: 'Cameră proprie · Camera Deputaților', joint: false }
  return { label: 'În plen', joint: false }
}

/**
 * A speaker-line-only string ("Domnul X:" / "Doamna Y:" with nothing after the
 * colon) carries no substance — it must not become the card's lead text.
 */
function isSpeakerLineOnly(text: string): boolean {
  const remainder = text
    .trim()
    .replace(/^(domnul|doamna|dl\.?|dna\.?)\b[^:]*:\s*/i, '')
  return remainder.trim().length === 0
}

/** First substantive (non-empty, non-speaker-line) line of a transcript. */
function firstSubstantiveLine(text: string | undefined): string | undefined {
  if (!text) return undefined
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || isSpeakerLineOnly(line)) continue
    return line
  }
  return undefined
}

/**
 * Pick the card's lead text. Cards LEAD WITH THE SUMMARY (title is NULL for
 * ~80% of rows and, on Senate, an ugly sitting header) — but a speaker-line-only
 * summary ("Domnul X:") is treated as empty; fall back in order to the first
 * substantive transcript line, then the title, then an honest placeholder.
 */
function leadText(speech: ParliamentMemberSpeech): string {
  const summary = speech.summary?.trim()
  if (summary && !isSpeakerLineOnly(summary)) return summary
  const fromTranscript = firstSubstantiveLine(speech.fullText)
  if (fromTranscript) return fromTranscript
  const title = speech.title?.trim()
  if (title) return title
  return '(conținut indisponibil în rezumat)'
}

function snippet(text: string): string {
  if (text.length <= SNIPPET_MAX) return text
  return `${text.slice(0, SNIPPET_MAX).trimEnd()}…`
}

/**
 * The sitting-reader target for a CANONICAL turn: the full transcript, scrolled
 * to and highlighting this contribution. Only minted when the row is canonical
 * AND names its sitting — see `canonicalPointers`.
 */
function sittingTarget(
  speech: ParliamentMemberSpeech,
): { sessionKey: string; interventie: string } | undefined {
  if (!speech.isCanonical || !speech.sessionKey) return undefined
  return { sessionKey: speech.sessionKey, interventie: speech.speechKey }
}

/** One speech TURN in the interventii list: date + sitting badge + summary +
 * an expandable verbatim transcript + a source-honest stenogram link. */
export function MemberSpeechRecordCard({
  speech,
  speaker,
  detailTo,
  showDate = true,
}: Props) {
  const badge = sittingBadge(speech.chamber)
  const lead = snippet(leadText(speech))
  const hasSource = Boolean(speech.sourceUrl)
  const isExact = speech.sourceUrlKind === 'exact'
  const sitting = sittingTarget(speech)
  const dateLabel = speech.spokenAt
    ? formatVoteDayLong(speech.spokenAt)
    : 'Dată indisponibilă'

  const dateLinkClassName =
    'text-sm font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]'

  return (
    <article className="border-2 border-[#b1b4b6] bg-white p-5 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {showDate ? (
          sitting ? (
            <Link
              to="/parlament/stenograme/sedinte/$sessionKey"
              params={{ sessionKey: sitting.sessionKey }}
              search={{ interventie: sitting.interventie }}
              className={dateLinkClassName}
            >
              {dateLabel}
            </Link>
          ) : detailTo ? (
            <Link
              to="/parlament/stenograme/$speechKey"
              params={{ speechKey: detailTo }}
              className={dateLinkClassName}
            >
              {dateLabel}
            </Link>
          ) : (
            <span className="text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {dateLabel}
            </span>
          )
        ) : null}
        <span
          className="inline-flex items-center border border-[#b1b4b6] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]"
        >
          {badge.label}
        </span>
      </div>

      {speaker ? (
        <p className="mt-1.5 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {speaker.memberId ? (
            <Link
              to="/parlament/membri/$memberId/interventii"
              params={{ memberId: speaker.memberId }}
              className="font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              {speaker.name}
            </Link>
          ) : (
            <span className="font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {speaker.name}
            </span>
          )}
          {speaker.groupName ? ` · ${speaker.groupName}` : null}
        </p>
      ) : null}

      <p className="mt-2 whitespace-pre-line text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        {lead}
      </p>

      <details className="group mt-3">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]">
          <span className="group-open:hidden">Transcriere completă</span>
          <span className="hidden group-open:inline">Ascunde transcrierea</span>
        </summary>
        {speech.fullText ? (
          <p className="mt-2 whitespace-pre-wrap border-l-2 border-[#b1b4b6] pl-4 text-sm leading-7 text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-fg)]">
            {speech.fullText}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            Transcrierea completă nu este încă disponibilă.
          </p>
        )}
      </details>

      {sitting ? (
        <div className="mt-3">
          <Link
            to="/parlament/stenograme/sedinte/$sessionKey"
            params={{ sessionKey: sitting.sessionKey }}
            search={{ interventie: sitting.interventie }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            <Trans>Vezi în stenograma completă a ședinței</Trans>
          </Link>
        </div>
      ) : null}

      {hasSource ? (
        <div className="mt-3">
          {isExact ? (
            <a
              href={speech.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            >
              Vezi în stenogramă (cdep.ro)
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          ) : (
            <div className="space-y-1">
              <a
                href={speech.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
              >
                Stenogramele Senatului (senat.ro)
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Linkul deschide lista stenogramelor; pagina exactă a acestei
                intervenții trebuie găsită după dată.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </article>
  )
}
