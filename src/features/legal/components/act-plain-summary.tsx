import { useState } from 'react'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Sparkles } from 'lucide-react'
import type { LegalActSummaryData } from '@/schemas/legal'
import { formatLegalPercent } from '../lib/legal-format'
import {
  legislationLinkClassName,
  legislationSectionClassName,
} from '../lib/legislation-theme'

type Props = {
  readonly summary: LegalActSummaryData
}

/**
 * Rung 1 — the lead block. Decided 2026-08-01 over a status-first and an
 * audience-first opening.
 *
 * `plainLanguageSummary` is the only field on the page that is both present for
 * ~100% of acts and always substantial (400–800 characters). It is also the only
 * one a first-time reader can use without knowing any law.
 *
 * The formal `description` is a second register of the same content, so it is a
 * disclosure rather than a second paragraph — showing both by default would read
 * as repetition.
 *
 * This text is generated, and the page never lets it pass as the law itself.
 */
export function ActPlainSummary({ summary }: Props) {
  const { i18n } = useLingui()
  const [showFormal, setShowFormal] = useState(false)

  const plain = summary.plainLanguageSummary
  if (plain === null) return null

  const hasFormal =
    summary.description !== null && summary.description !== plain

  return (
    <section
      aria-labelledby="act-plain-summary-heading"
      className={legislationSectionClassName}
    >
      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <h2
          id="act-plain-summary-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]"
        >
          <Trans>Ce spune, pe scurt</Trans>
        </h2>
        <p className="mt-3 max-w-[46rem] text-lg leading-8 text-[var(--pnrr-fg)]">
          {plain}
        </p>

        {hasFormal ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowFormal((open) => !open)}
              className={legislationLinkClassName}
              aria-expanded={showFormal}
              aria-controls="act-formal-description"
            >
              {showFormal
                ? t`Ascunde descrierea oficială`
                : t`Vezi descrierea în limbaj juridic`}
            </button>
            {showFormal ? (
              <p
                id="act-formal-description"
                className="mt-3 max-w-[46rem] border-l-2 border-[var(--pnrr-track)] pl-4 text-base leading-7 text-[var(--pnrr-muted)]"
              >
                {summary.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t-2 border-[var(--pnrr-border)] px-5 py-2.5 text-xs text-[var(--pnrr-muted)] sm:px-6">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          <Trans>
            Rezumat generat de AI din textul actului. Este un strat explicativ,
            nu textul legii și nu consultanță juridică.
          </Trans>
        </span>
        {summary.confidence !== null ? (
          <span className="tabular-nums">
            <Trans>
              Încredere {formatLegalPercent(summary.confidence, i18n.locale)}.
            </Trans>
          </span>
        ) : null}
      </div>
    </section>
  )
}
