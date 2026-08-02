import type { ReactNode } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, Info } from 'lucide-react'
import {
  CCR_DECISION_COUNT,
  GAZETTE_MATCH_RATE,
  GAZETTE_PUBLICATION_COUNT,
  LEGAL_ARTICLE_STRUCTURE_GAP_RATE,
  LEGAL_CORPUS_MEASURED_AT,
  LEGAL_DOCS_WITHOUT_ARTICLE_STRUCTURE,
  LEGAL_REFERENCE_EDGE_COUNT,
  LEGAL_REFERENCE_UNRESOLVED_COUNT,
} from '../lib/legal-coverage'
import {
  formatLegalDate,
  formatLegalNumber,
  formatLegalPercent,
} from '../lib/legal-format'
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
 */
export function LegislationHonestyNotes() {
  const { i18n } = useLingui()
  const number = (value: number) => formatLegalNumber(value, i18n.locale)
  const percent = (value: number) => formatLegalPercent(value, i18n.locale)

  const unresolvedShare =
    LEGAL_REFERENCE_UNRESOLVED_COUNT / LEGAL_REFERENCE_EDGE_COUNT

  const notes: ReadonlyArray<{
    key: string
    tone: 'warning' | 'info'
    body: ReactNode
  }> = [
    {
      key: 'ccr',
      tone: 'warning',
      body: (
        <Trans>
          Cele {number(CCR_DECISION_COUNT)} de decizii ale Curții
          Constituționale există ca acte, dar nu modifică statutul actelor pe
          care le vizează. Un articol declarat neconstituțional poate apărea în
          continuare „în vigoare”. Verifică întotdeauna deciziile Curții separat.
        </Trans>
      ),
    },
    {
      key: 'references',
      tone: 'info',
      body: (
        <Trans>
          Din {number(LEGAL_REFERENCE_EDGE_COUNT)} de trimiteri între acte,{' '}
          {number(LEGAL_REFERENCE_UNRESOLVED_COUNT)} ({percent(unresolvedShare)})
          nu se rezolvă la un act anume. Acestea apar ca „potrivire posibilă”,
          niciodată ca legătură fermă.
        </Trans>
      ),
    },
    {
      key: 'gazette-match',
      tone: 'info',
      body: (
        <Trans>
          Din {number(GAZETTE_PUBLICATION_COUNT)} de publicări în Monitorul
          Oficial, doar {percent(GAZETTE_MATCH_RATE)} se leagă cu certitudine de
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
          Structura pe articole lipsește pentru{' '}
          {number(LEGAL_DOCS_WITHOUT_ARTICLE_STRUCTURE)} de documente (circa{' '}
          {percent(LEGAL_ARTICLE_STRUCTURE_GAP_RATE)} din corpus), deci
          navigarea pe articol nu le acoperă.
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
      footnote={
        <Trans>
          Cifrele de mai sus sunt măsurate pe baza de date de producție la{' '}
          {formatLegalDate(LEGAL_CORPUS_MEASURED_AT, i18n.locale)}.
        </Trans>
      }
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
