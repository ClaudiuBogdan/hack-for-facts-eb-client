import { useState } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import {
  Building2,
  CalendarRange,
  Info,
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
  getPreviousCalendarYearBounds,
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  type ProcurementHubMeasure,
} from '@/schemas/procurement-hub'
import { useProcurementGeographyOptions } from '../hooks/use-procurement-data'
import type { ProcurementHubFilterState } from '../hooks/use-procurement-hub-state'
import { formatProcurementCountyName } from '../lib/procurement-geography'
import {
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
import { ProcurementPreviewBadge } from './procurement-preview-badge'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly hub: ProcurementHubFilterState
}

/**
 * Full shared hub filter sheet (D3) — period, geography, and list facets.
 * Unfinished controls stay visible with Preview / TODO honesty (B1).
 */
export function ProcurementHubFilterSheet({ open, onOpenChange, hub }: Props) {
  const { state, period, listFilterState } = hub
  const [buyerLevel, setBuyerLevel] = useState<'region' | 'county'>(
    state.buyerCounty ? 'county' : 'region',
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

  const changeBuyerLevel = (level: 'region' | 'county') => {
    setBuyerLevel(level)
    hub.setBuyerGeography({
      buyerRegion: undefined,
      buyerCounty: undefined,
      buyerSiruta: undefined,
    })
  }

  const changeBuyerLocation = (value: string | undefined) => {
    hub.setBuyerGeography({
      buyerRegion: buyerLevel === 'region' ? value : undefined,
      buyerCounty: buyerLevel === 'county' ? value : undefined,
      buyerSiruta: undefined,
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
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>
              Shared filters for Overview, Map, and List. Unsupported controls
              stay visible and are marked when they are not applied yet.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <section
            className="space-y-4"
            aria-labelledby="hub-period-label"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />
                <p id="hub-period-label" className={procurementSectionLabelClassName}>
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

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className={cn(
                  procurementOutlineButtonClassName,
                  'h-9 px-3 text-xs',
                  period.isDefault && 'border-[var(--pnrr-fg)]',
                )}
                onClick={() => {
                  const bounds = getPreviousCalendarYearBounds()
                  hub.setDates(bounds.dateFrom, bounds.dateTo)
                }}
              >
                <Trans>Previous year</Trans>
              </Button>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  procurementOutlineButtonClassName,
                  'h-9 px-3 text-xs',
                  period.isAllTime && 'border-[var(--pnrr-fg)]',
                )}
                onClick={hub.setPeriodAll}
              >
                <Trans>All time</Trans>
              </Button>
            </div>

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
            aria-labelledby="hub-measure-label"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                <p id="hub-measure-label" className={procurementSectionLabelClassName}>
                  <Trans>Metric</Trans>
                </p>
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Shared across Overview, Map, and List. Count is the default;
                  awarded value stays secondary where amounts are answerable.
                </Trans>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: 'record_count' as const, label: t`Record count` },
                  { id: 'value_awarded' as const, label: t`Awarded value` },
                ] satisfies ReadonlyArray<{
                  id: ProcurementHubMeasure
                  label: string
                }>
              ).map((option) => (
                <Button
                  key={option.id}
                  type="button"
                  variant="outline"
                  aria-pressed={state.measure === option.id}
                  className={cn(
                    procurementOutlineButtonClassName,
                    'h-9 px-3 text-xs',
                    state.measure === option.id && 'border-[var(--pnrr-fg)]',
                  )}
                  onClick={() => hub.updateFilters({ measure: option.id })}
                >
                  {option.label}
                </Button>
              ))}
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
                  Administrative territory linked to the contracting
                  institution in the procurement dataset.
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
              <div className="grid grid-cols-2 gap-2">
                {(['region', 'county'] as const).map((level) => (
                  <Button
                    key={level}
                    type="button"
                    variant="outline"
                    aria-pressed={buyerLevel === level}
                    className={
                      buyerLevel === level
                        ? 'h-10 rounded-none border-2 border-[#1d70b8] bg-[#e8f1f8] font-bold text-[#0b0c0c] hover:bg-[#d5e8f4] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]'
                        : 'h-10 rounded-none border-2 font-bold'
                    }
                    onClick={() => changeBuyerLevel(level)}
                  >
                    {level === 'region' ? (
                      <Trans>Region</Trans>
                    ) : (
                      <Trans>County</Trans>
                    )}
                  </Button>
                ))}
              </div>
            </fieldset>

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
                buyerLevel === 'region' ? state.buyerRegion : state.buyerCounty
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

            {buyerLevel === 'county' ? (
              <div className="flex gap-2 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm leading-5 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>
                  <Trans>
                    County analytics are not published yet. This first version
                    applies the county’s region and labels the result as a
                    regional approximation.
                  </Trans>
                </p>
              </div>
            ) : null}
          </section>

          <section
            className="space-y-3 border-t-2 border-[#b1b4b6] pt-6 dark:border-[var(--pnrr-border)]"
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
                {/* TODO(Supplier geo resolution + list filter): control stays Preview until Matrix v2. */}
                <ProcurementPreviewBadge
                  reason={t`Supplier geography is not linked to records yet`}
                />
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>Registered office of the awarded company.</Trans>
              </p>
            </div>
            <div className="border-l-4 border-[#1d70b8] bg-[#e8f1f8] p-3 text-sm leading-5 text-[#0b0c0c] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]">
              <Trans>
                Region and county names are available, but procurement records
                are not yet linked to supplier geography. This filter will be
                enabled when Matrix v2 can apply it without returning
                unfiltered data.
              </Trans>
            </div>
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
                    These facets apply on List. On Overview they stay in the
                    URL as inactive “list only” chips.
                  </Trans>
                ) : (
                  <Trans>
                    These facets narrow the paginated record list.
                  </Trans>
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
