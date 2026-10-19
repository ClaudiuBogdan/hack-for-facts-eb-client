import { t } from '@lingui/core/macro'
import { CELL, Chip, Group, Row, SHEET_CLOSE, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { ChoiceSelect, type ChoiceGroup } from '@/features/private-companies/components/analytics/analytics-choices'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import { eventShort, eventTitle, familyPlural, scopeLabel } from '../shared/labels'
import { FAMILIES, SCOPE_TYPES, type Family, type ScopeType } from '../shared/model'
import { useFormat } from '../shared/parts'
import { cleared, filterCount, measureValue, optionsOf, ROUND_UNREPORTED, withFilter, withoutFilter, type Answer, type Catalog, type FilterKey, type Query } from './model'
import { officeText, roundText } from './text'

/**
 * Every filter the question takes, in one panel (Guidelines G6): the
 * election (its family, its year, the election, the edition) and the rows
 * (the office, the level, the round, the county). Each value says what it
 * would select with the others kept, and a value that selects nothing is
 * not offered. Up to four short values sit side by side, more go in one
 * column, and the long lists (elections, editions, offices, counties) are
 * selects with the phone's own picker. Nothing above a list moves on a pick.
 */

const ALL = '__toate__'
const SELECT = 'h-11 rounded-none px-2.5 text-base shadow-none sm:h-10 sm:text-sm'

function unit(key: FilterKey, option: { readonly editions: number; readonly rows: number | null }, format: ReturnType<typeof useFormat>): string {
  if (key === 'tip' || key === 'an' || key === 'alegere') return option.editions === 1 ? t`o ediție` : t`${format.n(option.editions)} ediții`
  // Rows only in editions that are not the reference: said, never „0 rânduri".
  if (option.rows === null) return t`— · doar în alte ediții`
  return t`${format.n(option.rows)} rânduri`
}

/** A short list: one value a row, the chosen one marked, „Toate" first. */
function ValueColumn<V extends string>({
  label,
  values,
  picked,
  onPick,
  onClear,
}: {
  readonly label: string
  readonly values: readonly { readonly value: V; readonly label: string; readonly note: string }[]
  readonly picked: V | null
  readonly onPick: (value: V) => void
  readonly onClear: () => void
}) {
  const active = (on: boolean) => (on ? 'border-primary bg-primary/5 font-semibold' : '')
  return (
    <Row label={label}>
      <div className="grid grid-cols-1 gap-1.5" role="group" aria-label={label}>
        <button type="button" aria-pressed={picked === null} onClick={onClear} className={cn(CELL, 'flex items-center justify-between text-left', active(picked === null))}>
          <span>{t`Toate`}</span>
        </button>
        {values.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={picked === item.value}
            onClick={() => onPick(item.value)}
            className={cn(CELL, 'flex items-center justify-between gap-3 text-left', active(picked === item.value))}
          >
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{item.note}</span>
          </button>
        ))}
      </div>
    </Row>
  )
}

/** A long list as a select: the chosen value a chip with its ✕, the select otherwise. */
function ValueSelect({
  label,
  groups,
  picked,
  pickedLabel,
  onPick,
  onClear,
}: {
  readonly label: string
  readonly groups: readonly ChoiceGroup[]
  readonly picked: string | null
  readonly pickedLabel: string
  readonly onPick: (value: string) => void
  readonly onClear: () => void
}) {
  return (
    <Row label={label}>
      {picked !== null ? (
        <Chip label={pickedLabel} onClear={onClear} />
      ) : (
        <ChoiceSelect
          value={ALL}
          groups={[{ options: [{ value: ALL, label: t`Toate` }] }, ...groups]}
          onChange={(value) => (value === ALL ? onClear() : onPick(value))}
          label={label}
          triggerClassName={SELECT}
        />
      )}
    </Row>
  )
}

export function FilterPanel({
  query,
  cat,
  onChange,
  className,
}: {
  readonly query: Query
  readonly cat: Catalog
  readonly onChange: (query: Query) => void
  readonly className?: string
}) {
  const format = useFormat()
  const options = (key: FilterKey) => optionsOf(cat, query, key)
  const note = (key: FilterKey, value: string | number): string => {
    const found = options(key).find((option) => option.value === value)
    return found ? unit(key, found, format) : ''
  }
  const families = FAMILIES.filter((family) => options('tip').some((option) => option.value === family))
  const years = cat.years.filter((year) => options('an').some((option) => option.value === year))
  const events = cat.data.events.filter((event) => options('alegere').some((option) => option.value === event.key))
  const editions = cat.data.editions.filter((edition) => options('editie').some((option) => option.value === edition.key))
  const offices = cat.offices.filter((office) => options('functie').some((option) => option.value === office))
  const levels = SCOPE_TYPES.filter((scope) => options('nivel').some((option) => option.value === scope))
  const rounds = cat.rounds.map((round) => round ?? ROUND_UNREPORTED).filter((round) => options('tur').some((option) => option.value === round))
  const counties = cat.counties.filter((county) => options('judet').some((option) => option.value === county.code))
  const yearActive = (on: boolean) => (on ? 'border-primary bg-primary/5 font-semibold' : '')
  const eventGroups: ChoiceGroup[] = FAMILIES.map((family) => ({
    label: familyPlural(family),
    options: events.filter((event) => event.family === family).map((event) => ({ value: event.key, label: `${eventTitle(event)} · ${note('alegere', event.key)}` })),
  })).filter((group) => group.options.length > 0)
  const editionGroups: ChoiceGroup[] = (query.alegere ? [query.alegere] : [...new Set(editions.map((edition) => edition.eventKey ?? ''))])
    .map((eventKey) => {
      const event = cat.data.events.find((item) => item.key === eventKey)
      return {
        label: event ? eventShort(event) : t`Negrupate`,
        options: editions
          .filter((edition) => (edition.eventKey ?? '') === eventKey)
          .map((edition) => ({ value: edition.key, label: `${edition.key} · ${note('editie', edition.key)}` })),
      }
    })
    .filter((group) => group.options.length > 0)
  const officeGroups: ChoiceGroup[] = [
    {
      label: t`Funcții`,
      options: offices.filter((office) => officeText(office).known).map((office) => ({ value: office, label: `${officeText(office).label} · ${note('functie', office)}` })),
    },
    {
      label: t`Etichete din sursă`,
      options: offices.filter((office) => !officeText(office).known).map((office) => ({ value: office, label: `${office} · ${note('functie', office)}` })),
    },
  ].filter((group) => group.options.length > 0)
  const countyGroups: ChoiceGroup[] = [{ options: counties.map((county) => ({ value: county.code, label: `${county.name} · ${note('judet', county.code)}` })) }]
  return (
    <div className={cn('divide-y divide-border/70', className)}>
      <Group title={t`Alegerea`}>
        <ValueColumn<Family>
          label={t`Tipul`}
          values={families.map((family) => ({ value: family, label: familyPlural(family), note: note('tip', family) }))}
          picked={query.tip}
          onPick={(family) => onChange(withFilter(query, 'tip', family, cat))}
          onClear={() => onChange(withoutFilter(query, 'tip', cat))}
        />
        <Row label={t`Anul`}>
          <div className="grid grid-cols-4 gap-1.5">
            {years.map((year) => (
              <button
                key={year}
                type="button"
                aria-pressed={query.an === year}
                onClick={() => onChange(query.an === year ? withoutFilter(query, 'an', cat) : withFilter(query, 'an', year, cat))}
                className={cn(CELL, 'tabular-nums', yearActive(query.an === year))}
                title={note('an', year)}
              >
                {year}
              </button>
            ))}
          </div>
        </Row>
        <ValueSelect
          label={t`Alegerea`}
          groups={eventGroups}
          picked={query.alegere}
          pickedLabel={query.alegere ? eventTitle(cat.data.events.find((event) => event.key === query.alegere) ?? { family: null, year: 0, instance: null }) : ''}
          onPick={(value) => onChange(withFilter(query, 'alegere', value, cat))}
          onClear={() => onChange(withoutFilter(query, 'alegere', cat))}
        />
        <ValueSelect
          label={t`Ediția`}
          groups={editionGroups}
          picked={query.editie}
          pickedLabel={query.editie ?? ''}
          onPick={(value) => onChange(withFilter(query, 'editie', value, cat))}
          onClear={() => onChange(withoutFilter(query, 'editie', cat))}
        />
      </Group>
      <Group title={t`Rândurile`}>
        <ValueSelect
          label={t`Funcția`}
          groups={officeGroups}
          picked={query.functie}
          pickedLabel={query.functie ? officeText(query.functie).label : ''}
          onPick={(value) => onChange(withFilter(query, 'functie', value, cat))}
          onClear={() => onChange(withoutFilter(query, 'functie', cat))}
        />
        {query.judet ? null : (
          <ValueColumn<ScopeType>
            label={t`Nivelul`}
            values={levels.map((scope) => ({ value: scope, label: scopeLabel(scope), note: note('nivel', scope) }))}
            picked={query.nivel}
            onPick={(scope) => onChange(withFilter(query, 'nivel', scope, cat))}
            onClear={() => onChange(withoutFilter(query, 'nivel', cat))}
          />
        )}
        <ValueColumn<string>
          label={t`Turul`}
          values={rounds.map((round) => ({ value: round, label: roundText(round), note: note('tur', round) }))}
          picked={query.tur}
          onPick={(round) => onChange(withFilter(query, 'tur', round, cat))}
          onClear={() => onChange(withoutFilter(query, 'tur', cat))}
        />
        {query.nivel === null || query.nivel === 'siruta' ? (
          <ValueSelect
            label={t`Județul`}
            groups={countyGroups}
            picked={query.judet}
            pickedLabel={query.judet ? (cat.countyOf.get(query.judet)?.name ?? query.judet) : ''}
            onPick={(value) => onChange(withFilter(query, 'judet', value, cat))}
            onClear={() => onChange(withoutFilter(query, 'judet', cat))}
          />
        ) : null}
      </Group>
    </div>
  )
}

/** The panel in a sheet: from the right on a wide screen, from the bottom on a phone, with the answer's rows to close on. */
export function FilterSheet({
  query,
  cat,
  answer,
  onChange,
  open,
  onOpenChange,
}: {
  readonly query: Query
  readonly cat: Catalog
  readonly answer: Answer
  readonly onChange: (query: Query) => void
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const format = useFormat()
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  const count = filterCount(query)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        closeClassName={SHEET_CLOSE}
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {count > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{count}</span> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FilterPanel query={query} cat={cat} onChange={onChange} />
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button type="button" onClick={() => onChange(cleared(query))} disabled={count === 0} className={cn(TALL, 'border px-3 text-sm hover:bg-muted disabled:opacity-40')}>
            {t`Șterge tot`}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(TALL, 'bg-primary px-3 text-sm font-medium tabular-nums text-primary-foreground hover:bg-primary/90')}
          >
            {measureValue(answer.totals, 'randuri') === null ? t`Arată selecția` : t`Arată ${format.n(answer.totals.randuri)} rânduri`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
