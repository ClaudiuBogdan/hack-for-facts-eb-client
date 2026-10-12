import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * ANAF's TVA `cod_CAEN` is a fiscal source observation: ANAF publishes neither
 * a revision nor a principal-activity meaning for it. No ACTIVE catalog
 * message (RO source or EN translation) of the private-companies surfaces may
 * call it a principal / main activity "declared to ANAF" — the derived
 * activity copy says what it is NOT, which stays allowed.
 */
const CLAIMS = [
  /activitat(ea|e) principal[ăa] declarat[ăa]/iu,
  /declarat[ăa]? la ANAF/iu,
  /CAEN principal/iu,
  /^Activitate(a)? principal[ăa]/iu,
  /principal[ăa] ANAF/iu,
  /main activity (declared|ANAF)/iu,
  /ANAF(’s|'s)? (declared )?main activity/iu,
  /declared to ANAF/iu,
]

function activeEntries(file: string): { id: string; str: string }[] {
  const text = readFileSync(path.resolve(process.cwd(), 'src/locales', file), 'utf8')
  return text
    .split('\n\n')
    .filter((block) => !block.startsWith('#~') && block.includes('private-companies'))
    .flatMap((block) => {
      const match = /^msgid "(.*)"\nmsgstr "(.*)"$/mu.exec(block)
      return match ? [{ id: match[1] ?? '', str: match[2] ?? '' }] : []
    })
}

describe('ANAF fiscal CAEN wording in the catalogs', () => {
  it.each(['ro/messages.po', 'en/messages.po'])('%s never claims an ANAF principal or main activity', (file) => {
    const entries = activeEntries(file)
    expect(entries.length).toBeGreaterThan(100)
    const offending = entries.flatMap(({ id, str }) => [id, str]).filter((text) => CLAIMS.some((claim) => claim.test(text)))
    expect(offending).toEqual([])
  })
})
