#!/usr/bin/env node
/**
 * Regenerates `src/development/prototypes/public-companies/hub.fixture.json`:
 * the figures the public-enterprise hub prototypes read, computed from the
 * deployed dev API. The public-enterprise module serves a list and a profile
 * but no aggregate (design note §12.3, ask 1), so this script reads every
 * anchor and counts on its own; the result is the shape a server aggregate
 * would have to serve.
 *
 *   node scripts/generate-public-enterprise-hub-fixture.mjs [--api <graphql url>] [--cache <dir>]
 *
 * Reads (all read-only, about 15 minutes on dev-chronos):
 * - `publicEnterprises` (every anchor, historical included) and
 *   `publicEnterpriseSources`;
 * - `publicEnterprise(cui)`: registry observations and control edges;
 * - `entity(cui)` for every authority CUI: the authority's own budget record,
 *   whose kind tells a county council from a local one without reading names;
 * - `company(cui)` and `companyFinancials(cui)`: legal form, county, CAEN,
 *   ONRC and ANAF statuses, filed financial years;
 * - `procurementStats` counts: buyer and seller in SEAP, 2019–2026.
 *
 * `--cache <dir>` keeps each read as JSON and reuses it on the next run.
 * Money stays exact decimal text; a missing value stays null, never zero.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const { values } = parseArgs({
  options: {
    api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' },
    cache: { type: 'string' },
  },
})
const API = values.api
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const out = resolve(root, 'src/development/prototypes/public-companies/hub.fixture.json')
const CONCURRENCY = 6
/** The last complete financial year: 2025 is still being filed. */
const FINANCIAL_YEAR = 2024
const SEAP_SPAN = { from: '2019-01', to: '2026-12' }
const RANKED = 30
/** A headcount past this is a data error (EXIM 25252500 reports 92,149,177 for 2024), kept out of the ranking and named. */
const MAX_PLAUSIBLE_EMPLOYEES = 200_000

// ───────────────────────────────────────────────────────────── reading ──

async function gql(query, variables = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) })
      const json = await response.json()
      if (json.errors) throw new Error(JSON.stringify(json.errors).slice(0, 400))
      return json.data
    } catch (error) {
      if (attempt >= 4) throw error
      await new Promise((done) => setTimeout(done, 1000 * attempt))
    }
  }
}

async function pool(items, read) {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (next < items.length) {
        const index = next++
        results[index] = await read(items[index])
      }
    }),
  )
  return results
}

async function cached(name, read) {
  if (!values.cache) return read()
  mkdirSync(values.cache, { recursive: true })
  const file = resolve(values.cache, name)
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'))
  const value = await read()
  writeFileSync(file, JSON.stringify(value))
  return value
}

const ORG = 'orgId cui kind name countyName localityName sirutaCode'

async function readAnchors() {
  const anchors = []
  for (let page = 1; ; page++) {
    const data = await gql(
      `query L($page: Int!) { publicEnterprises(filter: { currentOnly: { eq: false } }, page: $page, pageSize: 100) { total items { cui isCurrentMember currentFamilies organization { ${ORG} } } } }`,
      { page },
    )
    anchors.push(...data.publicEnterprises.items)
    if (anchors.length >= data.publicEnterprises.total) return anchors
  }
}

const PROFILE = `cui isCurrentMember currentFamilies
  registryObservations { sourceFamily observedYear statusRaw statusNormalized rawSubordination derivedAuthorityLevel }
  authorityEdges { sourceFamily authorityCui authorityName authorityLevel aptTypeId }`

async function readProfile(cui) {
  const data = await gql(`query P($cui: CUI!) { publicEnterprise(cui: $cui) { ${PROFILE} } }`, { cui })
  return data.publicEnterprise ?? { cui, missing: true }
}

async function readAuthorities(cuis) {
  const entities = {}
  for (let index = 0; index < cuis.length; index += 20) {
    const part = cuis.slice(index, index + 20)
    const data = await gql(
      `{ ${part.map((cui, j) => `a${j}: entity(cui: "${cui}") { organization { name } territory { kind name countyCode countyName } reference { name entityType } budget { presence } }`).join('\n')} }`,
    )
    part.forEach((cui, j) => {
      entities[cui] = data[`a${j}`] ?? null
    })
  }
  return entities
}

async function readCompany(cui) {
  const data = await gql(
    `query C($cui: CUI!) {
      company(cui: $cui) { name legalForm headlineStatus { code label } territory { countyName } fiscal { mainCaenCode declaredFiscallyInactive } }
      companyFinancials(cui: $cui) { years { year turnover netProfit netLoss employees } }
    }`,
    { cui },
  )
  return { cui, company: data.company, financials: data.companyFinancials }
}

async function readProcurement(cuis) {
  const counts = {}
  const span = `from: "${SEAP_SPAN.from}", to: "${SEAP_SPAN.to}"`
  for (let index = 0; index < cuis.length; index += 15) {
    const part = cuis.slice(index, index + 15).filter((cui) => cui.length <= 10)
    const data = await gql(
      `{ ${part
        .flatMap((cui, j) => [
          `d${j}: procurementStats(scope: {authorityCui: "${cui}", grain: direct_acquisition, ${span}}) { blocks { recordCount } }`,
          `c${j}: procurementStats(scope: {authorityCui: "${cui}", grain: contract, recordKind: "contract_award", ${span}}) { blocks { recordCount } }`,
          `s${j}: procurementStats(scope: {supplierCui: "${cui}", grain: direct_acquisition, ${span}}) { blocks { recordCount } }`,
        ])
        .join('\n')} }`,
    )
    const count = (read) => (read?.blocks?.[0]?.recordCount == null ? null : Number(read.blocks[0].recordCount))
    part.forEach((cui, j) => {
      counts[cui] = { buyerDirect: count(data[`d${j}`]), buyerAwards: count(data[`c${j}`]), supplierDirect: count(data[`s${j}`]) }
    })
  }
  return counts
}

// ──────────────────────────────────────────────────────────── counting ──

const tally = (values) => {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
}

/** The authority's kind, read off its own budget record (never its name). */
function authorityKind(entity) {
  const type = entity?.reference?.entityType
  const territory = entity?.territory?.kind
  if (type === 'uat' && territory) return territory // county, municipality, town, commune, sector
  if (type === 'central_authority' || type === 'public_entity' || type === 'education') return type
  return 'unresolved'
}

/**
 * A display name: the source's own words, its most frequent spelling (the
 * source names the council that controls, „CONSILIUL JUDETEAN VALCEA"; the
 * budget record names the territory, „JUDETUL VALCEA"); the budget record's
 * name only when the source gave none.
 */
function authorityName(entity, reported) {
  const own = entity?.organization?.name
  return reported ?? (own && !/^\d+$/.test(own) ? own : null)
}

const mainS1001Edge = (profile) => profile.authorityEdges.find((edge) => edge.sourceFamily === 's1001') ?? null
const yearRow = (company, year) => (company?.financials?.years ?? []).find((row) => row.year === year) ?? null
const positive = (decimal) => decimal !== null && decimal !== undefined && Number(decimal) > 0

async function main() {
  const anchors = await cached('anchors.json', readAnchors)
  const sources = await cached('sources.json', async () => (await gql('{ publicEnterpriseSources { family laneStatus snapshotId rawStatus sourceUrl observedAt sourceLastModifiedAt acceptedAt } }')).publicEnterpriseSources)
  const cuis = anchors.map((anchor) => anchor.cui)
  const profiles = await cached('profiles.json', () => pool(cuis, readProfile))
  const authorityCuis = [...new Set(profiles.flatMap((profile) => (profile.authorityEdges ?? []).map((edge) => edge.authorityCui)).filter(Boolean))]
  const entities = await cached('authorities.json', () => readAuthorities(authorityCuis))
  const companies = await cached('companies.json', () => pool(cuis, readCompany))
  const current = anchors.filter((anchor) => anchor.isCurrentMember)
  const procurement = await cached('procurement.json', () => readProcurement(current.map((anchor) => anchor.cui)))

  const profileOf = new Map(profiles.map((profile) => [profile.cui, profile]))
  const companyOf = new Map(companies.map((entry) => [entry.cui, entry]))
  const members = current.map((anchor) => {
    const profile = profileOf.get(anchor.cui)
    const entry = companyOf.get(anchor.cui)
    const edge = mainS1001Edge(profile)
    const s1001 = profile.registryObservations.find((observation) => observation.sourceFamily === 's1001') ?? null
    const amepip = profile.registryObservations
      .filter((observation) => observation.sourceFamily === 'amepip_company_year')
      .sort((a, b) => (b.observedYear ?? 0) - (a.observedYear ?? 0))[0]
    return {
      cui: anchor.cui,
      name: entry?.company?.name ?? anchor.organization?.name ?? null,
      families: anchor.currentFamilies,
      level: edge?.authorityLevel ?? null,
      authorityCui: edge?.authorityCui ?? null,
      authorityKind: edge ? authorityKind(entities[edge.authorityCui]) : null,
      edges: profile.authorityEdges,
      s1001Status: s1001?.statusRaw ?? null,
      amepipStatus: amepip ? { year: amepip.observedYear, raw: amepip.statusRaw, normalized: amepip.statusNormalized } : null,
      company: entry?.company ?? null,
      financials: entry?.financials ?? null,
      observations: profile.registryObservations,
      procurement: procurement[anchor.cui] ?? null,
    }
  })

  // Who controls them: one row per authority CUI, by the S1001 edges of current members.
  const authorities = new Map()
  for (const member of members) {
    for (const edge of member.edges) {
      const row = authorities.get(edge.authorityCui) ?? { cui: edge.authorityCui, names: new Map(), s1001: new Set(), jsonApt: new Set(), levels: new Set() }
      if (edge.authorityName) row.names.set(edge.authorityName, (row.names.get(edge.authorityName) ?? 0) + 1)
      ;(edge.sourceFamily === 's1001' ? row.s1001 : row.jsonApt).add(member.cui)
      if (edge.sourceFamily === 's1001') row.levels.add(edge.authorityLevel)
      authorities.set(edge.authorityCui, row)
    }
  }
  const authorityRows = [...authorities.values()]
    .filter((row) => row.s1001.size > 0)
    .map((row) => {
      const entity = entities[row.cui]
      const reported = [...row.names.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
      const enterprises = [...row.s1001]
      return {
        cui: row.cui,
        name: authorityName(entity, reported),
        entityName: entity?.organization?.name && !/^\d+$/.test(entity.organization.name) ? entity.organization.name : null,
        spellings: row.names.size,
        level: [...row.levels][0] ?? null,
        kind: authorityKind(entity),
        county: entity?.territory?.countyName ?? null,
        hasBudget: entity?.budget?.presence === true,
        enterprises: enterprises.length,
        inactive: enterprises.filter((cui) => members.find((member) => member.cui === cui)?.s1001Status === 'INACTIV').length,
      }
    })
    .sort((a, b) => b.enterprises - a.enterprises || a.cui.localeCompare(b.cui))

  const ranked = (level, kinds) => authorityRows.filter((row) => row.level === level && kinds.includes(row.kind)).slice(0, RANKED)
  const enterpriseRow = (member, value) => ({
    cui: member.cui,
    name: member.name,
    value,
    level: member.level,
    authority: member.authorityCui ? (authorityRows.find((row) => row.cui === member.authorityCui)?.name ?? null) : null,
    county: member.company?.territory?.countyName ?? null,
  })
  const withYear = members.map((member) => ({ member, row: yearRow(member, FINANCIAL_YEAR) })).filter(({ row }) => row)
  const implausible = withYear.filter(({ row }) => row.employees !== null && Number(row.employees) > MAX_PLAUSIBLE_EMPLOYEES)

  const byLevel = (member) => (member.level === 'central' ? 'central' : member.level === 'local' ? 'local' : 'none')
  const split = (key) => {
    const rows = new Map()
    for (const member of members) {
      const value = key(member)
      const row = rows.get(value) ?? { key: value, total: 0, central: 0, local: 0, none: 0 }
      row.total += 1
      row[byLevel(member)] += 1
      rows.set(value, row)
    }
    return [...rows.values()].sort((a, b) => b.total - a.total || String(a.key).localeCompare(String(b.key)))
  }

  const years = new Map()
  for (const member of members) {
    for (const row of member.financials?.years ?? []) {
      const entry = years.get(row.year) ?? { year: row.year, filed: 0, turnover: 0, employees: 0 }
      entry.filed += 1
      if (row.turnover !== null) entry.turnover += 1
      if (row.employees !== null) entry.employees += 1
      years.set(row.year, entry)
    }
  }
  const indicatorYears = (family) =>
    tally(members.flatMap((member) => member.observations.filter((observation) => observation.sourceFamily === family).map((observation) => observation.observedYear)))
      .map(([year, enterprises]) => ({ year, enterprises }))
      .sort((a, b) => a.year - b.year)

  const fixture = {
    generatedAt: new Date().toISOString(),
    api: API,
    sources: sources.map((source) => ({
      family: source.family,
      laneStatus: source.laneStatus,
      sourceUrl: source.sourceUrl,
      observedAt: source.observedAt,
      sourceLastModifiedAt: source.sourceLastModifiedAt,
    })),
    members: { anchors: anchors.length, current: current.length, historical: anchors.length - current.length },
    families: {
      s1001: members.filter((member) => member.families.includes('s1001')).length,
      amepipCompanyYear: members.filter((member) => member.families.includes('amepip_company_year')).length,
      amepipForm: members.filter((member) => member.families.includes('amepip_form_group')).length,
      jsonApt: members.filter((member) => member.families.includes('json_apt')).length,
    },
    control: {
      central: members.filter((member) => member.level === 'central').length,
      local: members.filter((member) => member.level === 'local').length,
      noS1001: members.filter((member) => member.level === null).length,
      noEdge: members.filter((member) => member.edges.length === 0).length,
      authorities: authorities.size,
      s1001Authorities: authorityRows.length,
      s1001AuthoritiesWithBudget: authorityRows.filter((row) => row.hasBudget).length,
      disagreements: members.filter((member) => {
        const s1001 = new Set(member.edges.filter((edge) => edge.sourceFamily === 's1001').map((edge) => edge.authorityCui))
        const jsonApt = new Set(member.edges.filter((edge) => edge.sourceFamily === 'json_apt').map((edge) => edge.authorityCui))
        return s1001.size > 0 && jsonApt.size > 0 && [...jsonApt].some((cui) => !s1001.has(cui))
      }).length,
      kinds: tally(members.filter((member) => member.authorityKind).map((member) => member.authorityKind)).map(([kind, enterprises]) => ({ kind, enterprises })),
      ranking: {
        central: ranked('central', ['central_authority', 'public_entity', 'education', 'unresolved']),
        county: ranked('local', ['county']),
        local: ranked('local', ['municipality', 'town', 'commune', 'sector', 'unresolved']),
      },
    },
    status: {
      s1001: tally(members.map((member) => member.s1001Status)).map(([status, enterprises]) => ({ status, enterprises })),
      onrc: tally(members.map((member) => member.company?.headlineStatus?.label ?? null)).map(([status, enterprises]) => ({ status, enterprises })),
      anafInactive: members.filter((member) => member.company?.fiscal?.declaredFiscallyInactive === true).length,
      /** Where the sources disagree: deregistered at ONRC, or fiscally inactive at ANAF, yet ACTIV on ANAF's S1001 list. */
      crossings: {
        radiatedButS1001Active: members.filter((member) => member.company?.headlineStatus?.label === 'radiată' && member.s1001Status === 'ACTIV').length,
        radiatedOnS1001: members.filter((member) => member.company?.headlineStatus?.label === 'radiată' && member.s1001Status !== null).length,
        fiscallyInactiveButS1001Active: members.filter((member) => member.company?.fiscal?.declaredFiscallyInactive === true && member.s1001Status === 'ACTIV').length,
      },
      amepip: tally(members.filter((member) => member.amepipStatus?.year === FINANCIAL_YEAR).map((member) => member.amepipStatus.raw)).map(([status, enterprises]) => ({ status, enterprises })),
    },
    legalForms: tally(members.map((member) => member.company?.legalForm ?? null)).map(([form, enterprises]) => ({ form, enterprises })),
    counties: split((member) => member.company?.territory?.countyName ?? null).map(({ key, ...row }) => ({ county: key, ...row })),
    sectors: split((member) => member.company?.fiscal?.mainCaenCode?.slice(0, 2) ?? null).map(({ key, ...row }) => ({ division: key, ...row })),
    financials: {
      year: FINANCIAL_YEAR,
      withAny: members.filter((member) => (member.financials?.years ?? []).length > 0).length,
      years: [...years.values()].sort((a, b) => a.year - b.year),
      filed: withYear.length,
      profit: withYear.filter(({ row }) => positive(row.netProfit)).length,
      loss: withYear.filter(({ row }) => positive(row.netLoss)).length,
      implausibleEmployees: implausible.map(({ member, row }) => ({ cui: member.cui, name: member.name, employees: row.employees })),
      largest: {
        turnover: withYear.filter(({ row }) => positive(row.turnover)).sort((a, b) => Number(b.row.turnover) - Number(a.row.turnover)).slice(0, RANKED).map(({ member, row }) => enterpriseRow(member, row.turnover)),
        employees: withYear
          .filter(({ row }) => positive(row.employees) && Number(row.employees) <= MAX_PLAUSIBLE_EMPLOYEES)
          .sort((a, b) => Number(b.row.employees) - Number(a.row.employees))
          .slice(0, RANKED)
          .map(({ member, row }) => enterpriseRow(member, row.employees)),
        loss: withYear.filter(({ row }) => positive(row.netLoss)).sort((a, b) => Number(b.row.netLoss) - Number(a.row.netLoss)).slice(0, RANKED).map(({ member, row }) => enterpriseRow(member, row.netLoss)),
      },
    },
    procurement: {
      from: SEAP_SPAN.from,
      to: SEAP_SPAN.to,
      buyers: members.filter((member) => (member.procurement?.buyerDirect ?? 0) + (member.procurement?.buyerAwards ?? 0) > 0).length,
      buyerDirect: members.filter((member) => (member.procurement?.buyerDirect ?? 0) > 0).length,
      buyerAwards: members.filter((member) => (member.procurement?.buyerAwards ?? 0) > 0).length,
      sellers: members.filter((member) => (member.procurement?.supplierDirect ?? 0) > 0).length,
    },
    indicators: { calculated: indicatorYears('amepip_company_year'), form: indicatorYears('amepip_form_group') },
  }
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, `${JSON.stringify(fixture, null, 1)}\n`)
  console.log(`wrote ${out}: ${fixture.members.current} members, ${authorityRows.length} authorities, ${fixture.counties.length} counties, ${fixture.sectors.length} divisions`)
}

await main()
