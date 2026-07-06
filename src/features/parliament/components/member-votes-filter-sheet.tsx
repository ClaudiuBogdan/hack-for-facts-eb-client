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
import type { MemberVoteChoice, MemberVotesSearch } from '@/schemas/parliament'
import { getMemberVoteChoiceLabel, getVoteChoiceAccentColor } from '../lib/formatting'
import {
  countActiveMemberVoteFilters,
  getMemberVoteChoiceValues,
} from '../lib/member-votes-filter'

/** Patch merged into the search + committed to the URL by the tab. */
export type MemberVotesFilterPatch = Partial<MemberVotesSearch>

const CHOICE_OPTIONS: readonly MemberVoteChoice[] = [
  'pentru',
  'impotriva',
  'abtinere',
  'nu_a_votat',
]

const SECTION_LABEL_CLASS =
  'text-xs font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

const TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 justify-start gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] data-[state=on]:border-[#1d70b8] data-[state=on]:bg-[#1d70b8] data-[state=on]:text-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

const DATE_INPUT_CLASS =
  'h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

type SheetProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: MemberVotesSearch
  readonly onChange: (patch: MemberVotesFilterPatch) => void
  readonly onClearAll: () => void
}

/** GOV.UK-light side panel for the member voting-history filters. */
export function MemberVotesFilterSheet({
  open,
  onOpenChange,
  search,
  onChange,
  onClearAll,
}: SheetProps) {
  const activeCount = countActiveMemberVoteFilters(search)
  const choiceValues = getMemberVoteChoiceValues(search)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Filtre voturi
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {activeCount} {activeCount === 1 ? 'filtru activ' : 'filtre active'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>Interval de timp</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="member-votes-from"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  De la
                </Label>
                <input
                  id="member-votes-from"
                  type="date"
                  className={DATE_INPUT_CLASS}
                  value={search.from ?? ''}
                  max={search.to ?? undefined}
                  onChange={(event) =>
                    onChange({ from: event.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="member-votes-to"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  Până la
                </Label>
                <input
                  id="member-votes-to"
                  type="date"
                  className={DATE_INPUT_CLASS}
                  value={search.to ?? ''}
                  min={search.from ?? undefined}
                  onChange={(event) =>
                    onChange({ to: event.target.value || undefined })
                  }
                />
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>Votul exprimat</Label>
            <ToggleGroup
              type="multiple"
              value={choiceValues}
              onValueChange={(values) =>
                onChange({ choice: values.length > 0 ? values : undefined })
              }
              className="grid grid-cols-2 gap-2"
            >
              {CHOICE_OPTIONS.map((choice) => (
                <ToggleGroupItem
                  key={choice}
                  value={choice}
                  className={TOGGLE_ITEM_CLASS}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: getVoteChoiceAccentColor(choice) }}
                  />
                  <span className="truncate">{getMemberVoteChoiceLabel(choice)}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>Rezultatul votului</Label>
            <ToggleGroup
              type="single"
              value={search.outcome ?? ''}
              onValueChange={(value) =>
                onChange({
                  outcome: value === 'adoptat' || value === 'respins' ? value : undefined,
                })
              }
              className="grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem value="adoptat" className={TOGGLE_ITEM_CLASS}>
                Adoptat
              </ToggleGroupItem>
              <ToggleGroupItem value="respins" className={TOGGLE_ITEM_CLASS}>
                Respins
              </ToggleGroupItem>
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>Tipul ședinței</Label>
            <ToggleGroup
              type="single"
              value={search.session ?? ''}
              onValueChange={(value) =>
                onChange({
                  session: value === 'proprie' || value === 'comun' ? value : undefined,
                })
              }
              className="grid grid-cols-2 gap-2"
            >
              <ToggleGroupItem value="proprie" className={TOGGLE_ITEM_CLASS}>
                Camera proprie
              </ToggleGroupItem>
              <ToggleGroupItem value="comun" className={TOGGLE_ITEM_CLASS}>
                Ședință comună
              </ToggleGroupItem>
            </ToggleGroup>
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

type TriggerProps = {
  readonly activeCount: number
  readonly onClick: () => void
  readonly className?: string
}

/** "Filtre" trigger with an active-count badge (GOV.UK-light restyle). */
export function MemberVotesFilterTriggerButton({
  activeCount,
  onClick,
  className,
}: TriggerProps) {
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
      <span>Filtre</span>
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
  readonly search: MemberVotesSearch
  readonly onChange: (patch: MemberVotesFilterPatch) => void
  readonly onClearAll: () => void
}

function formatChipDate(iso: string): string {
  return new Intl.DateTimeFormat('ro-RO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${iso.slice(0, 10)}T00:00:00Z`))
}

/** One chip per active facet, each with an X to remove it. */
export function MemberVotesActiveFilters({
  search,
  onChange,
  onClearAll,
}: ChipsProps) {
  const chips: Array<{ key: string; label: string; onRemove: () => void }> = []

  if (search.from || search.to) {
    const clearDate = () => onChange({ from: undefined, to: undefined })
    if (search.from && search.from === search.to) {
      chips.push({
        key: 'day',
        label: `Ziua: ${formatChipDate(search.from)}`,
        onRemove: clearDate,
      })
    } else {
      const parts = [
        search.from ? formatChipDate(search.from) : '…',
        search.to ? formatChipDate(search.to) : '…',
      ]
      chips.push({
        key: 'period',
        label: `Perioadă: ${parts[0]} – ${parts[1]}`,
        onRemove: clearDate,
      })
    }
  }

  const choiceValues = getMemberVoteChoiceValues(search)
  if (choiceValues.length > 0) {
    chips.push({
      key: 'choice',
      label: `Vot: ${choiceValues.map(getMemberVoteChoiceLabel).join(', ')}`,
      onRemove: () => onChange({ choice: undefined }),
    })
  }

  if (search.outcome) {
    chips.push({
      key: 'outcome',
      label: `Rezultat: ${search.outcome === 'adoptat' ? 'Adoptat' : 'Respins'}`,
      onRemove: () => onChange({ outcome: undefined }),
    })
  }

  if (search.session) {
    chips.push({
      key: 'session',
      label: `Ședință: ${search.session === 'proprie' ? 'Camera proprie' : 'Ședință comună'}`,
      onRemove: () => onChange({ session: undefined }),
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
