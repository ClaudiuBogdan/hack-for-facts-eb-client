import { useEffect, useRef, useState } from 'react'
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
import type { MemberSpeechesSearch } from '@/schemas/parliament'
import {
  countActiveMemberSpeechFilters,
  getMemberSpeechQ,
} from '../lib/member-speeches-filter'

/** Patch merged into the search + committed to the URL by the tab. */
export type MemberSpeechesFilterPatch = Partial<MemberSpeechesSearch>

const SECTION_LABEL_CLASS =
  'text-xs font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

const TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 justify-start gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] data-[state=on]:border-[#1d70b8] data-[state=on]:bg-[#1d70b8] data-[state=on]:text-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

const INPUT_CLASS =
  'h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

/** Debounce before a keystroke reaches the URL/query (avoids a fetch per key). */
const Q_DEBOUNCE_MS = 400

type SheetProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: MemberSpeechesSearch
  readonly onChange: (patch: MemberSpeechesFilterPatch) => void
  readonly onClearAll: () => void
}

/** GOV.UK-light side panel for the member interventii filters. */
export function MemberSpeechesFilterSheet({
  open,
  onOpenChange,
  search,
  onChange,
  onClearAll,
}: SheetProps) {
  const activeCount = countActiveMemberSpeechFilters(search)

  // Local draft for the free-text query, debounced before it hits the URL. Keep
  // it in sync when the committed value changes from elsewhere (chip removal,
  // clear-all, deep-link) but only when it actually differs, so typing is not
  // clobbered mid-keystroke.
  const committedQ = getMemberSpeechQ(search) ?? ''
  const [qDraft, setQDraft] = useState(committedQ)
  const lastCommitted = useRef(committedQ)
  useEffect(() => {
    if (committedQ !== lastCommitted.current) {
      lastCommitted.current = committedQ
      setQDraft(committedQ)
    }
  }, [committedQ])

  useEffect(() => {
    const next = qDraft.trim()
    if (next === committedQ) return
    const handle = window.setTimeout(() => {
      lastCommitted.current = next
      onChange({ q: next.length > 0 ? next : undefined })
    }, Q_DEBOUNCE_MS)
    return () => window.clearTimeout(handle)
  }, [qDraft, committedQ, onChange])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Filtre intervenții
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
                  htmlFor="member-speeches-from"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  De la
                </Label>
                <input
                  id="member-speeches-from"
                  type="date"
                  className={INPUT_CLASS}
                  value={search.from ?? ''}
                  max={search.to ?? undefined}
                  onChange={(event) =>
                    onChange({ from: event.target.value || undefined })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label
                  htmlFor="member-speeches-to"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  Până la
                </Label>
                <input
                  id="member-speeches-to"
                  type="date"
                  className={INPUT_CLASS}
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
            <Label className={SECTION_LABEL_CLASS}>Tipul ședinței</Label>
            <ToggleGroup
              type="single"
              value={search.session ?? ''}
              onValueChange={(value) =>
                onChange({
                  session:
                    value === 'proprie' || value === 'comun' ? value : undefined,
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

          <section className="space-y-2">
            <Label
              htmlFor="member-speeches-q"
              className={SECTION_LABEL_CLASS}
            >
              Căutare în intervenții
            </Label>
            <input
              id="member-speeches-q"
              type="search"
              inputMode="search"
              placeholder="Caută în titlu, rezumat și transcriere…"
              className={INPUT_CLASS}
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
            />
            <p className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              Caută textul integral al intervenției, unde transcrierea este
              disponibilă.
            </p>
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
export function MemberSpeechesFilterTriggerButton({
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
  readonly search: MemberSpeechesSearch
  readonly onChange: (patch: MemberSpeechesFilterPatch) => void
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
export function MemberSpeechesActiveFilters({
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

  if (search.session) {
    chips.push({
      key: 'session',
      label: `Ședință: ${search.session === 'proprie' ? 'Camera proprie' : 'Ședință comună'}`,
      onRemove: () => onChange({ session: undefined }),
    })
  }

  const q = getMemberSpeechQ(search)
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
