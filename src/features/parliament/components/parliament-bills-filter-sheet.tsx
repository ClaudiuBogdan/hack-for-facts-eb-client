import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trans } from '@lingui/react/macro'
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
  getBillLastEventDateChipLabel,
  getBillLocationChipLabel,
  getBillTypeChipLabel,
} from '../lib/bills-filter'
import { getBillLocationLabel, getBillTypeLabel } from '../lib/bill-profile-data'
import {
  ParliamentActiveFilterChips,
  type ParliamentFilterChip,
} from './parliament-list-surface'

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
  'clasat',
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

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>
              <Trans>Data ultimei etape</Trans>
            </Label>
            <p className="text-sm leading-5 text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              <Trans>
                Filtrează după data ultimei etape publicate pentru fiecare
                proiect.
              </Trans>
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label
                  htmlFor="bills-last-event-from"
                  className="text-sm font-semibold"
                >
                  <Trans>De la</Trans>
                </Label>
                <Input
                  id="bills-last-event-from"
                  type="date"
                  value={search.from ?? ''}
                  onChange={(event) =>
                    onChange({ from: event.target.value || undefined })
                  }
                  className={SELECT_CLASS}
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="bills-last-event-to"
                  className="text-sm font-semibold"
                >
                  <Trans>Până la</Trans>
                </Label>
                <Input
                  id="bills-last-event-to"
                  type="date"
                  value={search.to ?? ''}
                  onChange={(event) =>
                    onChange({ to: event.target.value || undefined })
                  }
                  className={SELECT_CLASS}
                />
              </div>
            </div>
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
  const chips: ParliamentFilterChip[] = []

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

  const dateChip = getBillLastEventDateChipLabel(search)
  if (dateChip) {
    chips.push({
      key: 'lastEventDate',
      label: dateChip,
      onRemove: () => onChange({ from: undefined, to: undefined }),
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

  return <ParliamentActiveFilterChips chips={chips} onClearAll={onClearAll} />
}
