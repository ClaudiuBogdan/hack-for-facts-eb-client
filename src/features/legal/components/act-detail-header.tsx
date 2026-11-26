import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft, ArrowUpRight } from 'lucide-react'
import { DataStatusBadge } from '@/components/data-trust'
import { cn } from '@/lib/utils'
import type { LegalActDetail } from '@/schemas/legal'
import { originalPortalUrl, uniqueGazettePublication, webAddress } from '../lib/act-facts'
import { formatLegalDate } from '../lib/legal-format'
import { isLegalMockEnabled } from '../lib/mock-mode'
import {
  legalActTypeLabel,
  legalGazettePartLabel,
  legalIssuerLabel,
} from '../lib/legal-vocabulary'
import { LegalStatusBadge } from './legal-status-badge'
import { ACT_COLUMN, ACT_GRID, ACT_GRID_THREE, ACT_LINK, ACT_TITLE_ID } from './reader/act-page-grid'

/** A page where a fact can be read at its source. */
type Source = { readonly href: string; readonly label: string }
type Fact = { readonly name: string; readonly value: string; readonly wide?: boolean; readonly sources?: readonly Source[] }

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
 * Under „Publicat în" the publication can be read at its two sources (owner,
 * 26 November 2026): the Portal's page of the act as published, and the
 * gazette issue's page. Named by the site they open, with no claim on what
 * either holds.
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
  // A citation that already is the formal name with the subject (an act with
  // no number: "REGULAMENT privind …") says all of it: neither is repeated.
  const citationSaysAll = den !== null && textSubject !== null && `${den} ${textSubject}` === act.displayCitation
  const showDen = den !== null && den !== act.displayCitation && !citationSaysAll
  const showSubject = textSubject !== null && !citationSaysAll
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

  // Where the publication can be read at its sources (owner, 26 November 2026): the Portal's page of the act as
  // published, and the gazette issue's page on monitoruloficial.ro. Only under the publication the head states (the
  // one sure match), and only a link that is served; the Portal's page only when it is the text that issue printed.
  const portalUrl = publication === null ? null : originalPortalUrl(act, publication)
  const gazetteUrl = webAddress(publication?.pdfUrl ?? null)
  const sources = [
    portalUrl !== null ? { href: portalUrl, label: t`Portalul legislativ` } : null,
    gazetteUrl !== null ? { href: gazetteUrl, label: t`Monitorul Oficial` } : null,
  ].filter((source): source is Source => source !== null)

  const actType = act.actType.trim()
  // Each fact under its name. The long one comes last: in the band it is the
  // cell that takes what is left of the row, and wraps.
  const candidates: readonly (Fact | null)[] = [
    // An act served without a type (or with blanks for one) has no „Tip" to show: never a name over nothing.
    actType !== '' ? { name: t`Tip`, value: legalActTypeLabel(actType) } : null,
    act.issuerSlug ? { name: t`Emitent`, value: legalIssuerLabel(act.issuerSlug) } : null,
    act.entryIntoForce ? { name: t`În vigoare din`, value: formatLegalDate(act.entryIntoForce, i18n.locale) } : null,
    moCitation !== null ? { name: t`Publicat în`, value: t`Monitorul Oficial ${moCitation}`, wide: true, sources } : null,
  ]
  const facts = candidates.filter((fact): fact is Fact => fact !== null)

  return (
    // On the page's one grid (owner, 26 November 2026, the act page's
    // redesign): the back link in the contents' column, the identity in the
    // reading column, and from 88rem the facts in the third column, one under
    // the other, above the box about the text shown. The facts are ONE list,
    // moved by grid placement: they are said once at any width. No rule under
    // the head: the reading bar's own border closes it.
    <header className={cn(ACT_GRID, ACT_GRID_THREE, 'bg-background pb-7 pt-4 sm:pb-9 lg:pt-8')}>
      <Link
        to="/legislation"
        className="inline-flex min-h-11 items-center gap-1.5 self-start text-sm text-muted-foreground hover:text-foreground justify-self-start sm:min-h-10 lg:col-start-1 lg:row-start-1 lg:-mt-2.5"
      >
        <ArrowLeft className="size-4" aria-hidden />
        <Trans>Legislația României</Trans>
      </Link>

      <div className={cn(ACT_COLUMN, 'lg:col-start-2 lg:row-start-1')}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LegalStatusBadge status={act.status} strong />
          {isMock ? <DataStatusBadge status="mock" /> : null}
        </div>

        {/* Takes the focus when the reader comes back to the act's start. */}
        <h1
          id={ACT_TITLE_ID}
          tabIndex={-1}
          className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-foreground outline-none sm:text-4xl"
        >
          {act.displayCitation}
        </h1>

        {showSubject ? (
          <p className="mt-2 text-lg leading-7 text-muted-foreground sm:text-xl sm:leading-8">
            {textSubject}
          </p>
        ) : null}
      </div>

      {/* Two facts to a row on a phone, the publication on a row of its own
          (half a phone's width broke it over three lines). From `sm` they run
          on one row and wrap: a long issuer takes a row of its own and wraps
          inside it, the publication takes what is left and never falls under
          one word's width. From 88rem: one under the other, at the third
          column's foot, on the side box's inner edge. No facts, no band. */}
      {facts.length > 0 ? (
        <dl
          className={cn(
            ACT_COLUMN,
            'mt-5 grid grid-cols-2 gap-x-8 gap-y-3 border-y py-3 sm:flex sm:flex-wrap lg:col-start-2 lg:row-start-2',
            'min-[88rem]:col-start-3 min-[88rem]:row-span-3 min-[88rem]:row-start-1 min-[88rem]:mt-0 min-[88rem]:block min-[88rem]:max-w-none min-[88rem]:space-y-2.5 min-[88rem]:self-end min-[88rem]:border-y-0 min-[88rem]:px-3 min-[88rem]:py-0',
          )}
        >
          {facts.map((fact) => (
            <div key={fact.name} className={cn(
                // A value with no place to break (an issuer we have no name for is shown by its slug) breaks anywhere
                // rather than run past the column.
                'min-w-0 [overflow-wrap:anywhere]',
                fact.wide === true && 'col-span-2 sm:min-w-[min(100%,14rem)] sm:flex-1',
              )}
            >
              <dt className="text-xs leading-5 text-muted-foreground">{fact.name}</dt>
              <dd className="text-sm leading-6 text-foreground min-[88rem]:leading-5">
                {fact.sources !== undefined && fact.sources.length > 0 ? (
                  <>
                    <span className="block">{fact.value}</span>
                    {/* They leave the site: the site's blue and the arrow out, as every way out of this page. */}
                    <span className="flex flex-wrap gap-x-4 sm:mt-1 sm:gap-y-1 [overflow-wrap:normal]">
                      {fact.sources.map((source) => (
                        <a
                          key={source.href}
                          href={source.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(ACT_LINK, 'inline-flex min-h-11 items-center whitespace-nowrap sm:min-h-6')}
                        >
                          {source.label}
                          <ArrowUpRight className="ml-0.5 size-3.5" aria-hidden />
                        </a>
                      ))}
                    </span>
                  </>
                ) : (
                  fact.value
                )}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className={cn(ACT_COLUMN, 'mt-3 space-y-0.5 text-sm leading-6 text-muted-foreground empty:hidden lg:col-start-2 lg:row-start-3')}>
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
    </header>
  )
}
