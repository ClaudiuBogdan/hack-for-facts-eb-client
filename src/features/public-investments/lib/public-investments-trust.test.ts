import { describe, expect, it } from 'vitest'
import {
  compareObjectives,
  comparePayments,
  computeAbsorptionPct,
  computeTrustedMoneyTotal,
  isMoneySuspect,
  isMoneyTrusted,
} from './formatting'
import {
  REDACTED_NAME_MARKER,
  computeTopStalled,
  filterPubliclyServableParties,
  filterSortPaginateObjectives,
  getPublicPartyDisplay,
  groupPublicPartiesByRole,
  isPartyPubliclyServable,
  redactEvidencePayload,
} from './filters'
import type {
  MoneyValue,
  ObjectiveSummary,
  Party,
  PaymentFact,
} from './types'
import {
  GATED_RAW_PAYLOAD_NAPOCA,
  MOCK_OBJECTIVE_SUMMARIES,
} from '../mocks/public-investments-mock-data'

// Build a minimal objective helper for trust-boundary tests.
function makeObjective(overrides: Partial<ObjectiveSummary>): ObjectiveSummary {
  return {
    objectiveId: 'test-obj',
    program: 'ANGHEL_SALIGNY',
    title: 'Test objective',
    domain: 'Apă și canalizare',
    domainKey: 'apa_canalizare',
    county: 'Cluj',
    countyCode: 'CJ',
    uat: 'Comuna Apahida',
    siruta: '58728',
    lat: 46,
    lng: 23,
    allocated: { amount: 1_000_000, confidence: 'ok', raw: '1.000.000' },
    contracted: { amount: 1_000_000, confidence: 'ok', raw: '1.000.000' },
    reimbursed: { amount: 400_000, confidence: 'ok', raw: '400.000' },
    absorptionPct: 40,
    stage: { bucket: 'in_executie', raw: 'În execuție 40%' },
    hasContractorCui: true,
    hasDesignerCui: true,
    identityConfidence: 'high',
    evidenceRef: {
      sourceRowKey: 'ev-test',
      sourceFileId: null,
      objectId: null,
      sourceUrl: null,
      sourceUrlKind: 'workbook',
      snapshotId: null,
      snapshotDate: null,
      contentSha256: null,
      rowHash: null,
    },
    ...overrides,
  }
}

const ok = (amount: number): MoneyValue => ({ amount, confidence: 'ok', raw: String(amount) })
const suspect = (amount: number): MoneyValue => ({
  amount,
  confidence: 'suspect_x1000',
  raw: String(amount),
})
const warning = (amount: number): MoneyValue => ({
  amount,
  confidence: 'precision_warning',
  raw: String(amount),
})

describe('isMoneyTrusted / isMoneySuspect', () => {
  it('classifies ok and suspect correctly', () => {
    expect(isMoneyTrusted(ok(100))).toBe(true)
    expect(isMoneyTrusted(suspect(100))).toBe(false)
    expect(isMoneyTrusted(null)).toBe(false)
    expect(isMoneySuspect(suspect(100))).toBe(true)
    expect(isMoneySuspect(ok(100))).toBe(false)
  })
})

describe('computeTrustedMoneyTotal', () => {
  it('excludes suspect_x1000 amounts from the total', () => {
    const total = computeTrustedMoneyTotal([ok(100), suspect(1_000_000), ok(200)])
    expect(total.amount).toBe(300)
    expect(total.confidence).toBe('ok')
  })

  it('returns null amount when all contributors are suspect', () => {
    const total = computeTrustedMoneyTotal([suspect(1), suspect(2)])
    expect(total.amount).toBeNull()
    expect(total.confidence).toBe('suspect_x1000')
  })

  it('flags precision_warning when any contributor warns', () => {
    const total = computeTrustedMoneyTotal([ok(100), warning(200)])
    expect(total.amount).toBe(300)
    expect(total.confidence).toBe('precision_warning')
  })
})

describe('computeAbsorptionPct', () => {
  it('computes clamped percentage for trusted amounts', () => {
    expect(computeAbsorptionPct(ok(1_000_000), ok(400_000))).toBe(40)
  })

  it('returns null when contracted is 0 or unknown', () => {
    expect(computeAbsorptionPct(ok(0), ok(100))).toBeNull()
    expect(computeAbsorptionPct(null, ok(100))).toBeNull()
  })

  it('returns null when either amount is suspect_x1000', () => {
    expect(computeAbsorptionPct(suspect(1_000_000), ok(400_000))).toBeNull()
    expect(computeAbsorptionPct(ok(1_000_000), suspect(400_000))).toBeNull()
  })

  it('preserves the real (>100) percentage for precision_warning rows', () => {
    expect(computeAbsorptionPct(ok(3_000_000), warning(3_450_000))).toBe(115)
  })
})

describe('suspect rows are excluded from search totals / ranges', () => {
  const objectives: ObjectiveSummary[] = [
    makeObjective({
      objectiveId: 'trusted-1',
      contracted: ok(1_000_000),
      reimbursed: ok(400_000),
      absorptionPct: 40,
    }),
    makeObjective({
      objectiveId: 'suspect-1',
      contracted: suspect(5_200_000_000),
      reimbursed: suspect(1_300_000_000),
      absorptionPct: null,
    }),
  ]

  it('excludes suspect rows from amount range filters and counts them', () => {
    const result = filterSortPaginateObjectives(objectives, {
      amountField: 'contracted',
      amountMin: 500_000,
      amountMax: 2_000_000,
      page: 1,
      pageSize: 25,
    })
    expect(result.rows.map((row) => row.objectiveId)).toEqual(['trusted-1'])
    expect(result.excludedSuspectCount).toBe(1)
  })

  it('includes suspect rows when no range filter is active without range-exclusion count', () => {
    const result = filterSortPaginateObjectives(objectives, {
      amountField: 'contracted',
      page: 1,
      pageSize: 25,
    })
    expect(result.total).toBe(2)
    expect(result.excludedSuspectCount).toBe(0)
  })

  it('excludes suspect rows from absorption range filters', () => {
    const result = filterSortPaginateObjectives(objectives, {
      amountField: 'contracted',
      absMin: 0,
      absMax: 100,
      page: 1,
      pageSize: 25,
    })
    expect(result.rows.map((row) => row.objectiveId)).toEqual(['trusted-1'])
    expect(result.excludedSuspectCount).toBe(1)
  })

  it('mock fixture set: PNCCRS suspect row excluded from trusted totals', () => {
    // The trusted total across mock fixtures excludes the suspect PNCCRS row.
    const trustedTotal = computeTrustedMoneyTotal(
      MOCK_OBJECTIVE_SUMMARIES.map((objective) => objective.contracted),
    )
    // Trusted contracted: anghelApahida 5.8M + pndlSagetii 3M + pnmcMagic 0.45M + anghelNapocaGated 5.2M = 14.45M
    expect(trustedTotal.amount).toBe(14_450_000)
    expect(trustedTotal.confidence).toBe('ok')
  })

  it('mock fixture set: top stalled excludes the suspect PNCCRS row', () => {
    const topStalled = computeTopStalled(MOCK_OBJECTIVE_SUMMARIES, 6)
    // PNCCRS is suspect and must not appear; it is also 'contractat' bucket.
    expect(topStalled.find((row) => row.objectiveId === 'pi-pnccrs-bv-fagaras')).toBeUndefined()
    // Stalled (in_executie/contractat) trusted rows are present.
    expect(topStalled.length).toBeGreaterThan(0)
  })
})

describe('compareObjectives', () => {
  const a = makeObjective({ objectiveId: 'a', title: 'Argeș', county: 'Argeș', contracted: ok(100), absorptionPct: 10 })
  const b = makeObjective({ objectiveId: 'b', title: 'Brașov', county: 'Brașov', contracted: ok(300), absorptionPct: 30 })

  it('sorts contracted desc by default', () => {
    const sorted = [a, b].sort((x, y) => compareObjectives(x, y, 'contracted', 'desc'))
    expect(sorted[0].objectiveId).toBe('b')
  })

  it('sorts suspect_x1000 money rows last regardless of order', () => {
    const suspectObjective = makeObjective({
      objectiveId: 'suspect-sort',
      contracted: suspect(9_999_999_999),
      reimbursed: suspect(1_000_000),
      absorptionPct: null,
    })
    const trustedObjective = makeObjective({
      objectiveId: 'trusted-sort',
      contracted: ok(100),
      reimbursed: ok(10),
      absorptionPct: 10,
    })

    expect(
      [suspectObjective, trustedObjective]
        .sort((x, y) => compareObjectives(x, y, 'contracted', 'desc'))
        .map((row) => row.objectiveId),
    ).toEqual(['trusted-sort', 'suspect-sort'])
    expect(
      [suspectObjective, trustedObjective]
        .sort((x, y) => compareObjectives(x, y, 'contracted', 'asc'))
        .map((row) => row.objectiveId),
    ).toEqual(['trusted-sort', 'suspect-sort'])
  })

  it('mock fixture set: PNCCRS suspect row sorts last by contracted desc', () => {
    const sorted = [...MOCK_OBJECTIVE_SUMMARIES].sort((x, y) =>
      compareObjectives(x, y, 'contracted', 'desc'),
    )
    expect(sorted[sorted.length - 1]?.objectiveId).toBe('pi-pnccrs-bv-fagaras')
  })

  it('sorts absorption asc', () => {
    const sorted = [b, a].sort((x, y) => compareObjectives(x, y, 'absorption', 'asc'))
    expect(sorted[0].objectiveId).toBe('a')
  })

  it('sorts title asc', () => {
    const sorted = [b, a].sort((x, y) => compareObjectives(x, y, 'title', 'asc'))
    expect(sorted[0].objectiveId).toBe('a')
  })
})

describe('comparePayments', () => {
  const basePayment: Omit<PaymentFact, 'paymentId' | 'amount' | 'cumulative'> = {
    date: '2026-01-01',
    requested: null,
    reimbursed: null,
    evidenceRef: {
      sourceRowKey: 'ev-pay',
      sourceFileId: null,
      objectId: null,
      sourceUrl: null,
      sourceUrlKind: 'workbook',
      snapshotId: null,
      snapshotDate: null,
      contentSha256: null,
      rowHash: null,
    },
  }

  it('sorts suspect_x1000 payment money rows last regardless of order', () => {
    const suspectPayment: PaymentFact = {
      ...basePayment,
      paymentId: 'suspect-payment',
      amount: suspect(9_999_999),
      cumulative: suspect(9_999_999),
    }
    const trustedPayment: PaymentFact = {
      ...basePayment,
      paymentId: 'trusted-payment',
      amount: ok(10),
      cumulative: ok(10),
    }

    expect(
      [suspectPayment, trustedPayment]
        .sort((x, y) => comparePayments(x, y, 'amount', 'desc'))
        .map((payment) => payment.paymentId),
    ).toEqual(['trusted-payment', 'suspect-payment'])
    expect(
      [suspectPayment, trustedPayment]
        .sort((x, y) => comparePayments(x, y, 'cumulative', 'asc'))
        .map((payment) => payment.paymentId),
    ).toEqual(['trusted-payment', 'suspect-payment'])
  })
})

// ---------------------------------------------------------------------------
// Privacy boundary
// ---------------------------------------------------------------------------

function makeParty(overrides: Partial<Party>): Party {
  return {
    partyId: 'party-test',
    role: 'executant',
    displayName: 'Test Contractor SRL',
    cui: '12345678',
    privacyClass: 'public_aggregate',
    potentialNaturalPerson: false,
    reviewState: 'reviewed',
    served: true,
    evidenceRef: {
      sourceRowKey: 'ev-party',
      sourceFileId: null,
      objectId: null,
      sourceUrl: null,
      sourceUrlKind: 'workbook',
      snapshotId: null,
      snapshotDate: null,
      contentSha256: null,
      rowHash: null,
    },
    ...overrides,
  }
}

describe('isPartyPubliclyServable', () => {
  it('serves a reviewed public company', () => {
    expect(isPartyPubliclyServable(makeParty({}))).toBe(true)
  })

  it('withholds when served=false', () => {
    expect(isPartyPubliclyServable(makeParty({ served: false }))).toBe(false)
  })

  it('withholds personal_moderate', () => {
    expect(
      isPartyPubliclyServable(makeParty({ privacyClass: 'personal_moderate' })),
    ).toBe(false)
  })

  it('withholds potential natural persons', () => {
    expect(
      isPartyPubliclyServable(makeParty({ potentialNaturalPerson: true })),
    ).toBe(false)
  })

  it('withholds unreviewed parties', () => {
    expect(
      isPartyPubliclyServable(makeParty({ reviewState: 'unreviewed' })),
    ).toBe(false)
  })
})

describe('getPublicPartyDisplay', () => {
  it('returns the name for a served party', () => {
    expect(getPublicPartyDisplay(makeParty({ displayName: 'Construcții SRL' }))).toBe(
      'Construcții SRL',
    )
  })

  it('returns null for a gated party even if a name leaked into the fixture', () => {
    // The fixture sets displayName:null for gated parties, but the fail-safe
    // must also hold if a buggy fixture left a name in place.
    expect(
      getPublicPartyDisplay(
        makeParty({
          displayName: 'Popescu Ion Aurel',
          served: false,
          privacyClass: 'personal_moderate',
          potentialNaturalPerson: true,
          reviewState: 'unreviewed',
        }),
      ),
    ).toBeNull()
  })
})

describe('filterPubliclyServableParties / groupPublicPartiesByRole', () => {
  const parties = [
    makeParty({ partyId: 'served-exec', role: 'executant', displayName: 'Served Exec SRL' }),
    makeParty({ partyId: 'served-design', role: 'proiectant', displayName: 'Served Design SA' }),
    makeParty({
      partyId: 'gated-exec',
      role: 'executant',
      displayName: 'Popescu Ion Aurel',
      served: false,
      privacyClass: 'personal_moderate',
      potentialNaturalPerson: true,
    }),
  ]

  it('drops gated parties from the public list', () => {
    const publicParties = filterPubliclyServableParties(parties)
    expect(publicParties.map((party) => party.partyId)).toEqual([
      'served-exec',
      'served-design',
    ])
  })

  it('groups served parties by role, dropping gated ones', () => {
    const grouped = groupPublicPartiesByRole(parties)
    expect(grouped.executant.map((party) => party.partyId)).toEqual(['served-exec'])
    expect(grouped.proiectant.map((party) => party.partyId)).toEqual(['served-design'])
    expect(grouped.beneficiar).toEqual([])
  })
})

describe('redactEvidencePayload', () => {
  it('replaces gated party names with the redaction marker', () => {
    const parties = [
      makeParty({ partyId: 'served', displayName: 'Construcții Apahida SRL' }),
      makeParty({
        partyId: 'gated',
        displayName: 'Popescu Ion Aurel',
        cui: '99887766',
        served: false,
        privacyClass: 'personal_moderate',
        potentialNaturalPerson: true,
      }),
    ]
    const raw = 'Contractant: Popescu Ion Aurel, CUI 99887766, valoare 5.200.000'
    const redacted = redactEvidencePayload(raw, parties)
    expect(redacted).toContain(REDACTED_NAME_MARKER)
    expect(redacted).not.toContain('Popescu Ion Aurel')
    // The person-like CUI is also redacted.
    expect(redacted).not.toContain('99887766')
    // Served party names are preserved.
  })

  it('leaves the payload untouched when no gated names are present', () => {
    const raw = 'Contractant: Construcții Apahida SRL'
    const parties = [makeParty({ displayName: 'Construcții Apahida SRL' })]
    expect(redactEvidencePayload(raw, parties)).toBe(raw)
  })

  it('mock fixture: the gated raw payload contains the personal name', () => {
    // Sanity check the fixture is set up to exercise redaction.
    expect(GATED_RAW_PAYLOAD_NAPOCA).toContain('Popescu Ion Aurel')
  })

  it('mock fixture: redacting the gated raw payload removes the personal name', () => {
    const parties = [
      makeParty({
        partyId: 'gated',
        displayName: 'Popescu Ion Aurel',
        cui: '99887766',
        served: false,
        privacyClass: 'personal_moderate',
        potentialNaturalPerson: true,
      }),
    ]
    const redacted = redactEvidencePayload(GATED_RAW_PAYLOAD_NAPOCA, parties)
    expect(redacted).not.toContain('Popescu Ion Aurel')
    expect(redacted).not.toContain('99887766')
    expect(redacted).toContain(REDACTED_NAME_MARKER)
  })
})
