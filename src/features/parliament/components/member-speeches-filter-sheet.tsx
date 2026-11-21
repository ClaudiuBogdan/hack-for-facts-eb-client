import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
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
import type { MemberSpeechesSearch } from '@/schemas/parliament'
import {
  countActiveMemberSpeechFilters,
  getMemberSpeechQ,
} from '../lib/member-speeches-filter'
import {
  memberFilterDateInputClassName,
  memberFilterInputClassName,
  memberFilterSectionLabelClassName,
  memberFilterToggleItemClassName,
} from '../lib/member-detail-theme'

/** Patch merged into the search + committed to the URL by the tab. */
export type MemberSpeechesFilterPatch = Partial<MemberSpeechesSearch>

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
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-parliament-border bg-parliament-card p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-parliament-border p-6 pr-14 text-left">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-parliament-fg">
            Filtre intervenții
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
                  htmlFor="member-speeches-from"
                  className="text-xs font-normal text-parliament-muted"
                >
                  De la
                </Label>
                <input
                  id="member-speeches-from"
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
                  htmlFor="member-speeches-to"
                  className="text-xs font-normal text-parliament-muted"
                >
                  Până la
                </Label>
                <input
                  id="member-speeches-to"
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
            <Label className={memberFilterSectionLabelClassName}>Tipul ședinței</Label>
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
              <ToggleGroupItem value="proprie" className={memberFilterToggleItemClassName}>
                Camera proprie
              </ToggleGroupItem>
              <ToggleGroupItem value="comun" className={memberFilterToggleItemClassName}>
                Ședință comună
              </ToggleGroupItem>
            </ToggleGroup>
          </section>

          <section className="space-y-2">
            <Label
              htmlFor="member-speeches-q"
              className={memberFilterSectionLabelClassName}
            >
              Căutare în intervenții
            </Label>
            <input
              id="member-speeches-q"
              type="search"
              inputMode="search"
              placeholder="Caută în titlu, rezumat și transcriere…"
              className={memberFilterInputClassName}
              value={qDraft}
              onChange={(event) => setQDraft(event.target.value)}
            />
            <p className="text-xs font-normal text-parliament-muted">
              Caută textul integral al intervenției, unde transcrierea este
              disponibilă.
            </p>
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

/** Kept name for existing callers — the shared trigger button, re-exported. */
export { FilterTriggerButton as MemberSpeechesFilterTriggerButton } from './parliament-filter-trigger-button'

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
