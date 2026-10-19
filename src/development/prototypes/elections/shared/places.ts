import { useQuery } from '@tanstack/react-query'

/**
 * Every SIRUTA scope the sources report, with its rows (edition, office,
 * round) and, where the INS UAT list knows the code, its INS name, kind and
 * county. Rows a source keys by its own numbering are not here: matching them
 * to a place would be a join on names. Loaded on demand (1.2 MB), in the
 * browser only.
 */

export interface InsPlace {
  readonly name: string
  readonly kind: string
  readonly county: string
  readonly countyCode: string
}

export interface Place {
  readonly siruta: string
  /** The first label a source gave the code, spelled as the source spells it. */
  readonly label: string | null
  readonly ins: InsPlace | null
  /** [edition index, office index, round index] */
  readonly rows: readonly (readonly [number, number, number])[]
}

export interface PlaceIndex {
  readonly readAt: string
  readonly editions: readonly string[]
  readonly offices: readonly string[]
  readonly rounds: readonly (string | null)[]
  readonly places: ReadonlyMap<string, Place>
  readonly searchable: readonly { readonly place: Place; readonly folded: string }[]
}

interface PlacesFixture {
  readonly readAt: string
  readonly editions: readonly string[]
  readonly offices: readonly string[]
  readonly rounds: readonly (string | null)[]
  readonly places: Readonly<Record<string, Omit<Place, 'siruta'>>>
}

/** Lower case, no diacritics (ş and ș alike), single spaces: what a reader types matches what a source spells. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim()
}

export function placeName(place: Place): string {
  return place.ins?.name ?? place.label ?? place.siruta
}

async function loadPlaces(): Promise<PlaceIndex> {
  const module = (await import('./places.fixture.json')) as unknown as { readonly default: PlacesFixture }
  const raw = module.default
  const places = new Map<string, Place>()
  for (const [siruta, place] of Object.entries(raw.places)) places.set(siruta, { siruta, ...place })
  const searchable = [...places.values()].map((place) => ({
    place,
    folded: fold([placeName(place), place.ins?.county ?? '', place.label ?? '', place.siruta].join(' ')),
  }))
  return { readAt: raw.readAt, editions: raw.editions, offices: raw.offices, rounds: raw.rounds, places, searchable }
}

/** The index, read once per session; on the server it stays pending (the bands render their placeholders). */
export function usePlaces(enabled = true) {
  return useQuery({ queryKey: ['development', 'elections', 'places'], queryFn: loadPlaces, staleTime: Infinity, gcTime: Infinity, enabled })
}

/** Word starts, every word typed: „cluj nap" finds Cluj-Napoca, „sector 1" the sector. Larger places first. */
export function matchPlaces(index: PlaceIndex, query: string, limit = 8): readonly Place[] {
  const words = fold(query).split(' ').filter(Boolean)
  if (words.length === 0) return []
  const hits = index.searchable.filter(({ folded }) => {
    const tokens = folded.split(' ')
    return words.every((word) => tokens.some((token) => token.startsWith(word)))
  })
  const rank = (place: Place) => {
    const kind = place.ins?.kind ?? ''
    return kind.startsWith('Municipiu') || kind.startsWith('Sectoarele') ? 0 : kind === 'Oras' ? 1 : 2
  }
  return hits
    .map(({ place }) => place)
    .sort((a, b) => rank(a) - rank(b) || placeName(a).localeCompare(placeName(b), 'ro'))
    .slice(0, limit)
}
