import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Map as MapIcon, Table as TableIcon } from 'lucide-react'
import { ErrorBoundary } from '@/components/errors/ErrorBoundary'
import { Button } from '@/components/ui/button'
import { ChoiceSelect } from '@/components/ui/choice-select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { MapPicker } from '@/features/landing/components/budget-map/map-picker'
import type { NumberLocale } from '@/features/landing/lib/national-facts'
import { quietImport, reloadForFreshCode } from '@/lib/chunk-recovery'
import { isUpdateAvailableError } from '@/lib/errors-utils'
import { cn, getUserLocale } from '@/lib/utils'
import { useMapPageData } from '../hooks/use-map-page-data'
import { useMapPageState } from '../hooks/use-map-page-state'
import { YEARS, pageMeasures, type Basis, type Level } from '../lib/map-page-measures'
import type { View } from '../lib/map-page-search'
import { MapPageTable } from './map-page-table'

/**
 * The map page (`/map`): a slim bar — the title, the map picker, the year,
 * totals or per inhabitant, primării or counties, map or table — and the map
 * filling the rest of the window, its legend on its corner. On a phone the bar
 * takes three rows, the map most of the screen and the legend sits under it.
 *
 * The bar is server-rendered; the map is built in the browser as soon as the
 * page hydrates (MapLibre draws on WebGL), its code loaded beside the shapes
 * and figures. Decisions: `docs/design/map/design.md`.
 */

const loadMap = () => quietImport(() => import('./map-page-map'))
const MapPageMap = lazy(loadMap)

const SEGMENT = 'h-9 gap-1.5 px-3 text-sm data-[state=on]:bg-secondary data-[state=on]:text-foreground'
const MAP_PLACE = 'grid h-[62dvh] min-h-80 place-items-center bg-muted/30 text-sm text-muted-foreground md:h-auto md:min-h-0 md:flex-1'

/**
 * The map's code did not load, or the map threw while starting. Only the first
 * is mended by a reload — the code that failed stays failed in this document —
 * so only it offers one.
 */
function MapFailed({ error }: { readonly error: Error }) {
  const chunk = isUpdateAvailableError(error)
  return (
    <div className={MAP_PLACE}>
      <p className="flex flex-wrap items-center gap-3">
        {chunk ? t`Harta nu s-a putut încărca.` : t`Harta nu poate fi afișată în acest browser.`}
        {chunk ? (
          <Button size="sm" variant="outline" onClick={() => void reloadForFreshCode()}>
            {t`Încearcă din nou`}
          </Button>
        ) : null}
      </p>
    </div>
  )
}

function Segments<T extends string>({
  value,
  onChange,
  label,
  options,
  className,
}: {
  readonly value: T
  readonly onChange: (value: T) => void
  readonly label: string
  readonly options: readonly { readonly value: T; readonly label: string; readonly icon?: React.ReactNode }[]
  readonly className?: string
}) {
  return (
    <ToggleGroup type="single" variant="outline" value={value} onValueChange={(next) => next && onChange(next as T)} aria-label={label} className={cn('gap-0 rounded-md', className)}>
      {options.map((option, i) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.icon ? option.label : undefined}
          className={cn(SEGMENT, i === 0 ? 'rounded-r-none' : '-ml-px rounded-l-none')}
        >
          {option.icon}
          {/* With an icon, the word from `sm`: on a phone the icon carries it, named for assistive tech. */}
          <span className={option.icon ? 'hidden sm:inline' : undefined}>{option.label}</span>
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function MapPage() {
  const [state, change] = useMapPageState()
  const { measureId, year, basis, level, view } = state
  const locale: NumberLocale = getUserLocale() === 'en' ? 'en' : 'ro'
  // Stable per year, count and level: the map re-colours only when one of them changes.
  const measures = useMemo(() => pageMeasures(year, basis, level), [year, basis, level])
  const measure = measures.find((item) => item.id === measureId) ?? measures[0]!
  const data = useMapPageData(year, basis, level)
  // The map is built in the browser only.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    // The map's view fills the window from `md`; the table's grows with its rows.
    <div className={cn('flex flex-col', view === 'map' && 'md:h-dvh')} data-map-page>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b px-4 py-3 md:px-6">
        <h1 className="mr-auto text-xl font-semibold tracking-tight md:mr-3">{t`Harta bugetelor locale`}</h1>
        {/* First on a phone, beside the title; last on a desktop, at the bar's far end. */}
        <Segments<View>
          value={view}
          onChange={(next) => change({ view: next })}
          label={t`Vedere`}
          className="order-1 md:order-last md:ml-auto"
          options={[
            { value: 'map', label: t`Hartă`, icon: <MapIcon className="size-4" aria-hidden="true" /> },
            { value: 'table', label: t`Tabel`, icon: <TableIcon className="size-4" aria-hidden="true" /> },
          ]}
        />
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
          <Segments<Basis>
            value={basis}
            onChange={(next) => change({ basis: next })}
            label={t`Cum sunt numărate sumele`}
            options={[
              { value: 'total', label: t`Total` },
              { value: 'per_capita', label: t`Pe locuitor` },
            ]}
          />
          <Segments<Level>
            value={level}
            onChange={(next) => change({ level: next })}
            label={t`Ce este colorat pe hartă`}
            options={[
              { value: 'uat', label: t`Primării` },
              { value: 'county', label: t`Județe` },
            ]}
          />
        </div>
      </header>
      {view === 'table' ? (
        <MapPageTable data={data} measureId={measureId} basis={basis} level={level} locale={locale} />
      ) : mounted ? (
        <ErrorBoundary fallback={MapFailed}>
          <Suspense fallback={<div className={MAP_PLACE}>{t`Se încarcă harta…`}</div>}>
            <MapPageMap measure={measure} data={data} year={year} basis={basis} level={level} locale={locale} />
          </Suspense>
        </ErrorBoundary>
      ) : (
        <div className={MAP_PLACE}>{t`Se încarcă harta…`}</div>
      )}
    </div>
  )
}
