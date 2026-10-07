#!/usr/bin/env node
/**
 * Regenerates `src/features/justice/lib/court-names.generated.ts`: a readable
 * Romanian name for every court the judicial API serves. The API names a
 * court only by its Portal Just institution code (`JudecatoriaSECTORUL4BUCURESTI`,
 * `TribunalulMilitarCLUJNAPOCA`), in capitals and without diacritics, so the
 * place is restored from the county list and the UAT names the INS map uses.
 *
 *   node scripts/generate-justice-court-names.mjs [--api <graphql url>]
 *
 * Every court must resolve: the script fails rather than write a code as a
 * name. Rerun it when the API's court list changes.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({ options: { api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' } } })
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/features/justice/lib/court-names.generated.ts')

const response = await fetch(values.api, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ query: '{ judicialCourts { institutionCode courtLevel locality countyCode } }' }),
})
const json = await response.json()
if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 400))
const courts = json.data.judicialCourts

/** Capitals without diacritics, spaces or hyphens: the spelling of a place in an institution code. */
const key = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')

const countySource = readFileSync(resolve(root, 'src/lib/territory-counties.ts'), 'utf8')
const counties = [...countySource.matchAll(/code: '([A-Z]+)', name: '[^']+', nameRo: '([^']+)'/g)].map(([, code, name]) => ({ code, name }))
if (counties.length !== 42) throw new Error(`expected 42 counties, read ${counties.length}`)

const geometry = JSON.parse(readFileSync(resolve(root, 'src/features/statistics/data/uat-map-geometry.json'), 'utf8'))
const towns = geometry.name.map((name, i) => ({ name, county: geometry.county[i], kind: geometry.kind[i] }))
const TOWN_RANK = { resedinta: 0, municipiu: 1, oras: 2, comuna: 3 }

function countyPlace(spelling) {
  return counties.find((county) => key(county.name) === spelling)?.name
}

/** Codes that spell a town with the article its official name has since dropped. */
const OLD_SPELLINGS = {
  ODORHEIULSECUIESC: 'ODORHEIUSECUIESC',
  SANNICOLAULMARE: 'SANNICOLAUMARE',
  SIMLEULSILVANIEI: 'SIMLEUSILVANIEI',
}

function townPlace(spelling, countyCode) {
  const current = OLD_SPELLINGS[spelling] ?? spelling
  const matches = towns
    .filter((town) => key(town.name) === current)
    .sort((a, b) => Number(b.county === countyCode) - Number(a.county === countyCode) || (TOWN_RANK[a.kind] ?? 9) - (TOWN_RANK[b.kind] ?? 9))
  // The UAT list spells a few hyphens with a space beside them („Lehliu- Gară").
  const name = matches[0]?.name.replace(/\s*-\s*/g, '-')
  return name === undefined ? undefined : (PLACE_FIXES[name] ?? name)
}

/** Places the UAT list spells otherwise than the courts do: a missing diacritic, a hyphen the court's name has not. */
const PLACE_FIXES = {
  Toplita: 'Toplița',
  'Piatra-Neamț': 'Piatra Neamț',
}

/** Longest prefix first: `TribunalulMilitarTeritorial` before `TribunalulMilitar` before `Tribunalul`. */
const PREFIXES = [
  ['InaltaCurtedeCasatiesiJustitie', 'Înalta Curte de Casație și Justiție', null],
  ['CurteaMilitaradeApel', 'Curtea Militară de Apel', 'town'],
  ['CurteadeApel', 'Curtea de Apel', 'county'],
  ['TribunalulMilitarTeritorial', 'Tribunalul Militar Teritorial', 'town'],
  ['TribunalulMilitar', 'Tribunalul Militar', 'town'],
  ['TribunalulComercial', 'Tribunalul Comercial', 'county'],
  ['TribunalulpentruminoriSifamilie', 'Tribunalul pentru Minori și Familie', 'county'],
  ['Tribunalul', 'Tribunalul', 'county'],
  ['Judecatoria', 'Judecătoria', 'town'],
]

function courtName(court) {
  const prefix = PREFIXES.find(([code]) => court.institutionCode.startsWith(code))
  if (!prefix) return undefined
  const [code, label, prefer] = prefix
  if (prefer === null) return court.institutionCode === code ? label : undefined
  const spelling = key(court.institutionCode.slice(code.length))
  const sector = spelling.match(/^SECTORUL(\d)BUCURESTI$/)
  if (sector) return `${label} Sectorului ${sector[1]} București`
  const place =
    prefer === 'county'
      ? (countyPlace(spelling) ?? townPlace(spelling, court.countyCode))
      : (townPlace(spelling, court.countyCode) ?? countyPlace(spelling))
  return place ? `${label} ${place}` : undefined
}

const names = courts.map((court) => [court.institutionCode, courtName(court)])
const unresolved = names.filter(([, name]) => name === undefined).map(([code]) => code)
if (unresolved.length > 0) throw new Error(`no readable name for ${unresolved.join(', ')}`)
names.sort(([a], [b]) => a.localeCompare(b))

const body = names.map(([code, name]) => `  ${code}: '${name}',`).join('\n')
writeFileSync(
  out,
  `// Generated by scripts/generate-justice-court-names.mjs from the judicial API's court list,\n` +
    `// the county list and the INS UAT names. Do not edit by hand; rerun the script.\n\n` +
    `/** A readable Romanian name for each court, keyed by its Portal Just institution code. */\n` +
    `export const COURT_NAMES: Readonly<Record<string, string>> = {\n${body}\n}\n`,
)
console.log(`wrote ${names.length} court names to ${out}`)
