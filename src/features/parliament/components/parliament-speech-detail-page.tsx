import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  useParliamentSpeechContext,
  useParliamentSpeechDetail,
} from '../hooks/use-parliament-data'
import { formatVoteDayLong } from '../lib/formatting'
import { classifyStenogramFailure } from '../lib/parliament-stenogram-error'
import { isLegacySpeechKey } from '../lib/parliament-speech-keys'
import {
  sessionDisplayTitle,
  sourceLinkLabel,
  sourcePrecisionNote,
  stenogramChamberLabel,
} from '../lib/stenogram-presentation'
import {
  stenogramLinkClassName,
  stenogramMutedTextClassName,
  stenogramNoticeClassName,
  stenogramSectionTitleClassName,
} from '../lib/stenogram-theme'
import { ParliamentShell } from './parliament-shell'
import { ParliamentStenogramFailureNotice } from './parliament-stenogram-failure'

type Props = {
  readonly speechKey: string
}

/**
 * `/parlament/stenograme/$speechKey` — the PERMANENT resolver for a shared
 * contribution link.
 *
 * Millions of legacy `cdep:…` / `senat:…` keys are in the wild, so this route
 * never goes away; it stops being a page and becomes a redirect. It asks the
 * server to map the key onto the canonical reading and forwards to the sitting
 * reader, where the words appear WITH the debate around them:
 *
 *   mappingKind `exact_segment` → the sitting, highlighting that contribution.
 *   mappingKind `session_only`  → the sitting, with NO highlight. The server
 *                                 could not PROVE which block it was, so we do
 *                                 not guess one; the reader is told why.
 *   context === null            → the key is unknown or not yet mapped. We fall
 *                                 back to the standalone turn if it exists, and
 *                                 only report "not found" when it does not.
 *
 * The four failure states stay distinguishable throughout: a transport failure
 * must never render as "this speech does not exist".
 */
export function ParliamentSpeechDetailPage({ speechKey }: Props) {
  const { i18n } = useLingui()
  const navigate = useNavigate()

  const context = useParliamentSpeechContext(speechKey)
  // Only asked for once the canonical lane has said it cannot place the key —
  // the standalone turn is the fallback, not the primary answer.
  const fallbackEnabled = !context.isLoading && !context.isError && !context.data
  const speech = useParliamentSpeechDetail(fallbackEnabled ? speechKey : '')

  const target = context.data
  const canonicalKey =
    target?.redirect?.canonicalSpeechKey ?? target?.segment?.speechKey

  useEffect(() => {
    if (!target) return
    void navigate({
      to: '/parlament/stenograme/sedinte/$sessionKey',
      params: { sessionKey: target.session.sessionKey },
      // `session_only` carries no proven block, so no highlight is requested.
      search: canonicalKey ? { interventie: canonicalKey } : {},
      replace: true,
    })
  }, [target, canonicalKey, navigate])

  if (context.isLoading || (fallbackEnabled && speech.isLoading)) {
    return (
      <ParliamentShell activeTab="stenograme">
        <div className="space-y-4">
          <p className={stenogramMutedTextClassName} aria-live="polite">
            {isLegacySpeechKey(speechKey) ? (
              <Trans>
                Link vechi — căutăm intervenția în stenograma ședinței…
              </Trans>
            ) : (
              <Trans>Se caută intervenția…</Trans>
            )}
          </p>
          <Skeleton
            className="h-64 w-full rounded-none"
            aria-busy="true"
            aria-label={t`Se încarcă intervenția`}
          />
        </div>
      </ParliamentShell>
    )
  }

  // A GraphQL/transport failure resolving the context leaves the record's
  // existence an OPEN QUESTION — it must not fall through to "not found".
  if (context.isError) {
    return (
      <ParliamentShell activeTab="stenograme">
        <div className="space-y-6">
          <ParliamentStenogramFailureNotice
            failure={classifyStenogramFailure(context.error)}
            onRetry={() => void context.refetch()}
          >
            <Link to="/parlament/stenograme" className={stenogramLinkClassName}>
              <Trans>Vezi toate stenogramele</Trans>
            </Link>
          </ParliamentStenogramFailureNotice>
        </div>
      </ParliamentShell>
    )
  }

  // Redirect in flight — render the destination's identity rather than a blank.
  if (target) {
    const sittingTitle = sessionDisplayTitle(target.session, i18n.locale)
    return (
      <ParliamentShell activeTab="stenograme">
        <div className="space-y-4">
          <p className={stenogramMutedTextClassName} aria-live="polite">
            <Trans>Vă redirecționăm către stenograma ședinței…</Trans>
          </p>
          <Link
            to="/parlament/stenograme/sedinte/$sessionKey"
            params={{ sessionKey: target.session.sessionKey }}
            search={canonicalKey ? { interventie: canonicalKey } : {}}
            className={stenogramLinkClassName}
          >
            {sittingTitle}
          </Link>
          {target.redirect && !canonicalKey ? (
            <p className={stenogramNoticeClassName}>
              <Trans>
                Linkul vechi indică această ședință, dar nu am putut dovedi care
                anume este intervenția din ea. Deschidem stenograma completă,
                fără să evidențiem un bloc ghicit.
              </Trans>
            </p>
          ) : null}
        </div>
      </ParliamentShell>
    )
  }

  if (speech.isError) {
    return (
      <ParliamentShell activeTab="stenograme">
        <ParliamentStenogramFailureNotice
          failure={classifyStenogramFailure(speech.error)}
          onRetry={() => void speech.refetch()}
        >
          <Link to="/parlament/stenograme" className={stenogramLinkClassName}>
            <Trans>Vezi toate stenogramele</Trans>
          </Link>
        </ParliamentStenogramFailureNotice>
      </ParliamentShell>
    )
  }

  if (!speech.data) {
    return (
      <ParliamentShell activeTab="stenograme">
        <ParliamentStenogramFailureNotice
          failure={{
            kind: 'not_found',
            message: `Unknown speech key ${speechKey}`,
            retryable: false,
          }}
        >
          <Link to="/parlament/stenograme" className={stenogramLinkClassName}>
            <Trans>Vezi toate stenogramele</Trans>
          </Link>
        </ParliamentStenogramFailureNotice>
      </ParliamentShell>
    )
  }

  // The turn exists but the canonical lane has not mapped it to a sitting yet.
  // Render it standalone, and say plainly that the surrounding debate is not
  // available for it — rather than implying this is all there was.
  const turn = speech.data
  const precisionNote = sourcePrecisionNote(turn.sourceUrlKind)

  return (
    <ParliamentShell activeTab="stenograme">
      <div className="space-y-6">
        <Link
          to="/parlament/stenograme"
          className={cn(stenogramLinkClassName, 'text-sm')}
        >
          <Trans>Toate stenogramele</Trans>
        </Link>

        <header className="space-y-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {turn.spokenAt
                ? formatVoteDayLong(turn.spokenAt)
                : t`Dată indisponibilă`}
            </span>
            <span className="inline-flex items-center border border-[#b1b4b6] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]">
              {stenogramChamberLabel(turn.chamber)}
            </span>
          </div>
          <h1 className={stenogramSectionTitleClassName}>
            {turn.title?.trim() || t`Intervenție în plen`}
          </h1>
          {turn.speaker || turn.speakerName ? (
            <p className={stenogramMutedTextClassName}>
              <Trans>Vorbitor:</Trans>{' '}
              {turn.speaker ? (
                <Link
                  to="/parlament/membri/$memberId/interventii"
                  params={{ memberId: turn.speaker.mandateKey }}
                  className={stenogramLinkClassName}
                >
                  {turn.speaker.fullName}
                </Link>
              ) : (
                <span className="font-semibold">{turn.speakerName}</span>
              )}
              {turn.speaker?.groupName ? ` · ${turn.speaker.groupName}` : null}
            </p>
          ) : null}
        </header>

        <p className={stenogramNoticeClassName}>
          <Trans>
            Această intervenție nu are încă o poziție dovedită într-o stenogramă
            de ședință, așa că nu o putem arăta în contextul dezbaterii. Textul
            de mai jos este doar această luare de cuvânt.
          </Trans>
        </p>

        {turn.summary?.trim() ? (
          <section className="space-y-2">
            <h2 className="text-lg font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              <Trans>Rezumat</Trans>
            </h2>
            <p className="whitespace-pre-line text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
              {turn.summary}
            </p>
          </section>
        ) : null}

        <section className="space-y-2">
          <h2 className="text-lg font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>Transcrierea completă</Trans>
          </h2>
          {turn.fullText ? (
            <p className="whitespace-pre-wrap border-l-2 border-[#b1b4b6] pl-4 text-base leading-7 text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-fg)]">
              {turn.fullText}
            </p>
          ) : (
            <p className={stenogramMutedTextClassName}>
              <Trans>
                Transcrierea acestei intervenții nu a fost încă încărcată din
                stenogramă. Acoperirea este parțială — absența nu înseamnă că
                nu s-a vorbit.
              </Trans>
            </p>
          )}
        </section>

        {turn.sourceUrl ? (
          <section className="space-y-1">
            <a
              href={turn.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                stenogramLinkClassName,
                'inline-flex items-center gap-1.5 text-sm',
              )}
            >
              {sourceLinkLabel(undefined, turn.sourceUrlKind)}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
            {precisionNote ? (
              <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {precisionNote}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>
    </ParliamentShell>
  )
}
