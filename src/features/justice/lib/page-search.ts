/**
 * A justice page's `validateSearch`, from the keys it reads: each kept as a
 * string or the number a year travels as; any other key is dropped. A key
 * the router parsed as something else (`judet=1`, an array) stays as text,
 * for the page to drop it: the address then is not the bare page, and is
 * not indexed as one. No snapshot here: route modules load with every page.
 */
export function validatePageSearch<K extends string>(keys: readonly K[]): (search: Record<string, unknown>) => Partial<Record<K, string | number>> {
  return (search) => {
    const valid: Partial<Record<K, string | number>> = {}
    for (const key of keys) {
      const value = search[key]
      if (typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))) valid[key] = value
      else if (value !== undefined && value !== null) valid[key] = typeof value === 'object' ? JSON.stringify(value) : String(value)
    }
    return valid
  }
}
