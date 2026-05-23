import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  BillCurrentLocation,
  BillSortBy,
  BillType,
  ParliamentBillsSearch,
} from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  PARLIAMENT_ACTION_BLUE,
  parliamentHubSectionClassName,
} from '../lib/hub-theme'
import { getBillLocationLabel, getBillTypeLabel } from '../lib/bill-profile-data'

type Props = {
  readonly search: ParliamentBillsSearch
  readonly onSearchChange: (search: ParliamentBillsSearch) => void
}

type DraftSearch = {
  readonly q: string
  readonly billType: BillType | 'all'
  readonly billLocation: BillCurrentLocation | 'all'
  readonly sortBy: BillSortBy
}

const billSearchLabelClassName =
  'block text-base font-bold leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

const billSearchControlClassName =
  'box-border h-10 w-full shrink-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base leading-none shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

function toDraft(search: ParliamentBillsSearch): DraftSearch {
  return {
    q: search.q ?? '',
    billType: search.billType ?? 'all',
    billLocation: search.billLocation ?? 'all',
    sortBy: search.sortBy ?? 'updated_desc',
  }
}

const BILL_TYPES: readonly (BillType | 'all')[] = [
  'all',
  'guvern',
  'parlamentar',
  'cetateni',
  'ordonanta',
]

const BILL_LOCATIONS: readonly (BillCurrentLocation | 'all')[] = [
  'all',
  'camera',
  'senat',
  'mediere',
  'presedinte',
  'promulgat',
  'respins',
  'retras',
]

/** UK Parliament-style bill search panel */
export function BillsSearchForm({ search, onSearchChange }: Props) {
  const [draft, setDraft] = useState<DraftSearch>(() => toDraft(search))

  useEffect(() => {
    setDraft(toDraft(search))
  }, [search])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchChange({
      ...search,
      q: draft.q.trim() || undefined,
      billType: draft.billType === 'all' ? undefined : draft.billType,
      billLocation: draft.billLocation === 'all' ? undefined : draft.billLocation,
      sortBy: draft.sortBy,
      page: 1,
    })
  }

  const handleReset = () => {
    setDraft({ q: '', billType: 'all', billLocation: 'all', sortBy: 'updated_desc' })
    onSearchChange({
      tab: search.tab,
      page: 1,
      pageSize: search.pageSize,
    })
  }

  return (
    <section
      className={cn(
        parliamentHubSectionClassName,
        'w-full bg-white dark:bg-[var(--pnrr-card)]',
      )}
    >
      <div className="border-b border-[#b1b4b6] px-5 py-4 dark:border-[var(--pnrr-border)]">
        <h3 className="text-xl font-bold text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
          Caută proiecte de lege
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div className="md:col-span-2 xl:col-span-3">
            <Label htmlFor="bill-q" className={billSearchLabelClassName}>
              Titlu proiect
            </Label>
            <Input
              id="bill-q"
              value={draft.q}
              onChange={(event) => setDraft((prev) => ({ ...prev, q: event.target.value }))}
              placeholder="Caută după titlu sau număr (ex. PL 127/2026)"
              className={cn(billSearchControlClassName, 'mt-2')}
            />
          </div>

          <div>
            <Label htmlFor="bill-sort" className={billSearchLabelClassName}>
              Sortare
            </Label>
            <Select
              value={draft.sortBy}
              onValueChange={(value) =>
                setDraft((prev) => ({ ...prev, sortBy: value as BillSortBy }))
              }
            >
              <SelectTrigger id="bill-sort" className={cn(billSearchControlClassName, 'mt-2')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="updated_desc">Actualizare (cele mai recente)</SelectItem>
                <SelectItem value="updated_asc">Actualizare (cele mai vechi)</SelectItem>
                <SelectItem value="title_asc">Titlu (A-Z)</SelectItem>
                <SelectItem value="title_desc">Titlu (Z-A)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bill-type" className={billSearchLabelClassName}>
              Tip proiect
            </Label>
            <Select
              value={draft.billType}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  billType: value as BillType | 'all',
                }))
              }
            >
              <SelectTrigger id="bill-type" className={cn(billSearchControlClassName, 'mt-2')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILL_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type === 'all' ? 'Toate tipurile' : getBillTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="bill-location" className={billSearchLabelClassName}>
              Cameră / etapă curentă
            </Label>
            <Select
              value={draft.billLocation}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  billLocation: value as BillCurrentLocation | 'all',
                }))
              }
            >
              <SelectTrigger id="bill-location" className={cn(billSearchControlClassName, 'mt-2')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BILL_LOCATIONS.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location === 'all' ? 'Toate etapele' : getBillLocationLabel(location)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            variant="outline"
            className="rounded-none border-2 px-6"
            onClick={handleReset}
          >
            Resetare
          </Button>
          <Button
            type="submit"
            className="rounded-none border-2 px-6 text-white"
            style={{ backgroundColor: PARLIAMENT_ACTION_BLUE, borderColor: PARLIAMENT_ACTION_BLUE }}
          >
            Caută
          </Button>
        </div>
      </form>
    </section>
  )
}
