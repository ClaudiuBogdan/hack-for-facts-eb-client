import type { StatisticsComparisonsSearch } from '@/schemas/statistics'
import { MAX_COMPARISON_TERRITORIES } from './comparison-territories'
import type { ComparisonView, ComparisonWindow } from './comparison-view'
import { parseComparisonToken, type ClassificationPin, type ComparisonTerritoryToken } from './dataset-selection'
import { editSourcePin } from './source-selection'

/** What an edit is written against: the URL, and what the page resolved from it. */
export interface ComparisonSearchContext {
  readonly search: StatisticsComparisonsSearch
  /**
   * The example's own selection while the URL is empty: the first edit
   * adopts it, so the reader's change is made to the comparison on screen,
   * not to nothing.
   */
  readonly example: Pick<StatisticsComparisonsSearch, 'cod' | 'teritorii'> | null
  readonly tokens: readonly ComparisonTerritoryToken[]
  /** The pins in force: the URL's, or the defaults the server resolved. */
  readonly effectivePins: readonly ClassificationPin[]
  readonly unitCode: string | null
  readonly cadence: string | null
  /** The period axis, oldest first; a window names its ends by index. */
  readonly periods: readonly string[]
}

export type ComparisonSearchEdit =
  | { readonly kind: 'dataset'; readonly code: string }
  | { readonly kind: 'add-territory'; readonly token: string }
  | { readonly kind: 'remove-territory'; readonly token: string }
  /** The map's click: in the comparison already, out; else in. */
  | { readonly kind: 'toggle-territory'; readonly token: string }
  | { readonly kind: 'pin-classification'; readonly typeCode: string; readonly valueCode: string | null }
  | { readonly kind: 'pin-unit'; readonly unitCode: string | null }
  | { readonly kind: 'pin-cadence'; readonly cadence: string }
  | { readonly kind: 'window'; readonly window: ComparisonWindow }
  | { readonly kind: 'view'; readonly view: ComparisonView }
  /** Clear the source coordinates, the window and the view; keep what is compared. */
  | { readonly kind: 'reset-source' }

export interface ComparisonSearchPatch {
  readonly patch: Partial<StatisticsComparisonsSearch>
  /** A structural edit — the dataset, a territory — is a history entry; a refinement replaces. */
  readonly replace: boolean
}

/**
 * The URL patch one edit of the comparison writes, or null when the edit
 * changes nothing (a territory already compared, a seventh one).
 *
 * The URL's own entries travel as they are, a malformed one included: an
 * edit here is not a repair of another entry, which stays for the reader
 * (or the reset) to fix. An edit of the source coordinates materialises the
 * whole resolved selection first, so the server's defaults for the other
 * axes are pinned rather than re-resolved for an unrelated cell.
 */
export function editComparisonSearch(
  context: ComparisonSearchContext,
  edit: ComparisonSearchEdit,
): ComparisonSearchPatch | null {
  const { search, example, tokens, effectivePins, unitCode, cadence, periods } = context
  const adopted = example ? { cod: example.cod, teritorii: example.teritorii } : {}
  const rawTerritories = (): readonly unknown[] => {
    const raw = example ? example.teritorii : search.teritorii
    return Array.isArray(raw) ? raw : raw === undefined ? [] : [raw]
  }
  const materialized = () => ({
    ...adopted,
    clasificari:
      search.clasificari !== undefined
        ? search.clasificari
        : effectivePins.length
          ? effectivePins.map((pin) => `${pin.typeCode}:${pin.valueCode}`)
          : undefined,
    unitate: search.unitate !== undefined ? search.unitate : (unitCode ?? undefined),
    frecventa: search.frecventa !== undefined ? search.frecventa : (cadence ?? undefined),
  })
  const compared = (token: string) => tokens.some((entry) => entry.token === token)
  const add = (token: string): ComparisonSearchPatch | null =>
    compared(token) || tokens.length >= MAX_COMPARISON_TERRITORIES
      ? null
      : { patch: { ...adopted, teritorii: [...rawTerritories(), token] }, replace: false }
  const remove = (token: string): ComparisonSearchPatch => {
    const next = rawTerritories().filter((raw) => parseComparisonToken(raw)?.token !== token)
    return { patch: { ...adopted, teritorii: next.length > 0 ? next : undefined }, replace: false }
  }

  switch (edit.kind) {
    case 'dataset':
      // Coordinates, window and view belong to the previous dataset.
      return {
        patch: {
          ...adopted,
          cod: edit.code,
          clasificari: undefined,
          unitate: undefined,
          frecventa: undefined,
          perioada: undefined,
          din: undefined,
          vedere: undefined,
        },
        replace: false,
      }
    case 'add-territory':
      return add(edit.token)
    case 'remove-territory':
      return remove(edit.token)
    case 'toggle-territory':
      return compared(edit.token) ? remove(edit.token) : add(edit.token)
    case 'pin-classification': {
      const current = materialized()
      return {
        patch: { ...current, clasificari: editSourcePin(current.clasificari, edit.typeCode, edit.valueCode) },
        replace: true,
      }
    }
    case 'pin-unit':
      return { patch: { ...materialized(), unitate: edit.unitCode ?? undefined }, replace: true }
    case 'pin-cadence':
      // Another frequency is another period axis: the window's ends do not carry over.
      return {
        patch: { ...materialized(), frecventa: edit.cadence, din: undefined, perioada: undefined },
        replace: true,
      }
    case 'window':
      return {
        patch: { ...adopted, din: periods[edit.window.from], perioada: periods[edit.window.to] },
        replace: true,
      }
    case 'view':
      return { patch: { ...adopted, vedere: edit.view }, replace: true }
    case 'reset-source':
      return {
        patch: {
          clasificari: undefined,
          unitate: undefined,
          frecventa: undefined,
          perioada: undefined,
          din: undefined,
          vedere: undefined,
        },
        replace: true,
      }
  }
}
