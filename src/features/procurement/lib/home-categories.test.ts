import { describe, expect, it } from 'vitest'
import {
  categoryOfCode,
  completeContracts,
  cpvLeaves,
  cpvPrefix,
  cpvScope,
  cpvSearch,
  levelCpvLeaves,
  frequentWinners,
  groupContracts,
  readerCategories,
  type ContractRow,
  type CpvBucket,
} from './home-categories'
import { bigContract } from './home.fixture'

const top = (key: string, value: number, count = 1): CpvBucket => ({ key, kind: 'top', value, count })

describe('categoryOfCode', () => {
  it('takes the category with the longest matching prefix', () => {
    expect(categoryOfCode('45233').key).toBe('drumuri')
    expect(categoryOfCode('45233100').key).toBe('drumuri')
    expect(categoryOfCode('4521').key).toBe('cladiri')
    // 45 alone is the remainder of construction work.
    expect(categoryOfCode('4511').key).toBe('constructii')
    // 336 (medicines) is carved out of 33 (medical).
    expect(categoryOfCode('336').key).toBe('medicamente')
    expect(categoryOfCode('331').key).toBe('medical')
    // 797 (guarding) out of 79 (consulting); 302 (computers) out of 30 (office).
    expect(categoryOfCode('797').key).toBe('paza')
    expect(categoryOfCode('302').key).toBe('it')
    expect(categoryOfCode('301').key).toBe('birotica')
  })

  it('files a code no category claims under „Altele"', () => {
    expect(categoryOfCode('92').key).toBe('altele')
  })
})

describe('levelCpvLeaves', () => {
  it('nests each level in its parent, and each keeps what the next level does not hold', () => {
    const { leaves, unknown } = levelCpvLeaves([
      // Divisions: 33 (medical), 45 (works), the rest past the top, the uncoded.
      [top('33000000', 100, 10), top('45000000', 90, 9), { key: null, kind: 'other', value: 7, count: 2 }, { key: null, kind: 'unknown', value: 3, count: 1 }],
      // Groups: medicines (336) and medical equipment (331) under 33; building works (452) under 45.
      [top('33600000', 40, 4), top('33100000', 50, 5), top('45200000', 90, 9)],
      // Classes: 4521 (buildings) and 4523 (roads) under 452; nothing under 336 or 331.
      [top('45210000', 30, 3), top('45230000', 60, 6)],
      // Categories: 45233 (roads) under 4523; the class keeps 10 coded at its own level.
      [top('45233000', 50, 5), { key: null, kind: 'unknown', value: 40, count: 4 }],
    ])
    expect(leaves).toEqual([
      { prefix: '336', value: 40, count: 4 },
      { prefix: '331', value: 50, count: 5 },
      { prefix: '33', value: 10, count: 1 },
      { prefix: '4521', value: 30, count: 3 },
      { prefix: '45233', value: 50, count: 5 },
      { prefix: '4523', value: 10, count: 1 },
      { prefix: '', value: 7, count: 2 },
    ])
    expect(unknown).toEqual({ prefix: '', value: 3, count: 1 })
    // A works contract filed under 45210000 is a building, medicines under 33600000 are medicines.
    expect(readerCategories(leaves, unknown).map((row) => [row.category.key, row.value])).toEqual([
      ['medical', 60],
      ['drumuri', 50],
      ['medicamente', 40],
      ['cladiri', 30],
      ['constructii', 10],
      ['altele', 7],
      ['necunoscut', 3],
    ])
  })

  it('keeps a remainder with no valued record unknown, never 0 lei', () => {
    // 90 is all in the listed 45233; the division's other 2 records carry no value.
    const { leaves } = levelCpvLeaves([
      [{ key: '45000000', kind: 'top', value: 90, count: 5, valued: 3 }],
      [{ key: '45233000', kind: 'top', value: 90, count: 3, valued: 3 }],
    ])
    expect(leaves).toEqual([
      { prefix: '45233', value: 90, count: 3 },
      { prefix: '45', value: null, count: 2 },
    ])
  })

  it('keeps a remainder unknown when its parent’s money is', () => {
    const { leaves } = levelCpvLeaves([[{ key: '45000000', kind: 'top', value: null, count: 5 }], [top('45200000', 40, 2)]])
    expect(leaves).toEqual([
      { prefix: '452', value: 40, count: 2 },
      { prefix: '45', value: null, count: 3 },
    ])
  })
})

describe('CPV helpers', () => {
  it('strips a code to its prefix, keeping a division two digits', () => {
    expect(cpvPrefix('45233000')).toBe('45233')
    expect(cpvPrefix('45000000')).toBe('45')
    expect(cpvPrefix('09')).toBe('09')
    expect(cpvPrefix('03000000')).toBe('03')
  })

  it('selects a prefix at its own level', () => {
    expect(cpvScope('45')).toEqual({ cpvDivision: '45' })
    expect(cpvScope('336')).toEqual({ cpvGroup: '33600000' })
    expect(cpvScope('4521')).toEqual({ cpvClass: '45210000' })
    expect(cpvScope('45233')).toEqual({ cpvCategory: '45233000' })
    expect(cpvSearch('45233')).toEqual({ cpv_category: '45233000' })
  })
})

describe('cpvLeaves and readerCategories', () => {
  it('refines divisions into their children and sums them into categories that add up', () => {
    const divisions = [top('45', 100, 10), top('33', 40, 20), top('92', 5, 1), { key: null, kind: 'unknown', value: 3, count: 2 }]
    const refinements = new Map<string, readonly CpvBucket[]>([
      ['c45', [top('45230000', 70, 6), top('45210000', 20, 3), { key: null, kind: 'other', value: 10, count: 1 }]],
      ['k4523', [top('45233000', 60, 5), top('45234000', 10, 1)]],
      ['g33', [top('33600000', 30, 15), top('33100000', 10, 5)]],
    ])
    const { leaves, unknown } = cpvLeaves(divisions, refinements)
    expect(unknown).toEqual({ prefix: '', value: 3, count: 2 })
    const sum = leaves.reduce((total, leaf) => total + (leaf.value ?? 0), 0) + (unknown?.value ?? 0)
    expect(sum).toBe(148)

    const categories = readerCategories(leaves, unknown)
    const byKey = Object.fromEntries(categories.map((entry) => [entry.category.key, entry]))
    expect(byKey.drumuri?.value).toBe(60)
    expect(byKey['cai-ferate']?.value).toBe(10)
    expect(byKey.cladiri?.value).toBe(20)
    // The rest of 45 past its top classes stays with 45.
    expect(byKey.constructii?.value).toBe(10)
    expect(byKey.medicamente?.value).toBe(30)
    expect(byKey.medical?.value).toBe(10)
    expect(categories.reduce((total, entry) => total + (entry.share ?? 0), 0)).toBeCloseTo(1)
    // Largest first; the remainder and the uncoded last.
    expect(categories[0]?.category.key).toBe('drumuri')
    expect(categories.slice(-2).map((entry) => entry.category.key)).toEqual(['altele', 'necunoscut'])
  })

  it('keeps a refinement’s records known only to the parent with the parent', () => {
    const { leaves, unknown } = cpvLeaves([top('45', 50, 5)], new Map([['c45', [top('45210000', 30, 3), { key: null, kind: 'unknown', value: 20, count: 2 }]]]))
    expect(unknown).toBeNull()
    expect(leaves).toContainEqual({ prefix: '45', value: 20, count: 2 })
  })
})

describe('groupContracts', () => {
  const buyer = { cui: '36727850', name: 'CNIR' }
  const row = (id: string, supplier: string, overrides: Partial<ContractRow> = {}): ContractRow => ({
    id,
    contractNo: '101/1888',
    date: '2025-03-31',
    title: null,
    cpvCode: '45233100',
    buyer,
    supplier: { cui: supplier, name: supplier },
    value: 6_143_000_000,
    ...overrides,
  })

  it('makes one contract of a consortium’s rows, names every winner once, and counts its value once', () => {
    const rows = [
      row('1', 'Tehnostrade'),
      row('2', 'Spedition UMB'),
      row('3', 'Euro-Asfalt'),
      // The same award again, from the other source, with the title.
      row('4', 'Euro-Asfalt', { title: 'Autostrada Sibiu – Pitești' }),
      row('5', 'Solo SRL', { contractNo: '7', value: 1_000_000 }),
    ]
    const contracts = groupContracts(rows, 10)
    expect(contracts).toHaveLength(2)
    expect(contracts[0]).toMatchObject({ id: '4', title: 'Autostrada Sibiu – Pitești', value: 6_143_000_000 })
    expect(contracts[0]?.winners.map((winner) => winner.name)).toEqual(['Euro-Asfalt', 'Spedition UMB', 'Tehnostrade'])
    expect(contracts[1]?.winners).toEqual([{ cui: 'Solo SRL', name: 'Solo SRL' }])
  })

  it('keeps a row with no contract number a contract of its own, and stops at the limit', () => {
    const rows = [row('1', 'A', { contractNo: null }), row('2', 'B', { contractNo: null }), row('3', 'C', { contractNo: '9', value: 5 })]
    expect(groupContracts(rows, 10)).toHaveLength(3)
    expect(groupContracts(rows, 2)).toHaveLength(2)
  })
})

describe('frequentWinners', () => {
  it('names the firms that recur, when they recur three times or more', () => {
    const recurring = [{ cui: '1', name: 'Tehnostrade' }]
    const contracts = [
      bigContract({ id: 'a', winners: recurring }),
      bigContract({ id: 'b', winners: recurring }),
      bigContract({ id: 'c', winners: [...recurring, { cui: '2', name: 'Arcada' }] }),
    ]
    expect(frequentWinners(contracts)).toEqual({ names: ['Tehnostrade'], times: 3 })
    expect(frequentWinners(contracts.slice(0, 2))).toBeNull()
  })

  it('says nothing when more than three firms tie', () => {
    const winners = ['A', 'B', 'C', 'D'].map((name, index) => ({ cui: String(index), name }))
    const contracts = [1, 2, 3].map((id) => bigContract({ id: String(id), winners }))
    expect(frequentWinners(contracts)).toBeNull()
  })
})

describe('unknown money', () => {
  it('keeps a category whose records carry no money unknown, after the valued ones', () => {
    const { leaves, unknown } = cpvLeaves([top('45', 100, 10), { key: '33', kind: 'top', value: null, count: 5 }], new Map())
    const categories = readerCategories(leaves, unknown)
    expect(categories.map((entry) => [entry.category.key, entry.value, entry.share])).toEqual([
      ['constructii', 100, 1],
      ['medical', null, null],
    ])
  })
})

describe('completeContracts', () => {
  it('keeps from a full page only the contracts above its last value, whose members cannot run over', () => {
    const contracts = [bigContract({ id: 'a', value: 10 }), bigContract({ id: 'b', value: 5 })]
    expect(completeContracts(contracts, true, 5).map((contract) => contract.id)).toEqual(['a'])
    expect(completeContracts(contracts, false, 5).map((contract) => contract.id)).toEqual(['a', 'b'])
  })
})
