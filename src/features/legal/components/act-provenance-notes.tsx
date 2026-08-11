import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import { AlertTriangle, Info } from 'lucide-react'
import type { LegalActDetail } from '@/schemas/legal'
import { hasSummaryContent } from '../lib/act-facts'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly act: LegalActDetail
  /**
   * Whether the text on screen had its masthead lifted into the page header
   * (titlu/emitent/publicare hidden from the body under the equality rule).
   * An ACTIVE content transformation must be disclosed somewhere — the user
   * removed the inline note above the text (2026-08-12), so this catalogue
   * of limits is its home.
   */
  readonly mastheadInHeader?: boolean
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
export function ActProvenanceNotes({ act, mastheadInHeader = false }: Props) {
  const isSuspicious = act.canonical?.extractionStatus === 'suspicious'
  // The SAME predicate the page uses to render the summary card — this note
  // must claim "no summary" exactly when no card is on screen, including
  // blank-string summaries and description-only ones.
  const hasNoSummary = !act.summary || !hasSummaryContent(act.summary)
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
    ...(mastheadInHeader
      ? [
          {
            key: 'masthead',
            tone: 'info' as const,
            body: (
              // Non-enumerating on purpose: `lifted` means at least one
              // masthead line moved, not all of them — naming all three
              // would overstate a partial lift.
              <Trans>
                Liniile de antet ale actului nu sunt repetate în corpul
                textului de mai sus acolo unde capul paginii afișează deja
                aceleași informații. Restul textului este reprodus întocmai
                din sursa oficială.
              </Trans>
            ),
          },
        ]
      : []),
    // The old "no article structure" note is gone with the `structure`
    // field: the Cuprins in the left nav IS the served outline, and its
    // absence is visible on the page itself rather than asserted here.
    ...(hasNoSummary
      ? [
          {
            key: 'summary',
            tone: 'info' as const,
            body: (
              <Trans>
                Nu avem un rezumat generat pentru acest act — stratul
                explicativ lipsește; textul și fișa rămân complete.
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
