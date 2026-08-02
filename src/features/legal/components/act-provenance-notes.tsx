import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, Info } from 'lucide-react'
import type { LegalActDetail } from '@/schemas/legal'
import { isLegalMockEnabled } from '../lib/mock-mode'
import { LegislationSection } from './legislation-section'

type Props = {
  readonly act: LegalActDetail
}

/**
 * The page footer — what this page cannot tell you about *this* act.
 *
 * The Constitutional Court note leads and is unconditional: it is the only
 * over-claim the page can make on its own. Everything else is conditional on
 * the act's own record, so an act with a clean record gets a short footer rather
 * than a wall of boilerplate.
 */
export function ActProvenanceNotes({ act }: Props) {
  const isSuspicious = act.canonical?.extractionStatus === 'suspicious'
  const hasNoStructure = act.structure.length === 0
  const hasNoSummary = act.summary?.plainLanguageSummary == null

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
    {
      key: 'no-text',
      tone: 'info',
      body: (
        <Trans>
          Nu publicăm textul actelor normative. Această pagină descrie actul și
          te trimite la sursa oficială pentru text.
        </Trans>
      ),
    },
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
    <LegislationSection
      id="act-provenance-heading"
      title={t`Ce nu vă putem spune despre acest act`}
      description={t`Limitele acestor date, spuse pe față.`}
    >
      <ul className="flex flex-col gap-4">
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
                  ? 'text-sm font-medium text-[var(--pnrr-fg)]'
                  : 'text-sm text-[var(--pnrr-fg)]'
              }
            >
              {note.body}
            </p>
          </li>
        ))}
      </ul>
    </LegislationSection>
  )
}
