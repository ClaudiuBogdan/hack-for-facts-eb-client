import { describe, expect, it } from 'vitest'

import {
  concentrationSignalCopy,
  type ConcentrationSignal,
} from './concentration-copy'

const meta = (
  answerability: 'served' | 'degraded' | 'abstained' = 'served',
): ConcentrationSignal['meta'] => ({
  answerability,
  reason: null,
  policyKey: 'procurement.value_awarded',
  grain: 'contract',
  valueBasis: 'awarded',
  dateBasis: 'canonical_date',
  population: 'canonical records',
  buildId: '9',
  counts: { rows: '26', withValue: '0' },
  undatedInScope: null,
  provisional: false,
  caveats: [],
  canonicalScope: 'authorityCui=36727850&grain=contract&from=2025-01&to=2025-12',
})

const signal = (over: Partial<ConcentrationSignal> = {}): ConcentrationSignal => ({
  supplierCount: 10,
  top1Share: null,
  top5Share: null,
  hhi: null,
  totalRon: null,
  withheldConsortiumRon: null,
  meta: meta(),
  ...over,
})

describe('concentrationSignalCopy', () => {
  it('never claims the uncovered remainder has an unidentified supplier', () => {
    const copy = concentrationSignalCopy({
      concentration: signal({
        top1Share: '0.4000',
        top5Share: '0.8000',
        totalRon: '1000.00',
        withheldConsortiumRon: '400.00',
      }),
      contractAwardedRon: '1400.00',
    })
    expect(copy.detail).not.toMatch(/neidentificat/)
  })

  it('all withheld: keeps the dash and names the consortium amount', () => {
    const copy = concentrationSignalCopy({
      concentration: signal({ withheldConsortiumRon: '22262996083.00' }),
      contractAwardedRon: '22262996083.00',
    })

    expect(copy.value).toBe('—')
    expect(copy.hint).toBe('valoare nerepartizată pe furnizori')
    expect(copy.detail).toContain('Nu se poate calcula')
    expect(copy.detail).toContain('asocieri cu mai mulți membri')
    expect(copy.detail).toContain('nu este publicată')
    expect(copy.detail).not.toMatch(/neidentificat/)
  })

  it('all withheld without a quotable amount still explains the dash', () => {
    const copy = concentrationSignalCopy({
      concentration: signal({ withheldConsortiumRon: null }),
      contractAwardedRon: '22262996083.00',
    })

    expect(copy.value).toBe('—')
    expect(copy.detail).toContain('Nu se poate calcula')
    expect(copy.detail).not.toContain('undefined')
    expect(copy.detail).not.toMatch(/RON\s*0/)
  })

  it('partial attribution states both the covered and the withheld populations', () => {
    const copy = concentrationSignalCopy({
      concentration: signal({
        top1Share: '0.4000',
        top5Share: '0.8000',
        totalRon: '1000000000.00',
        withheldConsortiumRon: '400000000.00',
      }),
      contractAwardedRon: '1400000000.00',
    })

    expect(copy.value).not.toBe('—')
    expect(copy.hint).toBe('primii 5 din 10 furnizori')
    expect(copy.detail).toContain('Clasamentul acoperă')
    expect(copy.detail).toContain('asocieri cu mai mulți membri')
  })

  it('partial attribution with nothing withheld mentions no consortium at all', () => {
    const copy = concentrationSignalCopy({
      concentration: signal({
        top5Share: '0.8000',
        totalRon: '1000000000.00',
        withheldConsortiumRon: '0.00',
      }),
      contractAwardedRon: '1000000000.00',
    })

    expect(copy.detail).toContain('Clasamentul acoperă')
    expect(copy.detail).not.toContain('asocieri')
  })

  it('a gate-blocked block says "unavailable", not "nothing is attributable"', () => {
    const copy = concentrationSignalCopy({
      concentration: signal({ supplierCount: null, meta: meta('abstained') }),
      contractAwardedRon: null,
    })

    expect(copy.value).toBe('—')
    expect(copy.hint).toBe('indisponibil')
    expect(copy.detail).toContain('Indisponibil')
    expect(copy.detail).not.toContain('Nu se poate calcula')
  })

  it('renders a bare dash when the buyer has no concentration answer', () => {
    const copy = concentrationSignalCopy({
      concentration: null,
      contractAwardedRon: '10.00',
    })
    expect(copy).toEqual({ value: '—' })
  })
})
