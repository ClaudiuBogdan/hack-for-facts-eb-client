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
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import {
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
  resolveProcurementOverviewPeriod,
} from '@/schemas/procurement-overview'
import { useProcurementGeographyOptions } from '../hooks/use-procurement-data'
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
import { ProcurementPeriodYearPresets } from './procurement-period-year-presets'

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly filters: ProcurementLandingFilters
  readonly onChange: (filters: ProcurementLandingFilters) => void
}

type GeographyLevel = 'national' | 'region' | 'county'

function resolveGeographyLevel(params: {
  readonly region?: string
  readonly county?: string
}): GeographyLevel {
  if (params.county) return 'county'
  if (params.region) return 'region'
  return 'national'
}

export function ProcurementOverviewFilterSheet({
  open,
  onOpenChange,
  filters,
  onChange,
}: Props) {
  const [buyerLevel, setBuyerLevel] = useState<GeographyLevel>(() =>
    resolveGeographyLevel({
      region: filters.buyerRegion,
      county: filters.buyerCounty,
    }),
  )
  const [supplierLevel, setSupplierLevel] = useState<GeographyLevel>(() =>
    resolveGeographyLevel({
      region: filters.supplierRegion,
      county: filters.supplierCounty ?? filters.supplierSiruta,
    }),
  )
  const geographyQuery = useProcurementGeographyOptions()
  const resolvedPeriod = resolveProcurementOverviewPeriod(filters)
  const displayDateFrom = resolvedPeriod.isAllTime
    ? undefined
    : resolvedPeriod.dateFrom
  const displayDateTo = resolvedPeriod.isAllTime
    ? undefined
    : resolvedPeriod.dateTo
  const activeCount =
    (resolvedPeriod.isAllTime ? 0 : 1) +
    (filters.buyerRegion || filters.buyerCounty ? 1 : 0) +
    (filters.supplierRegion || filters.supplierCounty || filters.supplierSiruta
      ? 1
      : 0)

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
    onChange({
      ...filters,
      period: undefined,
      dateFrom,
      dateTo,
    })
  }

  const setDateTo = (value: string | undefined) => {
    const dateTo = normalizeProcurementMonthEnd(value)
    const dateFrom =
      dateTo && displayDateFrom && displayDateFrom > dateTo
        ? normalizeProcurementMonthStart(dateTo)
        : displayDateFrom
    onChange({
      ...filters,
      period: undefined,
      dateFrom,
      dateTo,
    })
  }

  const setCalendarYear = (bounds: {
    readonly dateFrom: string
    readonly dateTo: string
  }) => {
    onChange({
      ...filters,
      period: undefined,
      dateFrom: bounds.dateFrom,
      dateTo: bounds.dateTo,
    })
  }

  const changeBuyerLevel = (level: GeographyLevel) => {
    setBuyerLevel(level)
    onChange({
      ...filters,
      buyerRegion: undefined,
      buyerCounty: undefined,
    })
  }

  const changeBuyerLocation = (value: string | undefined) => {
    if (!value) {
      setBuyerLevel('national')
      onChange({
        ...filters,
        buyerRegion: undefined,
        buyerCounty: undefined,
      })
      return
    }
    onChange({
      ...filters,
      buyerRegion: buyerLevel === 'region' ? value : undefined,
      buyerCounty: buyerLevel === 'county' ? value : undefined,
    })
  }

  const changeSupplierLevel = (level: GeographyLevel) => {
    setSupplierLevel(level)
    onChange({
      ...filters,
      supplierRegion: undefined,
      supplierCounty: undefined,
      supplierSiruta: undefined,
    })
  }

  const changeSupplierLocation = (value: string | undefined) => {
    if (!value) {
      setSupplierLevel('national')
      onChange({
        ...filters,
        supplierRegion: undefined,
        supplierCounty: undefined,
        supplierSiruta: undefined,
      })
      return
    }
    onChange({
      ...filters,
      supplierRegion: supplierLevel === 'region' ? value : undefined,
      supplierCounty: supplierLevel === 'county' ? value : undefined,
      supplierSiruta: undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-full flex-col gap-0 overflow-hidden overscroll-contain border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md">
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>Filter procurement data</Trans>
          </SheetTitle>
          <SheetDescription className="sr-only">
            <Trans>
              Period and location filters apply to every supported indicator and
              analysis on this page.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <section
            className="space-y-4"
            aria-labelledby="procurement-period-label"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CalendarRange className="h-4 w-4" aria-hidden="true" />
                <p
                  id="procurement-period-label"
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
              period={resolvedPeriod}
              onSelectYear={setCalendarYear}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="overview-date-from" className="text-sm font-bold">
                  <Trans>From</Trans>
                </Label>
                <input
                  id="overview-date-from"
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
                <Label htmlFor="overview-date-to" className="text-sm font-bold">
                  <Trans>To</Trans>
                </Label>
                <input
                  id="overview-date-to"
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

            <p className="border-l-4 border-[#1d70b8] pl-3 text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                Full dates remain in the URL; the live analytics API receives
                the matching calendar months.
              </Trans>
            </p>
          </section>

          <section
            className="space-y-4 border-t-2 border-[#b1b4b6] pt-6 dark:border-[var(--pnrr-border)]"
            aria-labelledby="procurement-buyer-location-label"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" aria-hidden="true" />
                <p
                  id="procurement-buyer-location-label"
                  className={procurementSectionLabelClassName}
                >
                  <Trans>Public Institution Location</Trans>
                </p>
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Administrative territory linked to the contracting institution
                  in the procurement dataset. National covers all institutions
                  with no region or county filter.
                </Trans>
              </p>
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
                  inputId="procurement-buyer-location"
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
                      ? filters.buyerRegion
                      : filters.buyerCounty
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
            aria-labelledby="procurement-supplier-location-label"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                <p
                  id="procurement-supplier-location-label"
                  className={procurementSectionLabelClassName}
                >
                  <Trans>Supplier Location</Trans>
                </p>
              </div>
              <p className="text-sm leading-6 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>
                  Registered office of the awarded company. National covers all
                  suppliers with no region or county filter.
                </Trans>
              </p>
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
                inputId="procurement-supplier-location"
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
                    ? filters.supplierRegion
                    : filters.supplierCounty
                }
                loading={geographyQuery.isPending}
                disabled={geographyQuery.isError}
                onChange={changeSupplierLocation}
              />
            ) : null}
          </section>
        </div>

        <div className="border-t-2 border-[#b1b4b6] bg-white p-4 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)]">
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              className={procurementOutlineButtonClassName}
              disabled={activeCount === 0}
              onClick={() => onChange({})}
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

export function ProcurementOverviewFilterTrigger({
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
