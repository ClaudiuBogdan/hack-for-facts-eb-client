import { useLayoutEffect, useRef, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { ExternalLink, Sparkles } from 'lucide-react'
import type { LegalActSummaryData } from '@/schemas/legal'
import { cleanSummaryText } from '../lib/act-facts'
import {
  legislationLinkClassName,
  legislationSectionClassName,
} from '../lib/legislation-theme'

type Props = {
  readonly summary: LegalActSummaryData
  /**
   * The route to the official record, shown in the AI-provenance footer —
   * its one home on the happy path now (user decision 2026-08-12: the
   * header button is gone). Failure cards keep their own escape hatch.
   */
  readonly officialTextUrl?: string | null
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
 * Two registers of the same generated content, BOTH visible, in reading
 * order (user decision 2026-08-12): the formal one-two sentence
 * `description` opens the card — what the act regulates, in the law's own
 * vocabulary, and usually the only place naming the EU source directive —
 * then, past a full-bleed hairline (the card's one separator language), the
 * `plainLanguageSummary` a first-time reader can use without knowing any
 * law. Yes, the two overlap — that repetition is the accepted price of
 * killing the old disclosure toggle, which both hid the formal register and
 * mislabeled it "descrierea oficială". Do not restore the toggle.
 *
 * Only the SUMMARY clamps: the description is schema-bounded to 600
 * characters (1-2 sentences, `enrichment-schema.ts`), so a clamp there
 * would be a control that mostly toggles nothing, while the 400-800
 * character summary is what pushed the text below the fold (user decision
 * 2026-08-11). "Citește tot" appears only when the clamp actually hides
 * something, measured, never assumed.
 *
 * BOTH texts come from the same AI enrichment pass (the prompt literally
 * orders a "description" field) — nothing here is quoted from the source,
 * and the footer declares every text the card shows. Either register may
 * be empty (empty string included): each renders only with real content,
 * the separator only between two present texts, and a card with neither is
 * `hasSummaryContent === false` — the caller skips it entirely.
 */
export function ActPlainSummary({ summary, officialTextUrl = null, qualifiers }: Props) {
  const [expanded, setExpanded] = useState(false)
  // `null` = not yet measured. The distinction matters on the first paint
  // (and under SSR, where no measurement ever runs): an unmeasured summary
  // must be treated as possibly-clamped — fade shown, expand control
  // withheld — or the pre-hydration frame exposes end-of-summary controls
  // above text that is visibly cut.
  const [clamps, setClamps] = useState<boolean | null>(null)
  const proseRef = useRef<HTMLParagraphElement | null>(null)

  const plain = cleanSummaryText(summary.plainLanguageSummary)
  // A description identical to the summary is one register, not two.
  const rawDescription = cleanSummaryText(summary.description)
  const description = rawDescription === plain ? null : rawDescription

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

  if (plain === null && description === null) return null

  return (
    <section
      aria-labelledby="act-plain-summary-heading"
      className={legislationSectionClassName}
    >
      {/* The eyebrow covers BOTH registers ("Pe scurt", not "Ce spune, pe
          scurt" — the label must not promise plain language and then open
          with the formal register), and lives in whichever block renders
          first. The separator between the two registers is the card's one
          separator language: a full-bleed hairline, same as the footer rows. */}
      {description !== null && (
        <div
          className={
            plain !== null
              ? 'border-b border-[var(--pnrr-subtle)] px-5 py-4 sm:px-6 sm:py-5'
              : 'px-5 py-4 sm:px-6 sm:py-5'
          }
        >
          <h2
            id="act-plain-summary-heading"
            className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]"
          >
            <Trans>Pe scurt</Trans>
          </h2>
          <p className="mt-3 max-w-[46rem] text-sm leading-6 text-[var(--pnrr-muted)]">
            {description}
          </p>
        </div>
      )}

      {plain !== null && (
        <div className="px-5 py-4 sm:px-6 sm:py-5">
          {description === null && (
            <h2
              id="act-plain-summary-heading"
              className="text-xs font-semibold uppercase tracking-wide text-[var(--pnrr-muted)]"
            >
              <Trans>Pe scurt</Trans>
            </h2>
          )}
          <>
            <div className="relative">
              <p
                id="act-plain-summary-prose"
                ref={proseRef}
                // `mt-3` only under the eyebrow: after the separator the
                // block padding alone keeps the rule visually centred
                // between the two registers.
                className={[
                  description === null ? 'mt-3' : '',
                  expanded ? '' : 'line-clamp-4',
                  'max-w-[46rem] text-base leading-7 text-[var(--pnrr-fg)]',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {plain}
              </p>
              {/* One line's worth of fade (leading-7 = 28px): taller washes
                  out whole lines and reads as disabled text, not "continues
                  below". */}
              {!expanded && clamps !== false && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-[var(--pnrr-card)] to-transparent"
                />
              )}
            </div>

            {/* The toggle keys off `expanded`, never off a re-measure:
                expanding is what removes the overflow, so `clamps` cannot be
                the witness that collapsing is still possible. */}
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
          </>
        </div>
      )}

      {qualifiers}

      <div className="border-t border-[var(--pnrr-subtle)] px-5 py-2.5 text-xs text-[var(--pnrr-muted)] sm:px-6">
        <p className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {/* The disclosure names every text the card shows — with the
                description visible, a singular "rezumat" would under-declare. */}
            {description !== null ? (
              <Trans>
                Descrierea și rezumatul sunt generate de AI din textul actului
                — un strat explicativ, nu textul legii și nu consultanță
                juridică.
              </Trans>
            ) : (
              <Trans>
                Rezumat generat de AI din textul actului. Este un strat
                explicativ, nu textul legii și nu consultanță juridică.
              </Trans>
            )}
            {officialTextUrl !== null && (
              <>
                {' '}
                <a
                  href={officialTextUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 underline underline-offset-2"
                >
                  <Trans>Textul oficial, pe legislatie.just.ro</Trans>
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              </>
            )}
          </span>
        </p>
      </div>
    </section>
  )
}
