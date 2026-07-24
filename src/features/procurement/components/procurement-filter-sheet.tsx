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
import {
  PROCUREMENT_RECORD_KIND_OPTIONS,
  PROCUREMENT_VALUE_CATEGORIES,
  procurementSourceSchema,
  type ProcurementRecordKindOption,
  type ProcurementValueCategory,
} from '@/schemas/procurement-search'
import type { ProcurementFilterState } from '../hooks/use-procurement-filter-state'
import {
  recordKindLabel,
  reviewSignalLabel,
  sourceLabel,
  valueCategoryLabel,
} from '../lib/enum-labels'
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

const TONE_DOT_CLASSES: Record<string, string> = {
  positive: 'bg-emerald-500',
  active: 'bg-sky-500',
  pending: 'bg-amber-500',
  negative: 'bg-rose-500',
  neutral: 'bg-slate-400',
}

const TEXT_INPUT_CLASS = procurementDateInputClassName

type ListFieldsProps = {
  readonly filters: ProcurementFilterState
  /** When false, period controls are omitted (hub sheet owns E1 period). */
  readonly includePeriod?: boolean
  readonly idPrefix?: string
}

/** List-oriented facets shared by the search sheet and the hub sheet (D3). */
export function ProcurementListFilterFields({
  filters,
  includePeriod = true,
  idPrefix = 'filter',
}: ListFieldsProps) {
  const { search } = filters
  const statusOptions = STATUS_OPTIONS_BY_GRAIN[search.grain]
  const showSupplier = search.grain !== 'procedures'
  const showCpv = search.grain !== 'modifications'
  const cpvValue =
    search.cpv ??
    search.cpv_category ??
    search.cpv_class ??
    search.cpv_group ??
    search.cpv_division ??
    ''

  return (
    <>
      <section className="space-y-2">
        <Label
          htmlFor={`${idPrefix}-authority`}
          className={procurementSectionLabelClassName}
        >
          <Trans>Contracting authority (CUI)</Trans>
        </Label>
        <input
          id={`${idPrefix}-authority`}
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
          <Label
            htmlFor={`${idPrefix}-supplier`}
            className={procurementSectionLabelClassName}
          >
            <Trans>Supplier (CUI)</Trans>
          </Label>
          <input
            id={`${idPrefix}-supplier`}
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
          <Label
            htmlFor={`${idPrefix}-cpv`}
            className={procurementSectionLabelClassName}
          >
            <Trans>CPV code or hierarchy level</Trans>
          </Label>
          <input
            id={`${idPrefix}-cpv`}
            type="text"
            inputMode="numeric"
            className={TEXT_INPUT_CLASS}
            placeholder={t`45 (division), 452 (group), 4523 (class), 45233 (category) or 45233140 (code)`}
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
              <ToggleGroupItem
                key={option}
                value={option}
                className={procurementToggleItemClassName}
              >
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
              <ToggleGroupItem
                key={status}
                value={status}
                className={procurementToggleItemClassName}
              >
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

      {search.grain !== 'modifications' ? (
        <section className="space-y-2">
          <Label className={procurementSectionLabelClassName}>
            <Trans>Value quality</Trans>
          </Label>
          <ToggleGroup
            type="multiple"
            value={search.value_state ?? []}
            onValueChange={(values) =>
              filters.setValueCategories(values as ProcurementValueCategory[])
            }
            className="grid grid-cols-2 gap-2"
          >
            {PROCUREMENT_VALUE_CATEGORIES.map((category) => (
              <ToggleGroupItem
                key={category}
                value={category}
                className={procurementToggleItemClassName}
              >
                <span className="truncate">{valueCategoryLabel(category)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      ) : null}

      {search.grain === 'contracts' ? (
        <section className="space-y-2">
          <Label className={procurementSectionLabelClassName}>
            <Trans>Record kind</Trans>
          </Label>
          <ToggleGroup
            type="multiple"
            value={search.record_kind ?? []}
            onValueChange={(values) =>
              filters.setRecordKinds(values as ProcurementRecordKindOption[])
            }
            className="grid grid-cols-2 gap-2"
          >
            {PROCUREMENT_RECORD_KIND_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option}
                value={option}
                className={procurementToggleItemClassName}
              >
                <span className="truncate">{recordKindLabel(option)}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>
      ) : null}

      {includePeriod ? (
        <section className="space-y-2">
          <Label className={procurementSectionLabelClassName}>
            <Trans>Period</Trans>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label
                htmlFor={`${idPrefix}-date-from`}
                className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
              >
                <Trans>From</Trans>
              </Label>
              <input
                id={`${idPrefix}-date-from`}
                type="date"
                className={procurementDateInputClassName}
                value={search.dateFrom ?? ''}
                max={search.dateTo ?? undefined}
                onChange={(event) =>
                  filters.setDates(
                    event.target.value || undefined,
                    search.dateTo,
                  )
                }
              />
            </div>
            <div className="space-y-1">
              <Label
                htmlFor={`${idPrefix}-date-to`}
                className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
              >
                <Trans>To</Trans>
              </Label>
              <input
                id={`${idPrefix}-date-to`}
                type="date"
                className={procurementDateInputClassName}
                value={search.dateTo ?? ''}
                min={search.dateFrom ?? undefined}
                onChange={(event) =>
                  filters.setDates(
                    search.dateFrom,
                    event.target.value || undefined,
                  )
                }
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label
              htmlFor={`${idPrefix}-year`}
              className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
            >
              <Trans>Or a whole year</Trans>
            </Label>
            <input
              id={`${idPrefix}-year`}
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
      ) : null}

      {search.grain !== 'modifications' ? (
        <section className="space-y-2">
          <Label className={procurementSectionLabelClassName}>
            <Trans>Value (RON)</Trans>
          </Label>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label
                htmlFor={`${idPrefix}-value-min`}
                className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
              >
                <Trans>Minimum</Trans>
              </Label>
              <input
                id={`${idPrefix}-value-min`}
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
              <Label
                htmlFor={`${idPrefix}-value-max`}
                className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
              >
                <Trans>Maximum</Trans>
              </Label>
              <input
                id={`${idPrefix}-value-max`}
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
        <div className="flex flex-wrap items-center gap-2">
          <Label className={procurementSectionLabelClassName}>
            <Trans>Review signal</Trans>
          </Label>
          {/* TODO(Review signals API): keep disabled until same-day / pair candidates republish. */}
        </div>
        <ToggleGroup
          type="single"
          value=""
          disabled
          className="grid grid-cols-1 gap-2 opacity-60"
        >
          {REVIEW_SIGNAL_KIND_VALUES.map((signal) => (
            <ToggleGroupItem
              key={signal}
              value={signal}
              disabled
              className={procurementToggleItemClassName}
            >
              {reviewSignalLabel(signal)}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="border-l-4 border-amber-500 pl-3 text-xs leading-5 text-[var(--pnrr-muted)]">
          <Trans>
            Review signals are not wired to search yet. They will filter
            results when the API republishes same-day and repeated-pair
            candidates — until then this control stays disabled so it cannot
            pretend to narrow the list.
          </Trans>
        </p>
      </section>
    </>
  )
}

type SheetProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly filters: ProcurementFilterState
}

/** GOV.UK-style side panel with every search facet. */
export function ProcurementFilterSheet({
  open,
  onOpenChange,
  filters,
}: SheetProps) {
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
          <ProcurementListFilterFields filters={filters} />
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
