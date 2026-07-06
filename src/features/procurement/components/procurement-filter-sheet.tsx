import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { SlidersHorizontal, X } from 'lucide-react'
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { ProcurementGrain, ProcurementStatus } from '@/schemas/procurement'
import { REVIEW_SIGNAL_KIND_VALUES } from '@/schemas/procurement-search'
import { procurementSourceSchema } from '@/schemas/procurement-search'
import type { ProcurementFilterState } from '../hooks/use-procurement-filter-state'
import { reviewSignalLabel, sourceLabel } from '../lib/enum-labels'
import { statusLabel, statusMeta } from '../lib/status-meta'
import {
  procurementDateInputClassName,
  procurementOutlineButtonClassName,
  procurementPrimaryButtonClassName,
  procurementSectionLabelClassName,
  procurementToggleItemClassName,
} from '../lib/procurement-theme'

/** Per-grain status vocabulary shown in the sheet. */
const STATUS_OPTIONS_BY_GRAIN: Record<ProcurementGrain, readonly ProcurementStatus[]> = {
  procedures: ['published', 'in_evaluation', 'awarded', 'cancelled', 'suspended', 'unknown'],
  contracts: ['awarded', 'in_progress', 'closed', 'cancelled', 'unknown'],
  direct_acquisitions: ['offered', 'awarded', 'finalized', 'cancelled', 'unknown'],
  modifications: [],
}

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const

const TONE_DOT_CLASSES: Record<string, string> = {
  positive: 'bg-emerald-500',
  active: 'bg-sky-500',
  pending: 'bg-amber-500',
  negative: 'bg-rose-500',
  neutral: 'bg-slate-400',
}

const TEXT_INPUT_CLASS = procurementDateInputClassName

type SheetProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly filters: ProcurementFilterState
}

/** GOV.UK-style side panel with every search facet (multi-select status,
 * date range, value range, signal, page size — all previously URL-only). */
export function ProcurementFilterSheet({ open, onOpenChange, filters }: SheetProps) {
  const { search } = filters
  const statusOptions = STATUS_OPTIONS_BY_GRAIN[search.grain]
  const showSupplier = search.grain !== 'procedures'
  const showCpv = search.grain !== 'modifications'
  const cpvValue = search.cpv ?? search.cpv_division ?? ''

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            <Trans>Search filters</Trans>
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            <Trans>{filters.activeCount} active</Trans>
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <Label htmlFor="filter-authority" className={procurementSectionLabelClassName}>
              <Trans>Contracting authority (CUI)</Trans>
            </Label>
            <input
              id="filter-authority"
              type="text"
              inputMode="numeric"
              className={TEXT_INPUT_CLASS}
              placeholder={t`e.g. 4267117`}
              value={search.authority_cui ?? ''}
              onChange={(event) => filters.setAuthorityCui(event.target.value)}
            />
          </section>

          {showSupplier ? (
            <section className="space-y-2">
              <Label htmlFor="filter-supplier" className={procurementSectionLabelClassName}>
                <Trans>Supplier (CUI)</Trans>
              </Label>
              <input
                id="filter-supplier"
                type="text"
                inputMode="numeric"
                className={TEXT_INPUT_CLASS}
                placeholder={t`e.g. 14399840`}
                value={search.supplier_cui ?? ''}
                onChange={(event) => filters.setSupplierCui(event.target.value)}
              />
            </section>
          ) : null}

          {showCpv ? (
            <section className="space-y-2">
              <Label htmlFor="filter-cpv" className={procurementSectionLabelClassName}>
                <Trans>CPV code or division</Trans>
              </Label>
              <input
                id="filter-cpv"
                type="text"
                inputMode="numeric"
                className={TEXT_INPUT_CLASS}
                placeholder={t`45 (division) or 45453000 (code)`}
                value={cpvValue}
                onChange={(event) => filters.setCpv(event.target.value)}
              />
            </section>
          ) : null}

          {search.grain !== 'modifications' ? (
            <section className="space-y-2">
              <Label className={procurementSectionLabelClassName}>
                <Trans>Source</Trans>
              </Label>
              <ToggleGroup
                type="single"
                value={search.source ?? ''}
                onValueChange={(value) => {
                  const parsed = procurementSourceSchema.safeParse(value)
                  filters.setSource(parsed.success ? parsed.data : undefined)
                }}
                className="grid grid-cols-2 gap-2"
              >
                {procurementSourceSchema.options.map((option) => (
                  <ToggleGroupItem key={option} value={option} className={procurementToggleItemClassName}>
                    {sourceLabel(option)}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </section>
          ) : null}

          {statusOptions.length > 0 ? (
            <section className="space-y-2">
              <Label className={procurementSectionLabelClassName}>
                <Trans>Status</Trans>
              </Label>
              <ToggleGroup
                type="multiple"
                value={search.status ?? []}
                onValueChange={(values) =>
                  filters.setStatuses(values as ProcurementStatus[])
                }
                className="grid grid-cols-2 gap-2"
              >
                {statusOptions.map((status) => (
                  <ToggleGroupItem key={status} value={status} className={procurementToggleItemClassName}>
                    <span
                      aria-hidden
                      className={cn(
                        'inline-block h-2.5 w-2.5 shrink-0 rounded-full',
                        TONE_DOT_CLASSES[statusMeta(status).tone],
                      )}
                    />
                    <span className="truncate">{statusLabel(status)}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </section>
          ) : null}

          <section className="space-y-2">
            <Label className={procurementSectionLabelClassName}>
              <Trans>Period</Trans>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="filter-date-from" className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>From</Trans>
                </Label>
                <input
                  id="filter-date-from"
                  type="date"
                  className={procurementDateInputClassName}
                  value={search.dateFrom ?? ''}
                  max={search.dateTo ?? undefined}
                  onChange={(event) =>
                    filters.setDates(event.target.value || undefined, search.dateTo)
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="filter-date-to" className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                  <Trans>To</Trans>
                </Label>
                <input
                  id="filter-date-to"
                  type="date"
                  className={procurementDateInputClassName}
                  value={search.dateTo ?? ''}
                  min={search.dateFrom ?? undefined}
                  onChange={(event) =>
                    filters.setDates(search.dateFrom, event.target.value || undefined)
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="filter-year" className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                <Trans>Or a whole year</Trans>
              </Label>
              <input
                id="filter-year"
                type="number"
                min={2000}
                max={2100}
                className={TEXT_INPUT_CLASS}
                placeholder={t`e.g. 2025`}
                value={search.year ?? ''}
                onChange={(event) => {
                  const value = event.target.valueAsNumber
                  filters.setYear(Number.isFinite(value) ? value : undefined)
                }}
              />
            </div>
          </section>

          {search.grain !== 'modifications' ? (
            <section className="space-y-2">
              <Label className={procurementSectionLabelClassName}>
                <Trans>Value (RON)</Trans>
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="filter-value-min" className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    <Trans>Minimum</Trans>
                  </Label>
                  <input
                    id="filter-value-min"
                    type="number"
                    min={0}
                    className={TEXT_INPUT_CLASS}
                    value={search.valueMin ?? ''}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber
                      filters.setValueRange(
                        Number.isFinite(value) ? value : undefined,
                        search.valueMax,
                      )
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="filter-value-max" className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                    <Trans>Maximum</Trans>
                  </Label>
                  <input
                    id="filter-value-max"
                    type="number"
                    min={0}
                    className={TEXT_INPUT_CLASS}
                    value={search.valueMax ?? ''}
                    onChange={(event) => {
                      const value = event.target.valueAsNumber
                      filters.setValueRange(
                        search.valueMin,
                        Number.isFinite(value) ? value : undefined,
                      )
                    }}
                  />
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-2">
            <Label className={procurementSectionLabelClassName}>
              <Trans>Review signal</Trans>
            </Label>
            <ToggleGroup
              type="single"
              value={search.signal ?? ''}
              onValueChange={(value) =>
                filters.setSignal(
                  REVIEW_SIGNAL_KIND_VALUES.find((kind) => kind === value),
                )
              }
              className="grid grid-cols-1 gap-2"
            >
              {REVIEW_SIGNAL_KIND_VALUES.map((signal) => (
                <ToggleGroupItem key={signal} value={signal} className={procurementToggleItemClassName}>
                  {reviewSignalLabel(signal)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <p className="text-xs text-[var(--pnrr-muted)]">
              <Trans>
                Signals are review starting points, not conclusions — results
                stay gated until the signal data is served.
              </Trans>
            </p>
          </section>

          <section className="space-y-2">
            <Label className={procurementSectionLabelClassName}>
              <Trans>Results per page</Trans>
            </Label>
            <ToggleGroup
              type="single"
              value={String(search.pageSize)}
              onValueChange={(value) => {
                const size = Number(value)
                if (PAGE_SIZE_OPTIONS.some((option) => option === size)) {
                  filters.setPageSize(size)
                }
              }}
              className="grid grid-cols-3 gap-2"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <ToggleGroupItem key={size} value={String(size)} className={procurementToggleItemClassName}>
                  {size}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>
        </div>

        <div className="border-t-2 border-[#b1b4b6] p-4 dark:border-[var(--pnrr-border)]">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className={procurementOutlineButtonClassName}
              onClick={filters.clearFilters}
            >
              <Trans>Clear filters</Trans>
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

type TriggerProps = {
  readonly activeCount: number
  readonly onClick: () => void
  readonly className?: string
}

/** "Filters" trigger with an active-count badge. */
export function ProcurementFilterTriggerButton({ activeCount, onClick, className }: TriggerProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        'relative h-11 gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-4 text-sm font-semibold text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]',
        className,
      )}
      onClick={onClick}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      <span>
        <Trans>Filters</Trans>
      </span>
      {activeCount > 0 ? (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#1d70b8] p-0 text-[11px] text-white"
        >
          {activeCount}
        </Badge>
      ) : null}
    </Button>
  )
}

type ChipsProps = {
  readonly filters: ProcurementFilterState
}

/** One removable chip per active facet + clear-all. */
export function ProcurementActiveFilters({ filters }: ChipsProps) {
  if (filters.chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1.5 border-2 border-[#b1b4b6] bg-[#f3f2f1] px-2.5 py-1 text-sm font-semibold text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]"
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <button
            type="button"
            onClick={() => filters.updateFilters(chip.clear)}
            aria-label={t`Remove filter ${chip.label}`}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={filters.clearFilters}
        className="text-sm font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
      >
        <Trans>Clear all</Trans>
      </button>
    </div>
  )
}
