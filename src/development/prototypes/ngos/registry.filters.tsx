import { useEffect, useId, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import type { NgoRegistryCategoryKey, NgoRegistrySummary } from '@/features/ngos/hub/registry-summary-types'
import { useWindowSize } from '@/hooks/useWindowSize'
import { cn } from '@/lib/utils'
import { Announce, CELL, Chip, FIELD, Group, Notice, OPTION, OptionGroup, Options, Row, TALL, useActiveOption } from './registry.filter-parts'
import { categoryLabel, countText, EMPTY_QUERY, filterCount, isRegistryNumber, STATUS_ORDER, statusLabel, type RegistryQuery } from './registry.model'
import { countyPlaceOf, countyPlaces, searchCounties, type CountyPlace } from './registry.place'

/**
 * Every filter the query takes, in one panel, in a sheet: from the right on
 * a wide screen, from the bottom on a phone. The head („+ Adaugă un filtru")
 * and the bar (the status) keep the quick moves; this is the whole set. A
 * change applies at once: the address is the state.
 *
 * Built as the procurement analytics panel the owner approved (design.md
 * §18.18): the questions as groups, each row a label and one control; a
 * value set is a chip with its own ✕, a value unset a field; every control
 * 44 px on a phone, 40 from `sm`; the county one search, listed one a row
 * before a word is typed.
 */

type Change = (query: RegistryQuery) => void

const ACTIVE = 'border-primary bg-primary/5 font-semibold'

/**
 * Runs `change` once the focus has landed where it was going. Closing a
 * list or swapping a field for its chip during the blur removes nodes while
 * the focus is on `body`; Radix's focus scope then takes it to the sheet,
 * and the tap or Tab that caused the blur goes nowhere (the field tapped
 * gets no focus, a phone no keyboard).
 */
function afterFocusMoves(change: () => void) {
  window.setTimeout(change, 0)
}

// ──────────────────────────────────────────────────────────────── what ──

/** The forms most entries have; the rarer two (211 religious associations, 42 foreign legal persons) behind „Arată mai multe". */
const COMMON_FORMS: readonly NgoRegistryCategoryKey[] = ['association', 'foundation', 'federation']
const RARE_FORMS: readonly NgoRegistryCategoryKey[] = ['religious_association', 'foreign_legal_person']

function StatusRows({ query, onChange }: { readonly query: RegistryQuery; readonly onChange: Change }) {
  return (
    <Row label={t`Starea`}>
      <div className="grid grid-cols-2 gap-1.5">
        {STATUS_ORDER.map((status) => (
          <button
            key={status ?? 'all'}
            type="button"
            aria-pressed={query.status === status}
            onClick={() => onChange({ ...query, status })}
            className={cn(CELL, 'text-left', status === null && 'col-span-2', query.status === status && ACTIVE)}
          >
            {statusLabel(status)}
          </button>
        ))}
      </div>
    </Row>
  )
}

function FormRows({ query, onChange }: { readonly query: RegistryQuery; readonly onChange: Change }) {
  const [more, setMore] = useState(false)
  // The common forms and, when it is a rare one, the one picked; all of them once the reader asks.
  const shown = more
    ? [...COMMON_FORMS, ...RARE_FORMS]
    : query.category && RARE_FORMS.includes(query.category)
      ? [...COMMON_FORMS, query.category]
      : COMMON_FORMS
  return (
    <Row label={t`Forma`}>
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          aria-pressed={query.category === null}
          onClick={() => onChange({ ...query, category: null })}
          className={cn(CELL, 'col-span-2 text-left', query.category === null && ACTIVE)}
        >
          {t`Toate formele`}
        </button>
        {shown.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={query.category === category}
            onClick={() => onChange({ ...query, category })}
            className={cn(CELL, 'py-1.5 text-left leading-snug', query.category === category && ACTIVE)}
          >
            {categoryLabel(category)}
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-expanded={more}
        onClick={() => setMore(!more)}
        className={cn(TALL, 'text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline')}
      >
        {more ? t`Arată mai puține` : t`Arată mai multe`}
      </button>
    </Row>
  )
}

function UtilityRow({ query, onChange }: { readonly query: RegistryQuery; readonly onChange: Change }) {
  const options = [
    { value: null, label: t`Oricare` },
    { value: true, label: t`Da` },
    { value: false, label: t`Nu` },
  ] as const
  return (
    <Row label={t`Utilitate publică`}>
      <div className="grid grid-cols-3 gap-1.5">
        {options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            aria-pressed={query.publicUtility === option.value}
            onClick={() => onChange({ ...query, publicUtility: option.value })}
            className={cn(CELL, query.publicUtility === option.value && ACTIVE)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </Row>
  )
}

// ─────────────────────────────────────────────────────────────── where ──

/**
 * The county, as one search: before a word is typed it lists every
 * county, one a row; typing matches names with or without diacritics, a county's code
 * whole first. The pick is a chip with its kind („Jud. Cluj", „Municipiul
 * București"). A county is as fine as the registry filters, so a pick
 * leaves the chip alone.
 */
function PlaceField({
  query,
  counties,
  onChange,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  readonly onChange: Change
}) {
  const places = countyPlaces(counties)
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  // Escape closes the list and keeps the focus in the field; typing, an arrow or a new focus opens it again.
  const [dismissed, setDismissed] = useState(false)
  const term = text.trim()
  const typed = term.length >= 1
  const picked = query.county ? countyPlaceOf(places, query.county) : null
  // A field removed with the focus fires no blur: its focus goes with it, so it comes back closed.
  if (picked && (focused || dismissed)) {
    setFocused(false)
    setDismissed(false)
  }
  const choices = typed ? searchCounties(places, term) : places
  const open = (focused || typed) && !dismissed
  const keys = useActiveOption(open ? choices.map((place) => place.value) : [])
  const pick = (place: CountyPlace) => {
    setText('')
    onChange({ ...query, county: place.value })
  }
  const empty = t`Niciun județ pentru „${term}”.`
  const said = open && typed && choices.length === 0 ? empty : ''
  return (
    <Row label={t`Județul`}>
      {picked ? (
        <Chip label={picked.label} onClear={() => onChange({ ...query, county: null })} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            // Enter picks the first county found; with nothing typed there is nothing asked for.
            const first = typed ? choices[0] : undefined
            if (first) pick(first)
          }}
          onBlur={(event) => {
            const form = event.currentTarget
            if (form.contains(event.relatedTarget as Node | null)) return
            afterFocusMoves(() => {
              if (!form.contains(document.activeElement)) setFocused(false)
            })
          }}
          className="space-y-1.5"
        >
          <input
            {...keys.input(open)}
            value={text}
            onChange={(event) => {
              setText(event.target.value)
              setDismissed(false)
            }}
            onFocus={() => {
              setFocused(true)
              setDismissed(false)
            }}
            onKeyDown={(event) => {
              // The sheet leaves Escape to an open list (`FilterSheet`): it closes the list and clears the words, the focus staying put.
              if (event.key === 'Escape') {
                setText('')
                setDismissed(true)
              } else {
                if (event.key === 'ArrowDown') setDismissed(false)
                keys.onKeyDown(event, (position) => pick(choices[position]!))
              }
            }}
            placeholder={t`Județ: nume sau cod („CJ”)`}
            aria-label={t`Caută județul`}
            className={FIELD}
          />
          {open ? (
            // Browsed or searched, one county a row (the owner, 1 October 2026): its name, its code.
            <Options id={keys.listId} label={t`Județe`} notices={choices.length === 0 ? <Notice kind="empty">{empty}</Notice> : null}>
              {choices.length > 0 ? (
                <OptionGroup title={t`Județe`}>
                  {choices.map((place, index) => (
                    <button key={place.value} type="button" {...keys.option(index)} onClick={() => pick(place)} className={OPTION}>
                      <span className="min-w-0 truncate">{place.name}</span>
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">{place.code}</span>
                    </button>
                  ))}
                </OptionGroup>
              ) : null}
            </Options>
          ) : null}
          <Announce text={said} />
        </form>
      )}
    </Row>
  )
}

// ──────────────────────────────────────────────────────────────── which ──

function NameField({ query, onChange }: { readonly query: RegistryQuery; readonly onChange: Change }) {
  const [value, setValue] = useState('')
  const apply = () => {
    const words = value.trim().slice(0, 200)
    // Three letters, as the head's search asks: two would match half the registry.
    if (words.length < 3) return
    setValue('')
    onChange({ ...query, q: words })
  }
  const words = query.q
  return (
    <Row label={t`Numele`}>
      {words ? (
        <Chip label={t`„${words}”`} onClear={() => onChange({ ...query, q: null })} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
        >
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={() => afterFocusMoves(apply)}
            placeholder={t`„banca pentru alimente”, „club sportiv”`}
            aria-label={t`Numele conține`}
            className={FIELD}
          />
        </form>
      )}
    </Row>
  )
}

function NumberField({ query, onChange }: { readonly query: RegistryQuery; readonly onChange: Change }) {
  const [value, setValue] = useState('')
  // Said wrong once the reader has finished typing (left the field or pressed Enter), not from the first digit.
  const [checked, setChecked] = useState(false)
  const hint = useId()
  const typed = value.trim()
  const wrong = checked && typed !== '' && !isRegistryNumber(typed)
  const apply = () => {
    setChecked(true)
    if (!isRegistryNumber(typed)) return
    setValue('')
    onChange({ ...query, registryNumber: typed.replace(/\s/gu, '').toUpperCase() })
  }
  return (
    <Row label={t`Numărul`}>
      {query.registryNumber ? (
        <Chip label={query.registryNumber} onClear={() => onChange({ ...query, registryNumber: null })} />
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            apply()
          }}
        >
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value)
              setChecked(false)
            }}
            onBlur={() => afterFocusMoves(apply)}
            placeholder="3446/A/2026"
            aria-label={t`Numărul de registru`}
            aria-invalid={wrong || undefined}
            aria-describedby={wrong ? hint : undefined}
            className={cn(FIELD, 'font-mono', wrong && 'border-amber-600/70')}
          />
          {wrong ? (
            <p id={hint} className="mt-1 text-xs text-muted-foreground">
              {t`Forma este număr/literă/an: 3446/A/2026.`}
            </p>
          ) : null}
        </form>
      )}
    </Row>
  )
}

// ──────────────────────────────────────────────────────────────── panel ──

function FilterPanel({
  query,
  counties,
  phone,
  onChange,
  className,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  /** In a phone's bottom sheet: a search focused moves to the top, above the keyboard. */
  readonly phone: boolean
  readonly onChange: Change
  readonly className?: string
}) {
  // On a phone the keyboard covers the sheet's lower half: a search focused
  // moves to the top of the sheet, its list under it, with room below the
  // panel to scroll that far even for the last field.
  const [lifted, setLifted] = useState<HTMLElement | null>(null)
  useEffect(() => {
    lifted?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [lifted])
  return (
    <div
      className={cn('divide-y divide-border/70', lifted && 'pb-[70vh]', className)}
      // Every field here is typed into, so each lifts; any other focus lets the lift go (after a pick, `Row` takes the focus to the chip).
      onFocus={(event) => setLifted(phone && event.target instanceof HTMLInputElement ? event.target : null)}
      onBlur={(event) => {
        if (event.target === lifted) setLifted(null)
      }}
    >
      <Group title={t`Registrul`}>
        <StatusRows query={query} onChange={onChange} />
      </Group>
      <Group title={t`Ce organizații`}>
        <FormRows query={query} onChange={onChange} />
        <UtilityRow query={query} onChange={onChange} />
      </Group>
      <Group title={t`Unde`}>
        <PlaceField query={query} counties={counties} onChange={onChange} />
      </Group>
      <Group title={t`Care`}>
        <NameField query={query} onChange={onChange} />
        <NumberField query={query} onChange={onChange} />
      </Group>
    </div>
  )
}

/** The panel in a sheet: from the right on a wide screen, from the bottom on a phone, with the selection's count to close on. */
export function FilterSheet({
  query,
  counties,
  count,
  onChange,
  open,
  onOpenChange,
}: {
  readonly query: RegistryQuery
  readonly counties: NgoRegistrySummary['counties']
  /** The selection's count, where it is counted. */
  readonly count: number | null
  readonly onChange: Change
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
}) {
  const { width } = useWindowSize()
  const phone = width > 0 && width < 640
  // Counted as the „Filtre" button counts them; the status is the bar's, but „Șterge tot" clears it too.
  const active = filterCount(query)
  const none = active === 0 && query.status === null
  const shown = count !== null ? countText(count) : null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={phone ? 'bottom' : 'right'}
        onOverlayClick={() => onOpenChange(false)}
        // Escape in a search with its list open closes the list (the field does it), not the sheet with what was typed.
        onEscapeKeyDown={(event) => {
          const focused = document.activeElement
          if (focused instanceof HTMLInputElement && focused.getAttribute('aria-expanded') === 'true') event.preventDefault()
        }}
        // The close as tall as the header, a whole tap target on a phone; its ring for the keyboard only.
        closeClassName="right-2 top-1 flex size-11 items-center justify-center focus:ring-0 focus:ring-offset-0 focus-visible:ring-2 focus-visible:ring-offset-2 data-[state=open]:bg-transparent sm:top-1.5 sm:size-10"
        className={cn('flex flex-col gap-0 p-0', phone ? 'max-h-[90vh] rounded-t-2xl' : 'w-full sm:max-w-sm')}
      >
        <div className="flex items-baseline gap-2 border-b px-4 py-3">
          <SheetTitle className="text-base font-semibold">{t`Filtre`}</SheetTitle>
          {active > 0 ? <span className="bg-primary px-1.5 text-xs tabular-nums text-primary-foreground">{active}</span> : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <FilterPanel query={query} counties={counties} phone={phone} onChange={onChange} />
        </div>
        <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t px-4 py-3">
          <button
            type="button"
            onClick={() => onChange(EMPTY_QUERY)}
            disabled={none}
            className={cn(TALL, 'border px-3 text-sm hover:bg-muted disabled:opacity-40')}
          >
            {t`Șterge tot`}
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(TALL, 'bg-primary px-3 text-sm font-medium tabular-nums text-primary-foreground hover:bg-primary/90')}
          >
            {shown !== null ? t`Arată ${shown}` : t`Arată`}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
