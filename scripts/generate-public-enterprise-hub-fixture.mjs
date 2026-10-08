#!/usr/bin/env node
/**
 * Regenerates the public-enterprise hub's figures, computed from the deployed
 * dev API: `src/features/public-enterprises/lib/hub-snapshot.ts` (the page at
 * `/public-enterprises`), `src/features/public-enterprises/lib/portfolio-snapshot.json`
 * (every authority's enterprises, row by row, for `/public-enterprises/authorities/$cui`;
 * read on the server only) with its index `…/lib/portfolio-index.ts` (the snapshot's
 * version and the authorities that have a page, for the browser),
 * `src/development/prototypes/public-companies/hub.fixture.json`
 * (the hub's prototype) and `…/portfolio.fixture.json` (the portfolio prototype's
 * fourteen sampled authorities).
 * The public-enterprise module serves a list and a profile
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
 * `--cache <dir>` keeps each read as JSON and reuses it on the next run; the
 * figures are then dated by the cache's first read, not by the run.
 * Money stays exact decimal text; a missing value stays null, never zero.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

import { admittedNet, admittedValue, assessed } from '../src/features/public-enterprises/lib/financial-admission.ts'

const { values } = parseArgs({
  options: {
    api: { type: 'string', default: 'https://dev-chronos-api.transparenta.eu/api/v1/graphql' },
    cache: { type: 'string' },
  },
})
const API = values.api
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const prototypeOut = resolve(root, 'src/development/prototypes/public-companies/hub.fixture.json')
const snapshotOut = resolve(root, 'src/features/public-enterprises/lib/hub-snapshot.ts')
const portfolioOut = resolve(root, 'src/development/prototypes/public-companies/portfolio.fixture.json')
const portfolioSnapshotOut = resolve(root, 'src/features/public-enterprises/lib/portfolio-snapshot.json')
const portfolioIndexOut = resolve(root, 'src/features/public-enterprises/lib/portfolio-index.ts')
const CONCURRENCY = 6
/** The last complete financial year: 2025 is still being filed. */
const FINANCIAL_YEAR = 2024
const SEAP_SPAN = { from: '2019-01', to: '2026-12' }
const RANKED = 20
/** The head ranks at most ten authorities a group. */
const AUTHORITY_RANKED = 10
/**
 * The company read's cache file, named for the query that wrote it: bump it
 * whenever `readCompany` asks for more, so a cache from an older query is
 * never read as if it held the new fields (qualification, publisher).
 */
const COMPANY_CACHE = 'companies-v3.json'
/** A headcount past this is a data error (EXIM 25252500 reports 92,149,177 for 2024), kept out of the ranking and named. */
const MAX_PLAUSIBLE_EMPLOYEES = 200_000
/**
 * The authorities the portfolio prototype samples (design note §12.8): the
 * largest, one of each kind, and the cases a page must say apart — no budget
 * record (ADS), named only by AMEPIP's announcements (two ADIs), a list that
 * drops the sector's number (Sector 3), two spellings (Borș), enterprises
 * only the announcements put under it (Hunedoara, Bucharest).
 */
const PORTFOLIO_SAMPLES = [
  '11795573', // AAAS
  '43507695', // Ministerul Energiei
  '24931499', // Ministerul Economiei
  '13729380', // Ministerul Educației
  '14818116', // Agenția Domeniilor Statului
  '4267117', // Consiliul General al Municipiului București
  '4283481', // Consiliul Local Voluntari
  '4288110', // Consiliul Județean Cluj
  '4374474', // Consiliul Județean Hunedoara
  '4270740', // Consiliul Local Sibiu
  '4420465', // Consiliul Local al Sectorului 3
  '4390526', // Consiliul Local Borș
  '38474532', // ADI Transport Public București-Ilfov
  '45699112', // ADI Transport Metropolitan Sibiu
]

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
      companyFinancials(cui: $cui) { years { year sourceSystem turnover netProfit netLoss employees qualification { assessment evaluatorVersion metrics { metric status } netResultStatus netResult } } }
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

/** The JSON-APT blob writes some names with HTML entities (`&quot;`): text, not markup. */
const decodeEntities = (text) =>
  text.replace(/&(quot|amp|apos|#39|lt|gt);/gu, (_, entity) => ({ quot: '"', amp: '&', apos: "'", '#39': "'", lt: '<', gt: '>' })[entity])

const mostFrequent = (names) => [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null

/**
 * An authority's display name, and where it came from: ANAF's list's own
 * words, its most frequent spelling (it names the council that controls,
 * „CONSILIUL JUDETEAN VALCEA"; the budget record names the territory,
 * „JUDETUL VALCEA"). Only where the list gave no name: the AMEPIP
 * announcements' spelling, else the budget record's name; the source is kept,
 * so the page can say a name is not the list's.
 */
function authorityName(entity, s1001Names, otherNames) {
  const listed = mostFrequent(s1001Names)
  if (listed) return { name: listed, nameSource: 's1001' }
  const announced = mostFrequent(otherNames)
  if (announced) return { name: decodeEntities(announced), nameSource: 'json_apt' }
  const own = entity?.organization?.name
  return own && !/^\d+$/.test(own) ? { name: own, nameSource: 'budget' } : { name: null, nameSource: null }
}

const mainS1001Edge = (profile) => profile.authorityEdges.find((edge) => edge.sourceFamily === 's1001') ?? null
const yearRow = (company, year) => (company?.financials?.years ?? []).find((row) => row.year === year) ?? null
const positive = (decimal) => decimal !== null && decimal !== undefined && Number(decimal) > 0

/** When the figures were read: the run, or the cache's first read when the run reuses one. */
function readAt() {
  const anchors = values.cache ? resolve(values.cache, 'anchors.json') : null
  return (anchors && existsSync(anchors) ? statSync(anchors).mtime : new Date()).toISOString()
}

const latestAmepip = (observations) =>
  observations.filter((observation) => observation.sourceFamily === 'amepip_company_year' && observation.observedYear !== null).sort((a, b) => b.observedYear - a.observedYear)[0] ?? null

async function main() {
  const generatedAt = readAt()
  const anchors = await cached('anchors.json', readAnchors)
  const sources = await cached('sources.json', async () => (await gql('{ publicEnterpriseSources { family laneStatus snapshotId rawStatus sourceUrl observedAt sourceLastModifiedAt acceptedAt } }')).publicEnterpriseSources)
  const cuis = anchors.map((anchor) => anchor.cui)
  const profiles = await cached('profiles.json', () => pool(cuis, readProfile))
  const authorityCuis = [...new Set(profiles.flatMap((profile) => (profile.authorityEdges ?? []).map((edge) => edge.authorityCui)).filter(Boolean))]
  const entities = await cached('authorities.json', () => readAuthorities(authorityCuis))
  const companies = await cached(COMPANY_CACHE, () => pool(cuis, readCompany))
  const current = anchors.filter((anchor) => anchor.isCurrentMember)
  const procurement = await cached('procurement.json', () => readProcurement(current.map((anchor) => anchor.cui)))

  const profileOf = new Map(profiles.map((profile) => [profile.cui, profile]))
  const companyOf = new Map(companies.map((entry) => [entry.cui, entry]))
  const members = current.map((anchor) => {
    const profile = profileOf.get(anchor.cui)
    const entry = companyOf.get(anchor.cui)
    const edge = mainS1001Edge(profile)
    const s1001 = profile.registryObservations.find((observation) => observation.sourceFamily === 's1001') ?? null
    // The financial year's own row: a later year's row says nothing of this one.
    const amepip = profile.registryObservations.find((observation) => observation.sourceFamily === 'amepip_company_year' && observation.observedYear === FINANCIAL_YEAR) ?? null
    return {
      cui: anchor.cui,
      name: entry?.company?.name ?? anchor.organization?.name ?? null,
      families: anchor.currentFamilies,
      level: edge?.authorityLevel ?? null,
      authorityCui: edge?.authorityCui ?? null,
      authorityKind: edge ? authorityKind(entities[edge.authorityCui]) : null,
      edges: profile.authorityEdges,
      listed: s1001 !== null,
      s1001Status: s1001?.statusRaw ?? null,
      amepipStatus: amepip ? { year: amepip.observedYear, raw: amepip.statusRaw, normalized: amepip.statusNormalized } : null,
      company: entry?.company ?? null,
      financials: entry?.financials ?? null,
      observations: profile.registryObservations,
      procurement: procurement[anchor.cui] ?? null,
    }
  })

  const memberOf = new Map(members.map((member) => [member.cui, member]))

  // Who controls them: one row per authority CUI, by the S1001 edges of current members.
  const authorities = new Map()
  for (const member of members) {
    for (const edge of member.edges) {
      const row = authorities.get(edge.authorityCui) ?? { cui: edge.authorityCui, s1001Names: new Map(), otherNames: new Map(), s1001: new Set(), jsonApt: new Set(), levels: new Set() }
      const names = edge.sourceFamily === 's1001' ? row.s1001Names : row.otherNames
      if (edge.authorityName) names.set(edge.authorityName, (names.get(edge.authorityName) ?? 0) + 1)
      ;(edge.sourceFamily === 's1001' ? row.s1001 : row.jsonApt).add(member.cui)
      if (edge.sourceFamily === 's1001') row.levels.add(edge.authorityLevel)
      authorities.set(edge.authorityCui, row)
    }
  }
  const authorityRows = [...authorities.values()]
    .filter((row) => row.s1001.size > 0)
    .map((row) => {
      const entity = entities[row.cui]
      const enterprises = [...row.s1001]
      return {
        cui: row.cui,
        ...authorityName(entity, row.s1001Names, row.otherNames),
        level: [...row.levels][0] ?? null,
        kind: authorityKind(entity),
        county: entity?.territory?.countyName ?? null,
        hasBudget: entity?.budget?.presence === true,
        enterprises: enterprises.length,
        inactive: enterprises.filter((cui) => memberOf.get(cui)?.s1001Status === 'INACTIV').length,
      }
    })
    .sort((a, b) => b.enterprises - a.enterprises || a.cui.localeCompare(b.cui))

  const ranked = (level, kinds) => authorityRows.filter((row) => row.level === level && kinds.includes(row.kind)).slice(0, AUTHORITY_RANKED)
  const authorityOf = new Map(authorityRows.map((row) => [row.cui, row]))
  const enterpriseRow = (member, value) => {
    const authority = member.authorityCui ? authorityOf.get(member.authorityCui) : undefined
    return {
      cui: member.cui,
      name: member.name,
      value,
      level: member.level,
      authority: authority?.name ?? null,
      authorityNameSource: authority?.nameSource ?? null,
      county: member.company?.territory?.countyName ?? null,
    }
  }
  const withYear = members.map((member) => ({ member, row: yearRow(member, FINANCIAL_YEAR) })).filter(({ row }) => row)
  const qualified = withYear.map(({ member, row }) => ({
    member,
    sourceSystem: row.sourceSystem ?? null,
    turnover: admittedValue(row, 'turnover'),
    employees: admittedValue(row, 'employees'),
    net: admittedNet(row),
  }))
  const implausible = qualified.filter(({ employees }) => employees !== null && Number(employees) > MAX_PLAUSIBLE_EMPLOYEES)
  const withNet = qualified.filter(({ net }) => net !== null)

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
    generatedAt,
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
      // By the authority's kind and ANAF's level together: an authority with no budget record is central or local by the list's word.
      kinds: tally(members.filter((member) => member.authorityKind).map((member) => `${member.authorityKind}|${member.level}`)).map(([key, enterprises]) => {
        const [kind, level] = key.split('|')
        return { kind, level, enterprises }
      }),
      ranking: {
        central: ranked('central', ['central_authority', 'public_entity', 'education', 'unresolved']),
        county: ranked('local', ['county']),
        local: ranked('local', ['municipality', 'town', 'commune', 'sector', 'unresolved']),
      },
    },
    status: {
      s1001: tally(members.filter((member) => member.listed).map((member) => member.s1001Status)).map(([status, enterprises]) => ({ status, enterprises })),
      onrc: tally(members.filter((member) => member.company).map((member) => member.company.headlineStatus?.label ?? null)).map(([status, enterprises]) => ({ status, enterprises })),
      /** Members with no company record at all: apart from a record whose status is uncertain (null in `onrc`). */
      onrcMissing: members.filter((member) => !member.company).length,
      /** Members ANAF's list does not hold: apart from a listed member whose status cell is blank (null in `s1001`). */
      s1001NotListed: members.filter((member) => !member.listed).length,
      anafInactive: members.filter((member) => member.company?.fiscal?.declaredFiscallyInactive === true).length,
      /** Where the sources disagree: deregistered at ONRC, or fiscally inactive at ANAF, yet ACTIV on ANAF's S1001 list. */
      crossings: {
        radiatedButS1001Active: members.filter((member) => member.company?.headlineStatus?.label === 'radiată' && member.s1001Status === 'ACTIV').length,
        radiatedOnS1001: members.filter((member) => member.company?.headlineStatus?.label === 'radiată' && member.listed).length,
        fiscallyInactiveButS1001Active: members.filter((member) => member.company?.fiscal?.declaredFiscallyInactive === true && member.s1001Status === 'ACTIV').length,
      },
      amepip: tally(members.filter((member) => member.amepipStatus).map((member) => member.amepipStatus.raw)).map(([status, enterprises]) => ({ status, enterprises })),
      /** Members with no AMEPIP company-year row for the financial year: no observation, not a blank status. */
      amepipMissing: members.filter((member) => !member.amepipStatus).length,
    },
    legalForms: tally(members.map((member) => member.company?.legalForm ?? null)).map(([form, enterprises]) => ({ form, enterprises })),
    counties: split((member) => member.company?.territory?.countyName ?? null).map(({ key, ...row }) => ({ county: key, ...row })),
    sectors: split((member) => member.company?.fiscal?.mainCaenCode?.slice(0, 2) ?? null).map(({ key, ...row }) => ({ division: key, ...row })),
    financials: {
      year: FINANCIAL_YEAR,
      withAny: members.filter((member) => (member.financials?.years ?? []).length > 0).length,
      years: [...years.values()].sort((a, b) => a.year - b.year),
      /** Members with a statement for the year, admitted or not. */
      filed: withYear.length,
      /** Who published the year's statements (`anaf`, `mfp`): the page names its publisher from this, never assumes it. */
      publishers: [...new Set(qualified.map(({ sourceSystem }) => sourceSystem).filter(Boolean))].sort(),
      /** Statements already filed for the year after: a count, not a claim of completeness. */
      nextYearFiled: members.filter((member) => yearRow(member, FINANCIAL_YEAR + 1)).length,
      /** Of those, the statements whose net result the evaluator reported: the base of `profit` and `loss`. */
      netReported: withNet.length,
      profit: withNet.filter(({ net }) => Number(net) > 0).length,
      loss: withNet.filter(({ net }) => Number(net) < 0).length,
      implausibleEmployees: implausible.map(({ member, employees }) => ({ cui: member.cui, name: member.name, employees })),
      largest: {
        turnover: qualified.filter(({ turnover }) => positive(turnover)).sort((a, b) => Number(b.turnover) - Number(a.turnover)).slice(0, RANKED).map(({ member, turnover }) => enterpriseRow(member, turnover)),
        employees: qualified
          .filter(({ employees }) => positive(employees) && Number(employees) <= MAX_PLAUSIBLE_EMPLOYEES)
          .sort((a, b) => Number(b.employees) - Number(a.employees))
          .slice(0, RANKED)
          .map(({ member, employees }) => enterpriseRow(member, employees)),
        // The loss is the reported net result's size, exact text without its sign.
        loss: withNet.filter(({ net }) => Number(net) < 0).sort((a, b) => Number(a.net) - Number(b.net)).slice(0, RANKED).map(({ member, net }) => enterpriseRow(member, net.replace(/^-/u, ''))),
      },
    },
    // A count SEAP did not answer (null, or a CUI too long to ask) is unknown, never a zero: the figures are floors and say how many are unknown.
    procurement: {
      from: SEAP_SPAN.from,
      to: SEAP_SPAN.to,
      buyers: members.filter((member) => (member.procurement?.buyerDirect ?? 0) > 0 || (member.procurement?.buyerAwards ?? 0) > 0).length,
      buyerDirect: members.filter((member) => (member.procurement?.buyerDirect ?? 0) > 0).length,
      buyerAwards: members.filter((member) => (member.procurement?.buyerAwards ?? 0) > 0).length,
      sellers: members.filter((member) => (member.procurement?.supplierDirect ?? 0) > 0).length,
      unknown: members.filter((member) => !member.procurement || member.procurement.buyerDirect === null || member.procurement.buyerAwards === null || member.procurement.supplierDirect === null).length,
    },
    indicators: { calculated: indicatorYears('amepip_company_year'), form: indicatorYears('amepip_form_group') },
  }
  mkdirSync(dirname(prototypeOut), { recursive: true })
  writeFileSync(prototypeOut, `${JSON.stringify(fixture, null, 1)}\n`)
  // The page's chunk carries only what the page reads; the prototype's fixture keeps the rest.
  const { control, status, financials } = fixture
  const snapshot = {
    generatedAt: fixture.generatedAt,
    sources: fixture.sources,
    members: fixture.members,
    control: {
      central: control.central,
      local: control.local,
      noS1001: control.noS1001,
      s1001Authorities: control.s1001Authorities,
      s1001AuthoritiesWithBudget: control.s1001AuthoritiesWithBudget,
      disagreements: control.disagreements,
      kinds: control.kinds,
      ranking: Object.fromEntries(Object.entries(control.ranking).map(([group, rows]) => [group, rows.map(({ kind: _kind, ...row }) => row)])),
    },
    status: {
      s1001: status.s1001,
      s1001NotListed: status.s1001NotListed,
      onrc: status.onrc,
      onrcMissing: status.onrcMissing,
      anafInactive: status.anafInactive,
      crossings: { radiatedButS1001Active: status.crossings.radiatedButS1001Active, fiscallyInactiveButS1001Active: status.crossings.fiscallyInactiveButS1001Active },
      amepip: status.amepip,
      amepipMissing: status.amepipMissing,
    },
    counties: fixture.counties,
    sectors: fixture.sectors,
    financials: {
      year: financials.year,
      filed: financials.filed,
      publishers: financials.publishers,
      nextYearFiled: financials.nextYearFiled,
      netReported: financials.netReported,
      loss: financials.loss,
      implausibleEmployees: financials.implausibleEmployees,
      largest: Object.fromEntries(
        Object.entries(financials.largest).map(([measure, rows]) => [measure, rows.map(({ cui, name, value, authority, authorityNameSource }) => ({ cui, name, value, authority, authorityNameSource }))]),
      ),
    },
    procurement: fixture.procurement,
  }
  writeFileSync(
    snapshotOut,
    [
      '// Generated by scripts/generate-public-enterprise-hub-fixture.mjs — do not edit by hand.',
      `// Read from the public-enterprise, entity, company and procurement API on ${fixture.generatedAt.slice(0, 10)}.`,
      "import type { PublicEnterpriseHubSnapshot } from './hub-snapshot-types'",
      '',
      `export const PUBLIC_ENTERPRISE_HUB_SNAPSHOT: PublicEnterpriseHubSnapshot = ${JSON.stringify(snapshot, null, 2)}`,
      '',
    ].join('\n'),
  )

  // The portfolio prototype: each sampled authority with the enterprises each source puts under it, and those
  // enterprises row by row — each source's status apart, the financial year's admitted figures, SEAP counts.
  /** Why a statement's value is or is not on the page, in the evaluator's words (lower case): `reported`, `missing`, `held_profile`, …, or `unassessed`. */
  const metricStatus = (row, metric) => {
    if (!row) return null
    if (!assessed(row)) return 'unassessed'
    const raw = metric === 'net_result' ? row.qualification.netResultStatus : row.qualification.metrics.find((entry) => entry.metric === metric)?.status
    return raw?.toLowerCase() ?? null
  }
  const portfolioEnterprise = (member) => {
    const row = yearRow(member, FINANCIAL_YEAR)
    const employees = row ? admittedValue(row, 'employees') : null
    const implausible = employees !== null && Number(employees) > MAX_PLAUSIBLE_EMPLOYEES
    const amepip = latestAmepip(member.observations)
    const filedYears = (member.financials?.years ?? []).map((statement) => statement.year)
    return {
      cui: member.cui,
      // A source that knows no name answers with the CUI itself: that is no name.
      name: member.name && !/^\d+$/u.test(member.name.trim()) ? member.name : null,
      legalForm: member.company?.legalForm ?? null,
      county: member.company?.territory?.countyName ?? null,
      caen: member.company?.fiscal?.mainCaenCode ?? null,
      /** Null: not in ANAF's list; a null status: listed with a blank status cell. */
      s1001: member.listed ? { status: member.s1001Status } : null,
      /** AMEPIP's newest company-year row, in its own words. */
      amepip: amepip ? { year: amepip.observedYear, status: amepip.statusRaw } : null,
      /** Null: no company record; a null code: the registry's evidence conflicts or is partial. */
      registry: member.company ? { code: member.company.headlineStatus?.code ?? null, label: member.company.headlineStatus?.label ?? null } : null,
      fiscallyInactive: member.company?.fiscal?.declaredFiscallyInactive ?? null,
      edges: member.edges.map((edge) => ({ source: edge.sourceFamily, cui: edge.authorityCui, name: edge.authorityName ? decodeEntities(edge.authorityName) : null })),
      financials: {
        filed: row !== null,
        turnover: row ? admittedValue(row, 'turnover') : null,
        employees: implausible ? null : employees,
        implausibleEmployees: implausible ? employees : null,
        net: row ? admittedNet(row) : null,
        newestYear: filedYears.length > 0 ? Math.max(...filedYears) : null,
        statuses: { turnover: metricStatus(row, 'turnover'), employees: metricStatus(row, 'employees'), net: metricStatus(row, 'net_result') },
      },
      seap: member.procurement,
    }
  }
  const portfolioAuthority = (cui) => {
    const row = authorities.get(cui)
    const entity = entities[cui]
    const own = entity?.organization?.name ?? null
    return {
      cui,
      ...authorityName(entity, row.s1001Names, row.otherNames),
      spellings: { s1001: [...row.s1001Names.keys()], json_apt: [...row.otherNames.keys()].map(decodeEntities) },
      /** The budget record's own name: it names the territory („JUDETUL CLUJ"), not the council. */
      budgetName: own && !/^\d+$/u.test(own) ? own : null,
      level: [...row.levels][0] ?? null,
      kind: authorityKind(entity),
      county: entity?.territory?.countyName ?? null,
      hasBudget: entity?.budget?.presence === true,
      s1001: [...row.s1001].sort(),
      jsonApt: [...row.jsonApt].sort(),
    }
  }
  const portfolioHead = { generatedAt, financialYear: FINANCIAL_YEAR, seapSpan: SEAP_SPAN, sources: fixture.sources }
  const enterprisesOf = (rows) =>
    Object.fromEntries([...new Set(rows.flatMap((authority) => [...authority.s1001, ...authority.jsonApt]))].sort().map((cui) => [cui, portfolioEnterprise(memberOf.get(cui))]))
  // One line per authority and per enterprise: small, and a regeneration diffs row by row.
  const lines = (entries) => entries.map((entry) => `  ${entry}`).join(',\n')
  const keyed = (rows) => lines(Object.entries(rows).map(([cui, row]) => `${JSON.stringify(cui)}: ${JSON.stringify(row)}`))
  const head = `${JSON.stringify(portfolioHead).slice(0, -1)},\n`
  // The prototype: the sampled authorities, in the picker's order.
  const sampled = PORTFOLIO_SAMPLES.filter((cui) => authorities.has(cui)).map(portfolioAuthority)
  const sampledEnterprises = enterprisesOf(sampled)
  writeFileSync(portfolioOut, `${head} "authorities": [\n${lines(sampled.map((row) => JSON.stringify(row)))}\n ],\n "enterprises": {\n${keyed(sampledEnterprises)}\n }\n}\n`)
  console.log(`wrote ${portfolioOut}: ${sampled.length} authorities, ${Object.keys(sampledEnterprises).length} enterprises`)
  // The page: every authority a current member's edge names, keyed by CUI, and every enterprise under one.
  const every = [...authorities.keys()].sort().map(portfolioAuthority)
  const uncanonical = every.filter((authority) => !/^[1-9]\d{1,9}$/u.test(authority.cui)).map((authority) => authority.cui)
  if (uncanonical.length > 0) console.warn(`authorities whose CUI the page's address cannot take: ${uncanonical.join(', ')}`)
  const everyEnterprise = enterprisesOf(every)
  const snapshotText = `${head} "authorities": {\n${keyed(Object.fromEntries(every.map((row) => [row.cui, row])))}\n },\n "enterprises": {\n${keyed(everyEnterprise)}\n }\n}\n`
  writeFileSync(portfolioSnapshotOut, snapshotText)
  // The version is the snapshot's content: a regeneration that changes a byte changes it, whatever its read date.
  const snapshotVersion = createHash('sha256').update(snapshotText).digest('hex').slice(0, 12)
  console.log(`wrote ${portfolioSnapshotOut}: ${every.length} authorities, ${Object.keys(everyEnterprise).length} enterprises`)
  // What the browser may know of the snapshot without loading it: its version (the JSON address carries it, so a cached copy of
  // another snapshot is never read) and the authorities with a page (a link to any other would answer 404).
  writeFileSync(
    portfolioIndexOut,
    [
      '// Generated by scripts/generate-public-enterprise-hub-fixture.mjs — do not edit by hand.',
      `// The index of \`portfolio-snapshot.json\`, read from the API on ${generatedAt.slice(0, 10)}.`,
      '',
      '/** The snapshot\'s content (its sha256, cut to 12): the version a portfolio\'s JSON address carries and its server checks. */',
      `export const PORTFOLIO_SNAPSHOT_VERSION = ${JSON.stringify(snapshotVersion)}`,
      '',
      '/** Every authority the snapshot holds a portfolio for: a link to any other would answer 404. */',
      `export const PORTFOLIO_AUTHORITY_CUIS: ReadonlySet<string> = new Set(${JSON.stringify(every.map((row) => row.cui).join(' '))}.split(' '))`,
      '',
    ].join('\n'),
  )
  console.log(`wrote ${snapshotOut} and ${prototypeOut}: ${fixture.members.current} members, ${authorityRows.length} authorities, ${fixture.counties.length} counties, ${fixture.sectors.length} divisions`)
}

await main()
