import { useLayoutEffect, useRef, useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LegalActSummaryData } from '@/schemas/legal'
import { cleanSummaryText } from '../lib/act-facts'
import { ACT_ABOUT_WARNINGS, ACT_LINK, ACT_MORE } from './reader/act-page-grid'

type Props = {
  readonly summary: LegalActSummaryData
  /**
   * The route to the official record, shown in the AI-provenance footer —
   * its one home on the happy path now (user decision 2026-08-12: the
   * header button is gone). Failure cards keep their own escape hatch.
   */
  readonly officialTextUrl?: string | null
  /**
   * The warnings that qualify this summary, rendered as compact rows under it
   * (user decision 2026-08-11) — on the act page only when the box about the
   * text shown, which otherwise wears them, is not on the page. Rows draw
   * their own separators.
   */
  readonly qualifiers?: React.ReactNode
}

/**
 * Rung 1 — the lead block. Decided 2026-08-01 over a status-first and an
 * audience-first opening. No card since the act page's redesign (owner,
 * 26 November 2026): „Pe scurt", the texts, the AI line; the page draws the
 * rule under it. The control that opens the whole summary is plain underlined
 * text in the foreground colour: blue is for a link that goes somewhere.
 *
 * Two registers of the same generated content, BOTH visible, in reading
 * order (user decision 2026-08-12): the formal one-two sentence
 * `description` opens the card — what the act regulates, in the law's own
 * vocabulary, and usually the only place naming the EU source directive —
 * then the `plainLanguageSummary` a first-time reader can use without
 * knowing any law. Yes, the two overlap — that repetition is the accepted price of
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
 * and a card with neither is
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
    <section aria-labelledby="act-plain-summary-heading">
      {/* The eyebrow covers BOTH registers ("Pe scurt", not "Ce spune, pe
          scurt" — the label must not promise plain language and then open
          with the formal register). */}
      <h2 id="act-plain-summary-heading" className="text-sm font-medium text-foreground">
        <Trans>Pe scurt</Trans>
      </h2>

      {description !== null && (
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      )}

      {plain !== null && (
        <>
          <div className={cn('relative', description === null ? 'mt-1' : 'mt-3')}>
            <p
              id="act-plain-summary-prose"
              ref={proseRef}
              className={cn('text-base leading-7 text-foreground', !expanded && 'line-clamp-4 sm:line-clamp-3')}
            >
              {plain}
            </p>
            {/* One line's worth of fade (leading-7 = 28px): taller washes
                out whole lines and reads as disabled text, not "continues
                below". */}
            {!expanded && clamps !== false && (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 bottom-0 h-7 bg-gradient-to-t from-background to-transparent"
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
              className={cn(ACT_MORE, 'mt-1 inline-flex min-h-11 items-center text-sm sm:min-h-10')}
            >
              <Trans>Arată mai puțin</Trans>
            </button>
          ) : clamps === true ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              aria-expanded="false"
              aria-controls="act-plain-summary-prose"
              className={cn(ACT_MORE, 'mt-1 inline-flex min-h-11 items-center text-sm sm:min-h-10')}
            >
              <Trans>Citește tot rezumatul</Trans>
            </button>
          ) : null}
        </>
      )}

      {/* Said in sight: a reader must not take the summary for the law. */}
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
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
              className={cn(ACT_LINK, 'text-xs')}
            >
              {/* Not "textul oficial": on legal_v2 the default text may be
                  a Portal consolidation, which is unofficial (LEG-X3AV). */}
              <Trans>Textul, pe legislatie.just.ro</Trans>
              <ArrowUpRight className="ml-0.5 inline size-3 align-[-1px]" aria-hidden />
            </a>
          </>
        )}
      </p>

      {/* The warnings qualify the summary, so they sit on it — when the box
          about the text shown is not there to wear them. */}
      {qualifiers !== undefined && qualifiers !== null ? (
        <div className={cn('mt-3 empty:hidden', ACT_ABOUT_WARNINGS)}>{qualifiers}</div>
      ) : null}
    </section>
  )
}
