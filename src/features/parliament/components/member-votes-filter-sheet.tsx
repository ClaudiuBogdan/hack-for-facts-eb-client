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
import { getMemberVoteChoiceLabel } from '../lib/formatting'
import {
  MEMBER_VOTE_CHOICE_MARK_COLORS,
  memberFilterDateInputClassName,
  memberFilterSectionLabelClassName,
  memberFilterToggleItemClassName,
} from '../lib/member-detail-theme'
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
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-parliament-border bg-parliament-card p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-parliament-border p-6 pr-14 text-left">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-parliament-fg">
            Filtre voturi
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-parliament-muted">
            {activeCount} {activeCount === 1 ? 'filtru activ' : 'filtre active'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <Label className={memberFilterSectionLabelClassName}>Interval de timp</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="member-votes-from"
                  className="text-xs font-normal text-parliament-muted"
                >
                  De la
                </Label>
                <input
                  id="member-votes-from"
                  type="date"
                  className={memberFilterDateInputClassName}
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
                  className="text-xs font-normal text-parliament-muted"
                >
                  Până la
                </Label>
                <input
                  id="member-votes-to"
                  type="date"
                  className={memberFilterDateInputClassName}
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
            <Label className={memberFilterSectionLabelClassName}>Votul exprimat</Label>
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
                  className={memberFilterToggleItemClassName}
                >
                  <span
                    aria-hidden
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: MEMBER_VOTE_CHOICE_MARK_COLORS[choice] }}
                  />
                  <span className="truncate">{getMemberVoteChoiceLabel(choice)}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label className={memberFilterSectionLabelClassName}>Rezultatul votului</Label>
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
              <ToggleGroupItem value="adoptat" className={memberFilterToggleItemClassName}>
                Majoritate pentru
              </ToggleGroupItem>
              <ToggleGroupItem value="respins" className={memberFilterToggleItemClassName}>
                Majoritate împotrivă
              </ToggleGroupItem>
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label className={memberFilterSectionLabelClassName}>Tipul ședinței</Label>
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
              <ToggleGroupItem value="proprie" className={memberFilterToggleItemClassName}>
                Camera proprie
              </ToggleGroupItem>
              <ToggleGroupItem value="comun" className={memberFilterToggleItemClassName}>
                Ședință comună
              </ToggleGroupItem>
            </ToggleGroup>
          </section>
        </div>

        <div className="border-t-2 border-parliament-border p-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-none border-2 border-parliament-border bg-parliament-card px-2 text-xs font-black uppercase tracking-wide text-parliament-fg hover:bg-parliament-surface sm:text-sm"
              onClick={onClearAll}
            >
              Golește filtrele
            </Button>
            <Button
              type="button"
              className="h-11 rounded-none border-2 border-parliament-link bg-parliament-action px-2 text-xs font-black uppercase tracking-wide text-white hover:opacity-90 sm:text-sm"
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
        'relative h-11 gap-2 rounded-none border-2 border-parliament-border bg-parliament-card px-4 text-sm font-semibold text-parliament-fg hover:bg-parliament-surface',
        className,
      )}
      onClick={onClick}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      <span>Filtre</span>
      {activeCount > 0 ? (
        <Badge
          variant="default"
          className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-parliament-action p-0 text-[11px] text-white"
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
      // Describes the tally, not the bill's fate — see getOutcomeLabel.
      label: `Vot: ${search.outcome === 'adoptat' ? 'Majoritate pentru' : 'Majoritate împotrivă'}`,
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
          className="inline-flex max-w-full items-center gap-1.5 border-2 border-parliament-border bg-parliament-surface px-2.5 py-1 text-sm font-semibold text-parliament-fg"
        >
          <span className="min-w-0 truncate">{chip.label}</span>
          <button
            type="button"
            onClick={chip.onRemove}
            aria-label={`Elimină filtrul ${chip.label}`}
            className="inline-flex h-4 w-4 shrink-0 items-center justify-center hover:text-parliament-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-focus"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-sm font-semibold text-parliament-fg underline underline-offset-4 hover:text-parliament-link focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-parliament-focus"
      >
        Șterge tot
      </button>
    </div>
  )
}
