import { t } from '@lingui/core/macro'
import { SlidersHorizontal } from 'lucide-react'
import { CELL, Chip, FIELD, Group, Row, SHEET_CLOSE } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { LegalSearchFilter } from '@/features/legal/api/legal-search-api'
import { LEGAL_DOMAIN_SLUGS, legalDomainLabel, legalDomainLabelLoose } from '@/features/legal/lib/legal-domains'
import { legalActTypeLabel, legalStatusLabel } from '@/features/legal/lib/legal-vocabulary'
import { cn } from '@/lib/utils'

/**
 * The search page's filters (owner, 25 November 2026: type, year, status, domain, category and penalties; a quick
 * button under the field opens the analysis page's side panel, with no quick selects; issuer once LEG-N36A lands). Each one is a filter the
 * search engine expresses, measured on the dev API; `exclude` and the fiscal-impact filter are refused there, so
 * they are not offered. The search returns no counts per option (LEG-41A6), so the options carry none.
 */

/** The status choice folds the old „include repealed" box: the server's default, everything, or one status. */
export type StatusChoice = 'implicit' | 'toate' | string

export type SearchFilters = {
  readonly tip: readonly string[]
  readonly stare: StatusChoice
  readonly from: number | null
  readonly to: number | null
  readonly domeniu: readonly string[]
  readonly categorie: readonly string[]
  readonly sanctiuni: boolean
}

export const NO_FILTERS: SearchFilters = { tip: [], stare: 'implicit', from: null, to: null, domeniu: [], categorie: [], sanctiuni: false }

/** The act types the filter accepts (the API's 18; `doc`, `codul` and `proiect` are not among them: LEG-PDYY). */
const TYPES = ['lege', 'oug', 'og', 'hotarare', 'ordin', 'decizie', 'decret', 'norma', 'regulament', 'rectificare', 'metodologie', 'comunicat', 'procedura', 'acord', 'circulara', 'instructiuni', 'raport', 'unknown'] as const
const STATUSES = ['in-vigoare', 'modificat', 'abrogat-partial', 'abrogat', 'suspendat', 'iesit-din-vigoare'] as const
/** The summaries' categories (13). A different vocabulary from the act type, which it often repeats. */
const CATEGORIES = ['lege', 'ordin', 'hotarare', 'hotarare-de-guvern', 'decizie', 'decret', 'norma-metodologica', 'regulament', 'ordonanta', 'ordonanta-de-urgenta', 'tratat', 'circulara', 'altele'] as const

function categoryLabel(key: string): string {
  switch (key) {
    case 'lege':
      return t`Lege`
    case 'ordin':
      return t`Ordin`
    case 'hotarare':
      return t`Hotărâre`
    case 'hotarare-de-guvern':
      return t`Hotărâre de Guvern`
    case 'decizie':
      return t`Decizie`
    case 'decret':
      return t`Decret`
    case 'norma-metodologica':
      return t`Normă metodologică`
    case 'regulament':
      return t`Regulament`
    case 'ordonanta':
      return t`Ordonanță`
    case 'ordonanta-de-urgenta':
      return t`Ordonanță de urgență`
    case 'tratat':
      return t`Tratat`
    case 'circulara':
      return t`Circulară`
    default:
      return t`Altele`
  }
}

function typeLabel(key: string): string {
  return key === 'unknown' ? t`Tip necunoscut` : legalActTypeLabel(key)
}

/** The years offered, newest first: from this year back to 1860 (the corpus holds a few acts older still). */
function yearOptions(): readonly number[] {
  const now = new Date().getFullYear()
  return Array.from({ length: now - 1860 + 1 }, (_, index) => now - index)
}

/** The filters as the search adapter takes them, and whether repealed acts are searched. */
export function searchArgs(filters: SearchFilters): { readonly filter: LegalSearchFilter; readonly historical: boolean } {
  const status = filters.stare === 'implicit' || filters.stare === 'toate' ? undefined : [filters.stare]
  return {
    // a status chosen by name is searched among every act, the repealed ones too
    historical: filters.stare !== 'implicit',
    filter: {
      ...(filters.tip.length > 0 && { actType: filters.tip }),
      ...(status && { status }),
      ...(filters.from !== null && { yearFrom: filters.from }),
      ...(filters.to !== null && { yearTo: filters.to }),
      ...(filters.domeniu.length > 0 && { domain: filters.domeniu }),
      ...(filters.categorie.length > 0 && { category: filters.categorie }),
      ...(filters.sanctiuni && { penaltiesMentioned: true }),
    },
  }
}

/** Whether a filter read from the summaries is on: then acts without a summary are left out, and the page says so. */
export function usesSummaries(filters: SearchFilters): boolean {
  return filters.domeniu.length > 0 || filters.categorie.length > 0 || filters.sanctiuni
}

export function isFiltered(filters: SearchFilters): boolean {
  return filters.tip.length > 0 || filters.stare !== 'implicit' || filters.from !== null || filters.to !== null || usesSummaries(filters)
}

const toggled = (list: readonly string[], key: string) => (list.includes(key) ? list.filter((x) => x !== key) : [...list, key])

/** How many filters are on: each type, domain and category chosen counts, as do the status, the years and penalties. */
function activeCount(filters: SearchFilters): number {
  return (
    filters.tip.length +
    (filters.stare === 'implicit' ? 0 : 1) +
    (filters.from === null && filters.to === null ? 0 : 1) +
    filters.domeniu.length +
    filters.categorie.length +
    (filters.sanctiuni ? 1 : 0)
  )
}

/**
 * Beside the field, the one way to the filters (owner, 25 November 2026: no quick selects, the button alone, to the
 * right of the input): as tall as the field, with its border and radius, so the two read as one control.
 */
export function FilterButton({ filters, onOpen }: { readonly filters: SearchFilters; readonly onOpen: () => void }) {
  const on = activeCount(filters)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label={on > 0 ? t`Filtre, ${on} active` : t`Filtre`}
      className={cn(
        'inline-flex h-12 min-w-12 shrink-0 items-center justify-center gap-2 rounded-lg border bg-card px-3.5 sm:px-4 text-sm font-medium text-foreground transition-colors hover:border-foreground/30',
        on > 0 && 'border-primary/50 bg-primary/5',
      )}
    >
      <SlidersHorizontal className="size-4" aria-hidden="true" />
      {/* a phone keeps the field's width: the icon and the count, the word from 640px */}
      <span className="hidden sm:inline">{on > 0 ? t`Filtre (${on})` : t`Filtre`}</span>
      {on > 0 ? <span className="text-xs tabular-nums sm:hidden">{on}</span> : null}
    </button>
  )
}

/** A range kept in order: a start after the end moves the end, as the analysis page's years do. */
function withYears(filters: SearchFilters, from: number | null, to: number | null): SearchFilters {
  if (from !== null && to !== null && from > to) return { ...filters, from, to: from }
  return { ...filters, from, to }
}

/** Above the results: each filter on, removable on its own, and the way to remove them all. */
export function ActiveFilters({ filters, onChange }: { readonly filters: SearchFilters; readonly onChange: (next: SearchFilters) => void }) {
  if (!isFiltered(filters)) return null
  const chips: { readonly key: string; readonly label: string; readonly clear: () => void }[] = [
    ...filters.tip.map((key) => ({ key: `tip-${key}`, label: typeLabel(key), clear: () => onChange({ ...filters, tip: filters.tip.filter((x) => x !== key) }) })),
    ...(filters.stare === 'implicit' ? [] : [{ key: 'stare', label: filters.stare === 'toate' ? t`Și cele abrogate` : legalStatusLabel(filters.stare), clear: () => onChange({ ...filters, stare: 'implicit' }) }]),
    ...(filters.from === null && filters.to === null
      ? []
      : [
          {
            key: 'ani',
            label: filters.from !== null && filters.to !== null ? (filters.from === filters.to ? String(filters.from) : `${filters.from}–${filters.to}`) : filters.from !== null ? t`din ${filters.from}` : t`până în ${filters.to ?? ''}`,
            clear: () => onChange({ ...filters, from: null, to: null }),
          },
        ]),
    ...filters.domeniu.map((key) => ({ key: `domeniu-${key}`, label: legalDomainLabelLoose(key), clear: () => onChange({ ...filters, domeniu: filters.domeniu.filter((x) => x !== key) }) })),
    ...filters.categorie.map((key) => ({ key: `categorie-${key}`, label: t`Categoria: ${categoryLabel(key)}`, clear: () => onChange({ ...filters, categorie: filters.categorie.filter((x) => x !== key) }) })),
    ...(filters.sanctiuni ? [{ key: 'sanctiuni', label: t`Menționează sancțiuni`, clear: () => onChange({ ...filters, sanctiuni: false }) }] : []),
  ]
  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t`Filtre active`} role="group">
      {chips.map((chip) => (
        <Chip key={chip.key} label={chip.label} onClear={chip.clear} />
      ))}
      <button type="button" onClick={() => onChange(NO_FILTERS)} className="inline-flex min-h-11 items-center px-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-10">
        {t`Scoate toate filtrele`}
      </button>
    </div>
  )
}

const pressed = (on: boolean) => cn(CELL, 'flex items-center text-left', on ? 'border-primary bg-primary/5 font-medium' : '')

/** Every filter, in the analysis page's side panel (a sheet on a phone). */
export function FilterPanel({ filters, onChange, open, onOpenChange }: { readonly filters: SearchFilters; readonly onChange: (next: SearchFilters) => void; readonly open: boolean; readonly onOpenChange: (open: boolean) => void }) {
  const years = yearOptions()
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" closeClassName={SHEET_CLOSE} className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t`Filtre`}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 divide-y">
          <Group title={t`Ce`}>
            <Row label={t`Tip`}>
              <div className="grid grid-cols-2 gap-1">
                {TYPES.map((key) => (
                  <button key={key} type="button" aria-pressed={filters.tip.includes(key)} onClick={() => onChange({ ...filters, tip: toggled(filters.tip, key) })} className={pressed(filters.tip.includes(key))}>
                    <span className="truncate">{typeLabel(key)}</span>
                  </button>
                ))}
              </div>
            </Row>
            <Row label={t`Stare`}>
              <div className="grid grid-cols-2 gap-1">
                {(['implicit', 'toate', ...STATUSES] as const).map((key) => (
                  <button key={key} type="button" aria-pressed={filters.stare === key} onClick={() => onChange({ ...filters, stare: key })} className={pressed(filters.stare === key)}>
                    <span className="truncate">{key === 'implicit' ? t`Fără cele abrogate` : key === 'toate' ? t`Toate` : legalStatusLabel(key)}</span>
                  </button>
                ))}
              </div>
            </Row>
          </Group>
          <Group title={t`Când`}>
            <Row label={t`De la`}>
              <select className={FIELD} value={filters.from ?? ''} onChange={(event) => onChange(withYears(filters, event.target.value === '' ? null : Number(event.target.value), filters.to))}>
                <option value="">{t`orice an`}</option>
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </Row>
            <Row label={t`Până la`}>
              <select className={FIELD} value={filters.to ?? ''} onChange={(event) => onChange(withYears(filters, filters.from, event.target.value === '' ? null : Number(event.target.value)))}>
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
            <p className="text-xs text-muted-foreground">{t`Domeniul, categoria și sancțiunile vin din rezumatele făcute automat ale actelor: un act fără rezumat nu apare când folosești unul dintre aceste filtre.`}</p>
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
                {CATEGORIES.map((key) => (
                  <button key={key} type="button" aria-pressed={filters.categorie.includes(key)} onClick={() => onChange({ ...filters, categorie: toggled(filters.categorie, key) })} className={pressed(filters.categorie.includes(key))}>
                    <span className="truncate">{categoryLabel(key)}</span>
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
        {isFiltered(filters) ? (
          <button type="button" onClick={() => onChange(NO_FILTERS)} className="mt-6 min-h-11 w-full border text-sm hover:bg-muted">
            {t`Scoate toate filtrele`}
          </button>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
