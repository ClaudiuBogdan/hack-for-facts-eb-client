import { useEffect, useRef } from 'react'
import { t } from '@lingui/core/macro'
import { EntityAnalyticsFilter } from '@/components/filters/EntityAnalyticsFilter'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { usePublicInstitutionsPage, type PublicInstitutionsState } from '../hooks/use-public-institutions-page'
import type { Preferences } from '../lib/public-institutions-selection'
import { coverageText } from '../lib/public-institutions-text'
import { PublicInstitutionsBreakdown } from './public-institutions-breakdown'
import { PublicInstitutionsBar, PublicInstitutionsFigures } from './public-institutions-figures'
import { PublicInstitutionsHead } from './public-institutions-head'
import { BREAKDOWN_ID, FILTERS_BUTTON_ID, jumpTo } from '../lib/public-institutions-anchors'
import { PublicInstitutionsRanking } from './public-institutions-ranking'

/**
 * `/public-institutions`: every public institution's expenses or income in a
 * year, ranked, with what they are made of under the ranking (owner, 25
 * November 2026; promoted from the prototype `entities/analytics`, variant
 * `coloana`; design: docs/design/entities/features/public-institutions.md).
 *
 * The head says the selection as its headline and offers the choices most
 * readers make; every other filter is the old page's panel, in a sheet. The
 * address keeps the old page's keys, so its links carry over.
 */

/** Where the figures come from, once, at the foot. */
function SourceLine({ page }: { readonly page: PublicInstitutionsState }) {
  const { coverage } = page
  const reports =
    page.reports === 'detailed'
      ? t`raportul fiecărei instituții`
      : page.reports === 'secondary'
        ? t`rapoartele ordonatorilor secundari de credite, cu instituțiile din subordine la un loc`
        : t`rapoartele ordonatorilor principali de credite, cu instituțiile din subordine la un loc`
  const reach = coverage && (coverage.status === 'complete' || coverage.status === 'partial') ? coverageText({ year: coverage.year, complete: coverage.status === 'complete', lastMonth: coverage.status === 'partial' ? coverage.lastMonth : null }, page.locale) : null
  return (
    <RuledFrame className="border-t py-8">
      <p className="text-xs leading-5 text-muted-foreground">
        {t`Sursa: execuțiile bugetare lunare publicate de ANAF (extranet)`}; {reports}
        {reach ? `; ${reach}` : ''}.{page.perCapita ? ` ${t`Populația: INS.`}` : ''}
      </p>
    </RuledFrame>
  )
}

/** Every filter, for the few who need them: a side panel on a wide screen, a sheet from the bottom on a phone. */
function FiltersSheet({ page }: { readonly page: PublicInstitutionsState }) {
  const phone = useIsMobile()
  return (
    <Sheet open={page.filtersOpen} onOpenChange={page.setFiltersOpen}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        className={cn('flex flex-col gap-0 p-0', phone ? 'h-[88dvh]' : 'w-full max-w-md sm:max-w-md')}
        // Opened from a plain button, not a trigger: the focus goes back to it by hand.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          document.getElementById(FILTERS_BUTTON_ID)?.focus()
        }}
      >
        <SheetHeader className="border-b px-4 py-3 text-left">
          <SheetTitle className="text-base">{t`Toate filtrele`}</SheetTitle>
          <SheetDescription className="sr-only">{t`Restrânge instituțiile și sumele după loc, clasificație, sector și altele.`}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <EntityAnalyticsFilter currency={page.currency} normalization={page.selection.filter.normalization} showViewSwitch={false} />
        </div>
      </SheetContent>
    </Sheet>
  )
}

/** The page from its state: the route's, or the design harness's. */
export function PublicInstitutionsView({ page }: { readonly page: PublicInstitutionsState }) {
  // A link that asked for the old page's line items opens at the breakdown, once.
  const askedForLines = page.view === 'line-items'
  const jumped = useRef(false)
  useEffect(() => {
    const settled = page.ranking.data != null || page.ranking.isError
    if (!askedForLines || jumped.current || !settled) return
    jumped.current = true
    jumpTo(BREAKDOWN_ID)
  }, [askedForLines, page.ranking.data, page.ranking.isError])
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <PublicInstitutionsHead page={page} onFilters={() => page.setFiltersOpen(true)} />
      <PublicInstitutionsBar page={page} />
      <PublicInstitutionsFigures page={page} />
      <RuledFrame className="py-6 sm:py-8">
        <PublicInstitutionsRanking page={page} />
      </RuledFrame>
      <div className="border-t">
        <RuledFrame className="py-8 sm:py-10">
          <PublicInstitutionsBreakdown page={page} readNow={askedForLines} />
        </RuledFrame>
      </div>
      <SourceLine page={page} />
      <FiltersSheet page={page} />
    </div>
  )
}

export function PublicInstitutionsPage({ preferences }: { readonly preferences: Preferences }) {
  const page = usePublicInstitutionsPage(preferences)
  return <PublicInstitutionsView page={page} />
}
