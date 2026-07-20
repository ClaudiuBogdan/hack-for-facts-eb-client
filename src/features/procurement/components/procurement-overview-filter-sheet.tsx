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
import type { ProcurementLandingFilters } from '@/schemas/procurement-overview'
import {
  normalizeProcurementMonthEnd,
  normalizeProcurementMonthStart,
} from '@/schemas/procurement-overview'
import { useProcurementGeographyOptions } from '../hooks/use-procurement-data'
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

type Props = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly filters: ProcurementLandingFilters
  readonly onChange: (filters: ProcurementLandingFilters) => void
}

export function ProcurementOverviewFilterSheet({
  open,
  onOpenChange,
  filters,
  onChange,
}: Props) {
  const [buyerLevel, setBuyerLevel] = useState<'region' | 'county'>(
    filters.buyerCounty ? 'county' : 'region',
  )
  const geographyQuery = useProcurementGeographyOptions()
  const activeCount =
    (filters.dateFrom || filters.dateTo ? 1 : 0) +
    (filters.buyerRegion || filters.buyerCounty ? 1 : 0) +
    (filters.supplierRegion || filters.supplierCounty ? 1 : 0)

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
      dateFrom && filters.dateTo && dateFrom > filters.dateTo
        ? normalizeProcurementMonthEnd(dateFrom)
        : filters.dateTo
    onChange({ ...filters, dateFrom, dateTo })
  }

  const setDateTo = (value: string | undefined) => {
    const dateTo = normalizeProcurementMonthEnd(value)
    const dateFrom =
      dateTo && filters.dateFrom && filters.dateFrom > dateTo
        ? normalizeProcurementMonthStart(dateTo)
        : filters.dateFrom
    onChange({ ...filters, dateFrom, dateTo })
  }

  const changeBuyerLevel = (level: 'region' | 'county') => {
    setBuyerLevel(level)
    onChange({
      ...filters,
      buyerRegion: undefined,
      buyerCounty: undefined,
    })
  }

  const changeBuyerLocation = (value: string | undefined) => {
    onChange({
      ...filters,
      buyerRegion: buyerLevel === 'region' ? value : undefined,
      buyerCounty: buyerLevel === 'county' ? value : undefined,
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden overscroll-contain border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>Filter procurement data</Trans>
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>
              Period and location filters apply to every supported indicator
              and analysis on this page.
            </Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="min-w-0 flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-4" aria-labelledby="procurement-period-label">
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
                  Analytics are monthly. Start dates become the first day of
                  the month and end dates become its last day.
                </Trans>
              </p>
            </div>

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
                  value={filters.dateFrom ?? ''}
                  max={filters.dateTo ?? undefined}
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
                  value={filters.dateTo ?? ''}
                  min={filters.dateFrom ?? undefined}
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
                  Administrative territory linked to the contracting
                  institution in the procurement dataset.
                </Trans>
              </p>
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

            {buyerLevel === 'county' ? (
              <div className="flex gap-2 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm leading-5 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
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
      className="relative gap-2 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-4 py-2 text-sm font-bold text-[var(--pnrr-fg)] hover:bg-[var(--pnrr-fg)] hover:text-[var(--pnrr-bg)]"
      onClick={onClick}
      aria-haspopup="dialog"
      aria-label={
        activeCount > 0 ? t`Filters, ${activeCount} active` : t`Open filters`
      }
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">
        <Trans>Filters</Trans>
      </span>
      {activeCount > 0 ? (
        <Badge className="h-5 min-w-5 rounded-full bg-[#1d70b8] px-1.5 text-xs text-white">
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  )
}
