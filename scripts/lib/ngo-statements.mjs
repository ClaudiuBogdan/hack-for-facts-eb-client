/**
 * One year's non-profit statements file (MFP, data.gov.ro: `CUI,CAEN,CAENO,I1…I46`),
 * by CUI. Read by `scripts/summarize-ngo-finances.mjs`, tested in
 * `src/features/ngos/hub/ngo-statements.test.ts`.
 */

const INTEGER = /^-?\d+$/
/** The revenue indicators read: non-profit (I14), special-purpose (I22) and economic (I30) activities, and their total (I38). */
export const REVENUE_INDICATORS = ['I14', 'I22', 'I30', 'I38']

/**
 * The statements of one file, by CUI (leading zeros dropped); a row with a
 * non-integer revenue cell, or cut short, is dropped and counted. A blank
 * cell is unknown — `null`, never 0. I1 („Active imobilizate – total") is
 * read for the excluded statements' reason only, unvalidated: a bad I1 is
 * `null` and drops nothing.
 */
export function parseStatements(text) {
  const [header, ...lines] = text.split(/\r?\n/).filter(Boolean)
  const columns = header.split(',')
  const at = (name) => {
    const index = columns.indexOf(name)
    if (index < 0) throw new Error(`no column ${name}`)
    return index
  }
  const cui = at('CUI')
  const activity = at('CAENO')
  const indicators = REVENUE_INDICATORS.map((name) => [name, at(name)])
  const fixedAssets = at('I1')
  // Some years carry activity names (`DEN_CAENO`) with unquoted commas: a column after one is not where the header says.
  const firstText = columns.findIndex((name) => name.startsWith('DEN_'))
  if (firstText >= 0 && [...indicators.map(([, index]) => index), fixedAssets].some((index) => index > firstText)) {
    throw new Error('an indicator read sits after a text column')
  }
  const statements = new Map()
  let malformed = 0
  for (const line of lines) {
    const cells = line.split(',')
    const id = cells[cui]?.trim()
    const values = indicators.map(([name, index]) => [name, cells[index]?.trim()])
    // A row shorter than the header is cut, not empty: its missing cells are not zeros.
    const complete = cells.length >= columns.length
    if (!complete || !id || !INTEGER.test(id) || values.some(([, value]) => value === undefined || (value !== '' && !INTEGER.test(value)))) {
      malformed += 1
      continue
    }
    // A blank is unknown: null, which the sums read as nothing and the classes as `unknown`.
    const read = Object.fromEntries(values.map(([name, value]) => [name, value === '' ? null : Number(value)]))
    const assets = cells[fixedAssets]?.trim() ?? ''
    const statement = { activity: cells[activity]?.trim() ?? '', ...read, fixedAssets: INTEGER.test(assets) ? Number(assets) : null }
    const key = id.replace(/^0+/, '')
    const seen = statements.get(key)
    if (seen) {
      // A CUI filed twice must be the same statement twice (a handful per file are); anything else is ambiguous. Compared
      // on what the sums read, a blank as 0 (as it was read before blanks were unknown); the copy with more cells filled is kept.
      const comparable = (s) => JSON.stringify([s.activity, ...REVENUE_INDICATORS.map((name) => s[name] ?? 0)])
      if (comparable(seen) !== comparable(statement)) throw new Error(`CUI ${key} has two different statements`)
      const filled = (s) => [...REVENUE_INDICATORS, 'fixedAssets'].filter((name) => s[name] !== null).length
      if (filled(statement) > filled(seen)) statements.set(key, statement)
      continue
    }
    statements.set(key, statement)
  }
  return { statements, malformed }
}
