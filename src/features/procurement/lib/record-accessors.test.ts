import { describe, expect, it } from 'vitest'
import type {
  ContractModificationRecord,
  ContractRecordSummary,
  DirectAcquisitionRecord,
  ProcedureRecord,
  ValueResolution,
} from '@/schemas/procurement'
import {
  recordDate,
  recordDetailLink,
  recordNumberLabel,
  recordPrimaryMoney,
  recordSupplier,
  recordTitle,
  uiGrainOf,
} from './record-accessors'

const party = { cui: '1', name: 'X', displayName: 'X' }

const resolution = (over: Partial<ValueResolution> = {}): ValueResolution => ({
  valueState: 'source_missing',
  valueStateRule: null,
  valueAccepted: false,
  valueRonComparable: null,
  valueComparableBasis: null,
  valueRulesVersion: 2,
  valueResolvedAt: null,
  ...over,
})

const accepted = (ron: string): ValueResolution =>
  resolution({
    valueState: 'official_exact',
    valueStateRule: 'own_value',
    valueAccepted: true,
    valueRonComparable: ron,
    valueComparableBasis: 'official',
  })

const procedure: ProcedureRecord = {
  id: 'p1',
  grain: 'procedure',
  noticeNo: 'CN100',
  noticeKind: null,
  procedureType: null,
  contractKind: null,
  title: 'Procedura',
  authority: party,
  cpvCode: null,
  cpvDivisionCode: null,
  estimatedValueRon: '50.00',
  awardedValueRon: '40.00',
  currency: null,
  value: accepted('40.00'),
  status: 'awarded',
  countyName: null,
  publicationDate: null,
  stateDate: '2025-02-01',
  sourceSystem: 'seap_notice',
  sourceUrl: null,
  isCanonical: true,
  dupGroupId: null,
}

const contract: ContractRecordSummary = {
  id: 'c1',
  grain: 'contract',
  contractNo: '77',
  contractDate: '2025-03-01',
  procedureId: null,
  noticeNo: 'CN100',
  title: 'Contract',
  authority: party,
  supplier: party,
  cpvCode: '45453000',
  cpvDivisionCode: '45',
  valueRon: '10.00',
  estimatedValueRon: null,
  currency: null,
  value: accepted('10.00'),
  status: 'awarded',
  sourceSystem: 'seap_contracts',
  sourceUrl: null,
  isCanonical: true,
  dupGroupId: null,
  canonicalValueSource: 'seap_own',
  valueDisagreement: false,
  modifications: [],
}

const da: DirectAcquisitionRecord = {
  id: 'da1',
  grain: 'direct_acquisition',
  uniqueCode: 'DA1',
  title: null,
  authority: party,
  supplier: party,
  cpvCode: null,
  cpvDivisionCode: null,
  valueRon: null,
  estimatedValueRon: null,
  currency: 'EUR',
  value: resolution({ valueState: 'foreign_currency_only' }),
  status: 'unknown',
  stateId: null,
  countyName: null,
  publicationDate: null,
  finalizationDate: '2025-04-01',
  sourceSystem: 'seap_dan',
  sourceUrl: null,
  isCanonical: true,
  dupGroupId: null,
}

const linkedModification: ContractModificationRecord = {
  id: 'm1',
  grain: 'modification',
  contractId: 'c1',
  linkMethod: 'notice_no',
  linkConfidence: 1,
  modificationDate: '2025-05-01',
  valueBeforeRon: '10.00',
  valueAfterRon: '8.00',
  valueDeltaRon: '-2.00',
  modificationType: 'ACT ADITIONAL',
  authority: party,
  supplier: party,
  contractNo: '77',
  noticeNo: null,
  sourceUrl: null,
  parentContract: null,
}

describe('record accessors', () => {
  it('resolves per-grain dates with honest fallbacks', () => {
    expect(recordDate(procedure)).toBe('2025-02-01') // stateDate fallback
    expect(recordDate(contract)).toBe('2025-03-01')
    expect(recordDate(da)).toBe('2025-04-01') // finalization fallback
    expect(recordDate(linkedModification)).toBe('2025-05-01')
  })

  it('resolves identifiers and titles per grain', () => {
    expect(recordNumberLabel(procedure)).toBe('CN100')
    expect(recordNumberLabel(contract)).toBe('77')
    expect(recordNumberLabel(da)).toBe('DA1')
    expect(recordTitle(linkedModification)).toBe('ACT ADITIONAL')
  })

  it('procedures have no supplier', () => {
    expect(recordSupplier(procedure)).toBeNull()
    expect(recordSupplier(contract)).toBe(party)
  })

  it('primary money: awarded for procedures, delta for modifications, null when absent', () => {
    expect(recordPrimaryMoney(procedure)?.valueRon).toBe('40.00')
    expect(recordPrimaryMoney(linkedModification)?.valueRon).toBe('-2.00')
    expect(recordPrimaryMoney(da)?.valueRon).toBeNull()
    expect(
      recordPrimaryMoney({ ...linkedModification, valueDeltaRon: null }),
    ).toBeNull()
  })

  it('maps union members to UI grains', () => {
    expect(uiGrainOf(procedure)).toBe('procedures')
    expect(uiGrainOf(da)).toBe('direct_acquisitions')
  })

  it('links modifications to the parent contract trail anchor', () => {
    expect(recordDetailLink(linkedModification)).toEqual({
      to: '/procurement/contracts/$id',
      params: { id: 'c1' },
      hash: 'modificari',
    })
  })

  it('unlinked modifications have no destination', () => {
    expect(
      recordDetailLink({ ...linkedModification, contractId: null }),
    ).toBeNull()
  })
})
