import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle } from 'lucide-react'
import type { LegalActSummaryData } from '@/schemas/legal'
import { legalDomainLabelLoose } from '../lib/legal-domains'
import { legalAudienceLabel } from '../lib/legal-vocabulary'
import {
  LEGISLATION_ACCENT,
  legislationLinkClassName,
} from '../lib/legislation-theme'
import { LegislationSection } from './legislation-section'

type Props = {
  readonly summary: LegalActSummaryData
}

const CHIP_CLASS =
  'inline-flex items-center rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 py-1.5 text-sm font-semibold text-[var(--pnrr-fg)]'

const SOFT_CHIP_CLASS =
  'inline-flex items-center rounded-none border border-[var(--pnrr-track)] px-2.5 py-1 text-xs text-[var(--pnrr-muted)]'

/**
 * Rung 2 — "does this concern me?", answered without making the reader parse
 * the summary.
 *
 * Audiences get the heavier chip because that is the question people actually
 * arrive with; domains and keywords are navigation aids and stay quiet.
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
    <LegislationSection
      id="act-relevance-heading"
      title={t`Pe cine privește`}
      footnote={
        <Trans>
          Categoriile, domeniile și cuvintele-cheie sunt atribuite automat de un
          model pe baza textului actului — nu sunt o clasificare legală.
        </Trans>
      }
    >
      <div className="flex flex-col gap-5">
        {hasAudiences ? (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]">
              <Trans>Te privește dacă ești</Trans>
            </h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {summary.affectedAudiences.map((slug) => (
                <span key={slug} className={CHIP_CLASS}>
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
                <span
                  key={slug}
                  className="inline-flex items-center rounded-none border-l-4 bg-[var(--pnrr-hover)] px-2.5 py-1 text-sm text-[var(--pnrr-fg)]"
                  style={{ borderLeftColor: LEGISLATION_ACCENT }}
                >
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
                className="mt-3 max-w-[46rem] border-l-2 border-[var(--pnrr-track)] pl-4 text-sm leading-7 text-[var(--pnrr-fg)]"
              >
                {summary.fiscalImpact}
              </p>
            ) : null}
          </div>
        ) : null}

        {hasKeywords ? (
          <div className="flex flex-wrap gap-1.5">
            {summary.keywords.slice(0, 12).map((keyword) => (
              <span key={keyword} className={SOFT_CHIP_CLASS}>
                {keyword}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </LegislationSection>
  )
}
