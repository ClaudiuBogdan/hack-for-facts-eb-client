import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import { AlertTriangle, Info } from 'lucide-react'
import type { LegalActDetail } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly act: LegalActDetail
}

/**
 * The last accordion row — what this page cannot tell you about *this* act.
 *
 * The Constitutional Court note leads and is unconditional: it is the only
 * over-claim the page can make on its own. Everything else is conditional on
 * the act's own record, so an act with a clean record gets three notes rather
 * than a wall of boilerplate.
 *
 * Closed by default, and that is not a demotion of the caveats. Every claim
 * these notes qualify is already stated where it is made — the mock badge sits
 * beside the status badge in the header, the AI notice runs along the bottom of
 * the summary it applies to, and unresolved citations say "potrivire posibilă"
 * on the row itself. What is left here is the *catalogue* of limits, which is
 * reference material: as a permanently open wall at the end of the page it was
 * read by nobody and cost more screen than the publication proof.
 */
export function ActProvenanceNotes({ act }: Props) {
  const isSuspicious = act.canonical?.extractionStatus === 'suspicious'
  const hasNoStructure = act.structure.length === 0
  const hasNoSummary = act.summary?.plainLanguageSummary == null
  const hasNoPublication = act.gazettePublications.length === 0

  const notes: ReadonlyArray<{
    key: string
    tone: 'warning' | 'info'
    body: ReactNode
  }> = [
    // Leads when it applies: whatever else the page says, the reader needs to
    // know first that the act on screen is a snapshot, not a live lookup.
    ...(isLegalMockEnabled()
      ? [
          {
            key: 'mock',
            tone: 'warning' as const,
            body: (
              <Trans>
                Această pagină rulează pe date demonstrative: două acte reale,
                copiate din producție la 1 august 2026. Cifrele și statutul erau
                corecte atunci, nu neapărat astăzi.
              </Trans>
            ),
          },
        ]
      : []),
    {
      key: 'ccr',
      tone: 'warning',
      body: (
        <Trans>
          Statutul afișat vine din Portal Legislativ și nu ține cont de deciziile
          Curții Constituționale. Un articol declarat neconstituțional poate
          apărea în continuare ca fiind în vigoare. Verifică separat deciziile
          Curții.
        </Trans>
      ),
    },
    ...(hasNoPublication
      ? [
          {
            key: 'no-publication',
            tone: 'info' as const,
            body: (
              <Trans>
                Nu am putut lega acest act de un număr din Monitorul Oficial.
                Doar 46,4% dintre publicări se potrivesc cu certitudine unui act
                din Portal Legislativ.
              </Trans>
            ),
          },
        ]
      : []),
    ...(isSuspicious
      ? [
          {
            key: 'extraction',
            tone: 'warning' as const,
            body: (
              <Trans>
                Extragerea acestui document a fost marcată ca suspectă, deci
                titlul, datele sau structura pot fi incomplete.
              </Trans>
            ),
          },
        ]
      : []),
    ...(hasNoStructure
      ? [
          {
            key: 'structure',
            tone: 'info' as const,
            body: (
              <Trans>
                Nu avem structura pe articole pentru acest act, deci nu îi putem
                arăta cuprinsul.
              </Trans>
            ),
          },
        ]
      : []),
    ...(hasNoSummary
      ? [
          {
            key: 'summary',
            tone: 'info' as const,
            body: (
              <Trans>
                Nu avem un rezumat generat pentru acest act, deci pagina arată
                doar datele de identificare.
              </Trans>
            ),
          },
        ]
      : []),
  ]

  return (
    <ActAccordionItem
      id="act-provenance-heading"
      title={t`Ce nu vă putem spune despre acest act`}
      meta={
        <Plural
          value={notes.length}
          one="# limită"
          few="# limite"
          other="# de limite"
        />
      }
      description={t`Limitele acestor date, spuse pe față.`}
    >
      <ul className="flex flex-col gap-4 px-5 py-5 sm:px-6">
        {notes.map((note) => (
          <li key={note.key} className="flex gap-3">
            {note.tone === 'warning' ? (
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
                aria-hidden
              />
            ) : (
              <Info
                className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-muted)]"
                aria-hidden
              />
            )}
            <p
              className={
                note.tone === 'warning'
                  ? 'max-w-prose text-sm font-medium text-[var(--pnrr-fg)]'
                  : 'max-w-prose text-sm text-[var(--pnrr-fg)]'
              }
            >
              {note.body}
            </p>
          </li>
        ))}
      </ul>
    </ActAccordionItem>
  )
}
