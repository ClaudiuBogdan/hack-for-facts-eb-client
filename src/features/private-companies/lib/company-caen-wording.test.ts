import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * ANAF's TVA `cod_CAEN` is a fiscal source observation: ANAF publishes neither
 * a revision nor a principal-activity meaning for it. No ACTIVE catalog
 * message (RO source or EN translation) of the private-companies surfaces may
 * call it a principal / main activity "declared to ANAF" — the derived
 * activity copy says what it is NOT, which stays allowed. The ANAF-ASSUMED
 * main activity (policy `anaf-assumed-main-caen-v1`) is the one sanctioned
 * main-activity wording, and only in its approved phrases (`APPROVED`): „main
 * activity assumed from ANAF" / „Activitate principală presupusă după ANAF"
 * and the structured variants the page uses. Only those phrases are exempt —
 * the rest of the message is still checked — and a message carrying one
 * never says ONRC declared it.
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

/** A whole phrase: no letter right before or after it (Romanian diacritics included). */
const phrase = (source: string) => new RegExp(`(?<!\\p{L})${source}(?!\\p{L})`, 'giu')

/**
 * The approved assumption phrases, longest first: the user's chosen wording
 * („main activity assumed from ANAF", „Activitate principală presupusă după
 * ANAF") and the structured variants the page uses — the kicker with the
 * qualifier in brackets, the bare qualified noun (and its genitive), the
 * activity list's badge. Nothing looser: the qualifier alone exempts nothing.
 */
const APPROVED = [
  phrase('activitat(?:e|ea) principal[ăa] \\(presupus[ăa] după ANAF\\)'),
  phrase('activitat(?:e|ea) principal[ăa] presupus[ăa] după ANAF'),
  phrase('activitat(?:e|ea) principal[ăa] presupus[ăa]'),
  phrase('activității principale presupuse'),
  phrase('principal[ăa] \\(presupus[ăa]\\)'),
  phrase('main activity assumed from ANAF'),
  phrase('assumed main activity'),
  phrase('main \\(assumed\\)'),
]

/** The assumed main activity is never an ONRC fact. */
const ONRC_CLAIMS = [/declarat[ăa]? (de|la) ONRC/iu, /declared (by|at|to) ONRC/iu, /principal[ăa] (din|declarat[ăa] la) ONRC/iu, /ONRC(’s|'s)? (principal|main) activity/iu]

const MARK = '‹assumed-main›'

function withoutApproved(text: string): string {
  return APPROVED.reduce((rest, approved) => rest.replace(approved, MARK), text)
}

function approved(text: string): boolean {
  return withoutApproved(text) !== text
}

/**
 * Whether a message claims what it may not: an ANAF principal / main activity
 * anywhere outside an approved assumption phrase, or an approved phrase said
 * as ONRC's.
 */
function offends(text: string): boolean {
  return CLAIMS.some((claim) => claim.test(withoutApproved(text))) || (approved(text) && ONRC_CLAIMS.some((claim) => claim.test(text)))
}

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
    const offending = entries.flatMap(({ id, str }) => [id, str]).filter(offends)
    expect(offending).toEqual([])
  })

  it.each(['ro/messages.po', 'en/messages.po'])('%s words the assumed main activity in its approved phrases, never as an ONRC fact', (file) => {
    const texts = activeEntries(file).flatMap(({ id, str }) => (file.startsWith('en') ? [str] : [id]))
    const assumed = texts.filter(approved)
    expect(assumed.length).toBeGreaterThan(0)
    expect(assumed.filter((text) => ONRC_CLAIMS.some((claim) => claim.test(text)))).toEqual([])
  })

  it('the approved phrases pass, alone and inside a message', () => {
    for (const text of [
      'Activitate principală presupusă după ANAF',
      'Activitate principală (presupusă după ANAF)',
      'Activitate principală presupusă',
      'Activitatea principală presupusă după ANAF nu a fost încă stabilită pentru această firmă.',
      'Istoricul activității principale presupuse',
      'principală (presupusă)',
      'main activity assumed from ANAF',
      'Main activity assumed from ANAF',
      'The main activity assumed from ANAF cannot be shown: the API answer could not be read.',
      'Assumed main activity',
      'main (assumed)',
    ]) {
      expect(offends(text)).toBe(false)
    }
  })

  it('the exemption is the approved phrase only: an unqualified or merely „assumed"-flavoured claim is still caught', () => {
    for (const text of [
      'Activitate principală ANAF',
      'Activitatea principală declarată la ANAF',
      'main activity declared to ANAF',
      // Turn 01 exempted any message containing „presupus" / „assumed": these passed it.
      'Activitatea principală declarată la ANAF (presupusă greșit)',
      'main activity declared to ANAF, assumed',
      'Activitate principală ANAF (presupusă)',
      'assumed: main activity declared to ANAF',
      'ANAF’s main activity (assumed)',
      'Activitate principală presupusă după ANAF, CAEN principal declarat la ANAF',
    ]) {
      expect(offends(text)).toBe(true)
    }
  })

  it('an approved phrase said as ONRC’s is caught', () => {
    for (const text of [
      'Activitate principală presupusă după ANAF, declarată de ONRC',
      'activitate principală presupusă, declarată de ONRC',
      'main activity assumed from ANAF, declared by ONRC',
      'Assumed main activity — ONRC’s main activity',
    ]) {
      expect(offends(text)).toBe(true)
    }
  })
})
