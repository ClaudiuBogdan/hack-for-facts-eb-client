import { useRef, useState, type ReactNode, type Ref } from 'react'
import { flushSync } from 'react-dom'
import { t } from '@lingui/core/macro'
import { Check, SlidersHorizontal, X } from 'lucide-react'
import { FIELD, Group, Row, SHEET_CLOSE } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { LEGAL_DOMAIN_SLUGS, legalDomainLabelLoose } from '../lib/legal-domains'
import { legalActTypeLabel, legalStatusLabel } from '../lib/legal-vocabulary'
import {
  NO_SEARCH_FILTERS,
  SEARCH_CATEGORIES,
  SEARCH_STATUSES,
  SEARCH_TYPES,
  SEARCH_YEAR_MIN,
  activeFilterCount,
  isSearchFiltered,
  searchCategoryLabel,
  withSearchYears,
  type SearchFilters,
  type SearchStatus,
} from '../lib/search-filters'

/**
 * The search page's filters (owner, 25 November 2026): one button beside the field opens the analysis page's
 * side panel (a sheet on a phone); the filters on show as removable chips above the results. What each filter
 * means and which the engine takes is in `lib/search-filters.ts`.
 *
 * Round 2 (owner, 26 November 2026): the button has no box at rest from `sm`, the chips are small plain labels,
 * and the panel's options are plain rows with a mark when chosen, the long lists cut to their first six with the
 * rest behind one link, and on a phone a bar at the bottom that closes the panel. The frame (`Group`, `Row`, the
 * year fields) is still the analysis pages' shared one; the options and the chips are this page's own.
 */

function typeLabel(key: string): string {
  return key === 'unknown' ? t`Tip necunoscut` : legalActTypeLabel(key)
}

/** The years offered, newest first, from this year back to the oldest the filter takes. */
function yearOptions(): readonly number[] {
  const now = new Date().getFullYear()
  return Array.from({ length: now - SEARCH_YEAR_MIN + 1 }, (_, index) => now - index)
}

const toggled = (list: readonly string[], key: string) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key])

/**
 * Beside the field, as tall as it. From `sm` it has no box at rest (owner, 26 November 2026: „the problem is the
 * border"): the icon and the word, a box on hover and for the keyboard, and a tinted box while a filter is on, so
 * that state is seen without hovering. On a phone it is the icon alone and keeps its box, which is what says it
 * can be pressed.
 */
export function LegislationFilterButton({
  filters,
  onOpen,
  ref,
}: {
  readonly filters: SearchFilters
  readonly onOpen: () => void
  readonly ref?: Ref<HTMLButtonElement>
}) {
  const on = activeFilterCount(filters)
  return (
    <button
      ref={ref}
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={on > 0 ? t`Filtre, ${on} active` : t`Filtre`}
      className={cn(
        'inline-flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-lg border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 sm:h-14 sm:px-4',
        on > 0 ? 'border-primary/50 bg-primary/5' : 'sm:border-transparent sm:bg-transparent sm:hover:border-input sm:hover:bg-card sm:focus-visible:border-input',
      )}
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{on > 0 ? t`Filtre (${on})` : t`Filtre`}</span>
      {on > 0 ? <span className="text-xs tabular-nums sm:hidden">{on}</span> : null}
    </button>
  )
}

/**
 * A filter that is on, as a small plain label: pressing it takes the filter off. The drawn label is 28 px tall;
 * its press area is grown to 44 px with a pseudo-element, so the row of chips stays quiet and each is still a
 * whole target on a phone.
 */
function ActiveChip({ label, onClear }: { readonly label: string; readonly onClear: () => void }) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={t`Scoate ${label}`}
      title={t`Scoate ${label}`}
      className="group relative inline-flex h-7 max-w-full items-center gap-1.5 rounded-sm bg-muted pl-2.5 pr-2 text-sm text-foreground transition-colors after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:bg-muted-foreground/20"
    >
      <span className="min-w-0 truncate">{label}</span>
      <X className="size-3.5 shrink-0 text-muted-foreground group-hover:text-foreground" aria-hidden="true" />
    </button>
  )
}

/** Above the results: each filter on, removable on its own, and the way to remove them all. */
export function LegislationActiveFilters({ filters, onChange }: { readonly filters: SearchFilters; readonly onChange: (next: SearchFilters) => void }) {
  if (!isSearchFiltered(filters)) return null
  const years =
    filters.from !== null && filters.to !== null
      ? filters.from === filters.to
        ? String(filters.from)
        : `${filters.from}–${filters.to}`
      : filters.from !== null
        ? t`din ${filters.from}`
        : t`până în ${filters.to ?? ''}`
  const chips: { readonly key: string; readonly label: string; readonly clear: () => void }[] = [
    ...filters.tip.map((key) => ({ key: `tip-${key}`, label: typeLabel(key), clear: () => onChange({ ...filters, tip: filters.tip.filter((x) => x !== key) }) })),
    ...(filters.stare === 'implicit'
      ? []
      : [{ key: 'stare', label: filters.stare === 'toate' ? t`Și actele abrogate` : legalStatusLabel(filters.stare), clear: () => onChange({ ...filters, stare: 'implicit' }) }]),
    ...(filters.from === null && filters.to === null ? [] : [{ key: 'ani', label: years, clear: () => onChange({ ...filters, from: null, to: null }) }]),
    ...filters.domeniu.map((key) => ({ key: `domeniu-${key}`, label: legalDomainLabelLoose(key), clear: () => onChange({ ...filters, domeniu: filters.domeniu.filter((x) => x !== key) }) })),
    ...filters.categorie.map((key) => ({
      key: `categorie-${key}`,
      label: t`Categoria: ${searchCategoryLabel(key)}`,
      clear: () => onChange({ ...filters, categorie: filters.categorie.filter((x) => x !== key) }),
    })),
    ...(filters.sanctiuni ? [{ key: 'sanctiuni', label: t`Menționează sancțiuni`, clear: () => onChange({ ...filters, sanctiuni: false }) }] : []),
  ]
  return (
    // A row gap of 16 px: each chip's press area reaches 8 px above and below it, so wrapped rows never overlap.
    <div className="flex flex-wrap items-center gap-x-2 gap-y-4" role="group" aria-label={t`Filtre active`}>
      {chips.map((chip) => (
        <ActiveChip key={chip.key} label={chip.label} onClear={chip.clear} />
      ))}
      <button
        type="button"
        onClick={() => onChange(NO_SEARCH_FILTERS)}
        className="relative inline-flex h-7 items-center px-1 text-sm text-muted-foreground underline-offset-4 after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] hover:text-foreground hover:underline"
      >
        {t`Scoate toate filtrele`}
      </button>
    </div>
  )
}

/**
 * One option, as a plain row: a mark that fills when it is chosen (a box where several can be, a ring where one
 * is) and its name, which wraps onto a second line and is never cut. 44 px tall on a phone, 36 from `sm`.
 */
function Option({
  on,
  one = false,
  onPress,
  children,
  ref,
}: {
  readonly on: boolean
  readonly one?: boolean
  readonly onPress: () => void
  readonly children: ReactNode
  readonly ref?: Ref<HTMLButtonElement>
}) {
  return (
    <button ref={ref} type="button" aria-pressed={on} onClick={onPress} className="flex min-h-11 w-full items-start gap-2.5 rounded-sm px-2 py-3 text-left text-sm leading-5 hover:bg-muted sm:min-h-9 sm:py-2">
      <span
        aria-hidden="true"
        className={cn('mt-0.5 flex size-4 shrink-0 items-center justify-center border', one ? 'rounded-full' : 'rounded-[3px]', on ? 'border-primary bg-primary text-primary-foreground' : 'border-foreground/30 bg-background')}
      >
        {on ? one ? <span className="size-1.5 rounded-full bg-current" /> : <Check className="size-3" strokeWidth={3} /> : null}
      </span>
      <span className={cn('min-w-0 break-words', on && 'font-medium')}>{children}</span>
    </button>
  )
}

/**
 * A list of options under its label. On a phone the label sits above the list, so two columns of options have the
 * sheet's whole width (beside the label, a column was 112 px and „Administrație" ran into its neighbour); from
 * `sm` it is the shared `Row`'s label column.
 */
function ListRow({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div className="grid gap-x-2 gap-y-0.5 sm:grid-cols-[4.25rem_minmax(0,1fr)] sm:items-start">
      <span className="px-2 text-xs leading-tight text-muted-foreground sm:px-0 sm:pt-3">{label}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** How many of a long list's options are shown before „more". */
const FIRST = 6

/**
 * A list where several options can be chosen, in two columns. A long list shows its first six and the rest behind
 * one link; an option that is chosen is always shown, and a list with a chosen option among the rest opens whole.
 * The link counts only the options it hides, and opening it from the keyboard takes the focus to the first option
 * it revealed, which is drawn before the link (review astra-client-11: Tab from the link went past them).
 * The first six are the lists' own order: the types by the act's rank (laws and ordinances, then the Government's
 * and the ministers' acts), the domains by how many acts carry them (the dev API's counts, 26 November 2026), the
 * categories as the summaries list them.
 */
function Choices({
  keys,
  chosen,
  label,
  onToggle,
  more,
}: {
  readonly keys: readonly string[]
  readonly chosen: readonly string[]
  readonly label: (key: string) => string
  readonly onToggle: (key: string) => void
  /** The link's words for the options not shown („Încă 12 tipuri"); a list with none takes no link. */
  readonly more?: (hidden: number) => string
}) {
  const rest = more === undefined ? [] : keys.slice(FIRST)
  const [open, setOpen] = useState(() => rest.some((key) => chosen.includes(key)))
  const hidden = rest.filter((key) => !chosen.includes(key))
  const shown = open || rest.length === 0 ? keys : [...keys.slice(0, FIRST), ...rest.filter((key) => chosen.includes(key))]
  // The first option the link reveals, focused once it is drawn.
  const firstRevealed = useRef<HTMLButtonElement>(null)
  return (
    <>
      <div className="grid grid-cols-2 gap-x-1">
        {shown.map((key) => (
          <Option key={key} ref={key === hidden[0] ? firstRevealed : undefined} on={chosen.includes(key)} onPress={() => onToggle(key)}>
            {label(key)}
          </Option>
        ))}
      </div>
      {hidden.length > 0 && more !== undefined ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={(event) => {
            if (open) {
              setOpen(false)
              return
            }
            // A pointer click (its count, `detail`, is 1 or more) leaves the focus where it is; Enter, Space or an
            // assistive technology's activation (`detail` 0) is taken to the first option revealed (review
            // astra-client-12).
            if (event.detail !== 0) {
              setOpen(true)
              return
            }
            flushSync(() => setOpen(true))
            firstRevealed.current?.focus()
          }}
          className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-9"
        >
          {open ? t`Mai puține` : more(hidden.length)}
        </button>
      ) : null}
    </>
  )
}

const STATUS_CHOICES: readonly SearchStatus[] = ['implicit', 'toate', ...SEARCH_STATUSES]

/** Every filter, in the analysis page's side panel (a sheet on a phone). */
export function LegislationFilterPanel({
  filters,
  onChange,
  open,
  onOpenChange,
  returnFocus,
  asked = true,
}: {
  readonly filters: SearchFilters
  readonly onChange: (next: SearchFilters) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Where the focus goes when the panel closes: the button that opened it (the panel has no trigger of its own). */
  readonly returnFocus?: () => void
  /**
   * Whether a question is asked: without one, closing the panel shows the ways to ask, not results, and the phone's
   * bar says „Gata". Unsaid, it is taken as asked.
   */
  readonly asked?: boolean
}) {
  const years = yearOptions()
  const filtered = isSearchFiltered(filters)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        closeClassName={SHEET_CLOSE}
        className="w-full overflow-y-auto sm:max-w-md"
        onCloseAutoFocus={(event) => {
          if (!returnFocus) return
          event.preventDefault()
          returnFocus()
        }}
      >
        <SheetHeader>
          <SheetTitle>{t`Filtre`}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 divide-y">
          <Group title={t`Ce`}>
            <ListRow label={t`Tip`}>
              <Choices keys={SEARCH_TYPES} chosen={filters.tip} label={typeLabel} onToggle={(key) => onChange({ ...filters, tip: toggled(filters.tip, key) })} more={(hidden) => t`Încă ${hidden} tipuri`} />
            </ListRow>
            <ListRow label={t`Stare`}>
              <div className="grid grid-cols-2 gap-x-1">
                {STATUS_CHOICES.map((key) => (
                  <Option key={key} one on={filters.stare === key} onPress={() => onChange({ ...filters, stare: key })}>
                    {key === 'implicit' ? t`Fără cele abrogate` : key === 'toate' ? t`Toate` : legalStatusLabel(key)}
                  </Option>
                ))}
              </div>
            </ListRow>
          </Group>
          <Group title={t`Când`}>
            <Row label={t`De la`}>
              <select aria-label={t`De la`} className={FIELD} value={filters.from ?? ''} onChange={(event) => onChange(withSearchYears(filters, event.target.value === '' ? null : Number(event.target.value), filters.to))}>
                <option value="">{t`orice an`}</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t`Până la`}>
              <select aria-label={t`Până la`} className={FIELD} value={filters.to ?? ''} onChange={(event) => onChange(withSearchYears(filters, filters.from, event.target.value === '' ? null : Number(event.target.value)))}>
                <option value="">{t`azi`}</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Row>
            <p className="text-xs text-muted-foreground">{t`Anul actului. O perioadă lasă deoparte actele fără an.`}</p>
          </Group>
          <Group title={t`Despre ce`}>
            <p className="text-xs text-muted-foreground">
              {t`Domeniul, categoria și sancțiunile vin din rezumatele făcute automat ale actelor: un act fără rezumat nu apare când folosești unul dintre aceste filtre.`}
            </p>
            <ListRow label={t`Domeniu`}>
              <Choices
                keys={LEGAL_DOMAIN_SLUGS}
                chosen={filters.domeniu}
                label={legalDomainLabelLoose}
                onToggle={(key) => onChange({ ...filters, domeniu: toggled(filters.domeniu, key) })}
                more={(hidden) => t`Încă ${hidden} domenii`}
              />
            </ListRow>
            <ListRow label={t`Categorie`}>
              <Choices
                keys={SEARCH_CATEGORIES}
                chosen={filters.categorie}
                label={searchCategoryLabel}
                onToggle={(key) => onChange({ ...filters, categorie: toggled(filters.categorie, key) })}
                more={(hidden) => t`Încă ${hidden} categorii`}
              />
            </ListRow>
            <ListRow label={t`Sancțiuni`}>
              <Option on={filters.sanctiuni} onPress={() => onChange({ ...filters, sanctiuni: !filters.sanctiuni })}>
                {t`Doar actele care menționează sancțiuni`}
              </Option>
            </ListRow>
          </Group>
          <Group title={t`Cine`}>
            {/* LEG-N36A: the issuer filter waits for one name per issuer in the data. */}
            <p className="text-sm text-muted-foreground">{t`Filtrul după emitent vine curând: întâi fiecare emitent primește un singur nume în date.`}</p>
          </Group>
        </div>
        {filtered ? (
          <button
            type="button"
            onClick={() => onChange(NO_SEARCH_FILTERS)}
            className="mt-6 hidden min-h-10 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:inline-flex"
          >
            {t`Scoate toate filtrele`}
          </button>
        ) : null}
        {/* On a phone the filters apply as they are pressed, and nothing said so: a bar that stays at the bottom
            closes the panel onto the results, with the way to take every filter off beside it. */}
        <div className="sticky -bottom-6 -mx-6 -mb-6 mt-6 flex items-center gap-4 border-t bg-background px-6 py-3 sm:hidden">
          <Button type="button" className="min-h-11 flex-1" onClick={() => onOpenChange(false)}>
            {asked ? t`Vezi rezultatele` : t`Gata`}
          </Button>
          {filtered ? (
            <button type="button" onClick={() => onChange(NO_SEARCH_FILTERS)} className="inline-flex min-h-11 items-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              {t`Scoate toate`}
            </button>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
