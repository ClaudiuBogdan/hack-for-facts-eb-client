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
import { LegislationSection } from './legislation-section'

/** Column count per breakpoint, matching the grid classes below. */
const DOMAIN_GRID_COLUMNS = [2, 3, 4] as const

/**
 * The 16 subject domains.
 *
 * Deliberately **without counts**: each count is a separate
 * `legalActs(filter: { domain }, first: 1).totalCount`, and 16 round-trips on a
 * landing page is not acceptable. Add them in one pass when a
 * `legalActCounts(groupBy: DOMAIN)` aggregate exists — see
 * `docs/design/legal/main-page.md` §6.2. A grid with no numbers is honest; a
 * grid with invented ones is not.
 *
 * Cells are inert until `/legislation/acts` exists to filter.
 */
export function LegislationDomainGrid() {
  return (
    <LegislationSection
      id="legislation-domains-heading"
      title={t`Domenii`}
      description={t`Cele 16 domenii pe care le acoperă corpusul.`}
      bodyClassName="p-0"
      footnote={
        <Trans>
          Domeniile sunt atribuite automat de un model pe baza textului actului —
          nu sunt o clasificare legală. Verifică la sursă înainte de a te baza pe
          ele. Numărul de acte per domeniu apare când serverul poate răspunde
          într-o singură interogare.
        </Trans>
      }
    >
      <div
        className={cn(
          legislationGridClassName,
          'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
        )}
      >
        {LEGAL_DOMAIN_SLUGS.map((slug) => (
          <div key={slug} className={legislationCellClassName}>
            <span className="text-sm font-semibold text-[var(--pnrr-fg)]">
              {legalDomainLabel(slug)}
            </span>
          </div>
        ))}
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
