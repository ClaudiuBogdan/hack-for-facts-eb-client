/**
 * The entity page's map previews, by name only: their keys, the old names a
 * shared link may still carry, and how a `?public_map=` value resolves to one.
 *
 * Apart from the definitions (`challenge-entity-public-maps.ts`), which build
 * and parse every preview's map state when they load: the entity page's search
 * schema needs only the names, and the route tree loads it on every page
 * (docs/route-contracts.md). The definitions use these lists, and a test keeps
 * the two in step.
 */

export const CHALLENGE_ENTITY_MAP_PREVIEW_KEYS = ['expenses', 'income', 'balance', 'local-taxes'] as const

export type ChallengeEntityMapPreviewKey = (typeof CHALLENGE_ENTITY_MAP_PREVIEW_KEYS)[number]

/** The names a preview used to go by: series ids and saved-map ids from older links. */
export const CHALLENGE_ENTITY_MAP_PREVIEW_ALIASES: Readonly<Record<ChallengeEntityMapPreviewKey, readonly string[]>> = {
  expenses: ['expenses-total-per-capita', 'expenses-personnel-per-capita', '8JwhV2lN5OIz', 'Wy51tDP1HuQQ'],
  income: ['income-total-per-capita', 'FWlNQTf8I_DC'],
  balance: ['budget-balance', 'M7PyWc0ic4hV'],
  'local-taxes': ['taxes-local-per-capita', 'taxes-local-total', '9yugt1MKU-WD', 'gxnEfLoy3EqI'],
}

export const DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY: ChallengeEntityMapPreviewKey = CHALLENGE_ENTITY_MAP_PREVIEW_KEYS[0]

export function isChallengeEntityMapPreviewKey(value: string | undefined): value is ChallengeEntityMapPreviewKey {
  if (!value) {
    return false
  }

  return (CHALLENGE_ENTITY_MAP_PREVIEW_KEYS as readonly string[]).includes(value)
}

/** A key, an old name for one, or the default preview. */
export function normalizeChallengeEntityMapPreviewKey(value: string | undefined): ChallengeEntityMapPreviewKey {
  if (value && isChallengeEntityMapPreviewKey(value)) {
    return value
  }

  const aliased = value ? CHALLENGE_ENTITY_MAP_PREVIEW_KEYS.find((key) => CHALLENGE_ENTITY_MAP_PREVIEW_ALIASES[key].includes(value)) : undefined
  return aliased ?? DEFAULT_CHALLENGE_ENTITY_MAP_PREVIEW_KEY
}
