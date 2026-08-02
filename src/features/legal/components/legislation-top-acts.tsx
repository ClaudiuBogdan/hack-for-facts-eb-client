import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { LegalActListItem } from '@/schemas/legal'
import { formatLegalNumber } from '../lib/legal-format'
import { legalActTypeLabel, legalIssuerLabel } from '../lib/legal-vocabulary'
import {
  LEGISLATION_ACCENT,
  legislationRowClassName,
} from '../lib/legislation-theme'
import { LegalStatusBadge } from './legal-status-badge'
import { LegislationSection } from './legislation-section'

type Props = {
  readonly acts: readonly LegalActListItem[]
}

/**
 * The most-cited acts, ranked by `in_degree` — the server's default sort, so
 * this band costs a single `legalActs(sort: IN_DEGREE, dir: DESC)` call.
 *
 * It doubles as the beginner entry point: the top of this list is the codes
 * (Fiscal, Muncii, Civil) that most questions eventually land on, and each row
 * opens that act. Proportion is an inline fill bar, not a chart library
 * (DESIGN.md §Reference Patterns).
 *
 * `actType` and `issuerSlug` go through the vocabulary labels rather than being
 * printed raw: they are open vocabularies of slugs, and "lege · parlamentul"
 * is the source's storage format, not something to show a reader.
 */
export function LegislationTopActs({ acts }: Props) {
  const { i18n } = useLingui()
  const max = acts.reduce((peak, act) => Math.max(peak, act.inDegree), 0)

  return (
    <LegislationSection
      id="legislation-top-acts-heading"
      title={t`Actele pe care se sprijină restul legislației`}
      description={t`Ordonate după câte alte acte le citează — cel mai direct semn că un act contează.`}
      bodyClassName="p-0"
      footnote={
        <Trans>
          „Citări primite” numără trimiterile din alte acte către acesta.
          Graful de citări rezolvă 56,9% dintre trimiteri la un act intern;
          restul rămân potriviri posibile.
        </Trans>
      }
    >
      <div className="flex flex-col">
        {acts.map((act, index) => (
          <Link
            key={act.actId}
            to="/legislation/acts/$actId"
            params={{ actId: act.actId }}
            className={legislationRowClassName}
          >
            <span
              className="pointer-events-none absolute inset-y-0 left-0"
              style={{
                width: max > 0 ? `${(act.inDegree / max) * 100}%` : '0%',
                backgroundColor: LEGISLATION_ACCENT,
                opacity: 0.09,
              }}
              aria-hidden
            />
            <span className="relative w-6 shrink-0 text-sm tabular-nums text-[var(--pnrr-muted)]">
              {index + 1}
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="block truncate text-base font-semibold text-[var(--pnrr-fg)]">
                {act.displayCitation}
              </span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--pnrr-muted)]">
                <LegalStatusBadge status={act.status} />
                <span>
                  {[
                    act.actType ? legalActTypeLabel(act.actType) : null,
                    act.issuerSlug ? legalIssuerLabel(act.issuerSlug) : null,
                    act.actYear !== null ? String(act.actYear) : null,
                  ]
                    .filter((part): part is string => part !== null)
                    .join(' · ')}
                </span>
              </span>
            </span>
            <span className="relative shrink-0 text-right">
              <span className="block text-base font-bold tabular-nums text-[var(--pnrr-fg)]">
                {formatLegalNumber(act.inDegree, i18n.locale)}
              </span>
              <span className="block text-[0.7rem] text-[var(--pnrr-muted)]">
                <Trans>citări primite</Trans>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </LegislationSection>
  )
}
