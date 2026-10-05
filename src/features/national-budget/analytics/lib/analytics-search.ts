/** The contents panel's search: a name found by the words typed, diacritics or not. */

export const plain = (text: string) =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('ro-RO')

/**
 * Every word typed must begin a word of the name (or, failing that, sit inside
 * it): „inv" finds „Învățământ", not every name with an i, n and v in order.
 */
export function rank(search: string, label: string): number {
  const text = plain(label)
  const words = text.split(/[^\p{L}\p{N}]+/u)
  const tokens = plain(search).split(/\s+/u).filter(Boolean)
  if (tokens.length === 0) return 1
  let score = 0
  for (const token of tokens) {
    if (words.some((word) => word.startsWith(token))) score += 1
    else if (text.includes(token)) score += 0.4
    else return 0
  }
  // A name that begins with what was typed comes first: „sanatate" → „Sănătate" before „Fondul de sănătate".
  return score / tokens.length + (text.startsWith(tokens.join(' ')) ? 0.5 : 0)
}
