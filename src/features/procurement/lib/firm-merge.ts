/**
 * One firm per winner across a contract's award rows. SEAP publishes a row per
 * consortium member, and some awards twice, from two sources — one of them
 * often without the firm's CUI. A row without a CUI is the firm of that name;
 * two firms of one name with different CUIs stay two firms.
 */

interface Firm {
  readonly cui: string | null
  readonly name: string
}

const LEGAL_FORMS = /\b(s\.?\s?r\.?\s?l|s\.?\s?a|a\.?\s?g|s\.?\s?c|gmbh|ltd|spa)\b\.?/giu

/** A firm's name without its legal form, letters and digits only: to match a row that carries no CUI to one that does. */
export const nameKey = (name: string) =>
  name
    .toLocaleLowerCase('ro-RO')
    .replace(LEGAL_FORMS, '')
    .replace(/[^\p{L}\p{N}]/gu, '')

/** A firm's key: its CUI when a row has it (two firms of one name are two firms); its name only for a row without one. */
export const firmKey = (firm: Firm) => (firm.cui ? `cui:${firm.cui}` : `name:${nameKey(firm.name)}`)

/**
 * Adds a firm to a list keyed by `firmKey`: a row without a CUI joins the
 * firm of that name; a row with one takes the place of the name-only entry.
 * Returns the key the firm is under.
 */
export function addFirm<T extends Firm>(firms: Map<string, T>, firm: T): string {
  const byName = [...firms.entries()].find(([, known]) => nameKey(known.name) === nameKey(firm.name) && (!known.cui || !firm.cui || known.cui === firm.cui))
  if (!firm.cui) {
    if (byName) return byName[0]
    firms.set(firmKey(firm), firm)
    return firmKey(firm)
  }
  const key = firmKey(firm)
  if (firms.has(key)) return key
  if (byName && !byName[1].cui) firms.delete(byName[0])
  firms.set(key, { ...(byName?.[1] ?? {}), ...firm })
  return key
}
