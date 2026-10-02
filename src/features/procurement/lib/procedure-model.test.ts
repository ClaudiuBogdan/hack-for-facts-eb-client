import { describe, expect, it } from 'vitest'
import { NO_NAMES } from './direct-purchase-model'
import { procedureSheetOf } from './procedure-model'
import { cancelledRaw, cappedRaw, cnirRaw, legacyRaw, readOf } from './procedure.fixture'

/**
 * The procedure page's rules on what the API serves today (§22.1): another
 * institution's contracts are never the procedure's, an award notice's own
 * estimate is never the estimate, a zero is no value, an association's rows
 * are one contract, a full page of rows is a floor.
 */

describe('an award notice, as the API serves it today', () => {
  const sheet = procedureSheetOf(readOf(cnirRaw()))

  it('gathers an association’s rows, one per member, into one contract', () => {
    expect(sheet.kind).toBe('award')
    expect(sheet.contracts).toHaveLength(1)
    // Euro-Asfalt twice, without a CUI: one firm.
    expect(sheet.contracts[0]!.firms.map((firm) => firm.cui)).toEqual([null, '17042060', '9942680', '31994414'])
    expect(sheet.contracts[0]!.firms[0]!.name).toBe('Euro-Asfalt')
    expect(sheet.firmsCount).toBe(4)
    expect(sheet.contracts[0]!.value).toBe(6142792901)
    expect(sheet.contracts[0]!.linkId).toBe('2435981')
    expect(sheet.fromRows).toBe(true)
  })

  it('takes the award from the notice and has no estimate: the notice’s repeats the award', () => {
    expect(sheet.awarded).toBe(6142792901.06)
    expect(sheet.estimate).toBeNull()
    expect(sheet.status).toBe('awarded')
    expect(sheet.vatExcluded).toBe(false)
  })

  it('opens the notice on e-licitatie’s page, not its JSON, and links its TED notice', () => {
    expect(sheet.source).toEqual({ kind: 'notice', url: 'https://e-licitatie.ro/pub/notices/ca-notices/view-c/100578781' })
    expect(sheet.ted).toEqual({ no: '644509-2025', url: 'https://ted.europa.eu/ro/notice/-/detail/644509-2025' })
    expect(sheet.cpv?.code).toBe('45233100')
    expect(sheet.year).toBe(2025)
  })

  it('names the institution from the budget platform when it knows it, and is partial when the names fail', () => {
    const named = procedureSheetOf(
      readOf(cnirRaw(), { ...NO_NAMES, authority: { name: 'Compania Națională de Investiții Rutiere', identity: { cui: '36727850', name: 'Compania Națională de Investiții Rutiere', entityType: null, isTownHall: false, place: null, population: null, address: null, hasBudget: false }, hasBudget: false } }),
    )
    expect(named.authority.name).toBe('Compania Națională de Investiții Rutiere')
    expect(procedureSheetOf(readOf(cnirRaw(), { ...NO_NAMES, failed: true })).partial).toBe(true)
  })
})

describe('a legacy call', () => {
  const sheet = procedureSheetOf(readOf(legacyRaw()))

  it('sets apart the contracts another institution signed under a reused number, counting none', () => {
    expect(sheet.kind).toBe('call')
    expect(sheet.contracts).toHaveLength(0)
    expect(sheet.foreign.map((row) => row.authority.cui)).toEqual(['4267117', '2845710'])
    expect(sheet.foreign[0]!.value).toBe(37817489.22)
    expect(sheet.awarded).toBeNull()
    expect(sheet.firmsCount).toBe(0)
  })

  it('reads the call’s own estimate and day, and says the export file it comes from', () => {
    expect(sheet.estimate).toBe(183967.29)
    expect(sheet.call).toMatchObject({ no: '92137', id: '35106757', date: '2009-12-10', status: 'unknown' })
    expect(sheet.status).toBe('unknown')
    expect(sheet.title).toBeNull()
    expect(sheet.source).toEqual({ kind: 'export', url: legacyRaw().procedure.sourceUrl, file: 'anunturi-participare-2009.xls' })
    expect(sheet.year).toBe(2009)
  })
})

describe('an award notice with nothing linked', () => {
  it('keeps its cancelled state, and its zeros are no values', () => {
    const sheet = procedureSheetOf(readOf(cancelledRaw()))
    expect(sheet.kind).toBe('award')
    expect(sheet.status).toBe('cancelled')
    expect(sheet.contracts).toHaveLength(0)
    expect(sheet.awarded).toBeNull()
    expect(sheet.estimate).toBeNull()
    expect(sheet.contractsSpan).toBeNull()
  })

  it('reads „in evaluation" on an award notice as the award it is', () => {
    const raw = cancelledRaw()
    const sheet = procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, status: 'in_evaluation', awardedValueRon: '166612.00', value: { valueAccepted: true, valueRonComparable: null } } }))
    expect(sheet.status).toBe('awarded')
    expect(sheet.awarded).toBe(166612)
  })
})

describe('a full page of rows', () => {
  const sheet = procedureSheetOf(readOf(cappedRaw()))

  it('is a floor: the API serves 50 rows and no total, and their days are a part’s', () => {
    expect(sheet.contractsCapped).toBe(true)
    expect(sheet.contracts).toHaveLength(50)
    expect(sheet.firmsCount).toBe(7)
    expect(sheet.contractsSpan).toBeNull()
  })

  it('reads a framework notice’s own value as its call-offs’, never as the frameworks’ ceiling', () => {
    expect(sheet.framework).toBe(true)
    expect(sheet.awarded).toBeNull()
    expect(sheet.callOffsReported).toBe(557085.9)
  })
})

describe('a framework notice by its title', () => {
  it('is a framework with no rows to say so, and a call-off naming its framework is not', () => {
    const raw = cancelledRaw()
    const titled = (title: string) => procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, title, status: 'awarded', awardedValueRon: '5312.65', value: { valueAccepted: true, valueRonComparable: null } } }))
    const framework = titled('Acord-cadru de furnizare fructe și legume')
    expect(framework.framework).toBe(true)
    expect(framework.awarded).toBeNull()
    expect(framework.callOffsReported).toBe(5312.65)
    const callOff = titled('Contract subsecvent nr.4 la Acordul-cadru nr.16913/27.05.2024')
    expect(callOff.framework).toBe(false)
    expect(callOff.awarded).toBe(5312.65)
    expect(callOff.callOffsReported).toBeNull()
  })

  it('never reads a call-off naming its framework as one, whatever its rows are filed as', () => {
    const raw = cappedRaw()
    expect(procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, title: 'Contract subsecvent nr. 4 la Acordul-cadru nr. 16913' } })).framework).toBe(false)
  })

  it('reads the call-offs into a framework notice’s value on e-licitatie’s notices only', () => {
    const raw = cappedRaw()
    const seap = procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, sourceSystem: 'seap_notice', noticeKind: 'award' } }))
    expect(seap.framework).toBe(true)
    expect(seap.awarded).toBeNull()
    expect(seap.callOffsReported).toBeNull()
  })
})

describe('an institution’s own rows with a CUI missing', () => {
  const raw = cnirRaw()

  it('stay its own: foreign only when the two certainly differ', () => {
    const noCui = procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, authority: { ...raw.procedure.authority, cui: null } } }))
    expect(noCui.contracts).toHaveLength(1)
    expect(noCui.foreign).toHaveLength(0)
    const sameName = procedureSheetOf(readOf({ ...raw, contracts: raw.contracts.map((row) => ({ ...row, authority: { cui: null, name: 'Compania Națională de Investiții Rutiere S.A.' } })) }))
    expect(sameName.foreign).toHaveLength(0)
    const other = procedureSheetOf(readOf({ ...raw, contracts: raw.contracts.map((row) => ({ ...row, authority: { cui: null, name: 'Municipiul Iași' } })) }))
    expect(other.contracts).toHaveLength(0)
    expect(other.foreign).toHaveLength(5)
  })
})

describe('what the second review found', () => {
  const cnir = cnirRaw()

  it('ties a value to its contracts only within their rounding to whole lei', () => {
    const near = procedureSheetOf(readOf({ ...cnir, procedure: { ...cnir.procedure, awardedValueRon: '6142792901.80' } }))
    expect(near.awardedByContracts).toBe(true)
    const off = procedureSheetOf(readOf({ ...cnir, procedure: { ...cnir.procedure, awardedValueRon: '6200000000.00' } }))
    expect(off.awardedByContracts).toBe(false)
  })

  it('keeps a row with no institution named the notice’s under a unique number, apart and unverified under a repeating one', () => {
    const nameless = { cui: null, name: null }
    const onAward = procedureSheetOf(readOf({ ...cnir, contracts: cnir.contracts.map((row) => ({ ...row, authority: nameless })) }))
    expect(onAward.contracts).toHaveLength(1)
    const legacy = legacyRaw()
    const onLegacy = procedureSheetOf(readOf({ ...legacy, contracts: [{ ...legacy.contracts[0]!, authority: nameless }] }))
    expect(onLegacy.contracts).toHaveLength(0)
    expect(onLegacy.foreign).toEqual([expect.objectContaining({ verified: false })])
    expect(procedureSheetOf(readOf(legacy)).foreign.every((row) => row.verified)).toBe(true)
  })

  it('knows a framework by its title’s every form', () => {
    const raw = cancelledRaw()
    for (const title of ['Acordul-cadru de furnizare medicamente', 'Acorduri-cadru pentru lucrări', 'Încheierea acordului cadru de servicii']) {
      expect(procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, title } })).framework, title).toBe(true)
    }
  })

  it('says no span when a contract has no day', () => {
    const undated = procedureSheetOf(readOf({ ...cnir, contracts: [cnir.contracts[1]!, { ...cnir.contracts[2]!, contractNo: '102/1888', contractDate: null }] }))
    expect(undated.contracts).toHaveLength(2)
    expect(undated.contractsSpan).toBeNull()
  })

  it('counts a firm once, with its CUI and without', () => {
    const twice = procedureSheetOf(readOf({ ...cnir, contracts: [cnir.contracts[1]!, { ...cnir.contracts[1]!, id: '9', supplier: { cui: null, name: 'Tehnostrade SRL' } }] }))
    expect(twice.contracts[0]!.firms).toHaveLength(1)
    expect(twice.contracts[0]!.firms[0]!.cui).toBe('17042060')
    expect(twice.firmsCount).toBe(1)
  })

  it('has no association’s shape without a value its rows share', () => {
    const valueless = procedureSheetOf(readOf({ ...cnir, contracts: cnir.contracts.slice(1, 3).map((row) => ({ ...row, valueRon: null, value: { valueAccepted: false, valueRonComparable: null } })) }))
    expect(valueless.contracts[0]!.sharedValue).toBe(false)
    expect(procedureSheetOf(readOf(cnir)).contracts[0]!.sharedValue).toBe(true)
  })

  it('takes the value engine’s resolved amount for an accepted row', () => {
    const rescued = procedureSheetOf(readOf({ ...cnir, contracts: [{ ...cnir.contracts[1]!, valueRon: null, value: { valueAccepted: true, valueRonComparable: '6142792901.00' } }] }))
    expect(rescued.contracts[0]!.value).toBe(6142792901)
    expect(rescued.awardedByContracts).toBe(true)
  })
})

describe('the kind of notice and its value', () => {
  it('reads a dynamic purchasing system’s invitation as a call, its state as SEAP says', () => {
    const raw = legacyRaw()
    const sad = procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, noticeKind: 'sad', noticeNo: '100234', status: 'in_evaluation' }, contracts: [] }))
    expect(sad.kind).toBe('call')
    expect(sad.status).toBe('in_evaluation')
  })

  it('ties the notice’s value to its contracts only when they add up to it', () => {
    const raw = cnirRaw()
    expect(procedureSheetOf(readOf(raw)).awardedByContracts).toBe(true)
    const part = procedureSheetOf(readOf({ ...raw, procedure: { ...raw.procedure, awardedValueRon: '9000000000.00' } }))
    expect(part.awarded).toBe(9_000_000_000)
    expect(part.awardedByContracts).toBe(false)
  })
})
