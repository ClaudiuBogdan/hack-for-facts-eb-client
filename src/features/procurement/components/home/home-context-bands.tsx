import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, type LinkOptions } from '@tanstack/react-router'
import { msg, t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { IndicatorToggle } from '@/components/landing-skin/indicator-toggle'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { COMPANY_HUB_SNAPSHOT } from '@/features/private-companies/lib/hub-snapshot'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubCountyBand, type HubCountyBandDefinition } from '@/features/statistics/components/hub/hub-county-band'
import { ROMANIA_COUNTIES, countyNameRo } from '@/lib/territory-counties'
import { cn } from '@/lib/utils'
import type { ProcurementHomeMap, ProcurementHomeRecent } from '@/schemas/procurement-home'
import type { StatisticsHubCountyLayer } from '@/schemas/statistics'
import { categoryOfCode } from '../../lib/home-categories'
import { contractsCount, countText, moneyFigure, moneyText, monthText, percentText } from '../../lib/home-format'
import { DIRECT_COMPARABLE_FROM, isUnpublishedProcedure, perResidents, procedureLabel, type NationalRead, type RecentRecord } from '../../lib/home-model'
import { countyLede, directAverageLede, growthLede, unpublishedLede } from '../../lib/home-text'
import type { AnalyticsUrlSearch } from '../../lib/analytics-model'
import { countyRecordsSearch, startSearches } from '../../lib/home-links'
import { HOME_RECENT_RECORDS } from '../../hooks/use-procurement-home'
import { Bone, HomeBand, ProvisionalMark, RULED_NOTE_CLASS, TextPending, type NationalState } from './home-chrome'
import { PendingRows, RecordRows } from './home-rows'

/** A lede the national read writes, until it lands: two lines, three on a phone. */
const NATIONAL_LEDE_PENDING = <TextPending lines={2} narrow={3} />

function ledeOf(read: NationalRead | undefined, national: NationalState, lede: (read: NationalRead) => ReactNode): ReactNode {
  if (read) return lede(read)
  return national.isError ? null : NATIONAL_LEDE_PENDING
}

// ───────────────────────────────────────────────────────── the counties ──

/** Residents on 1 January of the population year, by county, from the companies hub's INS read (POP105A). */
const POPULATION = new Map(COMPANY_HUB_SNAPSHOT.counties.map((county) => [county.code, county.population]))
const NATIONAL_POPULATION = COMPANY_HUB_SNAPSHOT.national.population
const POPULATION_YEAR = COMPANY_HUB_SNAPSHOT.fiscalYear

/**
 * A layer over the counties' residents. The national figure is the country's
 * own ratio — all of the year's records over the national population — never
 * a mean of the county rates, and never only the counties SEAP could place.
 */
function countyLayer(read: NationalRead, indicator: ProcurementHomeMap): StatisticsHubCountyLayer {
  const direct = indicator === 'lei'
  const counties = direct ? read.counties.direct : read.counties.contract
  const per = direct ? 1 : 100_000
  const { values } = perResidents(counties, POPULATION, (county) => (direct ? county.value : county.count), per)
  const total = direct ? read.direct.value : read.contract.count
  const present = new Set(values.map((county) => county.code))
  return {
    code: direct ? 'seap-direct-per-resident' : 'seap-contracts-per-100k',
    period: String(read.year),
    unit: 'other',
    unitLabel: direct ? 'lei' : null,
    values: values.map((county) => ({ code: county.code, name: countyNameRo(county.code) ?? county.code, value: county.value })),
    missingCounties: ROMANIA_COUNTIES.filter((county) => !present.has(county.code)).map((county) => county.code),
    national: total !== null && NATIONAL_POPULATION > 0 ? (total / NATIONAL_POPULATION) * per : null,
  }
}

export function HomeCountiesBand({
  read,
  year,
  national,
  index,
  indicator,
  onIndicator,
}: {
  readonly read: NationalRead | undefined
  readonly year: number
  readonly national: NationalState
  readonly index: string
  readonly indicator: ProcurementHomeMap
  readonly onIndicator: (indicator: ProcurementHomeMap) => void
}) {
  const layer = useMemo(() => (read ? countyLayer(read, indicator) : null), [read, indicator])
  const { i18n } = useLingui()
  // Resolved here, through `i18n`, so a locale switch re-renders the band.
  const definition = useMemo<HubCountyBandDefinition>(
    () =>
      indicator === 'lei'
        ? {
            legend: i18n._(msg`Achiziții directe pe locuitor, ${year}, după județul instituției`),
            unit: i18n._(msg`lei`),
            digits: 0,
            caveat: i18n._(
              msg`Calculat de Transparenta.eu: valoarea achizițiilor directe ale instituțiilor din județ, fără TVA, împărțită la populația INS din 1 ianuarie ${POPULATION_YEAR}; media țării, pe aceeași bază. Instituțiile centrale au sediul în București.`,
            ),
            source: i18n._(msg`Sursa: SEAP.`),
          }
        : {
            legend: i18n._(msg`Contracte atribuite la 100.000 de locuitori, ${year}, după județul instituției`),
            unit: i18n._(msg`la 100.000 de locuitori`),
            digits: 0,
            caveat: i18n._(
              msg`Calculat de Transparenta.eu: contractele atribuite de instituțiile din județ, la 100.000 de locuitori (populația INS din 1 ianuarie ${POPULATION_YEAR}); media țării, pe aceeași bază. Instituțiile centrale au sediul în București.`,
            ),
            source: i18n._(msg`Sursa: SEAP.`),
          },
    [indicator, year, i18n],
  )
  // A county opens exactly the population it counts: its direct purchases, or its contract awards (frameworks apart).
  const countyLink = (code: string): LinkOptions => ({ to: '/procurement/analytics', search: countyRecordsSearch(indicator, code, year) })
  // A rate needs its denominator from the same year (DESIGN.md log, 2026-09-25): until the population read catches up, no map.
  const sameYear = POPULATION_YEAR === year
  return (
    <HomeBand id="judete" labelledBy="procurement-home-counties-title">
      <HubSectionHead
        titleId="procurement-home-counties-title"
        index={index}
        title={<Trans>Cât cumpără județul tău</Trans>}
        lede={
          sameYear && indicator === 'lei'
            ? layer
              ? countyLede(layer.values, layer.national, (code) => countyNameRo(code) ?? code)
              : national.isError
                ? null
                : NATIONAL_LEDE_PENDING
            : null
        }
        aside={
          <IndicatorToggle
            label={t`Indicatorul de pe hartă`}
            options={[
              { key: 'lei', label: t`Lei pe locuitor` },
              { key: 'contracte', label: t`Contracte` },
            ]}
            value={indicator}
            onChange={onIndicator}
          />
        }
      />
      {sameYear ? (
        layer ? (
          <HubCountyBand key={layer.code} layer={layer} definition={definition} countyLink={countyLink} />
        ) : national.isError ? (
          <div className="mt-10">
            <HubLoadError onRetry={national.retry} />
          </div>
        ) : (
          <CountyBandPending caveat={definition.caveat} source={definition.source} />
        )
      ) : (
        <p className="mt-8 max-w-[56ch] border-y py-4 text-sm text-muted-foreground">
          <Trans>
            Populația județelor pentru {year} nu e încă în datele paginii, iar o rată pe locuitor cere populația aceluiași an. Harta revine odată
            cu ea.
          </Trans>
        </p>
      )}
    </HomeBand>
  )
}

/**
 * The county band before its read, in `HubCountyBand`'s geometry: the map's
 * frame, the legend's height, the caveat itself (it says nothing the read
 * decides), and the ranking's two ends with the control between them.
 */
function CountyBandPending({ caveat, source }: { readonly caveat: ReactNode; readonly source: ReactNode }) {
  const ranks = (from: number) => (
    <ol className="divide-y divide-border/70">
      {Array.from({ length: 5 }, (_, index) => (
        <li key={index} className="flex min-h-11 items-center gap-3 px-1 text-sm">
          <MonoLabel className="tabular-nums text-muted-foreground/60">{String(from + index).padStart(2, '0')}</MonoLabel>
          <Bone className={index % 2 === 0 ? 'w-24' : 'w-20'} />
          <span className="h-2 flex-1 animate-pulse bg-muted/70" />
          <Bone className="w-12" />
        </li>
      ))}
    </ol>
  )
  return (
    <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
      <div className="min-w-0 lg:col-span-7">
        <div className="aspect-[640/454] w-full animate-pulse rounded-sm bg-muted/60" aria-hidden="true" />
        <div className="mt-6 space-y-6">
          <div className="h-28 animate-pulse rounded-sm bg-muted/60 sm:h-[4.5rem]" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            {caveat} {source}
          </p>
        </div>
      </div>
      <div className="min-w-0 lg:col-span-5 lg:col-start-8" aria-hidden="true">
        <div className="border-b border-border/70 pb-2">
          <MonoLabel className="block pl-1 text-muted-foreground">
            <Trans>Județ</Trans>
          </MonoLabel>
        </div>
        {ranks(1)}
        <div className="min-h-11 border-y border-border/70" />
        {ranks(38)}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────── the years ──

/**
 * Money per year as columns, the part-year hatched and named. The first and
 * last complete years are written above their columns so the chart reads
 * without a pointer; each column is a button with its value in its name and
 * in the readout above the chart.
 */
/** The year in progress, when the read kept a column for it (through its cutoff month): from the data, not the clock. */
function partYearOf(read: NationalRead): number | null {
  const next = read.year + 1
  return read.directYears.some((point) => point.year === next && point.value !== null) ? next : null
}

function YearColumns({ read }: { readonly read: NationalRead }) {
  const partYear = partYearOf(read)
  const points = read.directYears.filter((point) => point.year >= DIRECT_COMPARABLE_FROM && point.year <= (partYear ?? read.year) && point.value !== null)
  const max = Math.max(...points.map((point) => point.value ?? 0), 1)
  const complete = points.filter((point) => point.year !== partYear)
  const ends = new Set([complete[0]?.year, complete[complete.length - 1]?.year])
  const [active, setActive] = useState<number | null>(null)
  const current = points.find((point) => point.year === active) ?? null
  if (points.length === 0) return null
  return (
    <figure>
      <figcaption className="sr-only">{t`Valoarea achizițiilor directe pe an`}</figcaption>
      <p className="h-10 text-sm text-muted-foreground" aria-live="polite">
        {current ? (
          <>
            <span className="font-semibold tabular-nums text-foreground">{current.value === null ? '—' : moneyText(current.value)}</span>{' '}
            {current.year === partYear ? t`în ${current.year}, până în ${monthText(read.cutoff.direct ?? `${current.year}-01`)}` : t`în ${current.year}`}
          </>
        ) : null}
      </p>
      <div className="flex h-56 items-end gap-1.5 border-b border-foreground/30 sm:gap-2" onPointerLeave={() => setActive(null)}>
        {points.map((point) => {
          const part = point.year === partYear
          return (
            <button
              key={point.year}
              type="button"
              className="group relative flex h-full min-w-0 flex-1 flex-col justify-end outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              onPointerEnter={() => setActive(point.year)}
              onFocus={() => setActive(point.year)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(point.year)}
              aria-label={`${point.year}: ${point.value === null ? '—' : moneyText(point.value)}${part ? `, ${t`an în curs`}` : ''}`}
            >
              {ends.has(point.year) && active === null ? (
                <span className="mb-1 block text-center text-[0.625rem] font-semibold tabular-nums text-foreground" aria-hidden="true">
                  {moneyFigure(point.value ?? 0)}
                </span>
              ) : null}
              <span
                className={cn(
                  'block w-full transition-colors',
                  part ? 'border border-dashed border-primary/60 bg-primary/10' : 'bg-primary/70 group-hover:bg-primary',
                  active === point.year && !part && 'bg-primary',
                )}
                style={{ height: `${(((point.value ?? 0) / max) * 100).toFixed(1)}%` }}
              />
            </button>
          )
        })}
      </div>
      <div className="mt-2 flex gap-1.5 sm:gap-2" aria-hidden="true">
        {points.map((point) => (
          <MonoLabel key={point.year} className={cn('min-w-0 flex-1 text-center tabular-nums text-muted-foreground', point.year % 2 === 1 && 'max-sm:invisible')}>
            {String(point.year).slice(2)}
          </MonoLabel>
        ))}
      </div>
    </figure>
  )
}

/** Heights, in percent, of the columns drawn before the read: rising, the part year last. */
const PENDING_COLUMNS = [42, 50, 56, 63, 72, 84, 92, 36]

/** The columns before their read: the readout's line, the chart's frame and the labels' row, at the chart's height. */
function YearColumnsPending() {
  return (
    <div aria-hidden="true">
      <p className="h-10" />
      <div className="flex h-56 items-end gap-1.5 border-b border-foreground/30 sm:gap-2">
        {PENDING_COLUMNS.map((height, index) => (
          <span key={index} className="block flex-1 animate-pulse bg-muted" style={{ height: `${height}%` }} />
        ))}
      </div>
      <MonoLabel className="mt-2 block">&nbsp;</MonoLabel>
    </div>
  )
}

export function HomeYearsBand({
  read,
  national,
  index,
}: {
  readonly read: NationalRead | undefined
  readonly national: NationalState
  readonly index: string
}) {
  const partYear = read ? partYearOf(read) : null
  return (
    <HomeBand id="in-timp" labelledBy="procurement-home-years-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="procurement-home-years-title"
            index={index}
            title={
              <Trans>
                Achizițiile directe,
                <br />
                an de an
              </Trans>
            }
            lede={ledeOf(read, national, growthLede)}
          />
          {partYear && read?.cutoff.direct ? (
            <p className="mt-6 max-w-[56ch] text-sm leading-relaxed text-muted-foreground" data-reveal>
              <Trans>
                {partYear} e în curs: coloana ei are datele până în {monthText(read.cutoff.direct)}.
              </Trans>
            </p>
          ) : !read && !national.isError ? (
            <p className="mt-6 max-w-[56ch] text-sm leading-relaxed">
              <TextPending lines={1} narrow={2} />
            </p>
          ) : null}
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Valoarea achizițiilor directe pe an, lei, fără TVA</Trans>
          </MonoLabel>
          <div className="mt-2">
            {read ? <YearColumns read={read} /> : national.isError ? <HubLoadError onRetry={national.retry} /> : <YearColumnsPending />}
          </div>
        </div>
      </div>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────────── how it's bought ──

const PROCEDURE_ROW_CLASS = 'grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-center gap-x-4 px-1 py-2.5 text-sm'

/** The procedures SEAP names in a year's awards: the rows the list holds before its read. */
const PENDING_PROCEDURES = 9

export function HomeHowBand({
  read,
  year,
  national,
  index,
}: {
  readonly read: NationalRead | undefined
  readonly year: number
  readonly national: NationalState
  readonly index: string
}) {
  const { i18n } = useLingui()
  const total = read?.contract.count ?? null
  const direct = read ? directAverageLede(read) : null
  const waiting = !read && !national.isError
  return (
    <HomeBand id="cum" labelledBy="procurement-home-how-title">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <HubSectionHead
            titleId="procurement-home-how-title"
            index={index}
            title={
              <Trans>
                Licitație, negociere
                <br />
                sau cumpărare directă
              </Trans>
            }
            lede={ledeOf(read, national, unpublishedLede)}
          />
          {direct ? (
            <p className={RULED_NOTE_CLASS} data-reveal>
              {direct}
            </p>
          ) : waiting ? (
            <p className={RULED_NOTE_CLASS}>
              <TextPending lines={3} narrow={4} />
            </p>
          ) : null}
        </div>
        <div className={cn('lg:col-span-6 lg:col-start-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <MonoLabel className="block text-muted-foreground">
            <Trans>Contractele atribuite în {year}, după procedură</Trans>
          </MonoLabel>
          {!read ? (
            national.isError ? (
              <div className="mt-3">
                <HubLoadError onRetry={national.retry} />
              </div>
            ) : (
              <ol className="mt-3 divide-y divide-border/70 border-y border-border/70" aria-hidden="true">
                {Array.from({ length: PENDING_PROCEDURES }, (_, row) => (
                  <li key={row} className={PROCEDURE_ROW_CLASS}>
                    <span className="min-w-0">
                      {/* The longer procedure names take two lines on a phone: one row in three here. */}
                      <span className="block leading-snug">
                        <Bone className={row % 2 === 0 ? 'w-2/3' : 'w-3/5'} />
                        {row % 3 === 2 ? <Bone className="w-1/2 sm:hidden" /> : null}
                      </span>
                      <span className="mt-1 block h-1 bg-muted" />
                    </span>
                    <Bone className="w-10" />
                    <Bone />
                  </li>
                ))}
              </ol>
            )
          ) : total !== null && total > 0 && read.procedures.rows.length > 0 ? (
            <ol className="mt-3 divide-y divide-border/70 border-y border-border/70">
              {read.procedures.rows.map((row) => {
                const share = row.count / total
                const unpublished = isUnpublishedProcedure(row.key)
                const label = procedureLabel(row.key)
                return (
                  <li key={row.key} className={PROCEDURE_ROW_CLASS}>
                    <span className="min-w-0">
                      <span className={cn('block leading-snug text-foreground', unpublished && 'font-semibold')}>{label ? i18n._(label) : row.key}</span>
                      <span className="mt-1 block h-1 bg-muted" aria-hidden="true">
                        <span className={cn('block h-1', unpublished ? 'bg-foreground' : 'bg-primary/70')} style={{ width: `${Math.max(share * 100, 0.6).toFixed(1)}%` }} />
                      </span>
                    </span>
                    <span className="text-right tabular-nums text-muted-foreground">
                      <span className="sr-only">{contractsCount(row.count)}</span>
                      <span aria-hidden="true">{countText(row.count)}</span>
                    </span>
                    <span className="text-right font-semibold tabular-nums text-foreground">{percentText(share)}</span>
                  </li>
                )
              })}
            </ol>
          ) : total === null ? (
            <p className="mt-3 border-y py-3 text-sm text-muted-foreground">
              <Trans>Numărul contractelor din {read.year} nu e disponibil acum.</Trans>
            </p>
          ) : (
            <p className="mt-3 border-y py-3 text-sm text-muted-foreground">
              <Trans>SEAP nu a publicat procedurile contractelor din {read.year}.</Trans>
            </p>
          )}
        </div>
      </div>
    </HomeBand>
  )
}

// ──────────────────────────────────────────────────────── the newest ──

export function HomeRecentBand({
  month,
  national,
  index,
  recent,
  kind,
  onKind,
}: {
  /** The shown population's own newest complete month; null when the source has none yet, undefined until the national read says. */
  readonly month: string | null | undefined
  readonly national: NationalState
  readonly index: string
  readonly recent: { readonly data: readonly RecentRecord[] | undefined; readonly isError: boolean; readonly retry: () => void }
  readonly kind: ProcurementHomeRecent
  readonly onKind: (kind: ProcurementHomeRecent) => void
}) {
  const { i18n } = useLingui()
  const records = recent.data
  const categoryOf = (record: RecentRecord) => (record.cpvCode ? i18n._(categoryOfCode(record.cpvCode).label) : null)
  return (
    <HomeBand id="recente" labelledBy="procurement-home-recent-title">
      <HubSectionHead
        titleId="procurement-home-recent-title"
        index={index}
        title={month ? <Trans>Cele mai mari din {monthText(month)}</Trans> : <Trans>Cele mai noi</Trans>}
        lede={
          month ? (
            kind === 'contracte' ? (
              <>
                <Trans>Contractele cu cea mai mare valoare semnate în {monthText(month)}, cea mai nouă lună completă din SEAP.</Trans>{' '}
                <ProvisionalMark />
              </>
            ) : (
              <Trans>Achizițiile directe cu cea mai mare valoare finalizate în {monthText(month)}, cea mai nouă lună completă din SEAP, fără TVA.</Trans>
            )
          ) : month === undefined && !national.isError ? (
            NATIONAL_LEDE_PENDING
          ) : null
        }
        aside={
          <IndicatorToggle
            label={t`Tipul`}
            options={[
              { key: 'contracte', label: t`Contracte` },
              { key: 'directe', label: t`Achiziții directe` },
            ]}
            value={kind}
            onChange={onKind}
          />
        }
      />
      <div className="mt-8" data-reveal>
        {month === undefined ? (
          national.isError ? (
            <HubLoadError onRetry={national.retry} />
          ) : (
            <PendingRows shape="record" rows={HOME_RECENT_RECORDS} />
          )
        ) : month === null ? (
          <p className="border-y py-4 text-sm text-muted-foreground">
            <Trans>SEAP nu are încă o lună completă pentru acestea.</Trans>
          </p>
        ) : recent.isError && !records ? (
          <HubLoadError onRetry={recent.retry} />
        ) : records ? (
          records.length > 0 ? (
            <RecordRows records={records} lead="title" fallbackTitle={categoryOf} />
          ) : (
            <p className="border-y py-4 text-sm text-muted-foreground">
              <Trans>SEAP nu are încă înregistrări cu valoare pentru această lună.</Trans>
            </p>
          )
        ) : (
          <PendingRows shape="record" rows={HOME_RECENT_RECORDS} />
        )}
      </div>
    </HomeBand>
  )
}

// ─────────────────────────────────────────────────────── ways in ──

/** Three ways into the analytics page; each card opens exactly the answer it names. */
export function HomeStartBand({ year }: { readonly year: number }) {
  const searches = startSearches(year)
  return (
    <section aria-labelledby="procurement-home-start-title">
      <RuledFrame className="py-14 sm:py-20">
        <HubSectionHead titleId="procurement-home-start-title" index={t`Analize`} title={<Trans>De aici poți începe</Trans>} />
        <div className="mt-8" data-reveal>
          <ul className="grid gap-px border bg-border/70 sm:grid-cols-3">
            <StartCard
              search={searches.awards}
              title={<Trans>Contractele atribuite în {year}</Trans>}
              body={<Trans>Fiecare contract, cu instituția, firmele câștigătoare și valoarea publicată.</Trans>}
            />
            <StartCard
              search={searches.frameworks}
              title={<Trans>Acordurile-cadru din {year}</Trans>}
              body={<Trans>Plafoanele în care instituțiile cumpără apoi, fără o nouă licitație: un maxim posibil, nu o cheltuială.</Trans>}
            />
            <StartCard
              search={searches.rankings}
              title={<Trans>Clasamente</Trans>}
              body={<Trans>Instituțiile, firmele și categoriile, după număr și valoare, pe ani.</Trans>}
            />
          </ul>
        </div>
      </RuledFrame>
    </section>
  )
}

function StartCard({ search, title, body }: { readonly search: AnalyticsUrlSearch; readonly title: ReactNode; readonly body: ReactNode }) {
  return (
    <li>
      <Link to="/procurement/analytics" search={search} className="block h-full bg-background p-5 transition-colors hover:bg-muted/40">
        <span className="block text-base font-semibold tracking-tight text-foreground">{title}</span>
        <span className="mt-1.5 block text-sm leading-relaxed text-muted-foreground">{body}</span>
      </Link>
    </li>
  )
}

