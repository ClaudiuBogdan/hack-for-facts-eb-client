import { useMemo } from 'react'
import type { Edition } from '../shared/model'
import { contestKeyOf, lineageOf, nationalLineageOf, rollupsOf, rowsAtPlaceInEdition, type LineageEvent, type PlaceRow, type RowIdentity, type ScopeRollup } from './model'
import { useContestRead, useLevelRows, type ContestRead } from './reads'

/**
 * What every variant derives from the reads: the row's identity, its lineage
 * (SIRUTA rows across editions, or the national row across editions), the
 * rows at the same place in the edition, the same office's levels, and the
 * sibling editions of the election with this row where it exists.
 */

export interface SiblingEdition {
  readonly edition: Edition
  readonly current: boolean
  /** This office's rows at this place in the sibling edition; `null` while the index loads or when the place cannot be joined. */
  readonly rows: readonly PlaceRow[] | null
}

export type PageData =
  | { readonly state: 'invalid' | 'missing' | 'failed'; readonly read: ContestRead }
  | {
      readonly state: 'ready'
      readonly read: ContestRead
      readonly identity: RowIdentity
      /** The live row is still on its way: the head is computed from the key and the fixture. */
      readonly pending: boolean
      /** `null` for a row whose place cannot be joined across editions; `undefined` while the index loads. */
      readonly lineage: readonly LineageEvent[] | null | undefined
      readonly joinable: boolean
      readonly rowsHere: readonly PlaceRow[] | null | undefined
      readonly rollups: readonly ScopeRollup[]
      readonly siblings: readonly SiblingEdition[]
      /** The same office's county rows of the edition, as served; `null` when there is no county level or the read failed; `undefined` while it reads. */
      readonly countyRows: ReturnType<typeof useLevelRows>['data'] | null
    }

export function usePageData(): PageData {
  const read = useContestRead()
  const identity = read.identity
  const office = identity?.office ?? null
  const scopeType = identity?.scopeType ?? null
  const joinable = scopeType === 'siruta' || scopeType === 'national'
  const rollups = useMemo(() => rollupsOf(identity?.edition ?? null, office), [identity?.edition, office])
  const hasCounty = rollups.some((level) => level.scopeType === 'county')
  const countyRows = useLevelRows(hasCounty ? (identity?.parsed.editionKey ?? null) : null, hasCounty ? office : null, hasCounty ? 'county' : null)

  const lineage = useMemo((): readonly LineageEvent[] | null | undefined => {
    if (!identity || office === null) return undefined
    if (identity.scopeType === 'national') return nationalLineageOf(office)
    if (identity.scopeType !== 'siruta') return null
    return read.placeRows ? lineageOf(read.placeRows, office) : undefined
  }, [identity, office, read.placeRows])

  const rowsHere = useMemo((): readonly PlaceRow[] | null | undefined => {
    if (!identity) return undefined
    if (identity.scopeType !== 'siruta') return null
    return read.placeRows ? rowsAtPlaceInEdition(read.placeRows, identity.parsed.editionKey) : undefined
  }, [identity, read.placeRows])

  const siblings = useMemo((): readonly SiblingEdition[] => {
    if (!identity) return []
    const editions = identity.event?.editions ?? (identity.edition ? [identity.edition] : [])
    return editions.map((edition) => {
      const current = edition.key === identity.parsed.editionKey
      let rows: readonly PlaceRow[] | null = null
      if (office !== null && identity.scopeType === 'siruta') rows = read.placeRows ? read.placeRows.filter((row) => row.editionKey === edition.key && row.office === office) : null
      if (office !== null && identity.scopeType === 'national')
        rows = edition.counts
          .filter(([o, s, , n]) => o === office && s === 'national' && n === 1)
          .map(([, , round]) => ({ editionKey: edition.key, office, round, key: contestKeyOf(edition.key, office, 'national', 'RO') }))
      return { edition, current, rows }
    })
  }, [identity, office, read.placeRows])

  if (!read.parsed || !identity) return { state: 'invalid', read }
  if (read.row === null) return { state: 'missing', read }
  if (read.row === undefined && read.rowError) return { state: 'failed', read }
  return {
    state: 'ready',
    read,
    identity,
    pending: read.row === undefined,
    lineage,
    joinable,
    rowsHere,
    rollups,
    siblings,
    countyRows: hasCounty && !countyRows.isError ? countyRows.data : null,
  }
}
