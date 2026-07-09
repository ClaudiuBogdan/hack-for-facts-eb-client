import { ExternalLink } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Skeleton } from '@/components/ui/skeleton'
import { useParliamentSpeechDetail } from '../hooks/use-parliament-data'
import { formatVoteDayLong } from '../lib/formatting'
import {
  memberDetailSectionIntroClassName,
  memberDetailSectionTitleClassName,
} from '../lib/member-detail-theme'
import { ParliamentShell } from './parliament-shell'
import { ParliamentNotFoundPage } from './parliament-not-found-page'

type Props = {
  readonly speechKey: string
}

/** Sitting badge label (same mapping as the record card). */
function sittingLabel(chamber: string | undefined): string {
  if (chamber === 'comun') return 'Ședință comună'
  if (chamber === 'senat') return 'Senat'
  if (chamber === 'camera_deputatilor') return 'Camera Deputaților'
  return 'În plen'
}

/**
 * One intervention on its own shareable page: date + sitting + speaker (linked
 * to the member profile when matched), the summary, the verbatim transcript
 * and the source-honest stenogram link.
 */
export function ParliamentSpeechDetailPage({ speechKey }: Props) {
  const { data: speech, isLoading } = useParliamentSpeechDetail(speechKey)

  if (!isLoading && !speech) {
    return (
      <ParliamentNotFoundPage
        title="Intervenția nu a fost găsită"
        description="Intervenția căutată nu există sau nu mai este disponibilă. Puteți căuta în toate stenogramele Parlamentului."
        breadcrumbLabel="Stenogramă negăsită"
        actions={[
          { label: 'Toate stenogramele', to: '/parlament/stenograme' },
        ]}
      />
    )
  }

  return (
    <ParliamentShell activeTab="stenograme">
      <div className="space-y-8">
        <Link
          to="/parlament/stenograme"
          className="inline-flex items-center text-sm font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        >
          ← Toate stenogramele
        </Link>

        {isLoading || !speech ? (
          <Skeleton className="h-64 w-full rounded-none" />
        ) : (
          <>
            <div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {speech.spokenAt
                    ? formatVoteDayLong(speech.spokenAt)
                    : 'Dată indisponibilă'}
                </span>
                <span className="inline-flex items-center border border-[#b1b4b6] px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-[#505a5f] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-muted)]">
                  {sittingLabel(speech.chamber)}
                </span>
              </div>
              <h2 className={memberDetailSectionTitleClassName}>
                {speech.title?.trim() || 'Intervenție în plen'}
              </h2>
              {speech.speaker || speech.speakerName ? (
                <p className={memberDetailSectionIntroClassName}>
                  Vorbitor:{' '}
                  {speech.speaker ? (
                    <Link
                      to="/parlament/membri/$memberId/interventii"
                      params={{ memberId: speech.speaker.mandateKey }}
                      className="font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)]"
                    >
                      {speech.speaker.fullName}
                    </Link>
                  ) : (
                    <span className="font-semibold">{speech.speakerName}</span>
                  )}
                  {speech.speaker?.groupName
                    ? ` · ${speech.speaker.groupName}`
                    : null}
                </p>
              ) : null}
            </div>

            {speech.summary?.trim() ? (
              <section className="space-y-2">
                <h3 className={memberDetailSectionTitleClassName}>Rezumat</h3>
                <p className="whitespace-pre-line text-base leading-7 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
                  {speech.summary}
                </p>
              </section>
            ) : null}

            <section className="space-y-2">
              <h3 className={memberDetailSectionTitleClassName}>
                Transcrierea completă
              </h3>
              {speech.fullText ? (
                <p className="whitespace-pre-wrap border-l-2 border-[#b1b4b6] pl-4 text-base leading-7 text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:text-[var(--pnrr-fg)]">
                  {speech.fullText}
                </p>
              ) : (
                <p className="text-base leading-7 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  Transcrierea completă nu este încă disponibilă pentru această
                  intervenție.
                </p>
              )}
            </section>

            {speech.sourceUrl ? (
              <section className="space-y-1">
                <a
                  href={speech.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1d70b8] underline underline-offset-4 hover:text-[#0b0c0c] dark:hover:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
                >
                  {speech.sourceUrlKind === 'exact'
                    ? 'Vezi în stenograma oficială'
                    : 'Stenogramele oficiale (lista ședințelor)'}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                </a>
                {speech.sourceUrlKind !== 'exact' ? (
                  <p className="text-xs text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    Linkul deschide lista stenogramelor; pagina exactă a acestei
                    intervenții trebuie găsită după dată.
                  </p>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </div>
    </ParliamentShell>
  )
}
