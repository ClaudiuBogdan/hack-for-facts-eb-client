import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Building2,
  CalendarRange,
  MapPin,
  SlidersHorizontal,
} from 'lucide-react'
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
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  type ProcurementHubMeasure,
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
import { ProcurementPreviewBadge } from './procurement-preview-badge'

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

/**
 * Full shared hub filter sheet (D3) — period, metric, geography, and list facets.
 * Record type (grain) lives on each view’s own toolbar — Overview/Rankings use
 * contracts vs DA; List uses the full grain tabs. Unfinished controls stay
 * visible with Preview / TODO honesty (B1).
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

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-4" aria-labelledby="hub-measure-label">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <p
                  id="hub-measure-label"
                  className={procurementSectionLabelClassName}
                >
                  <Trans>Metric</Trans>
                </p>
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Shared across Overview and List. Awarded value is the default;
                  switch to record count when amounts are missing or you care
                  about volume.
                </Trans>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'value_awarded' as const, label: t`Awarded value` },
                  { id: 'record_count' as const, label: t`Record count` },
                ] satisfies ReadonlyArray<{
                  id: ProcurementHubMeasure
                  label: string
                }>
              ).map((option) => {
                const active = state.measure === option.id
                return (
                  <Button
                    key={option.id}
                    type="button"
                    variant="outline"
                    aria-pressed={active}
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
          </section>

          <section
            className="space-y-4 border-t-2 border-[#b1b4b6] pt-6 dark:border-[var(--pnrr-border)]"
            aria-labelledby="hub-period-label"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />
                <p
                  id="hub-period-label"
                  className={procurementSectionLabelClassName}
                >
                  <Trans>Period</Trans>
                </p>
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Default is the previous calendar year. Analytics are monthly —
                  start dates become the first day of the month and end dates
                  become its last day.
                </Trans>
              </p>
            </div>

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
          </section>

          <section
            className="space-y-4 border-t-2 border-[#b1b4b6] pt-6 dark:border-[var(--pnrr-border)]"
            aria-labelledby="hub-buyer-location-label"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <p
                  id="hub-buyer-location-label"
                  className={procurementSectionLabelClassName}
                >
                  <Trans>Public Institution Location</Trans>
                </p>
                {onList ? (
                  <ProcurementPreviewBadge
                    reason={t`Not applied to the record list yet`}
                  />
                ) : null}
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Administrative territory linked to the contracting institution
                  in the procurement dataset. National covers all institutions
                  with no region or county filter.
                </Trans>
              </p>
              {/* TODO(Search geography API): buyer territory is not applied to list GraphQL filters. */}
              {onList ? (
                <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
                  <Trans>
                    Buyer location is kept in the URL for round-trip, but it is
                    not applied to the record list yet.
                  </Trans>
                </p>
              ) : null}
            </div>

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
          </section>

          <section
            className="space-y-4 border-t-2 border-[#b1b4b6] pt-6 dark:border-[var(--pnrr-border)]"
            aria-labelledby="hub-supplier-location-label"
          >
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <p
                  id="hub-supplier-location-label"
                  className={procurementSectionLabelClassName}
                >
                  <Trans>Supplier Location</Trans>
                </p>
                {onList ? (
                  <ProcurementPreviewBadge
                    reason={t`Not applied to the record list yet`}
                  />
                ) : null}
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Registered office of the awarded company. National covers all
                  suppliers with no region or county filter.
                </Trans>
              </p>
              {onList ? (
                <p className="border-l-4 border-amber-500 pl-3 text-sm leading-6 text-[var(--pnrr-muted)]">
                  <Trans>
                    Supplier location scopes the analytics; it is kept in the
                    URL for round-trip but is not applied to the record list
                    yet.
                  </Trans>
                </p>
              ) : null}
            </div>

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
          </section>

          <section
            className="space-y-4 border-t-2 border-[#b1b4b6] pt-6 dark:border-[var(--pnrr-border)]"
            aria-labelledby="hub-list-facets-label"
          >
            <div className="space-y-1">
              <p
                id="hub-list-facets-label"
                className={procurementSectionLabelClassName}
              >
                <Trans>Record list filters</Trans>
              </p>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                {!onList ? (
                  <Trans>
                    These facets apply on List. On Overview they stay in the URL
                    as inactive “list only” chips.
                  </Trans>
                ) : (
                  <Trans>These facets narrow the paginated record list.</Trans>
                )}
              </p>
            </div>
            <div className="space-y-6">
              <ProcurementListFilterFields
                filters={listFilterState}
                includePeriod={false}
                idPrefix="hub-list"
              />
            </div>
          </section>
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
              <Trans>Clear All Filters</Trans>
            </Button>
            <Button
              type="button"
              className={procurementPrimaryButtonClassName}
              onClick={() => onOpenChange(false)}
            >
              <Trans>Close</Trans>
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
