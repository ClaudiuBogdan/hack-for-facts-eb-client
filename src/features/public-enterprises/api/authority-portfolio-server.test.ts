import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { portfolioSnapshotSchema } from '@/schemas/public-enterprise-portfolio'
import { PUBLIC_ENTERPRISE_HUB_SNAPSHOT } from '../lib/hub-snapshot'
import { PORTFOLIO_AUTHORITY_CUIS, PORTFOLIO_SNAPSHOT_VERSION } from '../lib/portfolio-index'
import snapshot from '../lib/portfolio-snapshot.json'
import { readAuthorityPortfolio } from './authority-portfolio-server'

describe('the authority portfolio’s server read', () => {
  it('holds the generated snapshot to its schema: every authority’s enterprises are in it, every CUI one an address takes', () => {
    const parsed = portfolioSnapshotSchema.parse(snapshot)
    const authorities = Object.values(parsed.authorities)
    expect(authorities.length).toBeGreaterThan(0)
    for (const authority of authorities) {
      expect(authority.cui).toMatch(/^[1-9]\d{1,9}$/u)
      for (const cui of [...authority.s1001, ...authority.jsonApt]) expect(parsed.enterprises).toHaveProperty([cui])
    }
  })

  it('keeps its index, the hub’s ranking and every authority an edge names in step with it, so no link answers 404', () => {
    const parsed = portfolioSnapshotSchema.parse(snapshot)
    expect([...PORTFOLIO_AUTHORITY_CUIS].sort()).toEqual(Object.keys(parsed.authorities).sort())
    // The version is the snapshot's content, so a regeneration that changes a byte changes it.
    const text = readFileSync(resolve(process.cwd(), 'src/features/public-enterprises/lib/portfolio-snapshot.json'), 'utf8')
    expect(PORTFOLIO_SNAPSHOT_VERSION).toBe(createHash('sha256').update(text).digest('hex').slice(0, 12))
    // The hub's snapshot comes from the same generator run.
    expect(PUBLIC_ENTERPRISE_HUB_SNAPSHOT.generatedAt).toBe(parsed.generatedAt)
    const ranked = Object.values(PUBLIC_ENTERPRISE_HUB_SNAPSHOT.control.ranking).flatMap((rows) => rows.map((row) => row.cui))
    expect(ranked.filter((cui) => !PORTFOLIO_AUTHORITY_CUIS.has(cui))).toEqual([])
    const edges = Object.values(parsed.enterprises).flatMap((enterprise) => enterprise.edges.flatMap((edge) => (edge.cui ? [edge.cui] : [])))
    expect(edges.filter((cui) => !PORTFOLIO_AUTHORITY_CUIS.has(cui))).toEqual([])
  })

  it('cuts one authority’s part: its record and its enterprises, the list’s first, then those only the announcements name', async () => {
    const portfolio = await readAuthorityPortfolio('4374474')
    expect(portfolio?.authority.cui).toBe('4374474')
    const { s1001, jsonApt } = portfolio!.authority
    const listed = new Set(s1001)
    expect(portfolio!.enterprises.map((enterprise) => enterprise.cui)).toEqual([...s1001, ...jsonApt.filter((cui) => !listed.has(cui))])
    expect(portfolio).toMatchObject({ financialYear: 2024, seapSpan: { from: '2019-01', to: '2026-12' } })
  })

  it('answers null for an authority it does not hold, and for a key that is no authority', async () => {
    expect(await readAuthorityPortfolio('99999999')).toBeNull()
    expect(await readAuthorityPortfolio('__proto__')).toBeNull()
    expect(await readAuthorityPortfolio('constructor')).toBeNull()
  })
})

describe('the snapshot’s load', () => {
  it('does not keep a failed load: the next request tries again', async () => {
    vi.resetModules()
    let calls = 0
    vi.doMock('../lib/portfolio-snapshot.json', () => {
      calls += 1
      if (calls === 1) throw new Error('snapshot unreadable')
      return { default: { generatedAt: 'x', financialYear: 2024, seapSpan: { from: '2019-01', to: '2026-12' }, sources: [], authorities: {}, enterprises: {} } }
    })
    const { readAuthorityPortfolio: read } = await import('./authority-portfolio-server')
    await expect(read('4270740')).rejects.toThrow()
    vi.resetModules()
    expect(await read('4270740')).toBeNull()
    vi.doUnmock('../lib/portfolio-snapshot.json')
  })
})
