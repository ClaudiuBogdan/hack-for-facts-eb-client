#!/usr/bin/env node
/**
 * Regenerates `src/features/private-companies/lib/hub-snapshot.ts`, the
 * figures the `/companies` hub renders, from the production database and the
 * INS population the public API serves.
 *
 * Read-only: every statement is a SELECT inside one REPEATABLE READ, READ ONLY
 * transaction, run as the agent read-only role. Connection details come from
 * the libpq environment (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD,
 * PGSSLMODE); nothing is read from disk but the repo's own reference lists.
 *
 *   set -a; . ~/.config/transparenta-server/zeus-redesign-psql.env; set +a
 *   PGSSLMODE=no-verify node scripts/generate-companies-hub-snapshot.mjs --year 2025
 *
 * `no-verify`: the database's load balancer presents a self-signed chain; the
 * connection runs over the tailnet. `pg` is not a client dependency, so it is
 * loaded from the sibling server checkout (`--server-repo`, default
 * `../hack-for-facts-eb-server`).
 *
 * Options:
 *   --year         fiscal year of the statements and of "new" companies (default: last year)
 *   --api          GraphQL endpoint for INS POP105A (default: dev-chronos-api)
 *   --server-repo  checkout whose node_modules provides `pg`
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(ROOT, 'src/features/private-companies/lib/hub-snapshot.ts')

const { values: args } = parseArgs({
  options: {
    year: { type: 'string', default: String(new Date().getFullYear() - 1) },
    api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' },
    'server-repo': { type: 'string', default: resolve(ROOT, '../hack-for-facts-eb-server') },
  },
})
const YEAR = Number(args.year)
if (!Number.isInteger(YEAR) || YEAR < 2019) {
  console.error('Usage: --year 2025 (ANAF statements start in 2019)')
  process.exit(1)
}

/** An employee count above this is a keying error: the largest real employer (CFR) reports about 24,000. */
const EMPLOYEE_CEILING = 50_000
const FIRST_REGISTRATION_YEAR = 1991

// ── the repo's own reference lists ──────────────────────────────────────

const source = (path) => readFileSync(resolve(ROOT, path), 'utf8')
const COUNTIES = [...source('src/lib/territory-counties.ts').matchAll(/\{ code: '([A-Z]+)', name: '[^']+', nameRo: '([^']+)' \}/g)].map(
  ([, code, name]) => ({ code, name }),
)
const NAMED_DIVISIONS = new Set([...source('src/features/private-companies/lib/caen-divisions.ts').matchAll(/code: '(\d\d)'/g)].map(([, code]) => code))
const statusCodes = (name) => {
  const list = new RegExp(`export const ${name} = \\[([^\\]]*)\\]`).exec(source('src/features/private-companies/lib/company-status-codes.ts'))?.[1]
  return [...(list ?? '').matchAll(/'(\d+)'/g)].map(([, code]) => code)
}
const INSOLVENCY_STATUSES = statusCodes('INSOLVENCY_STATUSES')
const DISSOLUTION_STATUSES = statusCodes('DISSOLUTION_STATUSES')
if (COUNTIES.length !== 42 || NAMED_DIVISIONS.size !== 88 || INSOLVENCY_STATUSES.length === 0 || DISSOLUTION_STATUSES.length === 0) {
  throw new Error('A reference list changed shape')
}
const sqlList = (codes) => codes.map((code) => `'${code}'`).join(', ')

/** `JUDEŢUL TIMIŞ`, `Municipiul București` and `Timiș` all fold to `timis`. */
function fold(name) {
  return name
    .trim()
    .replace(/^(jude[țţ]ul|municipiul)\s+/iu, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[şș]/giu, 's')
    .replace(/[ţț]/giu, 't')
    .toLowerCase()
}
const CODE_BY_FOLD = new Map(COUNTIES.map((county) => [fold(county.name), county.code]))
function countyCode(raw) {
  if (raw === null) return null
  const code = CODE_BY_FOLD.get(fold(raw))
  if (!code) throw new Error(`Unknown county ${raw}`)
  return code
}

// ── the database ────────────────────────────────────────────────────────

// Companies the API serves: organisations of kind 'company' with a CUI of at
// most ten digits (13-digit CNPs are natural persons). A registration year is
// the date's, or for the compact codes ONRC issues since September 2024, which
// carry no date, the year in the code.
const BASE = `
  select r.cui, r.onrc_lifecycle_status_code as status,
         coalesce(extract(year from r.registration_date)::int, r.registration_year_hint) as reg_year,
         r.selected_county_name as county
  from companies_v2.registrations r
  join core.organizations o on o.cui = r.cui and o.kind = 'company'
  where length(r.cui) <= 10`

// The main activity declared to ANAF, as a CAEN Rev.2 division. ANAF's codes
// mix Rev.2 and, since 2025, Rev.3 (and old Rev.1 codes on dormant firms); the
// field carries no revision. A Rev.2 class keeps its division. A class only
// Rev.3 has keeps its division too — the divisions line up — except motor
// vehicle repair (95.3x in Rev.3, which abolished division 45), which goes back
// to 45. Anything else is no recognised activity.
const MAIN_DIVISION = `
  select fs.cui,
         case
           when fs.main_caen_code in (select code from core.classification_codes where system = 'caen_rev2')
             then left(fs.main_caen_code, 2)
           when fs.main_caen_code in (select code from core.classification_codes where system = 'caen_rev3')
             then case when fs.main_caen_code like '953%' then '45' else left(fs.main_caen_code, 2) end
         end as division
  from companies_v2.fiscal_status fs`

const FY = `
  select f.cui, f.turnover,
         case when f.employees > ${EMPLOYEE_CEILING} then null else f.employees end as employees,
         coalesce(f.employees > ${EMPLOYEE_CEILING}, false) as employee_outlier
  from companies_v2.financials f
  where f.privacy_class = 'public' and length(f.cui) <= 10 and f.year = ${YEAR}`

const leaders = (metric) => `
  with fy as (${FY}), md as (${MAIN_DIVISION})
  select fy.cui, r.legal_name as name, r.selected_county_name as county, r.onrc_lifecycle_status_code as status,
         md.division, fy.${metric}::text as value,
         (case when p.employees > ${EMPLOYEE_CEILING} and '${metric}' = 'employees' then null else p.${metric} end)::text as previous
  from fy
  left join companies_v2.registrations r on r.cui = fy.cui
  left join md on md.cui = fy.cui
  left join companies_v2.financials p on p.cui = fy.cui and p.year = ${YEAR - 1} and p.privacy_class = 'public'
  where fy.${metric} is not null
  order by fy.${metric} desc
  limit 10`

const QUERIES = {
  // The newest ONRC capture that is loaded: the dimension also lists captures
  // whose rows have not arrived, which would date these figures too late.
  registryPublished: `
    select max(ss.source_published_at)::text as published
    from companies_v2.source_snapshots ss
    where ss.source_snapshot_id like 'onrc:%'
      and exists (select 1 from companies_v2.registration_history h where h.source_snapshot_id = ss.source_snapshot_id)`,
  status: `with base as (${BASE}) select status, count(*)::bigint as n from base group by status`,
  registrations: `
    with base as (${BASE})
    select reg_year, count(*)::bigint as registered, count(*) filter (where status = '1048')::bigint as active
    from base where reg_year between ${FIRST_REGISTRATION_YEAR} and ${YEAR}
    group by reg_year order by reg_year`,
  activeByCounty: `with base as (${BASE}) select county, count(*)::bigint as n from base where status = '1048' group by county`,
  newByCounty: `with base as (${BASE}) select county, count(*)::bigint as n from base where reg_year = ${YEAR} group by county`,
  activeByDivision: `
    with base as (${BASE}), md as (${MAIN_DIVISION})
    select md.division, count(*)::bigint as n
    from base b left join md on md.cui = b.cui
    where b.status = '1048' group by 1`,
  newByDivision: `
    with base as (${BASE}), md as (${MAIN_DIVISION})
    select md.division, count(*)::bigint as n
    from base b left join md on md.cui = b.cui
    where b.reg_year = ${YEAR} group by 1`,
  fiscallyInactive: `
    with base as (${BASE})
    select count(*) filter (where fs.is_inactive)::bigint as n
    from base b left join companies_v2.fiscal_status fs on fs.cui = b.cui
    where b.status = '1048'`,
  national: `
    with fy as (${FY})
    select count(*)::bigint as statements, sum(turnover)::text as turnover, sum(employees)::text as employees,
           count(*) filter (where employee_outlier)::bigint as outliers
    from fy`,
  sectors: `
    with fy as (${FY}), md as (${MAIN_DIVISION})
    select md.division,
           coalesce(sum(fy.turnover), 0)::text as turnover, coalesce(sum(fy.employees), 0)::text as employees
    from fy left join md on md.cui = fy.cui
    group by 1`,
  sizes: `
    with fy as (${FY})
    select case when employees is null or employees = 0 then '0' when employees < 10 then '1-9'
                when employees < 50 then '10-49' when employees < 250 then '50-249' else '250+' end as size_class,
           count(*)::bigint as firms, coalesce(sum(turnover), 0)::text as turnover, coalesce(sum(employees), 0)::text as employees
    from fy where not employee_outlier group by 1`,
  countyFinancials: `
    with fy as (${FY})
    select r.selected_county_name as county,
           coalesce(sum(fy.turnover), 0)::text as turnover, coalesce(sum(fy.employees), 0)::text as employees
    from fy left join companies_v2.registrations r on r.cui = fy.cui
    group by 1`,
  leadersTurnover: leaders('turnover'),
  leadersEmployees: leaders('employees'),
}

async function readDatabase() {
  const { Client } = createRequire(resolve(args['server-repo'], 'package.json'))('pg')
  const client = new Client({ application_name: 'companies-hub-snapshot', statement_timeout: 900_000 })
  await client.connect()
  const rows = {}
  try {
    // One snapshot for every query: under the default READ COMMITTED an
    // ingestion committing midway would mix two states of the database.
    await client.query('begin transaction isolation level repeatable read read only')
    for (const [name, sql] of Object.entries(QUERIES)) {
      const started = Date.now()
      rows[name] = (await client.query(sql)).rows
      console.log(`read ${name} (${rows[name].length} rows, ${((Date.now() - started) / 1000).toFixed(1)}s)`)
    }
    await client.query('rollback')
  } finally {
    await client.end()
  }
  return rows
}

// ── INS population ──────────────────────────────────────────────────────

const POPULATION_QUERY = `
  query Population($filter: InsObservationFilterInput, $offset: Int) {
    insObservations(datasetCode: "POP105A", filter: $filter, limit: 1000, offset: $offset) {
      nodes { value territory { code level } classifications { code name_ro } }
      pageInfo { hasNextPage }
    }
  }`

/**
 * Residents on 1 January of the year (POP105A): the cell with every axis at
 * its total but the county's own. A national row has no member off its
 * total; a county row has exactly one, the county.
 */
async function readPopulation() {
  const filter = {
    territoryLevels: ['NUTS3', 'NATIONAL'],
    period: { type: 'YEAR', selection: { interval: { start: String(YEAR), end: String(YEAR) } } },
  }
  const population = new Map()
  for (let offset = 0; ; offset += 1000) {
    const response = await fetch(args.api, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ query: POPULATION_QUERY, variables: { filter, offset } }),
    })
    const { data, errors } = await response.json()
    if (errors) throw new Error(JSON.stringify(errors))
    for (const node of data.insObservations.nodes) {
      const { code, level } = node.territory
      const offTotal = node.classifications.filter((entry) => !entry.name_ro.trim().toLowerCase().startsWith('total')).length
      if (offTotal !== (level === 'NATIONAL' ? 0 : 1) || population.has(code)) continue
      population.set(code, Number(node.value))
    }
    if (!data.insObservations.pageInfo.hasNextPage) break
  }
  if (!population.has('RO') || COUNTIES.some((county) => !population.has(county.code))) throw new Error('POP105A is missing a county')
  return population
}

// ── the module ──────────────────────────────────────────────────────────

const int = (value) => Math.round(Number(value))
const quote = (value) => `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
const nullable = (value) => (value === null || value === undefined ? 'null' : `'${value}'`)
const sumOf = (values) => values.reduce((total, value) => total + int(value), 0)

function byCounty(rows, key = 'n') {
  const out = new Map()
  for (const row of rows) {
    const code = countyCode(row.county)
    if (code) out.set(code, row[key])
  }
  return out
}

/**
 * The parts must add up to their wholes before anything is written: a read
 * that does not reconcile is broken, and a broken snapshot would ship as fact.
 */
function reconcile(rows, population) {
  const national = rows.national[0]
  const problems = []
  const check = (ok, message) => ok || problems.push(message)
  check(byCounty(rows.activeByCounty).size === 42 && byCounty(rows.countyFinancials, 'turnover').size === 42, 'a county has no figures')
  check(sumOf(COUNTIES.map((county) => population.get(county.code))) === population.get('RO'), 'county populations do not add up to RO')
  check(sumOf(rows.countyFinancials.map((row) => row.turnover)) === int(national.turnover), 'county turnover does not add up to the national total')
  check(sumOf(rows.sectors.map((row) => row.turnover)) === int(national.turnover), 'sector turnover does not add up to the national total')
  check(sumOf(rows.sizes.map((row) => row.employees)) === int(national.employees), 'size-class employees do not add up to the national total')
  check(rows.leadersTurnover.length === 10 && rows.leadersEmployees.length === 10, 'a ranking is short of ten')
  check(rows.registrations.length === YEAR - FIRST_REGISTRATION_YEAR + 1, 'a registration year is missing')
  check(/^\d{4}-\d{2}-\d{2}$/.test(rows.registryPublished[0]?.published ?? ''), 'no ONRC capture date')
  if (problems.length > 0) throw new Error(`The read does not reconcile:\n- ${problems.join('\n- ')}`)
}

function render(rows, population) {
  const status = new Map(rows.status.map((row) => [row.status, int(row.n)]))
  const statusTotal = (codes) => codes.reduce((total, code) => total + (status.get(code) ?? 0), 0)
  const national = rows.national[0]
  const registryPeriod = rows.registryPublished[0].published.slice(0, 7)
  const registrations = rows.registrations.map((row) => ({ year: row.reg_year, registered: int(row.registered), active: int(row.active) }))
  const newFirms = registrations.find((row) => row.year === YEAR)?.registered ?? 0
  const active = byCounty(rows.activeByCounty)
  const fresh = byCounty(rows.newByCounty)
  const finance = new Map(rows.countyFinancials.filter((row) => row.county !== null).map((row) => [countyCode(row.county), row]))
  const activeByDivision = new Map(rows.activeByDivision.map((row) => [row.division, int(row.n)]))
  const sectors = rows.sectors
    .filter((row) => NAMED_DIVISIONS.has(row.division))
    .map((row) => ({ division: row.division, activeFirms: activeByDivision.get(row.division) ?? 0, turnover: int(row.turnover), employees: int(row.employees) }))
    .sort((a, b) => b.turnover - a.turnover || a.division.localeCompare(b.division))
  const newBySector = rows.newByDivision
    .filter((row) => NAMED_DIVISIONS.has(row.division))
    .map((row) => ({ division: row.division, firms: int(row.n) }))
    .sort((a, b) => b.firms - a.firms || a.division.localeCompare(b.division))
  const sizes = new Map(rows.sizes.map((row) => [row.size_class, row]))
  const today = new Date().toISOString().slice(0, 10)
  const leader = (row) =>
    `      { cui: ${quote(row.cui)}, name: ${quote(row.name.trim())}, county: ${nullable(countyCode(row.county))}, division: ${nullable(
      NAMED_DIVISIONS.has(row.division) ? row.division : null,
    )}, status: ${nullable(row.status)}, value: ${int(row.value)}, previous: ${row.previous === null ? 'null' : int(row.previous)} },`

  return [
    "import type { CompanyHubSnapshot } from './hub-snapshot-types'",
    '',
    '/**',
    ` * The companies hub's figures, read on ${today} from the production`,
    ' * database (read-only role) and kept in the client, as the INS hub keeps its',
    " * annual histories: a year's statements and a year's registrations are closed",
    ' * figures, and recomputing them on every visit is a 30-second scan that tells',
    ' * the reader nothing new.',
    ' *',
    ` * - **Registry** (\`companies_v2.registrations\`, ONRC capture published ${rows.registryPublished[0].published}):`,
    " *   companies with a CUI of at most ten digits (natural persons' CNPs are never",
    ` *   served). In business = ONRC status 1048. Founded in ${YEAR} = registration`,
    ' *   date, or for the compact codes ONRC issues since September 2024 (which',
    ' *   carry no date) the year in the registration code.',
    ` * - **Statements** (\`companies_v2.financials\`, FY${YEAR}, public rows):`,
    ' *   turnover and average employees as filed with ANAF. Employee counts above',
    ` *   ${EMPLOYEE_CEILING.toLocaleString('en-US')} (${int(national.outliers)} this year) are keying errors and are dropped`,
    ' *   from every employee figure. Banks and insurers file with the BNR and ASF.',
    ' * - **Sector** = the main CAEN activity declared to ANAF, as a Rev.2 division',
    ' *   (Rev.3 classes mapped to theirs, vehicle repair back to 45), so every',
    ' *   company sits in one division; those with no recognised code are the rest.',
    " * - **County** = the registered office's county; turnover follows the head",
    ' *   office, so a national chain counts where it is registered.',
    ` * - **Population** = INS POP105A, residents on 1 January ${YEAR}.`,
    ' *',
    ' * Generated by `scripts/generate-companies-hub-snapshot.mjs`; never edit a figure by hand.',
    ' */',
    'export const COMPANY_HUB_SNAPSHOT: CompanyHubSnapshot = {',
    `  capturedAt: '${today}',`,
    `  registryPeriod: '${registryPeriod}',`,
    `  fiscalYear: ${YEAR},`,
    '  national: {',
    `    population: ${population.get('RO')},`,
    `    activeFirms: ${status.get('1048') ?? 0},`,
    `    newFirms: ${newFirms},`,
    `    turnover: ${int(national.turnover)},`,
    `    employees: ${int(national.employees)},`,
    `    statements: ${int(national.statements)},`,
    `    insolvency: ${statusTotal(INSOLVENCY_STATUSES)},`,
    `    dissolution: ${statusTotal(DISSOLUTION_STATUSES)},`,
    `    fiscallyInactive: ${int(rows.fiscallyInactive[0].n)},`,
    '  },',
    '  leaders: {',
    '    turnover: [',
    ...rows.leadersTurnover.map(leader),
    '    ],',
    '    employees: [',
    ...rows.leadersEmployees.map(leader),
    '    ],',
    '  },',
    '  sectors: [',
    ...sectors.map((s) => `    { division: '${s.division}', activeFirms: ${s.activeFirms}, turnover: ${s.turnover}, employees: ${s.employees} },`),
    '  ],',
    '  newFirmsBySector: [',
    ...newBySector.map((s) => `    { division: '${s.division}', firms: ${s.firms} },`),
    '  ],',
    '  sizeClasses: [',
    ...['0', '1-9', '10-49', '50-249', '250+'].map((key) => {
      const row = sizes.get(key)
      return `    { key: '${key}', firms: ${int(row.firms)}, turnover: ${int(row.turnover)}, employees: ${int(row.employees)} },`
    }),
    '  ],',
    '  counties: [',
    ...[...COUNTIES]
      .sort((a, b) => (a.code < b.code ? -1 : 1))
      .map(({ code }) => {
        const row = finance.get(code)
        return `    { code: '${code}', population: ${population.get(code)}, activeFirms: ${int(active.get(code))}, newFirms: ${int(fresh.get(code) ?? 0)}, turnover: ${int(row.turnover)}, employees: ${int(row.employees)} },`
      }),
    '  ],',
    '  registrations: [',
    ...registrations.map((row) => `    { year: ${row.year}, registered: ${row.registered}, active: ${row.active} },`),
    '  ],',
    '}',
    '',
  ].join('\n')
}

// The population first: a failing API read then never leaves a database
// connection open behind it.
const population = await readPopulation()
const rows = await readDatabase()
reconcile(rows, population)
writeFileSync(OUT, render(rows, population))
console.log(`wrote ${OUT}`)
