import { useState, type ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { Link } from '@tanstack/react-router'
import {
  CalendarRange,
  Coins,
  ListFilter,
  MapPin,
  SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import {
  isListCapabilityAvailable,
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  procurementValueBasisSchema,
  type ProcurementHubMeasure,
  type ProcurementValueBasis,
} from '@/schemas/procurement-hub'
import { useProcurementGeographyOptions } from '../hooks/use-procurement-data'
import type { ProcurementHubFilterState } from '../hooks/use-procurement-hub-state'
import { formatProcurementCountyName } from '../lib/procurement-geography'
import {
  procurementChoiceButtonActiveClassName,
  procurementChoiceButtonClassName,
  procurementDateInputClassName,
  procurementOutlineButtonClassName,
  procurementPrimaryButtonClassName,
  procurementSectionLabelClassName,
} from '../lib/procurement-theme'
import {
  ProcurementGeographyCombobox,
  type ProcurementGeographyPickerOption,
} from './procurement-geography-combobox'
import { ProcurementListFilterFields } from './procurement-filter-sheet'
import { ProcurementPeriodYearPresets } from './procurement-period-year-presets'
import {
  valueBasisLabel,
  valueBasisMoneyLabel,
  valueBasisQuestion,
} from '../lib/value-basis-meta'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly hub: ProcurementHubFilterState
}

type GeographyLevel = 'national' | 'region' | 'county'

function resolveGeographyLevel(params: {
  readonly region?: string
  readonly county?: string
  readonly siruta?: string
}): GeographyLevel {
  if (params.siruta || params.county) return 'county'
  if (params.region) return 'region'
  return 'national'
}

function formatMonthShort(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}

/** Collapsed-section trigger: icon + label left, active-value summary right. */
function FilterSectionTrigger({
  icon: Icon,
  title,
  summary,
}: {
  readonly icon: LucideIcon
  readonly title: ReactNode
  readonly summary: ReactNode
}) {
  return (
    <AccordionTrigger className="py-4 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] [&>svg]:h-4 [&>svg]:w-4">
      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-3">
        <span className="flex shrink-0 items-center gap-2">
          <Icon className="h-4 w-4" aria-hidden="true" />
          <span className={procurementSectionLabelClassName}>{title}</span>
        </span>
        <span className="min-w-0 truncate text-xs font-semibold normal-case tracking-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
          {summary}
        </span>
      </span>
    </AccordionTrigger>
  )
}

/**
 * Full shared hub filter sheet (D3) — period, metric, geography, and list facets.
 * Record type (grain) lives on each view’s own toolbar — Overview/Rankings use
 * contracts vs DA; List uses the full grain tabs. Unfinished controls stay
 * visible with Preview / TODO honesty (B1).
 *
 * Sections collapse into an accordion whose triggers carry the active value,
 * so the panel reads as a summary first and a form second. The common path
 * (metric, period) stays open; geography, list facets and the advanced value
 * logic open on demand.
 */
export function ProcurementHubFilterSheet({ open, onOpenChange, hub }: Props) {
  const { state, period, listFilterState } = hub
  const [buyerLevel, setBuyerLevel] = useState<GeographyLevel>(() =>
    resolveGeographyLevel({
      region: state.buyerRegion,
      county: state.buyerCounty,
      siruta: state.buyerSiruta,
    }),
  )
  const [supplierLevel, setSupplierLevel] = useState<GeographyLevel>(() =>
    resolveGeographyLevel({
      region: state.supplierRegion,
      county: state.supplierCounty,
      siruta: state.supplierSiruta,
    }),
  )
  const geographyQuery = useProcurementGeographyOptions()
  const displayDateFrom = period.isAllTime ? undefined : period.dateFrom
  const displayDateTo = period.isAllTime ? undefined : period.dateTo
  const onList = state.view === 'list'
  // Territory availability comes from the ONE capability registry, so the
  // control's promise and the query builder's behaviour cannot diverge.
  const buyerGeoOnList = isListCapabilityAvailable('buyer-geo', state.grain)
  const supplierGeoOnList = isListCapabilityAvailable('supplier-geo', state.grain)

  // The modifications population is counts-only — the value option must not
  // pretend, so the EFFECTIVE metric drives both the control and the summary.
  const countsOnlyGrain = state.grain === 'modifications'
  const effectiveMeasure: ProcurementHubMeasure = countsOnlyGrain
    ? 'record_count'
    : state.measure

  const measureSummary =
    effectiveMeasure === 'value_awarded'
      ? valueBasisMoneyLabel(state.vbasis)
      : t`Record count`
  const periodSummary = period.isAllTime
    ? t`All time`
    : `${period.dateFrom ? formatMonthShort(period.dateFrom) : '…'} – ${period.dateTo ? formatMonthShort(period.dateTo) : '…'}`
  const buyerGeoSummary = state.buyerSiruta
    ? `UAT ${state.buyerSiruta}`
    : (state.buyerCounty ?? state.buyerRegion ?? null)
  const supplierGeoSummary = state.supplierSiruta
    ? `UAT ${state.supplierSiruta}`
    : (state.supplierCounty ?? state.supplierRegion ?? null)
  const locationsSummary =
    [buyerGeoSummary, supplierGeoSummary].filter(Boolean).join(' · ') ||
    t`National`
  const listFacetCount = [
    state.authority_cui,
    state.supplier_cui,
    state.cpv,
    state.cpv_category,
    state.cpv_class,
    state.cpv_group,
    state.cpv_division,
    state.source,
    state.status?.length ? 'status' : undefined,
    state.value_state?.length ? 'value' : undefined,
    state.record_kind?.length ? 'kind' : undefined,
    state.valueMin !== undefined ? 'min' : undefined,
    state.valueMax !== undefined ? 'max' : undefined,
  ].filter(Boolean).length
  const vbasisSummary =
    state.vbasis === 'awarded' ? t`Default` : valueBasisLabel(state.vbasis)

  const regionOptions: readonly ProcurementGeographyPickerOption[] =
    geographyQuery.data?.regions.map((region) => ({
      value: region.region,
      label: region.region,
      description: t`${region.countyCount} counties · ${region.uatCount} localities`,
    })) ?? []
  const countyOptions: readonly ProcurementGeographyPickerOption[] =
    geographyQuery.data?.counties.map((county) => ({
      value: county.countyCode,
      label: t`${formatProcurementCountyName(county.countyName)} County`,
      description: county.region
        ? t`${county.region} region · code ${county.countyCode}`
        : t`County code ${county.countyCode}`,
    })) ?? []

  const setDateFrom = (value: string | undefined) => {
    const dateFrom = normalizeProcurementMonthStart(value)
    const dateTo =
      dateFrom && displayDateTo && dateFrom > displayDateTo
        ? normalizeProcurementMonthEnd(dateFrom)
        : displayDateTo
    hub.setDates(dateFrom, dateTo)
  }

  const setDateTo = (value: string | undefined) => {
    const dateTo = normalizeProcurementMonthEnd(value)
    const dateFrom =
      dateTo && displayDateFrom && displayDateFrom > dateTo
        ? normalizeProcurementMonthStart(dateTo)
        : displayDateFrom
    hub.setDates(dateFrom, dateTo)
  }

  const changeBuyerLevel = (level: GeographyLevel) => {
    setBuyerLevel(level)
    hub.setBuyerGeography({
      buyerRegion: undefined,
      buyerCounty: undefined,
      buyerSiruta: undefined,
    })
  }

  const changeBuyerLocation = (value: string | undefined) => {
    if (!value) {
      setBuyerLevel('national')
      hub.setBuyerGeography({
        buyerRegion: undefined,
        buyerCounty: undefined,
        buyerSiruta: undefined,
      })
      return
    }
    hub.setBuyerGeography({
      buyerRegion: buyerLevel === 'region' ? value : undefined,
      buyerCounty: buyerLevel === 'county' ? value : undefined,
      buyerSiruta: undefined,
    })
  }

  const changeSupplierLevel = (level: GeographyLevel) => {
    setSupplierLevel(level)
    hub.setSupplierGeography({
      supplierRegion: undefined,
      supplierCounty: undefined,
      supplierSiruta: undefined,
    })
  }

  const changeSupplierLocation = (value: string | undefined) => {
    if (!value) {
      setSupplierLevel('national')
      hub.setSupplierGeography({
        supplierRegion: undefined,
        supplierCounty: undefined,
        supplierSiruta: undefined,
      })
      return
    }
    hub.setSupplierGeography({
      supplierRegion: supplierLevel === 'region' ? value : undefined,
      supplierCounty: supplierLevel === 'county' ? value : undefined,
      supplierSiruta: undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden overscroll-contain border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>Filter procurement data</Trans>
          </SheetTitle>
          <SheetDescription className="sr-only">
            <Trans>Filter procurement data</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="min-w-0 flex-1 overflow-y-auto px-6">
          <Accordion
            type="multiple"
            defaultValue={['metric', 'period']}
            className="w-full"
          >
            <AccordionItem
              value="metric"
              className="border-b-2 border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            >
              <FilterSectionTrigger
                icon={SlidersHorizontal}
                title={t`Metric`}
                summary={measureSummary}
              />
              <AccordionContent className="space-y-4 pb-6">
                <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>What the charts and totals count.</Trans>
                </p>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      // The value option follows the ACTIVE value logic —
                      // calling a ceiling or call-off metric "Awarded value"
                      // would misname what the charts actually show.
                      {
                        id: 'value_awarded' as const,
                        label: valueBasisMoneyLabel(state.vbasis),
                      },
                      { id: 'record_count' as const, label: t`Record count` },
                    ] satisfies ReadonlyArray<{
                      id: ProcurementHubMeasure
                      label: string
                    }>
                  ).map((option) => {
                    const active = effectiveMeasure === option.id
                    const disabled =
                      option.id === 'value_awarded' && countsOnlyGrain
                    return (
                      <Button
                        key={option.id}
                        type="button"
                        variant="outline"
                        aria-pressed={active}
                        disabled={disabled}
                        title={
                          disabled
                            ? t`Modifications are counts-only — no money measure is served for them.`
                            : undefined
                        }
                        className={cn(
                          procurementChoiceButtonClassName,
                          active && procurementChoiceButtonActiveClassName,
                        )}
                        onClick={() => hub.updateFilters({ measure: option.id })}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="period"
              className="border-b-2 border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            >
              <FilterSectionTrigger
                icon={CalendarRange}
                title={t`Period`}
                summary={periodSummary}
              />
              <AccordionContent className="space-y-4 pb-6">
                <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>
                    Default is the previous calendar year. Dates snap to month
                    bounds.
                  </Trans>
                </p>

                <ProcurementPeriodYearPresets
                  period={period}
                  onSelectYear={(bounds) =>
                    hub.setDates(bounds.dateFrom, bounds.dateTo)
                  }
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="hub-date-from" className="text-sm font-bold">
                      <Trans>From</Trans>
                    </Label>
                    <input
                      id="hub-date-from"
                      name="procurement-date-from"
                      type="date"
                      autoComplete="off"
                      className={procurementDateInputClassName}
                      value={displayDateFrom ?? ''}
                      max={displayDateTo ?? undefined}
                      onChange={(event) =>
                        setDateFrom(event.target.value || undefined)
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hub-date-to" className="text-sm font-bold">
                      <Trans>To</Trans>
                    </Label>
                    <input
                      id="hub-date-to"
                      name="procurement-date-to"
                      type="date"
                      autoComplete="off"
                      className={procurementDateInputClassName}
                      value={displayDateTo ?? ''}
                      min={displayDateFrom ?? undefined}
                      onChange={(event) =>
                        setDateTo(event.target.value || undefined)
                      }
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="locations"
              className="border-b-2 border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            >
              <FilterSectionTrigger
                icon={MapPin}
                title={t`Locations`}
                summary={locationsSummary}
              />
              <AccordionContent className="space-y-6 pb-6">
                <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>
                    Territory of the contracting institution or the awarded
                    company. National means no territorial filter.
                  </Trans>
                </p>

                <div className="space-y-4">
                  <p className={procurementSectionLabelClassName}>
                    <Trans>Public Institution Location</Trans>
                  </p>
                  {onList && !buyerGeoOnList ? (
                    <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
                      <Trans>
                        Contract modifications are not in the search index, so
                        buyer location does not filter this record list. It
                        still scopes the analytics views.
                      </Trans>
                    </p>
                  ) : null}

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-bold">
                      <Trans>Territorial Level</Trans>
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'national' as const, label: t`National` },
                          { id: 'region' as const, label: t`Region` },
                          { id: 'county' as const, label: t`County` },
                        ] as const
                      ).map((level) => {
                        const active = buyerLevel === level.id
                        return (
                          <Button
                            key={level.id}
                            type="button"
                            variant="outline"
                            aria-pressed={active}
                            className={cn(
                              procurementChoiceButtonClassName,
                              'h-10 w-full justify-center font-bold',
                              active && procurementChoiceButtonActiveClassName,
                            )}
                            onClick={() => changeBuyerLevel(level.id)}
                          >
                            {level.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  {buyerLevel !== 'national' ? (
                    <>
                      <ProcurementGeographyCombobox
                        inputId="hub-buyer-location"
                        label={buyerLevel === 'region' ? t`Region` : t`County`}
                        placeholder={
                          buyerLevel === 'region'
                            ? t`Select a region…`
                            : t`Select a county…`
                        }
                        options={
                          buyerLevel === 'region' ? regionOptions : countyOptions
                        }
                        value={
                          buyerLevel === 'region'
                            ? state.buyerRegion
                            : state.buyerCounty
                        }
                        loading={geographyQuery.isPending}
                        disabled={geographyQuery.isError}
                        onChange={changeBuyerLocation}
                      />
                      {geographyQuery.isError ? (
                        <div
                          className="space-y-2 border-l-4 border-red-600 pl-3 text-sm"
                          role="alert"
                        >
                          <p>
                            <Trans>Location options could not be loaded.</Trans>
                          </p>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-none"
                            onClick={() => void geographyQuery.refetch()}
                          >
                            <Trans>Retry Loading Locations</Trans>
                          </Button>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <div className="space-y-4 border-t border-[#b1b4b6] pt-5 dark:border-[var(--pnrr-border)]">
                  <p className={procurementSectionLabelClassName}>
                    <Trans>Supplier Location</Trans>
                  </p>
                  {onList && !supplierGeoOnList ? (
                    <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
                      <Trans>
                        These records name no awarded supplier, so supplier
                        location cannot filter this record list. It still
                        scopes the analytics views.
                      </Trans>
                    </p>
                  ) : null}

                  <fieldset className="space-y-2">
                    <legend className="text-sm font-bold">
                      <Trans>Territorial Level</Trans>
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { id: 'national' as const, label: t`National` },
                          { id: 'region' as const, label: t`Region` },
                          { id: 'county' as const, label: t`County` },
                        ] as const
                      ).map((level) => {
                        const active = supplierLevel === level.id
                        return (
                          <Button
                            key={level.id}
                            type="button"
                            variant="outline"
                            aria-pressed={active}
                            className={cn(
                              procurementChoiceButtonClassName,
                              'h-10 w-full justify-center font-bold',
                              active && procurementChoiceButtonActiveClassName,
                            )}
                            onClick={() => changeSupplierLevel(level.id)}
                          >
                            {level.label}
                          </Button>
                        )
                      })}
                    </div>
                  </fieldset>

                  {supplierLevel !== 'national' ? (
                    <ProcurementGeographyCombobox
                      inputId="hub-supplier-location"
                      label={supplierLevel === 'region' ? t`Region` : t`County`}
                      placeholder={
                        supplierLevel === 'region'
                          ? t`Select a region…`
                          : t`Select a county…`
                      }
                      options={
                        supplierLevel === 'region' ? regionOptions : countyOptions
                      }
                      value={
                        supplierLevel === 'region'
                          ? state.supplierRegion
                          : state.supplierCounty
                      }
                      loading={geographyQuery.isPending}
                      disabled={geographyQuery.isError}
                      onChange={changeSupplierLocation}
                    />
                  ) : null}
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="list-filters"
              className="border-b-2 border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            >
              <FilterSectionTrigger
                icon={ListFilter}
                title={t`List filters`}
                summary={
                  listFacetCount > 0
                    ? t`${listFacetCount} active`
                    : t`None`
                }
              />
              <AccordionContent className="space-y-4 pb-6">
                <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  {!onList ? (
                    <Trans>
                      Apply on the List view — until then they stay in the URL
                      as inactive chips.
                    </Trans>
                  ) : (
                    <Trans>Narrow the paginated record list.</Trans>
                  )}
                </p>
                <div className="space-y-6">
                  <ProcurementListFilterFields
                    filters={listFilterState}
                    includePeriod={false}
                    idPrefix="hub-list"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="value-logic"
              className="border-b-2 border-[#b1b4b6] dark:border-[var(--pnrr-border)]"
            >
              <FilterSectionTrigger
                icon={Coins}
                title={t`Value logic`}
                summary={vbasisSummary}
              />
              <AccordionContent className="space-y-4 pb-6">
                <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>
                    Advanced — which money figure the analytics serve. Figures
                    are never mixed or summed together.
                  </Trans>{' '}
                  <Link
                    to="/achizitii/metodologie"
                    className="font-bold underline underline-offset-2"
                  >
                    <Trans>Methodology</Trans>
                  </Link>
                </p>
                <div
                  className="flex flex-col gap-2"
                  role="radiogroup"
                  aria-label={t`Value logic`}
                >
                  {procurementValueBasisSchema.options.map(
                    (option: ProcurementValueBasis) => {
                      const active = state.vbasis === option
                      return (
                        <Button
                          key={option}
                          type="button"
                          variant="outline"
                          role="radio"
                          aria-checked={active}
                          className={cn(
                            procurementChoiceButtonClassName,
                            'h-auto w-full flex-col items-start gap-0.5 whitespace-normal py-2 text-left',
                            active && procurementChoiceButtonActiveClassName,
                          )}
                          onClick={() =>
                            hub.updateFilters({
                              vbasis: option,
                              // The counts-only modifications grain carries no
                              // alternative value logic — selecting one moves
                              // to contracts instead of silently normalizing.
                              ...(state.grain === 'modifications' &&
                              option !== 'awarded'
                                ? { grain: 'contracts' as const }
                                : {}),
                            })
                          }
                        >
                          <span className="font-bold">
                            {valueBasisLabel(option)}
                            {option === 'awarded' ? (
                              <span className="ml-1.5 font-normal opacity-80">
                                <Trans>(default)</Trans>
                              </span>
                            ) : null}
                          </span>
                          <span
                            className={cn(
                              'text-xs leading-5',
                              active ? 'opacity-90' : 'text-[var(--pnrr-muted)]',
                            )}
                          >
                            {valueBasisQuestion(option)}
                          </span>
                        </Button>
                      )
                    },
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="border-t-2 border-[#b1b4b6] bg-white p-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)]">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className={procurementOutlineButtonClassName}
              disabled={hub.hubChips.length === 0}
              onClick={hub.clearFilters}
            >
              <Trans>Clear all</Trans>
            </Button>
            <Button
              type="button"
              className={procurementPrimaryButtonClassName}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Show results</Trans>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function ProcurementHubFilterTrigger({
  activeCount,
  onClick,
}: {
  readonly activeCount: number
  readonly onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      className="relative h-10 gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)] sm:px-4"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={
        activeCount > 0 ? t`Filters, ${activeCount} active` : t`Open filters`
      }
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        <Trans>Filter data</Trans>
      </span>
      {activeCount > 0 ? (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--pnrr-fg)] p-0 text-[11px] text-[var(--pnrr-bg)]"
        >
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  )
}
