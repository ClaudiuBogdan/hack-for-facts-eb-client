import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import { DataStatusBadge } from '@/components/data-trust'
import type { LegalActDetail } from '@/schemas/legal'
import { uniqueGazettePublication } from '../lib/act-facts'
import { formatLegalDate } from '../lib/legal-format'
import { isLegalMockEnabled } from '../lib/mock-mode'
import {
  legalActTypeLabel,
  legalGazettePartLabel,
  legalIssuerLabel,
} from '../lib/legal-vocabulary'
import { LegalStatusBadge } from './legal-status-badge'

type Props = {
  readonly act: LegalActDetail
  /**
   * The act's subject, lifted from the text's masthead once it renders
   * ("privind achizițiile publice") — shown under the citation, as the
   * sentence that says what the act is about. `null` until the text loads,
   * or when nothing was lifted.
   */
  readonly textSubject?: string | null
}

/**
 * Rung 0 of the disclosure ladder — the verdict strip.
 *
 * One identity column — status, the citation people actually search for
 * ("Legea nr. 227/2015"), the subject lifted from the text, then the act's
 * facts each under its name (owner, 26 November 2026, the act page's
 * redesign, chosen from a picture of three): what kind of act, who issued
 * it, since when it applies, where it was published. The formal name, the
 * aliases and the corpus line follow as small print. The facts are the same
 * ones, in the same words, that the `·`-joined lines said before.
 *
 * Status leads as an eyebrow above the title because rung 0's question is "what
 * is this, and is it alive" — and "Abrogat parțial" is the half of that answer a
 * reader cannot reconstruct from the citation.
 *
 * **No official-text button anymore** (user decision 2026-08-12): the page now
 * serves the full text itself, so the exit stopped being the page's reason to
 * exist. The route to legislatie.just.ro lives in the summary card's footer on
 * the happy path, and in every render-failure card as the escape hatch.
 *
 * What the page still says, and must keep saying, is narrower — the
 * publication band's PDF marker means an official PDF exists on
 * monitoruloficial.ro, never that we hold its text.
 *
 * The stat chips that used to close this header are gone: they restated the
 * amendment count from the warning below, the citation count from the "Cine îl
 * citează" row and the structure count from "Cum e structurat". Three numbers,
 * each said twice, on the screen with the least room to spare.
 *
 * The trust badge sits next to the status badge, above the fold. In mock mode
 * this page renders two acts copied verbatim from production, which is exactly
 * the case DESIGN.md §Mock-First Contract exists for: data that looks served
 * because it *was* served, on a day that has passed.
 */
export function ActDetailHeader({ act, textSubject = null }: Props) {
  const { i18n } = useLingui()

  const den = act.canonical?.den ?? null
  // The formal name ("LEGE nr. 98 din 19 mai 2016"), shown whenever it says
  // more than the H1 citation does.
  const showDen = den !== null && den !== act.displayCitation
  const isMock = isLegalMockEnabled()

  // The header owns the publication fact now (user decision 2026-08-11: the
  // text's masthead moved up here). Unique matches only — the reader hides
  // the text's own "Publicat în" line only when its issue number AND year
  // match what this line shows, so the fact is stated exactly once, never
  // zero times. The citation body ("nr. 390 (Partea I) din 23 mai 2016") is
  // Romanian legal citation grammar, assembled outside the Lingui message —
  // its connectors are part of the identifier, not translatable prose. The
  // issue number is an identifier too: String(), never the locale group
  // separator.
  const publication = uniqueGazettePublication(act)
  const moCitation =
    publication !== null && publication.issueNumber !== null
      ? [
          `nr. ${String(publication.issueNumber)}`,
          publication.partCode !== null
            ? `(${legalGazettePartLabel(publication.partCode)})`
            : null,
          publication.issueDate !== null
            ? `din ${formatLegalDate(publication.issueDate, i18n.locale)}`
            : null,
        ]
          .filter((part): part is string => part !== null)
          .join(' ')
      : null

  // Each fact under its name. The long one comes last: in the band it is the
  // cell that takes what is left of the row, and wraps.
  const facts = [
    { name: t`Tip`, value: legalActTypeLabel(act.actType) },
    act.issuerSlug ? { name: t`Emitent`, value: legalIssuerLabel(act.issuerSlug) } : null,
    act.entryIntoForce ? { name: t`În vigoare din`, value: formatLegalDate(act.entryIntoForce, i18n.locale) } : null,
    moCitation !== null ? { name: t`Publicat în`, value: t`Monitorul Oficial ${moCitation}`, wide: true } : null,
  ].filter((fact): fact is { name: string; value: string; wide?: boolean } => fact !== null)

  return (
    <header className="border-b-2 border-[var(--pnrr-border)] bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-3 pb-7 sm:px-6 sm:pb-9 lg:px-8 lg:pt-5">
        <Link
          to="/legislation"
          className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:min-h-10"
        >
          <ArrowLeft className="size-4" aria-hidden />
          <Trans>Legislația României</Trans>
        </Link>

        {/* The identity block sits on the SAME grid as the reading layout
            below (user decision 2026-08-11): empty rail column, then the
            content column — so the title, the summary card and the text all
            share one left edge. The breadcrumb above stays at the container
            edge, anchoring the rail column. */}
        <div className="lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-10">
          <div className="hidden lg:block" aria-hidden />
          <div className="mt-2 min-w-0 max-w-[42rem]">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <LegalStatusBadge status={act.status} strong />
              {isMock ? <DataStatusBadge status="mock" /> : null}
            </div>

            <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              {act.displayCitation}
            </h1>

            {textSubject !== null ? (
              <p className="mt-2 text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">
                {textSubject}
              </p>
            ) : null}

            {/* Two facts to a row on a phone, the publication on a row of its
                own (half a phone's width broke it over three lines); from
                `sm` one row, the publication taking what is left. */}
            <dl className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 border-y py-3 sm:grid-cols-[auto_auto_auto_minmax(0,1fr)]">
              {facts.map((fact) => (
                <div key={fact.name} className={fact.wide === true ? 'col-span-2 sm:col-span-1' : undefined}>
                  <dt className="text-xs leading-5 text-muted-foreground">{fact.name}</dt>
                  <dd className="text-sm leading-6 text-foreground">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-3 space-y-0.5 text-sm leading-6 text-muted-foreground">
              {showDen ? <p>{den}</p> : null}
              {act.aliases.length > 0 ? (
                <p>{t`cunoscut și ca ${act.aliases.join(', ')}`}</p>
              ) : null}
              {/* legal_v2 serves identity, versions and text from the rebuilt
                  corpus and BRIDGES the rest from the previous one by act id.
                  One quiet line says so; an act the previous corpus does not
                  hold has no status, links or summary at all, and says that. */}
              {act.dataSource === 'legal_v2' ? (
                <p className="text-xs leading-5">
                  {act.bridgedFields.length > 0 ? (
                    <Trans>
                      Starea, legăturile și rezumatul provin din corpusul anterior.
                    </Trans>
                  ) : (
                    <Trans>
                      Starea, legăturile și rezumatul nu sunt disponibile pentru
                      acest act: corpusul anterior nu îl conține.
                    </Trans>
                  )}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
