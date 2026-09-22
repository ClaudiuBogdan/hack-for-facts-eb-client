import type { InsDimension, InsDimensionValue } from '@/schemas/ins'
import { classificationTypeCode } from './dataset-selection'
import { editSourcePin } from './source-selection'

/**
 * How INS Tempo nests one axis inside another.
 *
 * A hierarchical axis is not a tree of its own: every member names its parent
 * with `parent_nom_item_id`, and that parent is a member of the axis
 * IMMEDIATELY BEFORE it. SOM101F's „Localitati" hangs off „Judete" — 1071
 * CIUGUD's parent is 3064, which is Alba on the county axis. Swept on
 * 2026-09-22 across 76 matrices with a hierarchical axis (localities, CAEN
 * groups, product groups): all 76 put the parents on the preceding axis, none
 * inside the axis itself, and no matrix had two nested axes in a row.
 *
 * The consequence is a cell rule the picker has to keep: a child member only
 * exists under its own parent. Ciugud with Judete = TOTAL is a cell INS never
 * published — the page read 0 rows and printed the pins as codes. Ciugud with
 * Judete = Alba is 197 months of data. A parent with the child's root (TOTAL)
 * is the parent's own aggregate and always exists.
 *
 * Member codes and `nom_item_id` are the same number (1,520 members sampled,
 * no exception), which is what lets a parent id be written as a pin.
 */

function isSourceAxis(dimension: InsDimension | undefined): dimension is InsDimension {
  return dimension?.type === 'CLASSIFICATION' || dimension?.type === 'TERRITORIAL'
}

/** The axis this one's members hang off, when this one is nested. */
export function parentSourceAxis(
  dimensions: readonly InsDimension[],
  dimension: InsDimension,
): InsDimension | null {
  if (!dimension.is_hierarchical) return null
  const parent = dimensions.find((candidate) => candidate.index === dimension.index - 1)
  return isSourceAxis(parent) ? parent : null
}

/** The axis nested inside this one, if any. */
export function childSourceAxis(
  dimensions: readonly InsDimension[],
  dimension: InsDimension,
): InsDimension | null {
  const child = dimensions.find((candidate) => candidate.index === dimension.index + 1)
  return isSourceAxis(child) && child.is_hierarchical ? child : null
}

/** The member a nested axis falls back to: the one with no parent — INS's TOTAL. */
export function rootMemberCode(values: readonly InsDimensionValue[]): string | null {
  const root = values.find((value) => value.parent_nom_item_id == null)
  return root?.classification_value?.code ?? null
}

/**
 * What the child axis must do when a member of THIS axis is picked.
 * `keep` when there is no nested axis, nothing pinned on it, or the parent is
 * unchanged; otherwise it must fall back to its root, which the caller looks
 * up — the root's code is the axis's own, not a constant.
 */
export function childAxisAfterPick(params: {
  readonly dimensions: readonly InsDimension[]
  readonly dimension: InsDimension
  readonly pins: ReadonlyMap<string, string>
  readonly memberCode: string
}): { readonly action: 'keep' } | { readonly action: 'reset'; readonly child: InsDimension } {
  const { dimensions, dimension, pins, memberCode } = params
  const child = childSourceAxis(dimensions, dimension)
  if (!child) return { action: 'keep' }
  if (!pins.has(classificationTypeCode(child))) return { action: 'keep' }
  if (pins.get(classificationTypeCode(dimension)) === memberCode) return { action: 'keep' }
  return { action: 'reset', child }
}

/**
 * The pins after picking `value` on `dimension`, kept to cells INS publishes:
 * the member itself, its parent on the axis before (when it has one), and the
 * nested axis after reset to `childRoot` — or unpinned when the root could not
 * be read, which leaves the page asking for it rather than showing a cell
 * that cannot exist.
 */
export function pickSourceMember(params: {
  readonly pins: unknown
  readonly dimensions: readonly InsDimension[]
  readonly dimension: InsDimension
  readonly value: InsDimensionValue
  readonly childReset?: { readonly child: InsDimension; readonly rootCode: string | null }
}): unknown {
  const { dimensions, dimension, value, childReset } = params
  const code = value.classification_value?.code
  if (!code) return params.pins

  let pins = editSourcePin(params.pins, classificationTypeCode(dimension), code)

  const parent = parentSourceAxis(dimensions, dimension)
  if (parent && value.parent_nom_item_id != null) {
    pins = editSourcePin(pins, classificationTypeCode(parent), String(value.parent_nom_item_id))
  }

  if (childReset) {
    pins = editSourcePin(pins, classificationTypeCode(childReset.child), childReset.rootCode)
  }

  return pins
}
