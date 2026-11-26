import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalActSummaryData } from '@/schemas/legal'
import { legalDomainLabelLoose } from '../lib/legal-domains'
import { legalAudienceLabel } from '../lib/legal-vocabulary'
import { ActAccordionItem } from './act-accordion'
import { ACT_RECORD_LINE, ACT_RECORD_MORE } from './reader/act-page-grid'

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
 * meant one kind of thing at three levels of importance. Now they are plain
 * text in the record's two columns (owner, 26 November 2026: no tinted chips),
 * the label at the left, the values at the right, and weight says the level:
 * the audiences in medium weight, the domains plain, the keywords — the act's
 * index terms, read as a line, not scanned — in the muted colour.
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
      <div className="divide-y">
        {hasAudiences ? (
          <div className={ACT_RECORD_LINE}>
            <h4 className="text-muted-foreground">
              <Trans>Te privește dacă ești</Trans>
            </h4>
            <ul>
              {summary.affectedAudiences.map((slug) => (
                <li key={slug} className="font-medium">
                  {legalAudienceLabel(slug)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {hasDomains ? (
          <div className={ACT_RECORD_LINE}>
            <h4 className="text-muted-foreground">
              <Trans>Domenii</Trans>
            </h4>
            <ul>
              {summary.domains.map((slug) => (
                <li key={slug}>{legalDomainLabelLoose(slug)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {summary.penaltiesMentioned === true ? (
          <p className="flex items-center gap-2 py-2 font-medium">
            <AlertTriangle
              className="size-4 shrink-0 text-status-partial-fg"
              aria-hidden
            />
            <Trans>Actul prevede sancțiuni.</Trans>
          </p>
        ) : null}

        {summary.fiscalImpact !== null ? (
          <div className="pb-1">
            <button
              type="button"
              onClick={() => setShowFiscal((open) => !open)}
              className={ACT_RECORD_MORE}
              aria-expanded={showFiscal}
              aria-controls={showFiscal ? 'act-fiscal-impact' : undefined}
            >
              {showFiscal ? t`Ascunde impactul fiscal` : t`Vezi impactul fiscal`}
            </button>
            {showFiscal ? (
              <p
                id="act-fiscal-impact"
                className="mb-2 mt-1 max-w-prose border-l-2 border-border pl-4"
              >
                {summary.fiscalImpact}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasKeywords ? (
          <p className={cn(ACT_RECORD_LINE, 'text-muted-foreground')}>
            <span>
              <Trans>Cuvinte-cheie</Trans>
            </span>
            <span>{summary.keywords.slice(0, KEYWORD_LIMIT).join(' · ')}</span>
          </p>
        ) : null}
      </div>
    </ActAccordionItem>
  )
}
