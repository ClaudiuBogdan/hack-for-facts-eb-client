import { describe, expect, it } from 'vitest'

import { humanizeProcurementCaveat } from './caveat-text'

/**
 * Every caveat the server's gate can emit, copied verbatim from
 * `procurement/core/gate-v2.ts`. None of them may reach a reader as-is: an
 * unhandled shape returns unchanged, so `toBe(caveat)` is the failure the
 * screenshot showed (engineer prose rendered in the page).
 */
const SERVER_CAVEATS = {
  timeDegradedSynth:
    "time answers are degraded for grain 'framework': dated coverage 93.8% (floor 75.0%) — interpret with the undated/unknown context",
  timeDegradedRecords:
    "time answers are degraded for grain 'contract': coverage 93.8% of records (floor 50.0% of records) — interpret with the undated/unknown context",
  timeDegradedWithMoney:
    "time answers are degraded for grain 'contract': coverage 93.8% of records / 88.2% of awarded money (floor 50.0% of records) — interpret with the undated/unknown context",
  timeAbstainSynth:
    "time answers abstain for grain 'modification': dated coverage 51.5% is below the disclosure floor 75.0%",
  timeAbstain:
    "time answers abstain for grain 'contract': coverage 31.0% of records is below the degrade floor 50.0% of records",
  geoDegraded:
    "geo answers are degraded for grain 'direct_acquisition': coverage 86.1% of records / 45.3% of awarded money (floor 50.0% of records) — interpret with the undated/unknown context",
  geoAbstainSynth:
    "geo answers abstain for grain 'calloff': buyer_geo coverage 40.2% is below the disclosure floor 75.0%",
  supplierGeoDegraded:
    "geo answers are degraded for grain 'contract' (class decided on buyer-geo rows): supplier-geo coverage is not published by this generation (the buyer-geo ratio does not apply to supplier surfaces); the named/unknown buckets carry the scope-exact regional split",
  supplierGeoAbstain:
    "geo answers abstain for grain 'contract' (class decided on buyer-geo rows): supplier-geo coverage is not published by this generation (the buyer-geo ratio does not apply to supplier surfaces); the named/unknown buckets carry the scope-exact regional split",
  supplierGeoRatio:
    "geo answers are degraded for grain 'contract': supplier-geo coverage 72.4% of records (floor 50.0% of records) — interpret with the undated/unknown context",
  spendDisclosed:
    "spend answers are served with DISCLOSED partial coverage for grain 'contract': accepted-value coverage 39.7% sits between the disclosure floor and the full-allow gate — totals understate the true spend",
  spendAbstain:
    "spend answers abstain for grain 'direct_acquisition': value coverage 12.4% is below the spend gate (money is omitted, not zeroed)",
  basisDisclosed:
    "framework ceiling answers are served with DISCLOSED partial coverage for grain 'framework': coverage 92.7% sits between the disclosure floor 75.0% and the full-allow gate 95.0% — totals understate the framework ceiling population",
  basisAbstain:
    "estimated value answers abstain for grain 'direct_acquisition': coverage 58.6% is below the disclosure floor 75.0% (money is omitted, not zeroed)",
  basisNotServed:
    "modification-adjusted value is not served on grain 'direct_acquisition'",
  missingCoverageVerdict:
    "no coverage verdict for estimated value on grain 'calloff' — money abstains (never served unvetted)",
  missingQualityVerdict:
    "no quality verdict for grain 'modification' — spend answers abstain",
  // Population notes and row-filter caveats — `analysis-usecases.ts`.
  procedureLifecycle:
    'procedures are tender lifecycles (a procedure yields contracts) — never sum this count with contract/direct-acquisition counts',
  noAwardedValues:
    'no awarded values observed in scope — the sum is null (unobserved), not zero',
  calloffPartial:
    'call-offs are the REPORTED subsequent contracts under framework agreements (~63k reported vs ~828k frameworks) — framework execution is mostly unobserved, and call-off totals must never be summed with contract awards (double-counts framework spend)',
  frameworkCeiling:
    'framework ceilings are maximum committed amounts attributed once per framework identity — an upper bound on possible call-off spend, NOT money spent; mixed-value framework groups are quarantined and excluded from every figure; rankings/sliced ceiling totals are withheld until repeat-cluster disclosure lands (per-slice repeat uncertainty can reach ~22%)',
  modificationCounts:
    'modifications are amendment events, not purchases — this population serves counts only; usable amendment values reach analytics solely through the contract grain’s modification-adjusted measure',
  qTitle:
    'q filters on record titles (case-insensitive substring); title coverage is partial per grain, so untitled records are excluded from every figure. The record list reads the same q as a full-text search over titles, party names and identifiers, so its result count legitimately differs from these figures',
  valueBounds:
    'value bounds restrict every figure (including counts) to records whose accepted awarded value falls in range',
  ratioNoDenominator:
    'denominator has no observed anchor-money values in scope — no ratio is derivable',
  ratioZeroDenominator:
    'denominator has zero anchor-money value in scope — no ratio is derivable',
} as const

describe('humanizeProcurementCaveat', () => {
  it.each(Object.entries(SERVER_CAVEATS))(
    'rewrites the %s caveat',
    (_name, caveat) => {
      const human = humanizeProcurementCaveat(caveat)
      expect(human).not.toBe(caveat)
      expect(human).not.toMatch(/grain '|floor|gate|abstain|coverage \d/)
    },
  )

  it('keeps every percentage the server quoted', () => {
    expect(
      humanizeProcurementCaveat(SERVER_CAVEATS.timeDegradedWithMoney),
    ).toContain('93.8%')
    expect(
      humanizeProcurementCaveat(SERVER_CAVEATS.timeDegradedWithMoney),
    ).toContain('88.2%')
    expect(humanizeProcurementCaveat(SERVER_CAVEATS.basisAbstain)).toContain(
      '58.6%',
    )
    expect(humanizeProcurementCaveat(SERVER_CAVEATS.basisAbstain)).toContain(
      '75.0%',
    )
  })

  it('names the population in reader terms, not registry terms', () => {
    expect(humanizeProcurementCaveat(SERVER_CAVEATS.basisAbstain)).toContain(
      'direct acquisitions',
    )
    expect(humanizeProcurementCaveat(SERVER_CAVEATS.spendDisclosed)).toContain(
      'contracts',
    )
  })

  it('never quotes a buyer ratio on a supplier-geo caveat', () => {
    const human = humanizeProcurementCaveat(SERVER_CAVEATS.supplierGeoDegraded)
    expect(human).toContain('Supplier location')
    expect(human).not.toMatch(/\d+(\.\d+)?%/)
  })

  it('distinguishes withheld money from zero', () => {
    expect(humanizeProcurementCaveat(SERVER_CAVEATS.spendAbstain)).toContain(
      'not zero',
    )
    expect(humanizeProcurementCaveat(SERVER_CAVEATS.basisAbstain)).toContain(
      'not zeroed',
    )
  })

  it('passes an unknown shape through untouched', () => {
    const unknown = 'some caveat the gate has not emitted before'
    expect(humanizeProcurementCaveat(unknown)).toBe(unknown)
  })
})
