import { useId } from 'react'
import { useInView } from 'react-intersection-observer'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import type { MessageDescriptor } from '@lingui/core'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { StatisticsTerritoryIdentity } from '@/schemas/statistics'
import { TERRITORY_DERIVED_LAST_YEAR, useTerritoryDerived } from '../../hooks/use-territory-derived'
import { comparisonPlaceName } from '../../lib/comparison-format'
import { statisticsTheme } from '../../lib/statistics-theme'
import { BUCHAREST_MUNICIPALITY_SIRUTA } from '../../lib/territory'
import {
  buildDerivedRows,
  DERIVED_TILES,
  derivedTrendSpan,
  derivedYearsLabel,
  formatDerived,
  isBalance,
  isTownName,
  missingContext,
  type DerivedRow,
  type TerritoryDerivedData,
} from '../../lib/territory-derived'
import { ValueStatusLegend } from '../value-status-legend'
import { DerivedFlags, ReferenceFlags, TerritoryDerivedList, type DerivedPlaces } from './territory-derived-list'
import { TerritoryDerivedChart, TerritoryDerivedTrendKey } from './territory-derived-trend'

type Props = {
  readonly identity: StatisticsTerritoryIdentity
  /** The period the page is filtered to (`2019`, `2024-05`), or null for the latest. */
  readonly activePeriod: string | null
}

/**
 * „Indicatori raportați la populație": the place's figures divided by its
 * population, beside its county and Romania computed the same way
 * (`lib/territory-derived.ts`). Eight tiles in the headline band's shape —
 * the rate, its period, the rate's own history against both references, the
 * references as rows — then every indicator in one dropdown, open, with how
 * each is computed. Under the page's list of series, nothing here competes
 * with the headline band, so nothing is folded away.
 *
 * Its reads start only when the section nears the screen: it sits under the
 * page's other bands, and most visits never reach it.
 */
export function TerritoryDerivedSection({ identity, activePeriod }: Props) {
  const headingId = useId()
  const { ref, inView } = useInView({ triggerOnce: true, rootMargin: '0px 0px 600px 0px' })
  // The capital's county is the city itself: no reference, as in the headline band.
  const county = identity.siruta !== BUCHAREST_MUNICIPALITY_SIRUTA
  const query = useTerritoryDerived({
    siruta: identity.siruta,
    countyCode: county ? identity.countyCode : null,
    enabled: inView && identity.countyCode !== null,
  })
  const placeName = identity.name ? comparisonPlaceName(identity.name).name : `SIRUTA ${identity.siruta}`
  if (identity.countyCode === null) return null
  const places: DerivedPlaces = { placeName, countyName: county ? identity.countyName : null, county }

  return (
    <section ref={ref} aria-labelledby={headingId} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div>
          <h2 id={headingId} className={statisticsTheme.sectionLabel}>
            <Trans>Indicatori raportați la populație</Trans>
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            {places.countyName ? (
              <Trans>
                Calcule Transparenta.eu din date INS, pe populația după domiciliu — aceeași bază pentru {placeName},
                județul {places.countyName} și România.
              </Trans>
            ) : (
              <Trans>
                Calcule Transparenta.eu din date INS, pe populația după domiciliu — aceeași bază pentru {placeName} și
                România.
              </Trans>
            )}
          </p>
        </div>
        <TerritoryDerivedTrendKey placeName={placeName} countyName={places.countyName} />
      </div>
      {query.data ? (
        <DerivedBody data={query.data} identity={identity} places={places} activePeriod={activePeriod} />
      ) : query.isError ? (
        <div role="alert" className={cn(statisticsTheme.note, 'flex flex-wrap items-center justify-between gap-3')}>
          <span>
            <Trans>Nu am putut citi indicatorii raportați la populație.</Trans>
          </span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            <Trans>Reîncearcă</Trans>
          </Button>
        </div>
      ) : (
        <div role="status" aria-busy="true" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <span className="sr-only">{t`Se încarcă indicatorii`}</span>
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-60" />
          ))}
        </div>
      )}
    </section>
  )
}

function DerivedBody({
  data,
  identity,
  places,
  activePeriod,
}: {
  readonly data: TerritoryDerivedData
  readonly identity: StatisticsTerritoryIdentity
  readonly places: DerivedPlaces
  readonly activePeriod: string | null
}) {
  const town = isTownName(identity.name)
  const year = activePeriod ? Number(activePeriod.slice(0, 4)) : null
  const rows = buildDerivedRows(data, {
    town,
    year: year !== null && Number.isInteger(year) ? year : null,
    lastYear: TERRITORY_DERIVED_LAST_YEAR,
    county: places.county,
  })
  // A year INS has published for none of them: said once, not on every row.
  if (year !== null && rows.every((row) => row.year === null)) {
    return (
      <p className={statisticsTheme.note}>
        <Trans>Fără date INS pentru {year} la acești indicatori.</Trans>
      </p>
    )
  }
  const byId = new Map(rows.map((row) => [row.def.id, row]))
  const tiles = DERIVED_TILES[town ? 'town' : 'commune']
    .map((id) => byId.get(id))
    .filter((row): row is DerivedRow => row !== undefined)
  const absent = missingContext(rows)
  // The markers the references carry, each explained once.
  const referenceFlags = [
    ...new Set(
      rows.flatMap((row) =>
        (['county', 'country'] as const).flatMap((scope) => [
          ...(row.results[scope]?.value != null ? row.results[scope].flags : []),
          ...(row.lastYear?.[scope]?.value != null ? row.lastYear[scope].flags : []),
        ]),
      ),
    ),
  ].sort()

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((row) => (
          <DerivedTile key={row.def.id} row={row} places={places} />
        ))}
      </div>
      <TerritoryDerivedList rows={rows} places={places} />
      {absent.length > 0 ? (
        <AbsentNote placeName={places.placeName} labels={absent.map((def) => def.label)} />
      ) : null}
      <ValueStatusLegend statuses={referenceFlags} />
    </>
  )
}

function AbsentNote({
  placeName,
  labels,
}: {
  readonly placeName: string
  readonly labels: readonly MessageDescriptor[]
}) {
  const { i18n } = useLingui()
  const list = labels.map((label) => i18n._(label).toLocaleLowerCase(i18n.locale)).join(', ')
  return (
    <p className="text-xs text-muted-foreground">
      <Trans>
        Fără date INS pentru {placeName}: {list}. Lipsa datelor nu înseamnă că fenomenul lipsește.
      </Trans>
    </p>
  )
}

/**
 * One indicator in the headline tiles' shape: the rate large with its unit,
 * what it counts and for when, a note where the figure needs one, its own
 * history against the county and Romania, then the two references as rows —
 * or the legal target, where the county and the country are no reference.
 */
function DerivedTile({ row, places }: { readonly row: DerivedRow; readonly places: DerivedPlaces }) {
  const countyName = places.countyName
  const { i18n } = useLingui()
  const place = row.results.place
  const signed = isBalance(row.def)
  const span = derivedTrendSpan(row)
  const reference = (scope: 'county' | 'country') => formatDerived(row.results[scope]?.value ?? null, { signed })

  return (
    <article className="@container flex min-w-0 flex-col rounded-lg border border-border/70 bg-card p-4">
      <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground">{i18n._(row.def.label)}</h3>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
        <span className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {place?.value == null ? '—' : formatDerived(place.value, { signed })}
        </span>
        {place?.value == null ? null : <span className="text-sm text-muted-foreground">{i18n._(row.def.unit)}</span>}
      </p>
      <p className="text-xs text-muted-foreground">
        {i18n._(row.def.caption)}
        {` · ${place ? (place.value === null ? (place.missing ?? '') : derivedYearsLabel(place)) : (row.missing ?? '')}`}
      </p>
      {row.def.note ? (
        <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{i18n._(row.def.note)}</p>
      ) : null}
      {place && place.value !== null ? (
        <div className="mt-1">
          <DerivedFlags result={place} />
        </div>
      ) : null}
      {span ? (
        <div className="mb-3 mt-3">
          <TerritoryDerivedChart row={row} places={places} className="h-12 w-full" />
          <p className="mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground" aria-hidden="true">
            <span>{span[0]}</span>
            {place?.pooled ? (
              <span className="hidden sm:inline">
                <Trans>medii pe 3 ani</Trans>
              </span>
            ) : null}
            <span>{span[1]}</span>
          </p>
        </div>
      ) : (
        <span className="mb-3" aria-hidden="true" />
      )}
      <dl className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-t border-border/70 pt-2.5 text-xs">
        {row.def.noReferences && row.def.norm ? (
          <>
            <dt className="text-muted-foreground">
              <Trans>Ținta legală</Trans>
            </dt>
            <dd className="text-right tabular-nums text-foreground">{formatDerived(row.def.norm.value)}</dd>
          </>
        ) : (
          <>
            {places.county ? (
              <>
                <dt className="truncate text-muted-foreground">
                  {countyName ? (
                    <>
                      {/* Two abreast on a phone, a tile is too narrow for the county's name. */}
                      <span className="@[13rem]:hidden">{t`Județ`}</span>
                      <span className="hidden @[13rem]:inline">{t`Județul ${countyName}`}</span>
                    </>
                  ) : (
                    t`Județ`
                  )}
                </dt>
                <dd className="text-right tabular-nums text-foreground">
                  {reference('county')}
                  <ReferenceFlags result={row.results.county} />
                </dd>
              </>
            ) : null}
            <dt className="text-muted-foreground">
              <Trans>România</Trans>
            </dt>
            <dd className="text-right tabular-nums text-foreground">
              {reference('country')}
              <ReferenceFlags result={row.results.country} />
            </dd>
          </>
        )}
      </dl>
    </article>
  )
}
