import { useState } from 'react'
import { flushSync } from 'react-dom'
import { t } from '@lingui/core/macro'
import { ChevronRight } from 'lucide-react'
import { afterFocusMoves } from '@/components/filters/filter-sheet/filter-sheet-focus'
import { Announce, CELL, Chip, FIELD, Notice, OPTION, OptionGroup, Options, Row, TALL } from '@/components/filters/filter-sheet/filter-sheet-parts'
import { useActiveOption, type ActiveOption } from '@/components/filters/filter-sheet/use-active-option'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { usePlaceIndex } from '../../hooks/use-procurement-analytics'
import { withFilter, withoutFilter, type Query } from '../../lib/analytics-model'
import { browsePlaces, kindLabel, placePath, scopeOf, searchPlaces, type Place, type PlaceIndex, type PlaceMatches } from '../../lib/analytics-places'

/**
 * A party's place — the institution's or the firm's — as one search over
 * the regions, the counties and the localities (with or without diacritics,
 * a county by its code too). Before a word is typed the field offers what
 * the place picked so far holds: the regions, a region's counties, a
 * county's largest localities; a pick keeps the list open on the next level
 * down. The place picked is its path from the region, each name with its
 * kind, each step before the last a way back up.
 */

/** A place in a list under its level's head: its bare name, its finer kind as a tag, its county where the scope is wider than one. */
function PlaceOption({
  place,
  index,
  withCounty,
  option,
  onPick,
}: {
  readonly place: Place
  readonly index: PlaceIndex
  readonly withCounty: boolean
  readonly option: ReturnType<ActiveOption['option']>
  readonly onPick: (place: Place) => void
}) {
  const kind = kindLabel(place.kind)
  const county = withCounty && place.county ? (index.byValue.get(`judet:${place.county}`)?.name ?? place.county) : null
  return (
    <button type="button" {...option} onClick={() => onPick(place)} className={OPTION}>
      <span className="min-w-0 truncate">{place.name}</span>
      {kind || county ? (
        <span className="flex shrink-0 items-baseline gap-2 text-xs text-muted-foreground">
          {kind ? <MonoLabel>{kind}</MonoLabel> : null}
          {county ? <span>{county}</span> : null}
        </span>
      ) : null}
    </button>
  )
}

/** Regions or counties to browse, under their level's head: whole buttons, two to a row; a long name takes a second line rather than an ellipsis. */
function PlaceGrid({ id, title, places, option, onPick }: { readonly id: string; readonly title: string; readonly places: readonly Place[]; readonly option: ActiveOption['option']; readonly onPick: (place: Place) => void }) {
  return (
    <div onMouseDown={(event) => event.preventDefault()}>
      <MonoLabel className="block pb-1.5 pt-1 text-muted-foreground" aria-hidden="true">
        {title}
      </MonoLabel>
      <div id={id} role="listbox" aria-label={title} className="grid grid-cols-2 gap-1.5">
        {places.map((place, index) => (
          <button key={place.value} type="button" {...option(index)} onClick={() => onPick(place)} className={cn(CELL, 'py-1.5 text-left leading-snug aria-selected:border-primary/60 aria-selected:bg-muted')}>
            {place.name}
          </button>
        ))}
      </div>
    </div>
  )
}

/** The path from the region down, each name with its kind: the steps before the last widen the place to themselves, the ✕ removes it. */
function PathChip({ path, onWiden, onClear }: { readonly path: readonly Place[]; readonly onWiden: (place: Place) => void; readonly onClear: () => void }) {
  const last = path[path.length - 1]!
  return (
    <Chip label={last.label} onClear={onClear}>
      {/* A path the chip cannot hold on one line wraps to a second, every name whole; only a name longer than the line itself is cut. */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center text-sm" title={path.map((crumb) => crumb.label).join(' › ')}>
        {path.slice(0, -1).map((crumb) => {
          const label = crumb.label
          return (
            <span key={crumb.value} className="flex shrink-0 items-center">
              <button type="button" onClick={() => onWiden(crumb)} title={t`Doar ${label}`} className={cn(TALL, 'text-muted-foreground hover:text-foreground')}>
                {label}
              </button>
              <ChevronRight className="mx-1 size-3 shrink-0 text-muted-foreground/70" aria-hidden="true" />
            </span>
          )
        })}
        <span className="min-w-0 max-w-full truncate font-medium">{last.label}</span>
      </span>
    </Chip>
  )
}

export function PlaceField({ axis, query, onChange }: { readonly axis: 'loc' | 'loc_firma'; readonly query: Query; readonly onChange: (query: Query) => void }) {
  const filter = query.filters[axis]
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  // Escape closes the list and keeps the focus in the field; typing, an arrow or a new focus opens it again.
  const [dismissed, setDismissed] = useState(false)
  const term = text.trim()
  const typed = term.length >= 2
  // The map's files are read once a place is looked for, or a locality is on screen; a county's chip needs only the API's names.
  const { index, loading, failed, retry, countiesFailed, countiesLoading, retryCounties } = usePlaceIndex(focused || typed || filter?.level === 'localitate')
  const path = placePath(index, filter)
  const last = path[path.length - 1] ?? null
  // A locality is as fine as a place goes: its chip alone, no field under it.
  const searching = last?.level !== 'localitate'
  // A field removed with the focus fires no blur: its focus goes with it, so it comes back closed.
  if (!searching && (focused || dismissed)) {
    setFocused(false)
    setDismissed(false)
  }
  const scope = scopeOf(path)
  const matches: PlaceMatches = typed ? searchPlaces(index, term, scope) : browsePlaces(index, scope)
  const pick = (place: Place) => {
    setText('')
    onChange(withFilter(query, axis, place.level, place.value))
  }
  const placeholder = scope.county ? t`Localitate din ${last?.name ?? ''}` : scope.region ? t`Județ sau localitate din ${last?.name ?? ''}` : t`Regiune, județ sau localitate`
  // Browsing regions or counties is a grid; everything else is a list under its levels' heads.
  const grid = !typed && !scope.county
  const gridPlaces = scope.region ? matches.counties : matches.regions
  const none = matches.regions.length + matches.counties.length + matches.localities.length === 0
  // The localities come from the map's files: in a search, and in a county's own list.
  const wantsLocalities = typed || Boolean(scope.county)
  // A search waits on both reads: the localities' files and the API's regions and counties.
  const listLoading = (wantsLocalities && loading) || (typed && countiesLoading)
  const listFailed = wantsLocalities && failed
  // The options in the order they are drawn, for the arrow keys.
  const choices: readonly Place[] = grid ? gridPlaces : [...matches.regions, ...matches.counties, ...matches.localities]
  // Open whenever something shows under the field — options or what stands for them — so Escape is the list's.
  const open = (focused || typed) && !dismissed
  const gridNotice = grid && (countiesFailed || countiesLoading || gridPlaces.length === 0)
  const keys = useActiveOption(open && !gridNotice ? choices.map((place) => `${place.level}:${place.value}`) : [])
  const at = (place: Place) => keys.option(choices.indexOf(place))
  const empty = typed ? t`Nimic pentru „${term}".` : t`Nimic de arătat.`
  // What a screen reader hears as the list changes; a failure is its own alert.
  const said = !open ? '' : (grid ? countiesLoading : listLoading) ? t`Se încarcă…` : none && !listFailed && !countiesFailed ? empty : ''
  return (
    <Row label={t`Locul`}>
      {last ? <PathChip path={path} onWiden={(crumb) => onChange(withFilter(query, axis, crumb.level, crumb.value))} onClear={() => onChange(withoutFilter(query, axis))} /> : null}
      {searching ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            // Enter picks the first place found; with nothing typed there is nothing asked for.
            const first = typed ? choices[0] : undefined
            if (first) pick(first)
          }}
          onBlur={(event) => {
            const form = event.currentTarget
            if (form.contains(event.relatedTarget as Node | null)) return
            // The list closes once the focus has landed, unless it has come back.
            afterFocusMoves(() => {
              // Collapsed now, not at React's next render: the phone lift scrolls to the new field right after (`FilterPanel`).
              if (!form.contains(document.activeElement)) flushSync(() => setFocused(false))
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
            placeholder={placeholder}
            // Its name starts with the row's label, as voice control reads it („Locul"); the party tells the two rows apart.
            aria-label={axis === 'loc_firma' ? t`Locul firmei` : t`Locul instituției`}
            className={FIELD}
          />
          {open ? (
            grid ? (
              gridNotice ? (
                <Options
                  id={keys.listId}
                  label={t`Regiuni și județe`}
                  notices={
                    countiesLoading ? (
                      <Notice kind="loading">{t`Se încarcă regiunile și județele…`}</Notice>
                    ) : countiesFailed ? (
                      <Notice kind="failed" onRetry={retryCounties}>
                        {t`Regiunile și județele nu s-au încărcat.`}
                      </Notice>
                    ) : (
                      <Notice kind="empty">{t`Nimic de arătat.`}</Notice>
                    )
                  }
                />
              ) : (
                <PlaceGrid id={keys.listId} title={scope.region ? t`Județe` : t`Regiuni`} places={gridPlaces} option={keys.option} onPick={pick} />
              )
            ) : (
              <Options
                id={keys.listId}
                label={t`Locuri`}
                notices={
                  <>
                    {listLoading ? (
                      <Notice kind="loading">{t`Se încarcă localitățile…`}</Notice>
                    ) : listFailed ? (
                      <Notice kind="failed" onRetry={retry}>
                        {t`Localitățile nu s-au încărcat.`}
                      </Notice>
                    ) : null}
                    {/* The regions and counties come from another read: its failure is said beside the localities found. */}
                    {countiesFailed ? (
                      <Notice kind="failed" onRetry={retryCounties}>
                        {t`Regiunile și județele nu s-au încărcat.`}
                      </Notice>
                    ) : null}
                    {none && !listLoading && !listFailed && !countiesFailed ? <Notice kind="empty">{empty}</Notice> : null}
                  </>
                }
              >
                {matches.regions.length > 0 ? (
                  <OptionGroup title={t`Regiuni`}>
                    {matches.regions.map((place) => (
                      <PlaceOption key={place.value} place={place} index={index} withCounty={false} option={at(place)} onPick={pick} />
                    ))}
                  </OptionGroup>
                ) : null}
                {matches.counties.length > 0 ? (
                  <OptionGroup title={t`Județe`}>
                    {matches.counties.map((place) => (
                      <PlaceOption key={place.value} place={place} index={index} withCounty={false} option={at(place)} onPick={pick} />
                    ))}
                  </OptionGroup>
                ) : null}
                {matches.localities.length > 0 ? (
                  <OptionGroup title={t`Localități`}>
                    {matches.localities.map((place) => (
                      <PlaceOption key={place.value} place={place} index={index} withCounty={!scope.county} option={at(place)} onPick={pick} />
                    ))}
                  </OptionGroup>
                ) : null}
              </Options>
            )
          ) : null}
          <Announce text={said} />
        </form>
      ) : null}
    </Row>
  )
}
