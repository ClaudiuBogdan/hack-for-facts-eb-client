import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Plural, Trans } from '@lingui/react/macro'
import { Check, ChevronDown, Copy, ExternalLink } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LegalActDetail } from '@/schemas/legal'
import { formatLegalDate } from '../lib/legal-format'
import {
  legalAudienceLabel,
  legalGazettePartLabel,
  legalStatusLabel,
} from '../lib/legal-vocabulary'
import { legislationStatLabelClassName } from '../lib/legislation-theme'

type Props = {
  readonly act: LegalActDetail
  /** Whether the page above actually serves this act's text right now. */
  readonly textServed: boolean
}

type FaqEntry = {
  readonly key: string
  readonly question: string
  readonly answer: ReactNode
}

/**
 * "Întrebări frecvente" — the end of the page, in plain question form.
 *
 * Every answer is assembled from fields the page already serves (status,
 * entry into force, amendment count, MO publication, the AI summary's
 * audience/penalty reads) — a question with no data behind it does not
 * render, so the section never pads itself with boilerplate. The questions
 * exist because they are what people actually type into a search engine
 * about a law; the fișa above answers them too, but in *our* vocabulary,
 * not theirs.
 *
 * Answers derived from the AI summary (audiences, penalties) say so inline —
 * same honesty rule as the relevance band.
 */
function CitationAnswer({
  citation,
  den,
}: {
  readonly citation: string
  readonly den: string | null
}) {
  const [copied, setCopied] = useState(false)
  return (
    <>
      <p className="flex items-center gap-2 font-medium text-[var(--pnrr-fg)]">
        {citation}
        <button
          type="button"
          onClick={() => {
            // `navigator.clipboard` is undefined in insecure contexts — the
            // dereference itself throws before any .catch could run.
            if (typeof navigator.clipboard?.writeText !== 'function') return
            navigator.clipboard
              .writeText(citation)
              .then(() => {
                setCopied(true)
                window.setTimeout(() => setCopied(false), 2000)
              })
              .catch(() => undefined)
          }}
          aria-label={t`Copiază citarea`}
          className="inline-flex items-center gap-1 rounded-none border border-[var(--pnrr-subtle)] px-1.5 py-0.5 text-xs text-[var(--pnrr-muted)] transition-colors hover:bg-[var(--pnrr-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
        >
          {copied ? (
            <>
              <Check className="size-3" aria-hidden />
              <Trans>copiat</Trans>
            </>
          ) : (
            <>
              <Copy className="size-3" aria-hidden />
              <Trans>copiază</Trans>
            </>
          )}
        </button>
      </p>
      {den !== null && den !== citation && (
        <p className="mt-1 text-[var(--pnrr-muted)]">{den}</p>
      )}
    </>
  )
}

export function ActFaqBand({ act, textServed }: Props) {
  const { i18n } = useLingui()
  const citation = act.displayCitation
  const date = (value: string) => formatLegalDate(value, i18n.locale)

  // Only a UNIQUELY resolved act↔issue join earns a definite "publicat în"
  // claim — the publication band labels every other resolution as probable,
  // and an FAQ answer must not be more certain than the band it summarizes.
  const publication =
    act.gazettePublications.find(
      (pub) => pub.resolution === 'unique' && pub.issueNumber !== null,
    ) ?? null
  const audiences = act.summary?.affectedAudiences ?? []
  const penalties = act.summary?.penaltiesMentioned ?? null
  const den = act.canonical?.den ?? null

  const entries: readonly FaqEntry[] = [
    {
      key: 'in-force',
      question: t`Mai este în vigoare ${citation}?`,
      answer: (
        <>
          <p>
            <Trans>
              Statutul înregistrat în Portal Legislativ este
              „{legalStatusLabel(act.status)}”.
            </Trans>{' '}
            {act.entryIntoForce !== null && (
              <Trans>A intrat în vigoare la {date(act.entryIntoForce)}.</Trans>
            )}
          </p>
          {act.amendedAfterPublication > 0 && (
            <p className="mt-2">
              <Trans>
                Atenție: a fost modificat{' '}
                <Plural
                  value={act.amendedAfterPublication}
                  one="o dată"
                  few="de # ori"
                  other="de # de ori"
                />{' '}
                de la publicare, iar statutul nu ține cont de deciziile Curții
                Constituționale.
              </Trans>
            </p>
          )}
        </>
      ),
    },
    ...(audiences.length > 0
      ? [
          {
            key: 'audiences',
            question: t`Pe cine privește acest act?`,
            answer: (
              <p>
                <Trans>
                  Conform rezumatului generat automat, actul privește:{' '}
                  {audiences.map((slug) => legalAudienceLabel(slug)).join(', ')}.
                </Trans>
              </p>
            ),
          },
        ]
      : []),
    ...(penalties === true
      ? [
          {
            key: 'penalties',
            question: t`Prevede sancțiuni sau amenzi?`,
            answer: (
              <p>
                <Trans>
                  Rezumatul generat automat a identificat mențiuni de sancțiuni
                  în text — nu neapărat sancțiuni pe care actul le instituie.
                  Verifică articolele relevante în textul de mai sus pentru
                  cuantum și condiții.
                </Trans>
              </p>
            ),
          },
        ]
      : []),
    ...(publication !== null && publication.issueNumber !== null
      ? [
          {
            key: 'publication',
            question: t`Unde a fost publicat oficial?`,
            answer: (
              <>
                <p>
                  <Trans>
                    În Monitorul Oficial
                    {publication.partCode !== null
                      ? ` (${legalGazettePartLabel(publication.partCode)})`
                      : ''}{' '}
                    {/* An issue number is an identifier, not a quantity —
                        never through the locale group separator. */}
                    nr. {String(publication.issueNumber)}
                    {publication.issueYear !== null
                      ? `/${String(publication.issueYear)}`
                      : ''}
                    {publication.issueDate !== null
                      ? `, din ${date(publication.issueDate)}`
                      : ''}
                    . Forma autentică este cea tipărită acolo.
                  </Trans>
                </p>
                {act.gazettePublications.length > 1 && (
                  <p className="mt-2">
                    <Trans>
                      Actul are și alte apariții înregistrate în Monitor
                      (republicări sau rectificări) — vezi fișa actului.
                    </Trans>
                  </p>
                )}
              </>
            ),
          },
        ]
      : []),
    {
      key: 'citation',
      question: t`Cum citez corect acest act?`,
      answer: <CitationAnswer citation={citation} den={den} />,
    },
    {
      key: 'official',
      question: t`Textul de pe această pagină este cel oficial?`,
      answer: (
        <>
          <p>
            {textServed ? (
              <Trans>
                Textul este reprodus caracter cu caracter din Portal
                Legislativ, în forma publicată — nu o consolidare la zi. Forma
                autentică rămâne cea din Monitorul Oficial.
              </Trans>
            ) : (
              // The fidelity claim belongs only next to a text we actually
              // display — beside a failure card it would describe nothing.
              <Trans>
                Pentru această expresie nu afișăm încă un corp de text. Forma
                autentică este cea din Monitorul Oficial.
              </Trans>
            )}
          </p>
          {act.officialTextUrl !== null && (
            <p className="mt-2">
              <a
                href={act.officialTextUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2"
              >
                <Trans>Compară cu textul de pe legislatie.just.ro</Trans>
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </p>
          )}
        </>
      ),
    },
  ]

  return (
    <section
      id="act-faq"
      aria-labelledby="act-faq-heading"
      className="mt-12 scroll-mt-24"
    >
      <div className="border-b-2 border-[var(--pnrr-border)] pb-3">
        <h2
          id="act-faq-heading"
          className="text-3xl font-black tracking-tight text-[var(--pnrr-fg)]"
        >
          <Trans>Întrebări frecvente</Trans>
        </h2>
        <p className={`${legislationStatLabelClassName} mt-1 normal-case`}>
          <Trans>
            Răspunsuri pe scurt, din datele acestui act — nu consultanță
            juridică.
          </Trans>
        </p>
      </div>

      <div className="divide-y divide-[var(--pnrr-subtle)]">
        {entries.map((entry) => (
          <details key={entry.key} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 text-base font-semibold text-[var(--pnrr-fg)] [&::-webkit-details-marker]:hidden">
              {entry.question}
              <ChevronDown
                className="size-4 shrink-0 text-[var(--pnrr-muted)] transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="max-w-prose pb-4 text-sm leading-6 text-[var(--pnrr-muted)]">
              {entry.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
