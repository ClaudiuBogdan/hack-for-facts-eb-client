import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import type {
  BillCurrentLocation,
  BillType,
  ParliamentBillsSearch,
} from '@/schemas/parliament'
import {
  countActiveBillFilters,
  getBillLocationChipLabel,
  getBillTypeChipLabel,
} from '../lib/bills-filter'
import { getBillLocationLabel, getBillTypeLabel } from '../lib/bill-profile-data'

/** Patch merged into the search + committed to the URL by the tab. */
export type ParliamentBillsFilterPatch = Partial<ParliamentBillsSearch>

const SECTION_LABEL_CLASS =
  'text-xs font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

const TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 justify-start gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] data-[state=on]:border-[#1d70b8] data-[state=on]:bg-[#1d70b8] data-[state=on]:text-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

const SELECT_CLASS =
  'h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm text-[#0b0c0c] shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

const BILL_TYPES: readonly BillType[] = [
  'guvern',
  'parlamentar',
  'cetateni',
  'ordonanta',
]

const BILL_LOCATIONS: readonly BillCurrentLocation[] = [
  'camera',
  'senat',
  'mediere',
  'presedinte',
  'promulgat',
  'respins',
  'retras',
]

type SheetProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: ParliamentBillsSearch
  readonly onChange: (patch: ParliamentBillsFilterPatch) => void
  readonly onClearAll: () => void
}

/**
 * GOV.UK-light side panel for the proiecte (laws) filters. Every change
 * applies immediately (with `page: 1` reset committed by the tab) — no submit
 * button, mirroring the stenograme/interventii sheets.
 */
export function ParliamentBillsFilterSheet({
  open,
  onOpenChange,
  search,
  onChange,
  onClearAll,
}: SheetProps) {
  const activeCount = countActiveBillFilters(search)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Filtre proiecte
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {activeCount} {activeCount === 1 ? 'filtru activ' : 'filtre active'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>Tip proiect</Label>
            <ToggleGroup
              type="single"
              value={search.billType ?? ''}
              onValueChange={(value) =>
                onChange({
                  billType: BILL_TYPES.includes(value as BillType)
                    ? (value as BillType)
                    : undefined,
                })
              }
              className="grid grid-cols-1 gap-2"
            >
              {BILL_TYPES.map((type) => (
                <ToggleGroupItem
                  key={type}
                  value={type}
                  className={TOGGLE_ITEM_CLASS}
                >
                  {getBillTypeLabel(type)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label htmlFor="bills-location" className={SECTION_LABEL_CLASS}>
              Cameră / etapă curentă
            </Label>
            <Select
              value={search.billLocation ?? 'all'}
              onValueChange={(value) =>
                onChange({
                  billLocation:
                    value === 'all' ? undefined : (value as BillCurrentLocation),
                })
              }
            >
              <SelectTrigger id="bills-location" className={SELECT_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate etapele</SelectItem>
                {BILL_LOCATIONS.map((location) => (
                  <SelectItem key={location} value={location}>
                    {getBillLocationLabel(location)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </section>
        </div>

        <div className="border-t-2 border-[#b1b4b6] p-4 dark:border-[var(--pnrr-border)]">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-none border-2 border-[#b1b4b6] bg-white px-2 text-xs font-black uppercase tracking-wide text-[#0b0c0c] hover:bg-[#f3f2f1] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] sm:text-sm"
              onClick={onClearAll}
            >
              Golește filtrele
            </Button>
            <Button
              type="button"
              className="h-11 rounded-none border-2 border-[#1d70b8] bg-[#1d70b8] px-2 text-xs font-black uppercase tracking-wide text-white hover:opacity-90 sm:text-sm"
              onClick={() => onOpenChange(false)}
            >
              Închide
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type ChipsProps = {
  readonly search: ParliamentBillsSearch
  readonly onChange: (patch: ParliamentBillsFilterPatch) => void
  readonly onClearAll: () => void
}

/** One chip per active facet (type, stage, free-text), each removable. */
export function ParliamentBillsActiveFilters({
  search,
  onChange,
  onClearAll,
}: ChipsProps) {
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = []

  const typeChip = getBillTypeChipLabel(search)
  if (typeChip) {
    chips.push({
      key: 'billType',
      label: typeChip,
      onRemove: () => onChange({ billType: undefined }),
    })
  }

  const locationChip = getBillLocationChipLabel(search)
  if (locationChip) {
    chips.push({
      key: 'billLocation',
      label: locationChip,
      onRemove: () => onChange({ billLocation: undefined }),
    })
  }

  const q = search.q?.trim()
  if (q) {
    chips.push({
      key: 'q',
      label: `Conține: ${q}`,
      onRemove: () => onChange({ q: undefined }),
    })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex max-w-full items-center gap-1.5 border-2 border-[#b1b4b6] bg-[#f3f2f1] px-2.5 py-1 text-sm font-semibold text-[#0b0c0c] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-subtle)] dark:text-[var(--pnrr-fg)]"
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Elimină filtrul ${chip.label}`}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center hover:text-[#1d70b8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-sm font-semibold text-[#0b0c0c] underline underline-offset-4 hover:text-[#1d70b8] dark:text-[var(--pnrr-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
      >
        Șterge tot
      </button>
    </div>
  )
}
