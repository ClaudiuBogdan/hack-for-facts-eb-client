import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { PanelLeftClose, SlidersHorizontal } from 'lucide-react'
import { PublicInstitutionsPage } from '@/features/public-institutions/components/public-institutions-page'
import { useIsMobile } from '@/hooks/use-mobile'
import { useUserCurrency } from '@/lib/hooks/useUserCurrency'
import { useUserInflationAdjusted } from '@/lib/hooks/useUserInflationAdjusted'
import { cn } from '@/lib/utils'
import { Breakdown } from './analytics.breakdown'
import { Bar, FiltersPanel, FiltersSheet, HarnessAddress, Head, PROTOTYPE_MARKER, Ranking, useAnalyticsPage } from './analytics.parts'

/**
 * Three layouts of one page, same parts and same reads:
 *
 * - `coloana`: one column — the ranking, then the breakdown under it; every
 *   filter in a sheet behind one button. Chosen by the owner and promoted to
 *   `/public-institutions` (25 November 2026): the variant renders the
 *   feature's page, so the two cannot drift.
 * - `alaturi`: the ranking and the breakdown side by side on a wide screen,
 *   stacked below it; filters in the same sheet.
 * - `panou`: the filters stay a left column, closed to a rail until asked for;
 *   the ranking and the breakdown stacked beside it.
 */

const SHELL = 'relative w-full overflow-x-clip bg-background'

/** The promoted page itself, on the harness's address, in the reader's saved currency and inflation setting. */
function Coloana() {
  const [currency] = useUserCurrency()
  const [inflationAdjusted] = useUserInflationAdjusted()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER}>
      <PublicInstitutionsPage preferences={{ currency, inflationAdjusted }} />
    </div>
  )
}

function Alaturi() {
  const page = useAnalyticsPage()
  return (
    <div className={SHELL} data-dev-marker={PROTOTYPE_MARKER}>
      <Head page={page} onFilters={() => page.setFiltersOpen(true)} />
      <Bar page={page} />
      {/* Wider than the head's frame: two answers need the room. */}
      <div className="mx-auto grid w-full max-w-[104rem] gap-x-10 gap-y-10 px-5 py-6 sm:px-8 sm:py-8 xl:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <Ranking page={page} />
        <Breakdown page={page} />
      </div>
      <FiltersSheet page={page} />
    </div>
  )
}

function Panou() {
  const page = useAnalyticsPage()
  const phone = useIsMobile()
  const [open, setOpen] = useState(false)
  return (
    <div className={SHELL} data-dev-marker={PROTOTYPE_MARKER}>
      <Head page={page} onFilters={() => (phone ? page.setFiltersOpen(true) : setOpen((value) => !value))} />
      <Bar page={page} />
      <div className={cn('mx-auto grid w-full max-w-[104rem] gap-x-8 px-5 sm:px-8', open ? 'md:grid-cols-[22rem_minmax(0,1fr)]' : 'md:grid-cols-[2.75rem_minmax(0,1fr)]')}>
        <aside className="hidden border-r py-6 md:block" aria-label={t`Filtre`}>
          <div className="sticky top-14">
            {open ? (
              <div className="pr-4">
                <button type="button" onClick={() => setOpen(false)} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <PanelLeftClose className="size-4" aria-hidden="true" />
                  {t`Închide filtrele`}
                </button>
                <div className="max-h-[calc(100dvh-8rem)] overflow-y-auto">
                  <FiltersPanel page={page} />
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setOpen(true)} aria-label={t`Deschide filtrele`} title={t`Deschide filtrele`} className="relative inline-flex size-9 items-center justify-center border text-muted-foreground hover:text-foreground">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                {page.chips.length > 0 ? <span className="absolute -right-1.5 -top-1.5 bg-foreground px-1 text-[0.625rem] tabular-nums text-background">{page.chips.length}</span> : null}
              </button>
            )}
          </div>
        </aside>
        <div className="min-w-0 py-6 sm:py-8">
          <Ranking page={page} />
          <Breakdown page={page} className="mt-10 border-t pt-8" />
        </div>
      </div>
      <FiltersSheet page={page} />
    </div>
  )
}

export function ColoanaVariant() {
  return (
    <HarnessAddress>
      <Coloana />
    </HarnessAddress>
  )
}

export function AlaturiVariant() {
  return (
    <HarnessAddress>
      <Alaturi />
    </HarnessAddress>
  )
}

export function PanouVariant() {
  return (
    <HarnessAddress>
      <Panou />
    </HarnessAddress>
  )
}
