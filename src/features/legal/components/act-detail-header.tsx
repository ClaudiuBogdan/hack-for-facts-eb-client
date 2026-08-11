import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
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
import { legislationHeaderMetaClassName } from '../lib/legislation-theme'
import { LegalStatusBadge } from './legal-status-badge'

type Props = {
  readonly act: LegalActDetail
  /**
   * The act's subject, lifted from the text's masthead once it renders
   * ("privind achizițiile publice") — appended to the den line, restoring
   * the one sentence the portal splits across two blocks. `null` until the
   * text loads, or when nothing was lifted.
   */
  readonly textSubject?: string | null
}

/**
 * Rung 0 of the disclosure ladder — the verdict strip.
 *
 * One identity column — status, the citation people actually search for
 * ("Legea nr. 227/2015"), the formal name with the lifted subject, one line
 * of classification, and the Monitorul Oficial line. Everything short enough
 * to share a line does: act type, issuer, entry into force and the aliases
 * are one `·`-joined line rather than four.
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
  // The den line: "LEGE nr. 98 din 19 mai 2016" + the subject lifted from
  // the text's masthead ("privind achizițiile publice") — one sentence
  // again. Shown whenever it says more than the H1 citation does.
  const denLine =
    den !== null && textSubject !== null ? `${den} ${textSubject}` : den
  const showDen = denLine !== null && denLine !== act.displayCitation
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

  const classification = [
    legalActTypeLabel(act.actType),
    act.issuerSlug ? legalIssuerLabel(act.issuerSlug) : null,
    act.entryIntoForce
      ? t`în vigoare din ${formatLegalDate(act.entryIntoForce, i18n.locale)}`
      : null,
    act.aliases.length > 0
      ? t`cunoscut și ca ${act.aliases.join(', ')}`
      : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')

  return (
    <header className="border-b-2 border-[var(--pnrr-border)] bg-background">
      <div className="mx-auto max-w-7xl px-4 pt-5 pb-6 sm:px-6 sm:pt-6 lg:px-8">
        <Link
          to="/legislation"
          className="inline-flex items-center gap-1 text-sm text-[var(--pnrr-muted)] underline-offset-2 hover:underline"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          <Trans>Legislația României</Trans>
        </Link>

        {/* The identity block sits on the SAME grid as the reading layout
            below (user decision 2026-08-11): empty rail column, then the
            content column — so the title, the summary card and the text all
            share one left edge. The breadcrumb above stays at the container
            edge, anchoring the rail column. */}
        <div className="lg:grid lg:grid-cols-[290px_minmax(0,1fr)] lg:gap-10">
          <div className="hidden lg:block" aria-hidden />
          <div className="mt-4 min-w-0">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <LegalStatusBadge status={act.status} />
                {isMock ? <DataStatusBadge status="mock" /> : null}
              </div>

              <h1 className="mt-2.5 max-w-3xl text-balance text-[clamp(1.75rem,4vw,3rem)] font-black leading-[0.95] tracking-tight text-[var(--pnrr-fg)]">
                {act.displayCitation}
              </h1>

              {showDen ? (
                <p className="mt-2 max-w-3xl text-base leading-6 text-[var(--pnrr-fg)]">
                  {denLine}
                </p>
              ) : null}

              {classification ? (
                <p className={cn(legislationHeaderMetaClassName, 'mt-2 text-sm')}>
                  {classification}
                </p>
              ) : null}

              {moCitation !== null ? (
                <p className={cn(legislationHeaderMetaClassName, 'mt-1 text-sm')}>
                  <Trans>Publicat în Monitorul Oficial {moCitation}</Trans>
                </p>
              ) : null}
            </div>

          </div>
        </div>
      </div>
    </header>
  )
}
