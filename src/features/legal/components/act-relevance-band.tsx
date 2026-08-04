import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalActSummaryData } from '@/schemas/legal'
import { legalDomainLabelLoose } from '../lib/legal-domains'
import { legalAudienceLabel } from '../lib/legal-vocabulary'
import {
  LEGISLATION_ACCENT,
  legislationChipClassName,
  legislationLinkClassName,
  legislationQuietChipClassName,
} from '../lib/legislation-theme'
import { ActAccordionItem } from './act-accordion'

type Props = {
  readonly summary: LegalActSummaryData
}

/** Enough to show what the act is indexed under; past this it is a tag cloud. */
const KEYWORD_LIMIT = 12

/**
 * Rung 2 — "does this concern me?", answered without making the reader parse
 * the summary.
 *
 * Three taxonomies live here — audiences, domains, keywords — and they used to
 * arrive in three different chip shapes, so the reader had to work out whether
 * a 2px border, an accent bar and a hairline meant three kinds of thing. They
 * meant one kind of thing at three levels of importance, which is what fill
 * weight says without inventing a shape for it. Keywords drop out of chips
 * entirely: they are the act's index terms, read as a line, not scanned.
 *
 * **The audiences are the row's description, so the relevance check survives
 * the row being closed.** This rung's whole job is to answer "does this concern
 * me" without work, and a reader who has to open something to find out has
 * already done the work. Closed, the row reads
 * "Pe cine privește · cetățeni · firme · ONG-uri"; open, it adds the domains,
 * the sanctions flag, the fiscal impact and the index terms.
 *
 * `fiscalImpact` exists for only 25% of acts and runs long when it does, so it
 * is a disclosure rather than a paragraph.
 */
export function ActRelevanceBand({ summary }: Props) {
  const [showFiscal, setShowFiscal] = useState(false)

  const hasAudiences = summary.affectedAudiences.length > 0
  const hasDomains = summary.domains.length > 0
  const hasKeywords = summary.keywords.length > 0

  if (!hasAudiences && !hasDomains && !hasKeywords) return null

  return (
    <ActAccordionItem
      id="act-relevance-heading"
      title={t`Pe cine privește`}
      description={
        hasAudiences
          ? summary.affectedAudiences.map(legalAudienceLabel).join(' · ')
          : undefined
      }
      footnote={
        <Trans>
          Categoriile, domeniile și cuvintele-cheie sunt atribuite automat de un
          model pe baza textului actului — nu sunt o clasificare legală.
        </Trans>
      }
    >
      <div className="flex flex-col gap-5 px-5 py-5 sm:px-6">
        {hasAudiences ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
              <Trans>Te privește dacă ești</Trans>
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {summary.affectedAudiences.map((slug) => (
                <span
                  key={slug}
                  className={cn(legislationChipClassName, 'font-semibold')}
                >
                  {legalAudienceLabel(slug)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {hasDomains ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
              <Trans>Domenii</Trans>
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {summary.domains.map((slug) => (
                <span key={slug} className={legislationQuietChipClassName}>
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: LEGISLATION_ACCENT }}
                    aria-hidden
                  />
                  {legalDomainLabelLoose(slug)}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {summary.penaltiesMentioned === true ? (
          <p className="flex items-center gap-2 text-sm font-medium text-[var(--pnrr-fg)]">
            <AlertTriangle
              className="h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
              aria-hidden
            />
            <Trans>Actul prevede sancțiuni.</Trans>
          </p>
        ) : null}

        {summary.fiscalImpact !== null ? (
          <div>
            <button
              type="button"
              onClick={() => setShowFiscal((open) => !open)}
              className={legislationLinkClassName}
              aria-expanded={showFiscal}
              aria-controls="act-fiscal-impact"
            >
              {showFiscal ? t`Ascunde impactul fiscal` : t`Vezi impactul fiscal`}
            </button>
            {showFiscal ? (
              <p
                id="act-fiscal-impact"
                className="mt-3 max-w-[46rem] border-l-2 border-[var(--pnrr-subtle)] pl-4 text-sm leading-7 text-[var(--pnrr-fg)]"
              >
                {summary.fiscalImpact}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasKeywords ? (
          <p className="text-xs leading-6 text-[var(--pnrr-muted)]">
            <span className="font-semibold uppercase tracking-wide">
              <Trans>Cuvinte-cheie</Trans>
            </span>{' '}
            {summary.keywords.slice(0, KEYWORD_LIMIT).join(' · ')}
          </p>
        ) : null}
      </div>
    </ActAccordionItem>
  )
}
