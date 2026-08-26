import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { cn } from '@/lib/utils'
import {
  getGridFillerClassNames,
  legislationCellClassName,
  legislationGridClassName,
  legislationGridFillerClassName,
} from '../lib/legislation-theme'
import { LEGAL_DOMAIN_SLUGS, legalDomainLabel } from '../lib/legal-domains'
import { formatLegalNumber } from '../lib/legal-format'
import { useLegislationDomainCounts } from '../hooks/use-legislation'
import { LegislationSection } from './legislation-section'

/** Column count per breakpoint, matching the grid classes below. */
const DOMAIN_GRID_COLUMNS = [2, 3, 4] as const

/**
 * The 16 subject domains, each with its act count — all 16 numbers from ONE
 * `legalActCounts(groupBy: DOMAIN)` round-trip (main-page.md §6.2, live since
 * 2026-08-26; the grid shipped numberless while a count meant 16 per-cell
 * `totalCount` queries).
 *
 * The counts OVERLAP: `domains` is an array on the summaries and an act
 * carries more than two on average, so the 16 cells sum to well over the
 * corpus total. STATUS and ACT_TYPE partition the corpus; DOMAIN does not —
 * a reader adding the cells, or a render treating them as shares of a whole,
 * would be wrong, so the footnote says it plainly whenever numbers are on
 * screen (and that is also why there is no proportion bar).
 *
 * The aggregate rides its own request (`legal-domain-counts-api.ts`), so its
 * failure degrades only this band: the 16 cells render label-only — no
 * number is honest, 0 would be a lie — and the footnote says the counts
 * could not load.
 *
 * Each cell filters the acts directory by its domain; the unfiltered bucket
 * equals that list's `totalCount` (verified live 2026-08-26), so the number
 * on a cell is the number of rows behind the click.
 */
export function LegislationDomainGrid() {
  const { i18n } = useLingui()
  const { data: counts, isError: countsFailed } = useLegislationDomainCounts()
  const showsCounts =
    counts !== undefined &&
    LEGAL_DOMAIN_SLUGS.some((slug) => counts[slug] !== undefined)

  return (
    <LegislationSection
      id="legislation-domains-heading"
      title={t`Domenii`}
      description={t`Cele 16 domenii pe care le acoperă corpusul.`}
      bodyClassName="p-0"
      footnote={
        <>
          <Trans>
            Domeniile sunt atribuite automat de un model pe baza textului
            actului — nu sunt o clasificare legală. Verifică la sursă înainte
            de a te baza pe ele.
          </Trans>{' '}
          {showsCounts ? (
            <Trans>
              Un act poate ține de mai multe domenii, așa că numerele se
              suprapun — adunate, depășesc numărul real de acte din corpus.
            </Trans>
          ) : countsFailed ? (
            <Trans>Numărul de acte pe domeniu nu a putut fi încărcat.</Trans>
          ) : null}
        </>
      }
    >
      <div
        className={cn(
          legislationGridClassName,
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        )}
      >
        {LEGAL_DOMAIN_SLUGS.map((slug) => {
          const count = counts?.[slug]
          return (
            <Link
              key={slug}
              to="/legislation/acts"
              search={{ domain: slug }}
              className={cn(
                legislationCellClassName,
                'transition-colors hover:bg-[var(--pnrr-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]',
              )}
            >
              <span className="block text-sm font-semibold text-[var(--pnrr-fg)]">
                {legalDomainLabel(slug)}
              </span>
              {/* The count line is reserved even before a number exists, so
                  counts arriving after hydration do not shift the bands
                  below. Absent count ⇒ blank — never 0. */}
              <span className="mt-0.5 block text-sm font-normal tabular-nums text-[var(--pnrr-muted)]">
                {count !== undefined
                  ? formatLegalNumber(count, i18n.locale)
                  : '\u00A0'}
              </span>
            </Link>
          )
        })}
        {getGridFillerClassNames({
          itemCount: LEGAL_DOMAIN_SLUGS.length,
          columns: DOMAIN_GRID_COLUMNS,
        }).map((visibility, index) => (
          <div
            key={`filler-${index}`}
            aria-hidden
            className={cn(legislationGridFillerClassName, visibility)}
          />
        ))}
      </div>
    </LegislationSection>
  )
}
