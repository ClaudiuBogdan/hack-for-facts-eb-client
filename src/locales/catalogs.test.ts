import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * The source locale is `en`, so a Romanian entry left empty falls back to the
 * English catalog's text: where `en` carries a translation, the Romanian UI
 * would show English. Every such entry carries its Romanian text (the msgid).
 */

/** Each entry's msgid and msgstr, multi-line strings joined. */
function entries(path: string): ReadonlyMap<string, string> {
  const text = readFileSync(fileURLToPath(new URL(path, import.meta.url)), 'utf8')
  const join = (block: string) => [...block.matchAll(/"((?:[^"\\]|\\.)*)"/gu)].map((match) => match[1]).join('')
  const found = new Map<string, string>()
  for (const match of text.matchAll(/^msgid ("(?:[^"\\]|\\.)*"(?:\n"(?:[^"\\]|\\.)*")*)\nmsgstr ("(?:[^"\\]|\\.)*"(?:\n"(?:[^"\\]|\\.)*")*)/gmu)) {
    found.set(join(match[1]!), join(match[2]!))
  }
  return found
}

describe.each(['messages', 'admin', 'pnrr'])('the %s catalogs', (catalog) => {
  it('leave no Romanian entry empty where the English one is translated', () => {
    const ro = entries(`./ro/${catalog}.po`)
    const en = entries(`./en/${catalog}.po`)
    expect(ro.size).toBeGreaterThan(0)
    const english = [...ro].filter(([id, text]) => id !== '' && text === '' && ![undefined, '', id].includes(en.get(id))).map(([id]) => id)
    expect(english).toEqual([])
  })
})
