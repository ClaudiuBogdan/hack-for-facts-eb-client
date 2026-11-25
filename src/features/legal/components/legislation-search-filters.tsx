import type { Ref } from 'react'
import { t } from '@lingui/core/macro'
import { SlidersHorizontal } from 'lucide-react'
import { CELL, Chip, FIELD, Group, Row, SHEET_CLOSE } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { LEGAL_DOMAIN_SLUGS, legalDomainLabel, legalDomainLabelLoose } from '../lib/legal-domains'
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

/** Beside the field: as tall as it, with its border and radius, so the two read as one control; on a phone the icon. */
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
        'inline-flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-lg border bg-card px-3.5 text-sm font-medium text-foreground transition-colors hover:border-foreground/30 sm:px-4',
        on > 0 && 'border-primary/50 bg-primary/5',
      )}
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      <span className="hidden sm:inline">{on > 0 ? t`Filtre (${on})` : t`Filtre`}</span>
      {on > 0 ? <span className="text-xs tabular-nums sm:hidden">{on}</span> : null}
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
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t`Filtre active`}>
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onClear={chip.clear} />
      ))}
      <button type="button" onClick={() => onChange(NO_SEARCH_FILTERS)} className="inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-10">
        {t`Scoate toate filtrele`}
      </button>
    </div>
  )
}

const pressed = (on: boolean) => cn(CELL, 'flex items-center text-left', on && 'border-primary bg-primary/5 font-medium')

const STATUS_CHOICES: readonly SearchStatus[] = ['implicit', 'toate', ...SEARCH_STATUSES]

/** Every filter, in the analysis page's side panel (a sheet on a phone). */
export function LegislationFilterPanel({
  filters,
  onChange,
  open,
  onOpenChange,
  returnFocus,
}: {
  readonly filters: SearchFilters
  readonly onChange: (next: SearchFilters) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  /** Where the focus goes when the panel closes: the button that opened it (the panel has no trigger of its own). */
  readonly returnFocus?: () => void
}) {
  const years = yearOptions()
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
            <Row label={t`Tip`}>
              <div className="grid grid-cols-2 gap-1">
                {SEARCH_TYPES.map((key) => (
                  <button key={key} type="button" aria-pressed={filters.tip.includes(key)} onClick={() => onChange({ ...filters, tip: toggled(filters.tip, key) })} className={pressed(filters.tip.includes(key))}>
                    <span className="truncate">{typeLabel(key)}</span>
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t`Stare`}>
              <div className="grid grid-cols-2 gap-1">
                {STATUS_CHOICES.map((key) => (
                  <button key={key} type="button" aria-pressed={filters.stare === key} onClick={() => onChange({ ...filters, stare: key })} className={pressed(filters.stare === key)}>
                    <span className="truncate">{key === 'implicit' ? t`Fără cele abrogate` : key === 'toate' ? t`Toate` : legalStatusLabel(key)}</span>
                  </button>
                ))}
              </div>
            </Row>
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
            <Row label={t`Domeniu`}>
              <div className="grid gap-1">
                {LEGAL_DOMAIN_SLUGS.map((key) => (
                  <button key={key} type="button" aria-pressed={filters.domeniu.includes(key)} onClick={() => onChange({ ...filters, domeniu: toggled(filters.domeniu, key) })} className={pressed(filters.domeniu.includes(key))}>
                    <span className="truncate">{legalDomainLabel(key)}</span>
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t`Categorie`}>
              <div className="grid grid-cols-2 gap-1">
                {SEARCH_CATEGORIES.map((key) => (
                  <button key={key} type="button" aria-pressed={filters.categorie.includes(key)} onClick={() => onChange({ ...filters, categorie: toggled(filters.categorie, key) })} className={pressed(filters.categorie.includes(key))}>
                    <span className="truncate">{searchCategoryLabel(key)}</span>
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t`Sancțiuni`}>
              <button type="button" aria-pressed={filters.sanctiuni} onClick={() => onChange({ ...filters, sanctiuni: !filters.sanctiuni })} className={pressed(filters.sanctiuni)}>
                {t`Doar actele care menționează sancțiuni`}
              </button>
            </Row>
          </Group>
          <Group title={t`Cine`}>
            {/* LEG-N36A: the issuer filter waits for one name per issuer in the data. */}
            <p className="text-sm text-muted-foreground">{t`Filtrul după emitent vine curând: întâi fiecare emitent primește un singur nume în date.`}</p>
          </Group>
        </div>
        {isSearchFiltered(filters) ? (
          <button type="button" onClick={() => onChange(NO_SEARCH_FILTERS)} className="mt-6 min-h-11 w-full border text-sm hover:bg-muted">
            {t`Scoate toate filtrele`}
          </button>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
