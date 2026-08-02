import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { FileText, FileX2 } from 'lucide-react'
import type { GazetteIssue } from '@/schemas/legal'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import { legalGazettePartLabel } from '../lib/legal-vocabulary'
import {
  LEGISLATION_ACCENT,
  legislationCellClassName,
} from '../lib/legislation-theme'
import { LegislationSection } from './legislation-section'

type Props = {
  readonly issues: readonly GazetteIssue[]
}

/**
 * The latest Monitorul Oficial issues.
 *
 * Copy guardrail (hard): this band may say an **official PDF exists** and
 * nothing more. `MoIssue` carries no `hasFullText`, so "text disponibil" is
 * unsayable — and per-issue act counts are unsayable too, because
 * `MoActPublicationConnection` has no `totalCount`. Both absences are load-
 * bearing: they make it impossible to overclaim what the gazette layer holds.
 */
export function LegislationGazetteBand({ issues }: Props) {
  const { i18n } = useLingui()

  return (
    <LegislationSection
      id="legislation-gazette-heading"
      title={t`Ultimele numere din Monitorul Oficial`}
      description={t`Dovada publicării — de la data apariției în Monitor, un act produce efecte.`}
      bodyClassName="p-0"
      footnote={
        <Trans>
          Marcajul se referă doar la existența PDF-ului oficial, nu la
          disponibilitatea textului. Numerele cele mai recente pot apărea fără
          PDF: descărcarea lor este în curs.
        </Trans>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {issues.map((issue) => {
          const hasPdf = issue.hasEmonitorLink && issue.pdfUrl !== null

          return (
            <div key={issue.moIssueId} className={legislationCellClassName}>
              <div
                className="text-[0.7rem] font-bold uppercase tracking-wider"
                style={{ color: LEGISLATION_ACCENT }}
              >
                {legalGazettePartLabel(issue.partCode)}
              </div>
              <div className="mt-1 text-base font-bold tabular-nums text-[var(--pnrr-fg)]">
                {issue.issueLabel}
              </div>
              <div className="mt-0.5 text-xs text-[var(--pnrr-muted)]">
                {issue.issueDate
                  ? formatLegalDate(issue.issueDate, i18n.locale)
                  : formatLegalNumber(issue.issueYear, i18n.locale)}
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--pnrr-muted)]">
                {hasPdf ? (
                  <>
                    <FileText className="h-3 w-3" aria-hidden />
                    <Trans>PDF oficial disponibil</Trans>
                  </>
                ) : (
                  <>
                    <FileX2 className="h-3 w-3" aria-hidden />
                    <Trans>doar coordonate de publicare</Trans>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </LegislationSection>
  )
}
