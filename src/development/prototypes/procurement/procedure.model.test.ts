// The procedure page's record: another institution's contracts are never the procedure's, call-offs never add to their frameworks, an award's estimate is never its own award, and a call's row tells the procedure it opened.
import { describe, expect, it } from 'vitest'
import { PROCEDURE_FIXTURES } from '@/development/prototypes/procurement/procedure.fixtures'
import { procedureSheetOf } from '@/development/prototypes/procurement/procedure.model'

const sheet = (key: string, read: 'target' | 'today' = 'target') => procedureSheetOf(PROCEDURE_FIXTURES[key]!, read)

describe('procedureSheetOf', () => {
  it('sets apart the contracts another institution signed under a reused notice number', () => {
    const legacy = sheet('nuclearelectrica-2009')
    expect(legacy.kind).toBe('call')
    expect(legacy.contracts).toHaveLength(0)
    expect(legacy.foreign.map((row) => row.authority.cui)).toEqual(['4267117', expect.any(String)])
    expect(legacy.awarded).toBeNull()
    expect(legacy.call?.date).toBe('2009-12-10')
  })

  it('counts a framework procedure by its frameworks, the call-offs drawn on them apart', () => {
    const caracal = sheet('caracal')
    expect(caracal.framework).toBe(true)
    expect(caracal.contracts.every((contract) => !contract.callOff)).toBe(true)
    expect(caracal.callOffs.length).toBeGreaterThan(0)
    const frameworks = caracal.contracts.reduce((total, contract) => total + (contract.value ?? 0), 0)
    expect(caracal.awarded).toBeCloseTo(frameworks, 2)
    const lot5 = caracal.lots.find((lot) => lot.no === '5')!
    expect(lot5.value).toBeCloseTo(2486.4, 2)
    expect(lot5.contracts.every((contract) => !contract.callOff)).toBe(true)
  })

  it('takes the estimate from the call or the contracts, never the award notice repeating the award', () => {
    const cnir = sheet('cnir')
    expect(cnir.awarded).toBeCloseTo(6142792901.06, 2)
    expect(cnir.estimate).toBeCloseTo(7579615950.64, 2)
    // Today the award notice's row is all there is: its estimate is the award, so the page has none.
    expect(sheet('cnir', 'today').estimate).toBeNull()
  })

  it('tells the whole procedure from the call’s row when the award is known, and only the call today', () => {
    const call = sheet('anif-apel')
    expect(call.openedOnCall).toBe(true)
    expect(call.kind).toBe('award')
    expect(call.award?.no).toBe('CAN1096494')
    expect(sheet('anif-apel', 'today').kind).toBe('call')
  })

  it('reads each lot’s offers and drops the lot number its title repeats', () => {
    const anif = sheet('anif')
    expect(anif.lots.map((lot) => lot.no)).toEqual(['1', '2', '3'])
    expect(anif.lots.map((lot) => lot.offers?.received)).toEqual([2, 1, 4])
    expect(anif.lots[0]!.title?.startsWith('Reabilitarea')).toBe(true)
    expect(anif.offers).toEqual({ received: 7, lots: 3, single: 1 })
  })

  it('gathers today’s association rows into one contract', () => {
    const today = sheet('cnir', 'today')
    expect(today.contracts).toHaveLength(1)
    expect(today.contracts[0]!.firms.length).toBe(4)
  })
})
