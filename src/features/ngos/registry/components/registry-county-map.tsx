import { useMemo } from 'react'
import type { LinkOptions } from '@tanstack/react-router'
import { msg, plural, t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { List, Map as MapIcon } from 'lucide-react'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import type { NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'
import { countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { siteKeys } from '../api'
import type { Tally } from '../counts'
import { drilled, searchOf, type RegistryQuery } from '../model'
import { TALL } from './filter-parts'

export type CountyView = 'list' | 'map'

/** „Pe județe" as the ranked table or the map: two buttons, the one shown pressed. */
export function CountyViewToggle({ view, onView, className }: { readonly view: CountyView; readonly onView: (view: CountyView) => void; readonly className?: string }) {
  const options = [
    { value: 'list', label: t`Listă`, Icon: List },
    { value: 'map', label: t`Hartă`, Icon: MapIcon },
  ] as const
  return (
    <div role="group" aria-label={t`Arată județele ca`} className={cn('inline-flex', className)}>
      {options.map(({ value, label, Icon }, index) => (
        <button
          key={value}
          type="button"
          aria-pressed={view === value}
          onClick={() => onView(value)}
          className={cn(
            TALL,
            'inline-flex items-center gap-1.5 border px-3 text-sm transition-colors',
            index > 0 && '-ml-px',
            view === value ? 'border-foreground bg-foreground text-background' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * The selection's entries by county on the map the NGO hub draws: the
 * choropleth ramp's five blues, more or fewer. Every county is drawn, at 0
 * where the selection has none (a real zero, not a missing figure); the
 * entries with no county the registry names are said under the legend. A
 * county narrows the selection to it, as its row in the list does.
 */
export function RegistryCountyMap({
  query,
  counties,
  tally,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly tally: Tally
}) {
  const { i18n } = useLingui()
  const layer = useMemo<StatisticsHubCountyLayer>(
    () => ({
      code: 'ngo-registry-selection',
      // The count is the selection's, at the export the source line dates: no year of its own.
      period: null,
      unit: 'count',
      unitLabel: null,
      values: counties.map((county) => ({ code: county.code, name: countyNameRo(county.code) ?? county.code, value: tally.by.judet.get(county.source) ?? 0 })),
      missingCounties: [],
      national: null,
    }),
    [counties, tally],
  )
  // No county in the registry, or one spelled as none of the 42: neither is drawn.
  const unplaced = tally.total - layer.values.reduce((sum, county) => sum + county.value, 0)
  const definition = useMemo<HubCountyBandDefinition>(
    () => ({
      legend: i18n._(msg`Înregistrări pe județe`),
      unit: i18n._(msg({ message: 'înregistrări', context: 'registru ONG' })),
      // Agreed with the figure, as Romanian counts: „1 înregistrare", „12 înregistrări", „92 de înregistrări".
      countUnit: (count: number) => plural(count, { one: 'înregistrare', few: 'înregistrări', other: 'de înregistrări' }),
      digits: 0,
      ramp: 'steps',
      caveat:
        unplaced > 0
          ? plural(unplaced, {
              one: 'O înregistrare fără un județ recunoscut nu apare pe hartă.',
              few: '# înregistrări fără un județ recunoscut nu apar pe hartă.',
              other: '# de înregistrări fără un județ recunoscut nu apar pe hartă.',
            })
          : null,
      // The page's source line names the registry and its export once.
      source: null,
      // A county here narrows the selection; it opens no data of its own.
      open: i18n._(msg`Arată doar acest județ`),
    }),
    [unplaced, i18n],
  )
  const countyLink = useMemo(() => {
    const spelling = new Map(counties.map((county) => [county.code, county.source]))
    // The page's own address for the narrowed selection: its site keys (`lang`) kept, the reader left where they are.
    return (code: string): LinkOptions => {
      const next = drilled(query, 'judet', spelling.get(code) ?? '') ?? query
      return { to: '/ngos/registry', search: (previous: Record<string, unknown>) => ({ ...siteKeys(previous), ...searchOf(next) }), resetScroll: false }
    }
  }, [counties, query])
  return <HubCountyBand layer={layer} definition={definition} countyLink={countyLink} list={false} />
}
