import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, Info } from 'lucide-react'
import { formatLegalNumber } from '../lib/legal-format'
import { useLegislationFreshness } from '../hooks/use-legislation'
import { LegislationSection } from './legislation-section'

/**
 * What this module cannot tell you, stated on the surface rather than buried in
 * a data page.
 *
 * The Constitutional Court item leads because it is the one that can actively
 * mislead: `act_status_events(event_source='ccr')` is 0, so an act whose
 * provision was struck down still renders its Portal status. Everything else
 * here is an under-claim; that one is an over-claim, so it goes first and gets
 * the warning treatment.
 *
 * No measured figure appears here any more (2026-11-20): the CCR decision
 * count is read live (`useLegislationFreshness`) and dropped from the
 * sentence while unknown; the reference, gazette-match and structure shares
 * had no query and were measurements of the previous corpus, so the notes
 * state the limit without a number.
 */
export function LegislationHonestyNotes() {
  const { i18n } = useLingui()
  const { data: freshness } = useLegislationFreshness()
  const ccrCount = freshness?.ccrDecisionCount ?? null

  const notes: ReadonlyArray<{
    key: string
    tone: 'warning' | 'info'
    body: ReactNode
  }> = [
    {
      key: 'ccr',
      tone: 'warning',
      body:
        ccrCount !== null ? (
          <Trans>
            Cele {formatLegalNumber(ccrCount, i18n.locale)} de decizii ale Curții
            Constituționale există ca acte, dar nu modifică statutul actelor pe
            care le vizează. Un articol declarat neconstituțional poate apărea
            în continuare „în vigoare”. Verifică întotdeauna deciziile Curții
            separat.
          </Trans>
        ) : (
          <Trans>
            Deciziile Curții Constituționale există ca acte, dar nu modifică
            statutul actelor pe care le vizează. Un articol declarat
            neconstituțional poate apărea în continuare „în vigoare”. Verifică
            întotdeauna deciziile Curții separat.
          </Trans>
        ),
    },
    {
      key: 'references',
      tone: 'info',
      body: (
        <Trans>
          O parte dintre trimiterile între acte nu se rezolvă la un act anume.
          Acestea apar ca „potrivire posibilă”, niciodată ca legătură fermă.
        </Trans>
      ),
    },
    {
      key: 'gazette-match',
      tone: 'info',
      body: (
        <Trans>
          Nu toate publicările din Monitorul Oficial se leagă cu certitudine de
          un act din Portal Legislativ. Restul rămân publicații de sine
          stătătoare.
        </Trans>
      ),
    },
    {
      key: 'structure',
      tone: 'info',
      body: (
        <Trans>
          Unele documente nu au structură pe articole, deci navigarea pe
          articol nu le acoperă.
        </Trans>
      ),
    },
    {
      key: 'ai',
      tone: 'info',
      body: (
        <Trans>
          Rezumatele pe înțelesul tuturor, domeniile și categoriile sunt generate
          de AI. Sunt un strat explicativ, nu consultanță juridică — textul
          oficial rămâne singura referință.
        </Trans>
      ),
    },
  ]

  return (
    <LegislationSection
      id="legislation-honesty-heading"
      title={t`Ce nu vă putem spune încă`}
      description={t`Limitele acestor date, spuse pe față. Citiți-le înainte să vă bazați pe o concluzie.`}
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
