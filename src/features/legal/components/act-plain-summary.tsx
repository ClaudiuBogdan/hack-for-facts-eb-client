import { useLayoutEffect, useRef, useState } from 'react'
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
  /**
   * The warnings that qualify this summary, rendered as compact footer rows
   * between the prose and the AI-provenance row (user decision 2026-08-11:
   * one card, not three stacked elements). Rows draw their own separators.
   */
  readonly qualifiers?: React.ReactNode
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
 *
 * The summary CLAMPS to a few lines with a fade (user decision 2026-08-11: the
 * page's main content is the text of the act, and a 700-character lead pushed
 * it below the fold). "Citește tot" appears only when the clamp actually hides
 * something — at this measure a short summary fits whole, and a button that
 * toggles nothing teaches the reader to ignore buttons. The AI-provenance
 * footer never clamps: the generated-text disclosure is not expendable chrome.
 */
export function ActPlainSummary({ summary, qualifiers }: Props) {
  const { i18n } = useLingui()
  const [showFormal, setShowFormal] = useState(false)
  const [expanded, setExpanded] = useState(false)
  // `null` = not yet measured. The distinction matters on the first paint
  // (and under SSR, where no measurement ever runs): an unmeasured summary
  // must be treated as possibly-clamped — fade shown, formal disclosure
  // withheld — or the pre-hydration frame exposes end-of-summary controls
  // above text that is visibly cut.
  const [clamps, setClamps] = useState<boolean | null>(null)
  const proseRef = useRef<HTMLParagraphElement | null>(null)

  const plain = summary.plainLanguageSummary

  // Whether the clamp hides anything is a fact about THIS summary at THIS
  // measure — measured, not assumed. Re-measured on resize because the line
  // count changes with the column width. NOT measured while expanded: the
  // unclamped paragraph never overflows, so measuring it would flip `clamps`
  // to false and dissolve the collapse control mid-read.
  useLayoutEffect(() => {
    if (plain === null || expanded) return
    const el = proseRef.current
    if (el === null) return
    const measure = () => {
      setClamps(el.scrollHeight > el.clientHeight + 1)
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [plain, expanded])

  if (plain === null) return null

  const hasFormal =
    summary.description !== null && summary.description !== plain

  // Fully readable: expanded, or measured and proven not to overflow.
  const open = expanded || clamps === false

  return (
    <section
      aria-labelledby="act-plain-summary-heading"
      className={legislationSectionClassName}
    >
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        <h2
          id="act-plain-summary-heading"
          className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]"
        >
          <Trans>Ce spune, pe scurt</Trans>
        </h2>
        <div className="relative">
          <p
            id="act-plain-summary-prose"
            ref={proseRef}
            className={
              expanded
                ? 'mt-3 max-w-[46rem] text-base leading-7 text-[var(--pnrr-fg)]'
                : 'mt-3 line-clamp-4 max-w-[46rem] text-base leading-7 text-[var(--pnrr-fg)]'
            }
          >
            {plain}
          </p>
          {/* One line's worth of fade (leading-7 = 28px): taller washes out
              whole lines and reads as disabled text, not "continues below". */}
          {!open && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-[var(--pnrr-card)] to-transparent"
            />
          )}
        </div>

        {/* The toggle keys off `expanded`, never off a re-measure: expanding
            is what removes the overflow, so `clamps` cannot be the witness
            that collapsing is still possible. */}
        {expanded ? (
          <button
            type="button"
            onClick={() => setExpanded(false)}
            aria-expanded="true"
            aria-controls="act-plain-summary-prose"
            className={`${legislationLinkClassName} mt-2`}
          >
            <Trans>Arată mai puțin</Trans>
          </button>
        ) : clamps === true ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            aria-expanded="false"
            aria-controls="act-plain-summary-prose"
            className={`${legislationLinkClassName} mt-2`}
          >
            <Trans>Citește tot rezumatul</Trans>
          </button>
        ) : null}

        {/* Gated on `open`, not `expanded`: a short summary never clamps and
            never sets `expanded`, yet its formal register must stay reachable. */}
        {open && hasFormal ? (
          <div className="mt-4">
            <button
              type="button"
              onClick={() => setShowFormal((openFormal) => !openFormal)}
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
                className="mt-3 max-w-[46rem] border-l-2 border-[var(--pnrr-subtle)] pl-4 text-base leading-7 text-[var(--pnrr-muted)]"
              >
                {summary.description}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {qualifiers}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--pnrr-subtle)] px-5 py-2.5 text-xs text-[var(--pnrr-muted)] sm:px-6">
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
