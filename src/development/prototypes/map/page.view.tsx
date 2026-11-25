import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Map as MapIcon, Table as TableIcon } from 'lucide-react'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { ChoiceSelect } from '@/components/ui/choice-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MapPicker } from '@/features/landing/components/budget-map/map-picker'
import type { NumberLocale } from '@/features/landing/lib/national-facts'
import { getUserLocale } from '@/lib/utils'
import { usePageData } from './page.data'
import { YEARS, pageMeasures, type Basis, type Level } from './page.measures'
import { usePageState, type View } from './page.state'
import { PageTable } from './page.table'

/**
 * The map page, laid out for the map: a slim bar (title, the map picker, the
 * year, totals or per inhabitant, primării or counties, map or table) and the
 * map filling the rest
 * of the window, its legend on its corner. On a phone the bar wraps, the map
 * takes most of the screen and the legend sits under it.
 *
 * The bar is rendered on the server; the map is built in the browser, at once
 * — here it is the page's content, so nothing waits for a scroll.
 */

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

const PageMap = lazy(() => import('./page.map'))

const SEGMENT = 'h-9 gap-1.5 px-3 text-sm data-[state=on]:bg-secondary data-[state=on]:text-foreground'

function MapPlace({ children }: { readonly children?: React.ReactNode }) {
  return <div className="grid h-[62dvh] min-h-80 place-items-center bg-muted/30 text-sm text-muted-foreground md:h-auto md:min-h-0 md:flex-1">{children}</div>
}

function MapFailed() {
  return <MapPlace>{t`Harta nu s-a putut încărca.`}</MapPlace>
}

export function MapPage() {
  const [state, change] = usePageState()
  const { measureId, year, basis, level, view } = state
  const locale: NumberLocale = getUserLocale() === 'en' ? 'en' : 'ro'
  // Stable per year, count and level: the map re-colours only when one of them changes.
  const measures = useMemo(() => pageMeasures(year, basis, level), [year, basis, level])
  const measure = measures.find((item) => item.id === measureId) ?? measures[0]!
  const data = usePageData(year, basis, level)
  // The map is built in the browser only (MapLibre draws on WebGL).
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="flex flex-col md:h-dvh" data-dev-marker={PROTOTYPE_MARKER}>
      {/* Desktop: one row — title, map, year, count, level, and the view switch at the far end. Phone: three rows — title and view, map and year, count and level. */}
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 md:px-6">
        <h1 className="mr-auto text-xl font-semibold tracking-tight md:mr-3">{t`Harta bugetelor locale`}</h1>
        <ToggleGroup
          type="single"
          variant="outline"
          value={view}
          onValueChange={(next) => next && change({ view: next as View })}
          aria-label={t`Vedere`}
          className="order-1 gap-0 rounded-md md:order-last md:ml-auto"
        >
          <ToggleGroupItem value="map" className={`${SEGMENT} rounded-r-none`} aria-label={t`Hartă`}>
            <MapIcon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t`Hartă`}</span>
          </ToggleGroupItem>
          <ToggleGroupItem value="table" className={`${SEGMENT} -ml-px rounded-l-none`} aria-label={t`Tabel`}>
            <TableIcon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{t`Tabel`}</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <div className="order-2 flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="min-w-0 flex-1 sm:w-72 sm:flex-none">
            <MapPicker value={measureId} onChange={(id) => change({ measureId: id })} measures={measures} />
          </div>
          <ChoiceSelect
            value={year}
            groups={[{ options: YEARS.map((item) => ({ value: item, label: item })) }]}
            onChange={(next) => change({ year: next })}
            label={t`Anul`}
            triggerClassName="h-10 w-24 shrink-0 tabular-nums"
          />
        </div>
        <div className="order-3 flex items-center gap-2 sm:gap-3">
          <ToggleGroup
            type="single"
            variant="outline"
            value={basis}
            onValueChange={(next) => next && change({ basis: next as Basis })}
            aria-label={t`Cum sunt numărate sumele`}
            className="gap-0 rounded-md"
          >
            <ToggleGroupItem value="total" className={`${SEGMENT} rounded-r-none`}>
              {t`Total`}
            </ToggleGroupItem>
            <ToggleGroupItem value="per_capita" className={`${SEGMENT} -ml-px rounded-l-none`}>
              {t`Pe locuitor`}
            </ToggleGroupItem>
          </ToggleGroup>
          <ToggleGroup
            type="single"
            variant="outline"
            value={level}
            onValueChange={(next) => next && change({ level: next as Level })}
            aria-label={t`Ce este colorat pe hartă`}
            className="gap-0 rounded-md"
          >
            <ToggleGroupItem value="uat" className={`${SEGMENT} rounded-r-none`}>
              {t`Primării`}
            </ToggleGroupItem>
            <ToggleGroupItem value="county" className={`${SEGMENT} -ml-px rounded-l-none`}>
              {t`Județe`}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>
      {view === 'table' ? (
        <div className="min-h-0 flex-1 md:overflow-y-auto">
          <PageTable data={data} measureId={measureId} basis={basis} level={level} locale={locale} />
        </div>
      ) : mounted ? (
        <ErrorBoundary fallback={MapFailed}>
          <Suspense fallback={<MapPlace>{t`Se încarcă harta…`}</MapPlace>}>
            <PageMap measure={measure} data={data} year={year} basis={basis} level={level} locale={locale} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <MapPlace>{t`Se încarcă harta…`}</MapPlace>
      )}
    </div>
  )
}
