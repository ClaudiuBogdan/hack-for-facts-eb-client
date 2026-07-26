import type { ReactNode } from 'react'
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
import type { ParliamentSpeechesSearch } from '@/schemas/parliament'
import {
  countActiveParliamentSpeechFilters,
  getParliamentSpeechQ,
} from '../lib/parliament-speeches-filter'
import {
  countActiveStenogramSessionFilters,
  getStenogrameView,
} from '../lib/parliament-stenogram-filter'
import { useParliamentMember } from '../hooks/use-parliament-data'
import { formatMemberName } from '../lib/formatting'
import { ParliamentSpeakerCombobox } from './parliament-speaker-combobox'

/** Patch merged into the search + committed to the URL by the page. */
export type ParliamentSpeechesFilterPatch = Partial<ParliamentSpeechesSearch>

const SECTION_LABEL_CLASS =
  'text-xs font-bold uppercase tracking-wide text-[#0b0c0c] dark:text-[var(--pnrr-fg)]'

const TOGGLE_ITEM_CLASS =
  'h-10 min-w-0 justify-start gap-2 rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm font-semibold text-[#0b0c0c] transition-colors hover:bg-[#f3f2f1] data-[state=on]:border-[#1d70b8] data-[state=on]:bg-[#1d70b8] data-[state=on]:text-white dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)] dark:hover:bg-[var(--pnrr-subtle)]'

const INPUT_CLASS =
  'h-10 w-full rounded-none border-2 border-[#b1b4b6] bg-white px-3 text-sm text-[#0b0c0c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)] dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-card)] dark:text-[var(--pnrr-fg)]'

type SheetProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly search: ParliamentSpeechesSearch
  readonly onChange: (patch: ParliamentSpeechesFilterPatch) => void
  readonly onClearAll: () => void
}

/** GOV.UK-light side panel for the global stenograme filters. */
export function ParliamentSpeechesFilterSheet({
  open,
  onOpenChange,
  search,
  onChange,
  onClearAll,
}: SheetProps) {
  const view = getStenogrameView(search)
  const activeCount =
    view === 'sedinte'
      ? countActiveStenogramSessionFilters(search)
      : countActiveParliamentSpeechFilters(search)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="flex w-full max-w-full flex-col gap-0 overflow-hidden border-l-2 border-[#b1b4b6] bg-white p-0 dark:border-[var(--pnrr-border)] dark:bg-[var(--pnrr-bg)] sm:max-w-md"
      >
        <SheetHeader className="border-b-2 border-[#b1b4b6] p-6 pr-14 text-left dark:border-[var(--pnrr-border)]">
          <SheetTitle className="text-left text-2xl font-black tracking-tight text-[#0b0c0c] dark:text-[var(--pnrr-fg)]">
            Filtre stenograme
          </SheetTitle>
          <SheetDescription className="pt-1 text-left text-sm font-semibold text-[#505a5f] dark:text-[var(--pnrr-muted)]">
            {activeCount} {activeCount === 1 ? 'filtru activ' : 'filtre active'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          <section className="space-y-2">
            <Label htmlFor="speeches-speaker" className={SECTION_LABEL_CLASS}>
              Vorbitor
            </Label>
            <ParliamentSpeakerCombobox
              inputId="speeches-speaker"
              value={search.vorbitor}
              onChange={(vorbitor) => onChange({ vorbitor })}
            />
          </section>

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>Camera</Label>
            <ToggleGroup
              type="single"
              value={search.camera ?? ''}
              onValueChange={(value) =>
                onChange({
                  camera:
                    value === 'camera' || value === 'senat' || value === 'comun'
                      ? value
                      : undefined,
                })
              }
              className="grid grid-cols-1 gap-2"
            >
              <ToggleGroupItem value="camera" className={TOGGLE_ITEM_CLASS}>
                Camera Deputaților
              </ToggleGroupItem>
              <ToggleGroupItem value="senat" className={TOGGLE_ITEM_CLASS}>
                Senat
              </ToggleGroupItem>
              <ToggleGroupItem value="comun" className={TOGGLE_ITEM_CLASS}>
                Ședință comună
              </ToggleGroupItem>
            </ToggleGroup>
          </section>

          {/* Availability describes a CAPTURE, so it only exists on the
              sittings view. Rendering it on interventions would offer a filter
              that has nothing to apply to. */}
          {view === 'sedinte' ? (
            <section className="space-y-2">
              <Label className={SECTION_LABEL_CLASS}>Disponibilitate</Label>
              <ToggleGroup
                type="single"
                value={search.disponibilitate ?? ''}
                onValueChange={(value) =>
                  onChange({
                    disponibilitate:
                      value === 'COMPLETE' ||
                      value === 'PARTIAL' ||
                      value === 'SOURCE_ONLY'
                        ? value
                        : undefined,
                  })
                }
                className="grid grid-cols-1 gap-2"
              >
                <ToggleGroupItem value="COMPLETE" className={TOGGLE_ITEM_CLASS}>
                  Transcriere completă
                </ToggleGroupItem>
                <ToggleGroupItem value="PARTIAL" className={TOGGLE_ITEM_CLASS}>
                  Transcriere parțială
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="SOURCE_ONLY"
                  className={TOGGLE_ITEM_CLASS}
                >
                  Doar linkul oficial
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
                Cât din ședință se poate citi aici. „Doar linkul oficial”
                înseamnă că păstrăm ședința și adresa ei la sursă, dar textul
                dezbaterii nu este servit — nu că ședința ar fi fost tăcută.
              </p>
            </section>
          ) : null}

          <section className="space-y-2">
            <Label className={SECTION_LABEL_CLASS}>Interval de timp</Label>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label
                  htmlFor="speeches-from"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  De la
                </Label>
                <input
                  id="speeches-from"
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
                  htmlFor="speeches-to"
                  className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]"
                >
                  Până la
                </Label>
                <input
                  id="speeches-to"
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
            <p className="text-xs font-normal text-[#505a5f] dark:text-[var(--pnrr-muted)]">
              {view === 'sedinte'
                ? 'Fără interval, lista arată tot istoricul de ședințe, cele mai recente primele. Căutarea acoperă întregul text al stenogramelor, pe tot istoricul.'
                : 'Fără vorbitor sau interval, lista arată anul selectat. Căutarea în transcrierea completă cere un vorbitor sau un interval de cel mult 3 luni.'}
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

type ChipsProps = {
  readonly search: ParliamentSpeechesSearch
  readonly onChange: (patch: ParliamentSpeechesFilterPatch) => void
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

const CAMERA_CHIP_LABEL: Record<'camera' | 'senat' | 'comun', string> = {
  camera: 'Camera Deputaților',
  senat: 'Senat',
  comun: 'Ședință comună',
}

/** Chip label for the speaker facet — resolves the member name when cached. */
function SpeakerChipLabel({ mandateKey }: { readonly mandateKey: string }) {
  const { data: member } = useParliamentMember(mandateKey)
  return (
    <>
      Vorbitor:{' '}
      {member ? formatMemberName(member.firstName, member.lastName) : mandateKey}
    </>
  )
}

/** One chip per active facet, each with an X to remove it. */
export function ParliamentSpeechesActiveFilters({
  search,
  onChange,
  onClearAll,
}: ChipsProps) {
  const chips: Array<{
    key: string
    label: ReactNode
    ariaLabel: string
    onRemove: () => void
  }> = []

  if (search.vorbitor) {
    chips.push({
      key: 'vorbitor',
      label: <SpeakerChipLabel mandateKey={search.vorbitor} />,
      ariaLabel: 'Elimină filtrul de vorbitor',
      onRemove: () => onChange({ vorbitor: undefined }),
    })
  }

  if (search.camera) {
    chips.push({
      key: 'camera',
      label: `Camera: ${CAMERA_CHIP_LABEL[search.camera]}`,
      ariaLabel: 'Elimină filtrul de cameră',
      onRemove: () => onChange({ camera: undefined }),
    })
  }

  if (search.from || search.to) {
    const clearDate = () => onChange({ from: undefined, to: undefined })
    if (search.from && search.from === search.to) {
      chips.push({
        key: 'day',
        label: `Ziua: ${formatChipDate(search.from)}`,
        ariaLabel: 'Elimină filtrul de zi',
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
        ariaLabel: 'Elimină filtrul de perioadă',
        onRemove: clearDate,
      })
    }
  }

  const q = getParliamentSpeechQ(search)
  if (q) {
    chips.push({
      key: 'q',
      label: `Conține: ${q}`,
      ariaLabel: 'Elimină filtrul de căutare',
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
            aria-label={chip.ariaLabel}
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
