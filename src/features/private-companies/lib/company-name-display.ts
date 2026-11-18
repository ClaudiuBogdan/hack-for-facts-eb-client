/**
 * A company's name as a heading shows it. Its own module, without the profile
 * model's imports, so a route's head can name a company without bringing the
 * private-company schemas into the start-up graph (docs/route-contracts.md).
 */

/** The registry's cedilla letters as the comma-below ones Romanian is written in („Bucureşti" → „București"). */
export function commaBelow(text: string): string {
  return text.replace(/ş/gu, 'ș').replace(/Ş/gu, 'Ș').replace(/ţ/gu, 'ț').replace(/Ţ/gu, 'Ț')
}

/** Romanian function words, lower case inside a name („Compania Națională de Căi Ferate"). */
const FUNCTION_WORDS = new Set(['de', 'din', 'si', 'și', 'a', 'al', 'ale', 'la', 'pe', 'pentru', 'cu', 'in', 'în'])

/**
 * The registry writes names in capitals; a heading in capitals shouts. Words
 * become capitalised, with three generic exceptions that hold for any name:
 * a word of three letters or fewer stays in capitals (legal forms, initials
 * and acronyms: SA, SRL, ABC), a word with a digit, a dot or an ampersand
 * stays as written (S.R.L., 2016), and a function word goes lower case. The
 * exact legal name stays in the registry facts.
 */
export function displayCompanyName(legalName: string): string {
  return commaBelow(legalName)
    .split(/(\s+|-)/u)
    .map((word, index) => {
      if (word === '' || /^\s+$|^-$/u.test(word)) return word
      const lower = word.toLocaleLowerCase('ro-RO')
      if (index > 0 && FUNCTION_WORDS.has(lower)) return lower
      if (/[\d.&]/u.test(word)) return word
      const letters = word.replace(/[^\p{L}]/gu, '')
      if (letters.length <= 3) return word
      return lower.replace(/\p{L}/u, (first) => first.toLocaleUpperCase('ro-RO'))
    })
    .join('')
}
