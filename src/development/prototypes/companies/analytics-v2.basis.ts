/**
 * A basis group's key — `(multiple_values)`, `(partial_observations)`, … — as
 * opposed to a value's own key. The product's analytics text dropped this
 * helper after this prototype was written (2026-10-12); kept here so the
 * prototype still runs as it was.
 */
export function isBasisKey(key: string): boolean {
  return key.startsWith('(') && key.endsWith(')')
}
