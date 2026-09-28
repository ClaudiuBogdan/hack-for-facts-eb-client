import { describe, expect, it } from 'vitest'
import { cniRead, contractRow, plainRead } from './contract.fixture'
import { contractAroundOf, contractContextGapOf, contractContextInputOf, contractSheetOf, kindOf, statedChange, valueOf } from './contract-model'

/**
 * The contract page's rules (`design.md` §17.1, §17.4): a contract is read
 * from its notice; firms at one value are an association, values under one
 * number are versions the source does not rank; the amendments are the ones
 * filed under its number, checked against their own text; the procedure only
 * when it is the institution's own.
 */

describe('the value', () => {
  it('is a framework’s ceiling, never spending', () => {
    expect(valueOf(contractRow({ recordKind: 'framework_agreement', valueRon: '34464.00', valueAccepted: false }))).toEqual({ kind: 'ceiling', value: 34464 })
    expect(valueOf(contractRow({ valueStateRule: 'framework_guard' })).kind).toBe('ceiling')
  })

  it('is checked only when the platform accepted it, and says a conversion’s currency', () => {
    expect(valueOf(contractRow())).toEqual({ kind: 'accepted', value: 8451291 })
    expect(valueOf(contractRow({ valueState: 'official_ron_equivalent', currency: 'EUR' }))).toEqual({ kind: 'converted', value: 8451291, currency: 'EUR' })
    expect(valueOf(contractRow({ valueState: 'official_ron_equivalent', currency: 'RON' }))).toEqual({ kind: 'converted', value: 8451291, currency: null })
  })

  it('says why a published value is not taken', () => {
    const unchecked = { valueAccepted: false }
    expect(valueOf(contractRow({ ...unchecked, valueState: 'conflicting_sources' }))).toMatchObject({ kind: 'unverified', reason: 'conflicting', published: 8451291 })
    expect(valueOf(contractRow({ ...unchecked, valueState: 'invalid_source_value' }))).toMatchObject({ reason: 'invalid' })
    expect(valueOf(contractRow({ ...unchecked, valueState: 'not_applicable', valueStateRule: 'call_off_counted_with_framework' }))).toMatchObject({ reason: 'call-off' })
    expect(valueOf(contractRow({ ...unchecked, valueState: 'not_applicable', valueStateRule: 'duplicate' }))).toMatchObject({ reason: 'not-counted' })
    expect(valueOf(contractRow({ ...unchecked, valueState: 'ambiguous_grain' }))).toMatchObject({ reason: 'pending' })
    expect(valueOf(contractRow({ ...unchecked, valueState: 'foreign_currency_only', valueRon: null }))).toEqual({ kind: 'missing', reason: 'foreign' })
    expect(valueOf(contractRow({ ...unchecked, valueState: 'source_missing', valueRon: null }))).toEqual({ kind: 'missing', reason: 'none' })
  })
})

describe('the kind', () => {
  it('reads a call-off from its title, and a call-off naming its framework is not one', () => {
    expect(kindOf(contractRow(), 'Contract subsecvent nr. 3 la Acordul-cadru 12')).toBe('call-off')
    expect(kindOf(contractRow({ recordKind: 'framework_agreement' }), null)).toBe('framework')
    expect(kindOf(contractRow(), 'Lucrări')).toBe('award')
  })
})

describe('a contract read from its notice', () => {
  const sheet = contractSheetOf(cniRead())

  it('is an association: several firms at one value, a CUI-less row joined to its firm by name', () => {
    expect(sheet.contract.association).toBe(true)
    expect(sheet.contract.firms.map((firm) => firm.name)).toEqual(['Masterclass AG SRL', 'Project Office Studio S.R.L.', 'Migifra SRL'])
    expect(sheet.contract.firms.map((firm) => firm.cui)).toEqual(['18146760', '34570049', '4880340874'])
  })

  it('is published at three values, this page’s marked, the lowest first', () => {
    expect(sheet.contract.versions.map((version) => [version.value, version.isThis])).toEqual([
      [8451291, true],
      [180260321, false],
      [181271655, false],
    ])
  })

  it('keeps only the amendments filed under its own number', () => {
    expect(sheet.amendments.map((item) => item.number)).toEqual(['3', '5', '6', '9'])
  })

  it('reads an amendment’s values only with both ends, and checks them against the act’s own text', () => {
    const [three, five, six, nine] = sheet.amendments
    expect(three).toMatchObject({ before: null, after: null, stated: null, mismatch: false, date: '2023-04-18' })
    // „se majorează cu suma de 1.809.030,69 lei" — reported as +171,8 mil. (a typed „180" for „10").
    expect(five).toMatchObject({ stated: 1809030.69, mismatch: true, date: '2024-04-08' })
    expect(six).toMatchObject({ stated: -28209.4, mismatch: false })
    // The VAT rate going from 19% to 21%: the value without VAT rightly does not move.
    expect(nine).toMatchObject({ stated: null, mismatch: false })
  })

  it('says which act produced a published value, and that its values do not hold', () => {
    expect(sheet.contract.versions[1]).toMatchObject({ afterAmendment: '5', suspect: true })
    expect(sheet.contract.versions[2]).toMatchObject({ afterAmendment: null, suspect: false })
  })

  it('shows the procedure, its own, and its total when the notice holds more than this contract', () => {
    expect(sheet.procedure).toMatchObject({ id: '361648', unpublished: false, awardedTotal: null })
  })

  it('names the parties by the spine, the category by its label', () => {
    expect(sheet.authority.name).toBe('Compania Nationala de Investitii C.N.I. SA')
    expect(sheet.supplier.name).toBe('Masterclass AG SRL')
    expect(sheet.cpv).toEqual({ code: '45200000', label: { ro: 'Lucrări de construcţii complete sau parţiale şi lucrări publice', en: 'Works for complete or part construction and civil engineering work' } })
  })

  it('points at the award notice SEAP matched the export row to, without claiming its VAT basis', () => {
    expect(sheet.source).toMatchObject({ kind: 'export', file: { year: '2024', quarter: '2' } })
    expect(sheet.noticeUrl).toBe('https://e-licitatie.ro/pub/notices/ca-notices/view-c/100625175')
    expect(sheet.vatExcluded).toBe(false)
  })

  it('is whole when every read answered', () => {
    expect(sheet.partial).toBe(false)
  })
})

describe('a contract alone in its notice', () => {
  const sheet = contractSheetOf(plainRead())

  it('is neither an association nor several versions', () => {
    expect(sheet.contract.association).toBe(false)
    expect(sheet.contract.versions).toHaveLength(1)
    expect(sheet.others).toEqual([])
  })

  it('is the award notice’s own entry: its values without VAT, its page the source', () => {
    expect(sheet.vatExcluded).toBe(true)
    expect(sheet.source).toEqual({ kind: 'notice', url: 'https://e-licitatie.ro/pub/notices/ca-notices/view-c/100631627', file: null })
  })

  it('links its EU journal notice', () => {
    expect(sheet.procedure?.ted).toEqual({ no: '313170-2026', url: 'https://ted.europa.eu/ro/notice/-/detail/313170-2026' })
  })
})

describe('what the page will not say', () => {
  it('shows no procedure that is another institution’s, nor takes its title', () => {
    const read = cniRead()
    const legacy = contractSheetOf({
      ...read,
      contract: { ...read.contract, displayTitle: { text: 'Reabilitare Hârșova', source: 'procedure', sourceUrl: null } },
      procedure: { id: '1', procedureType: 'licitatie deschisa', authorityCui: '4288993', awardedValueRon: null },
    })
    expect(legacy.procedure).toBeNull()
    expect(legacy.title).toBeNull()
  })

  it('stands alone and says so when the notice or the names could not be read', () => {
    const alone = contractSheetOf(cniRead({ notice: { rows: [], full: false, failed: true } }))
    expect(alone).toMatchObject({ partial: true, noticeUnread: true })
    expect(alone.contract.firms).toHaveLength(1)
    expect(alone.contract.versions).toHaveLength(1)
    expect(contractSheetOf(cniRead({ names: { labels: new Map(), authority: null, cpv: new Map(), failed: true } })).partial).toBe(true)
  })

  it('does not take an unread notice for one holding nothing else: no unnumbered amendment, no notice-wide estimate', () => {
    const read = cniRead()
    const unnumbered = { id: '7', date: '2024-02-01', before: '1.00', after: '2.00', delta: '1.00', text: 'Act aditional', contractNo: null }
    const withUnnumbered = { ...read, contract: { ...read.contract, modifications: [...read.contract.modifications, unnumbered] } }
    expect(contractSheetOf(withUnnumbered).amendments.map((item) => item.id)).toContain('7')
    expect(contractSheetOf({ ...withUnnumbered, notice: { rows: [], full: false, failed: true } }).amendments.map((item) => item.id)).not.toContain('7')
    const plain = plainRead()
    const estimated = { ...plain, contract: { ...plain.contract, estimatedValueRon: '4300406164.41' } }
    expect(contractSheetOf(estimated).estimate).toBe(4300406164.41)
    expect(contractSheetOf({ ...estimated, notice: { rows: [], full: false, failed: true } }).estimate).toBeNull()
  })

  it('keeps an unnumbered contract’s amendments only when its notice holds nothing else', () => {
    const read = cniRead()
    const unnumbered = { ...read, contract: { ...read.contract, contractNo: null } }
    // Alone in a notice read whole: every act filed under it, whatever number it names.
    expect(contractSheetOf({ ...unnumbered, notice: { rows: [], full: false, failed: false } }).amendments).toHaveLength(5)
    expect(contractSheetOf({ ...unnumbered, notice: { rows: [], full: false, failed: true } }).amendments).toHaveLength(0)
  })

  it('marks a title that is the procedure’s own', () => {
    const read = cniRead()
    const borrowed = contractSheetOf({ ...read, contract: { ...read.contract, displayTitle: { text: 'Bazin de inot didactic', source: 'procedure', sourceUrl: null } } })
    expect(borrowed).toMatchObject({ title: 'Bazin de inot didactic', titleFromProcedure: true })
    expect(contractSheetOf(read).titleFromProcedure).toBe(false)
  })
})

describe('an act’s stated change', () => {
  it('is the one amount in lei, signed by the verb nearest before it', () => {
    expect(statedChange('pretul se majoreaza cu suma de 1.809.030,69 lei (exclusiv TVA)')).toBe(1809030.69)
    expect(statedChange('pretul se diminueaza cu suma de 28.209,40 lei')).toBe(-28209.4)
  })

  it('is none for VAT, a rate, a guarantee, two amounts, or no verb', () => {
    expect(statedChange('se majoreaza cu 1.000 lei inclusiv TVA')).toBeNull()
    expect(statedChange('se majoreaza cu 2.302,40 lei, ca urmare a modificarii cotei de TVA')).toBeNull()
    expect(statedChange('se majoreaza garantia de buna executie cu 5.000 lei')).toBeNull()
    expect(statedChange('se majoreaza cu 1.000 lei, de la 2.000 lei')).toBeNull()
    expect(statedChange('valoarea este 1.000 lei')).toBeNull()
  })
})

describe('the context', () => {
  it('has none to read without both CUIs, without a day, or before 2019', () => {
    const sheet = contractSheetOf(cniRead())
    expect(contractContextGapOf(sheet)).toBeNull()
    expect(contractContextInputOf(sheet)).toEqual({ id: '1745168', authorityCui: '14273221', supplierCui: '18146760', day: '2021-12-07' })
    expect(contractContextGapOf({ ...sheet, supplier: { ...sheet.supplier, cui: null } })).toBe('no-cui')
    expect(contractContextGapOf({ ...sheet, date: null })).toBe('no-date')
    expect(contractContextGapOf({ ...sheet, date: '2010-05-01' })).toBe('before-comparable')
  })

  it('collapses a contract’s rows around this one, and shows this page’s own value', () => {
    const sheet = contractSheetOf(cniRead())
    const newer = [
      contractRow({ id: '2188061', valueRon: '180260321.00' }),
      contractRow({ id: '900', contractNo: '132', contractDate: '2022-02-14', valueRon: '5500000.00', title: null }),
      contractRow({ id: '901', contractNo: '132', contractDate: '2022-02-14', valueRon: '5600000.00', title: null }),
    ]
    const older = [contractRow({ id: '1745170', supplier: { cui: '34570049', name: 'PROJECT OFFICE STUDIO' } })]
    const around = contractAroundOf(sheet, { rows: newer, full: false }, { rows: older, full: false })
    expect(around.map((other) => [other.id, other.value, other.rows])).toEqual([
      ['900', 5500000, 2],
      ['1745168', 8451291, 2],
    ])
  })

  it('leaves out a full side’s farthest contract, whose other rows may be past the page', () => {
    const sheet = contractSheetOf(cniRead())
    const newer = [
      contractRow({ id: '2188061', valueRon: '180260321.00' }),
      contractRow({ id: '800', contractNo: '100', contractDate: '2022-01-10', valueRon: '100.00' }),
      contractRow({ id: '900', contractNo: '132', contractDate: '2022-02-14', valueRon: '5500000.00' }),
    ]
    const around = contractAroundOf(sheet, { rows: newer, full: true }, { rows: [], full: false })
    expect(around.map((other) => other.id)).toEqual(['800', '1745168'])
    // This contract's own rows are never left out, even when they fill the side.
    expect(contractAroundOf(sheet, { rows: [contractRow({ id: '2188061', valueRon: '180260321.00' })], full: true }, { rows: [], full: false }).map((other) => other.id)).toEqual(['1745168'])
  })
})
