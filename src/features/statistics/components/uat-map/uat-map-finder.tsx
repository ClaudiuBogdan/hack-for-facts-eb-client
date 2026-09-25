import { memo, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { plural, t } from '@lingui/core/macro'
import { Input } from '@/components/ui/input'
import type { UatMapGeometry, UatMapSeries } from '../../lib/uat-map-snapshot'
import { HUB_EXAMPLE_PLACES } from '../../lib/landing-constants'
import { countyNameRo } from '@/lib/territory-counties'
import { formatTotal, kindLabel, type SeriesMeta } from './uat-map-series'
import { searchUats, uatSearchIndex, type UatSearchIndex } from './uat-map-search'

/** Rows shown for a term; typing more narrows the rest. */
const SHOWN = 8
const NOTHING = { found: [], total: 0 } as const

/** Built on the first search, not with the map: most readers never type. */
const indexes = new WeakMap<UatMapGeometry, UatSearchIndex>()
function searchIndexOf(geometry: UatMapGeometry): UatSearchIndex {
  let index = indexes.get(geometry)
  if (!index) {
    index = uatSearchIndex(geometry.name, geometry.county.map((code) => countyNameRo(code) ?? code))
    indexes.set(geometry, index)
  }
  return index
}

/**
 * The finder under the map: a UAT by its name, from the names the map
 * already holds — so no county among them, and found as the reader types.
 * Each row opens the UAT's page and gives the figure the map shows; a hover
 * or a focus marks it on the map, and Enter opens the first.
 *
 * Memoized, like the lists: each row is a router `Link`, and a hover on the
 * map must not render them.
 */
export const UatFinder = memo(function UatFinder({
  inputId,
  geometry,
  meta,
  series,
  size,
  onHover,
}: {
  readonly inputId: string
  readonly geometry: UatMapGeometry
  readonly meta: SeriesMeta
  readonly series: UatMapSeries
  /** Each UAT's population: the larger first among equal matches. */
  readonly size: readonly (number | null)[]
  readonly onHover: (index: number | null) => void
}) {
  const navigate = useNavigate()
  const [term, setTerm] = useState('')
  const typed = term.trim() !== ''
  const { found, total } = useMemo(
    () => (typed ? searchUats({ index: searchIndexOf(geometry), search: term, size, limit: SHOWN }) : NOTHING),
    [typed, geometry, term, size],
  )
  const more = total - found.length
  // Found as you type, so what was found is said, not only shown.
  const status = !typed
    ? ''
    : total === 0
      ? t`Nicio localitate găsită`
      : plural(total, { one: 'O localitate găsită', few: '# localități găsite', other: '# de localități găsite' })

  const clear = () => {
    setTerm('')
    onHover(null)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const first = found[0]
    if (event.key === 'Enter' && first !== undefined) {
      event.preventDefault()
      void navigate({ to: '/ins/teritorii/$siruta', params: { siruta: geometry.siruta[first]! } })
    } else if (event.key === 'Escape' && typed) {
      clear()
    }
  }

  return (
    <div data-uat-finder>
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={inputId}
          type="search"
          inputMode="search"
          enterKeyHint="go"
          autoComplete="off"
          spellCheck={false}
          aria-label={t`Caută o localitate`}
          placeholder={t`Caută o localitate`}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={onKeyDown}
          // As the statistics search fields: the card's white, a border not a shadow, a 2px focus ring.
          className="h-10 bg-card pl-9 pr-9 text-base shadow-none transition-colors hover:border-muted-foreground/40 focus-visible:ring-2 md:text-sm [&::-webkit-search-cancel-button]:hidden"
        />
        {term ? (
          <button
            type="button"
            onClick={clear}
            aria-label={t`Șterge căutarea`}
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      {!typed ? (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
          <span>{t`Încearcă:`}</span>
          {HUB_EXAMPLE_PLACES.map((place) => (
            <Link
              key={place.siruta}
              to="/ins/teritorii/$siruta"
              params={{ siruta: place.siruta }}
              className="rounded-md border border-border/70 px-2 py-0.5 text-foreground transition-colors hover:border-primary/40 hover:bg-muted/50"
            >
              {place.name}
            </Link>
          ))}
        </p>
      ) : total === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">{t`Nicio localitate nu are acest nume.`}</p>
      ) : (
        <>
          <ul className="mt-3 divide-y divide-border/70 rounded-lg border border-border/70 bg-card">
            {found.map((uat) => (
              <li key={uat}>
                <Link
                  to="/ins/teritorii/$siruta"
                  params={{ siruta: geometry.siruta[uat]! }}
                  onPointerEnter={() => onHover(uat)}
                  onPointerLeave={() => onHover(null)}
                  onFocus={() => onHover(uat)}
                  onBlur={() => onHover(null)}
                  className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{geometry.name[uat]}</span>
                    <span className="block text-xs text-pretty text-muted-foreground">
                      {kindLabel(geometry.kind[uat]!)}, {countyNameRo(geometry.county[uat]!) ?? geometry.county[uat]}
                    </span>
                  </span>
                  <span className="shrink-0 text-right tabular-nums">
                    <span className="block text-foreground">{formatTotal(meta, series.total.values[uat], { unit: false })}</span>
                    {series.total.values[uat] != null ? <span className="block text-xs text-muted-foreground">{meta.unit}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          {more > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              {plural(more, {
                one: 'Încă o localitate se potrivește; scrie mai mult din nume.',
                few: 'Încă # localități se potrivesc; scrie mai mult din nume.',
                other: 'Încă # de localități se potrivesc; scrie mai mult din nume.',
              })}
            </p>
          ) : null}
        </>
      )}
    </div>
  )
})
