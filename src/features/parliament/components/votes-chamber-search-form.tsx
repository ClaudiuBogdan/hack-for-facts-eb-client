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
import type { ParliamentVotesSearch, VoteOutcome } from '@/schemas/parliament'
import { cn } from '@/lib/utils'
import {
  PARLIAMENT_ACTION_BLUE,
  parliamentHubSectionClassName,
} from '../lib/hub-theme'

type Props = {
  readonly search: ParliamentVotesSearch
  readonly chamberLabel: string
  readonly onSearchChange: (search: ParliamentVotesSearch) => void
}

type DraftSearch = {
  readonly q: string
  readonly from: string
  readonly to: string
  readonly outcome: VoteOutcome | 'all'
}

const voteSearchLabelClassName =
  'block text-base font-bold leading-6 text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

/** Fixed-height controls — avoid parliamentHubFieldClassName flex-1 stretching in grid cells */
const voteSearchControlClassName =
  'box-border h-10 w-full shrink-0 rounded-none border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] px-3 text-base leading-none shadow-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)]'

function toDraft(search: ParliamentVotesSearch): DraftSearch {
  return {
    q: search.q ?? '',
    from: search.from ?? '',
    to: search.to ?? '',
    outcome: search.outcome ?? 'all',
  }
}

/** UK Parliament-style vote search panel */
export function VotesChamberSearchForm({
  search,
  chamberLabel,
  onSearchChange,
}: Props) {
  const [draft, setDraft] = useState<DraftSearch>(() => toDraft(search))

  useEffect(() => {
    setDraft({
      q: search.q ?? '',
      from: search.from ?? '',
      to: search.to ?? '',
      outcome: search.outcome ?? 'all',
    })
  }, [search.q, search.from, search.to, search.outcome])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    onSearchChange({
      ...search,
      q: draft.q.trim() || undefined,
      from: draft.from || undefined,
      to: draft.to || undefined,
      outcome: draft.outcome === 'all' ? undefined : draft.outcome,
      page: 1,
    })
  }

  const handleReset = () => {
    setDraft({ q: '', from: '', to: '', outcome: 'all' })
    onSearchChange({
      tab: search.tab,
      chamber: search.chamber,
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
          Caută voturi în {chamberLabel}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] lg:items-end">
          <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="vote-q" className={voteSearchLabelClassName}>
              Titlu sau număr divizare
            </Label>
            <Input
              id="vote-q"
              value={draft.q}
              onChange={(e) => setDraft((prev) => ({ ...prev, q: e.target.value }))}
              placeholder="Ex. buget, protecția consumatorilor, 4"
              className={voteSearchControlClassName}
            />
          </div>

          <div className="min-w-0 space-y-2">
            <Label htmlFor="vote-from" className={voteSearchLabelClassName}>
              De la
            </Label>
            <Input
              id="vote-from"
              type="date"
              value={draft.from}
              onChange={(e) => setDraft((prev) => ({ ...prev, from: e.target.value }))}
              className={voteSearchControlClassName}
            />
          </div>

          <div className="min-w-0 space-y-2">
            <Label htmlFor="vote-to" className={voteSearchLabelClassName}>
              Până la
            </Label>
            <Input
              id="vote-to"
              type="date"
              value={draft.to}
              onChange={(e) => setDraft((prev) => ({ ...prev, to: e.target.value }))}
              className={voteSearchControlClassName}
            />
          </div>

          <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="vote-outcome" className={voteSearchLabelClassName}>
              Rezultat
            </Label>
            <Select
              value={draft.outcome}
              onValueChange={(value) =>
                setDraft((prev) => ({
                  ...prev,
                  outcome: value as DraftSearch['outcome'],
                }))
              }
            >
              <SelectTrigger id="vote-outcome" className={cn(voteSearchControlClassName, 'py-0')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toate rezultatele</SelectItem>
                <SelectItem value="adoptat">Adoptat</SelectItem>
                <SelectItem value="respins">Respins</SelectItem>
                <SelectItem value="amânat">Amânat</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 w-full rounded-none border-2 px-6 text-base sm:w-auto"
            onClick={handleReset}
          >
            Resetează
          </Button>
          <Button
            type="submit"
            className="h-10 w-full rounded-none border-0 px-8 text-base font-normal text-white hover:opacity-90 sm:w-auto"
            style={{ backgroundColor: PARLIAMENT_ACTION_BLUE }}
          >
            Caută
          </Button>
        </div>
      </form>
    </section>
  )
}
