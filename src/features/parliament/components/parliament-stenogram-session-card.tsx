import { Link } from '@tanstack/react-router'
import { ExternalLink, FileText, Users } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import type { ParliamentStenogramSession } from '@/schemas/parliament'
import {
  formatSittingDate,
  sessionDisplayTitle,
  sessionTimeSpan,
  sourceLinkLabel,
  stenogramAvailabilityLabel,
  stenogramChamberLabel,
  yieldsReading,
} from '../lib/stenogram-presentation'
import {
  stenogramAvailabilityToneClassName,
  stenogramBadgeClassName,
  stenogramCardClassName,
  stenogramChamberLeftRuleClassName,
  stenogramChamberToneClassName,
  stenogramLinkClassName,
  stenogramMetaActionClassName,
  stenogramMutedTextClassName,
} from '../lib/stenogram-theme'

type Props = {
  readonly session: ParliamentStenogramSession
}

/**
 * One captured sitting in the browse list.
 *
 * The headline is the SITTING, not a turn: date, assembly, and how much of it
 * can be read. A SOURCE_ONLY capture is still listed — suppressing it would
 * quietly rewrite the record of which sittings happened — but it links to the
 * official source instead of promising a reading it cannot serve.
 */
export function ParliamentStenogramSessionCard({ session }: Props) {
  const { i18n } = useLingui()
  const readable = yieldsReading(session.availability)
  const title = sessionDisplayTitle(session, i18n.locale)
  const timeSpan = sessionTimeSpan(session)

  return (
    <article
      className={cn(
        stenogramCardClassName,
        stenogramChamberLeftRuleClassName[session.chamber ?? ''],
      )}
    >
      {/* The day leads — it is what a reader scanning a column of sittings
          reads down. The labels go to the far edge, where the actions in the
          meta line below them also sit: one left rail of content, one right
          rail of what-this-is. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-sm font-semibold tabular-nums text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          {formatSittingDate(session.sessionDate, i18n.locale)}
        </span>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:ml-auto">
          <span
            className={cn(
              stenogramBadgeClassName,
              stenogramChamberToneClassName[session.chamber ?? ''],
            )}
          >
            {stenogramChamberLabel(session.chamber)}
          </span>
          {/* Only when there is something to warn about. A "Transcriere
              completă" badge on every readable card was a caveat printed where
              there is no caveat, and a caveat that is always there teaches
              readers to skip the ones that matter — the partial capture and the
              one with no text at all, which still say so here. */}
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
      </div>

      <h3 className="mt-2 text-lg font-bold leading-snug text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
        {readable ? (
          <Link
            to="/parlament/stenograme/sedinte/$sessionKey"
            params={{ sessionKey: session.sessionKey }}
            className={stenogramLinkClassName}
          >
            {title}
          </Link>
        ) : (
          title
        )}
      </h3>

      {session.presidingText || timeSpan ? (
        <p className={cn(stenogramMutedTextClassName, 'mt-1.5')}>
          {[session.presidingText, timeSpan].filter(Boolean).join(' · ')}
        </p>
      ) : null}

      {readable ? null : (
        <p className={cn(stenogramMutedTextClassName, 'mt-3')}>
          <Trans>
            Captura acestei ședințe nu conține textul dezbaterii. Păstrăm
            ședința și adresa ei oficială, ca să puteți merge direct la sursă.
          </Trans>
        </p>
      )}

      {/* ONE meta line: what the sitting holds, then what can be done with it.
          The counts and the actions were two stacked rows saying the same
          quiet, secondary thing, which cost the card a line and gave the
          actions a prominence the title should own. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#505a5f] dark:text-[var(--pnrr-muted)]">
        {readable ? (
          <dl className="flex flex-wrap items-center gap-x-5 gap-y-1">
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 shrink-0" aria-hidden />
              <dt className="sr-only">
                <Trans>Luări de cuvânt</Trans>
              </dt>
              <dd className="tabular-nums">
                <Plural
                  value={session.speechCount}
                  one="# luare de cuvânt"
                  few="# luări de cuvânt"
                  other="# de luări de cuvânt"
                />
              </dd>
            </div>
            <div className="flex items-center gap-1.5">
              <Users className="h-4 w-4 shrink-0" aria-hidden />
              <dt className="sr-only">
                <Trans>Vorbitori</Trans>
              </dt>
              <dd className="tabular-nums">
                <Plural
                  value={session.speakerCount}
                  one="# vorbitor"
                  few="# vorbitori"
                  other="# de vorbitori"
                />
              </dd>
            </div>
          </dl>
        ) : null}

        {/* The actions sit at the END of the line: the counts describe the
            sitting and are read left to right with everything above them, while
            these are what a reader does next — and next belongs at the far edge,
            not interleaved with the description. `sm:` only, because on a narrow
            card the row wraps and a right-aligned orphan line reads as a
            mistake. */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto">
          {readable ? (
            <Link
              to="/parlament/stenograme/sedinte/$sessionKey"
              params={{ sessionKey: session.sessionKey }}
              className={stenogramMetaActionClassName}
            >
              <Trans>Citește stenograma</Trans>
            </Link>
          ) : null}

          <a
            href={session.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={stenogramMetaActionClassName}
          >
            {sourceLinkLabel(session.sourceSystem, session.sourceUrlKind)}
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="sr-only">{t`(se deschide într-o filă nouă)`}</span>
          </a>
        </div>
      </div>
    </article>
  )
}
