import type { DaDetail, DirectAcquisitionRecord } from '@/schemas/procurement'
import { mapDirectPurchase, type DirectPurchase, type DpContext, type DpNames } from './direct-purchase-model'

/**
 * Direct purchases as the API answers them, drawn from real SEAP records (read
 * 2026-09-28): the National Bank's flowers — a ten-line basket in the page's
 * tests, three lines here — and the variations the page must say differently.
 */

type DaItem = DaDetail['items'][number]

export function daRecord(fields: Partial<DirectAcquisitionRecord> = {}): DirectAcquisitionRecord {
  return {
    id: '10120196',
    grain: 'direct_acquisition',
    uniqueCode: 'DA39664537',
    title: 'Aranjamente florale',
    authority: { cui: '361684', name: 'BANCA NATIONALA A ROMANIEI', displayName: 'BANCA NATIONALA A ROMANIEI' },
    supplier: { cui: '9446547', name: 'FLORARIA IRIS', displayName: 'FLORARIA IRIS' },
    cpvCode: '03121210',
    cpvDivisionCode: '03',
    valueRon: '98448.00',
    estimatedValueRon: '98448.00',
    currency: null,
    value: {
      valueState: 'official_exact',
      valueStateRule: 'own_value',
      valueAccepted: true,
      valueRonComparable: '98448.00',
      valueComparableBasis: 'official',
      valueRulesVersion: 5,
      valueResolvedAt: null,
    },
    status: 'finalized',
    stateId: null,
    countyName: null,
    publicationDate: '2026-01-16',
    finalizationDate: '2026-01-21',
    sourceSystem: 'elicitatie_da',
    sourceUrl: 'https://e-licitatie.ro/pub/direct-acquisition/view/121372731',
    isCanonical: true,
    dupGroupId: null,
    ...fields,
  }
}

export function daItem(itemIndex: number, fields: Partial<DaItem> = {}): DaItem {
  return {
    id: `item-${itemIndex}`,
    itemIndex,
    catalogItemCode: `B${itemIndex}`,
    catalogItemName: 'ARANJAMENT FLORAL MIC',
    catalogItemDescription: 'ARANJAMENT FLORAL MIC',
    itemMeasureUnit: 'bucata',
    cpvCode: '03121210-0',
    cpvText: 'Aranjamente florale (Rev.2)',
    itemQuantity: '150',
    unitPrice: '70',
    unitEstimatedPrice: '70',
    catalogUnitPrice: '70',
    lineValue: '10500',
    sourceUrl: 'https://e-licitatie.ro/pub/direct-acquisition/view/121372731',
    ...fields,
  }
}

/** Three of the ten lines: two funeral wreaths and the small arrangements, adding up to the value. */
export function daDetail(fields: Partial<DaDetail> = {}): DaDetail {
  return {
    description: 'Diverse aranjamente florale',
    deliveryCondition: 'Livrarea se va face la sediul beneficiarului doar in urma transmiterii unei comenzi',
    paymentCondition: 'Plata se va face cu OP in termen de 15 zile',
    contractTypeText: 'Furnizare',
    isEuFunded: false,
    euFundText: null,
    caDecisionDate: '2026-01-21T07:19:29Z',
    caDecisionDeadline: '2026-01-22T15:00:00Z',
    supplierDecisionDate: '2026-01-17T12:25:04Z',
    supplierDecisionDeadline: '2026-01-22T15:00:00Z',
    caRejectionReason: null,
    supplierRejectionReason: null,
    correctionReason: null,
    documentCount: 0,
    itemCount: 3,
    itemsTotal: '98448',
    itemsValueDelta: '0',
    itemsReconciled: true,
    textRedacted: false,
    sourceUrl: 'https://e-licitatie.ro/pub/direct-acquisition/view/121372731',
    items: [
      daItem(5, { catalogItemName: 'COROANA FUNERARA MODEL I', catalogItemDescription: 'COROANA FUNERARA MODEL I', itemQuantity: '30', unitPrice: '1000', catalogUnitPrice: '1000', lineValue: '30000' }),
      daItem(6, { catalogItemName: 'COROANA FUNERARA MODEL II', catalogItemDescription: 'COROANA FUNERARA MODEL II', itemQuantity: '30', unitPrice: '700', catalogUnitPrice: '700', lineValue: '21000' }),
      daItem(2, { itemQuantity: '659', unitPrice: '72', catalogUnitPrice: '72', lineValue: '47448' }),
    ],
    ...fields,
  }
}

export const NAMES: DpNames = {
  labels: new Map([
    ['361684', 'BANCA NATIONALA A ROMANIEI'],
    ['9446547', 'FLORARIA IRIS SRL'],
  ]),
  authority: null,
  cpv: new Map([['03121210', { ro: 'Aranjamente florale', en: 'Floral arrangements' }]]),
  failed: false,
}

export function directPurchase(
  record: Partial<DirectAcquisitionRecord> = {},
  detail: Partial<DaDetail> | null = {},
  names: DpNames = NAMES,
  duplicates: readonly string[] = [],
): DirectPurchase {
  return mapDirectPurchase(daRecord(record), detail === null ? null : daDetail(detail), detail === null ? 'NOT_CAPTURED' : 'AVAILABLE', names, duplicates)
}

/** The flowers' context in 2026 through May: the firm sixth of 47 for the bank, the bank second of 7 for the firm. */
export function dpContext(fields: Partial<DpContext> = {}): DpContext {
  return {
    year: 2026,
    through: '2026-05',
    years: [
      { year: 2023, count: 12, value: 117940 },
      { year: 2024, count: 3, value: 78670 },
      { year: 2025, count: 1, value: 62708 },
      { year: 2026, count: 1, value: 98448 },
    ],
    last: { year: 2026, through: '2026-05' },
    records: { count: 17, estimated: false },
    pair: { count: 1, value: 98448 },
    buyer: { count: 142, value: 1764398.02, sellers: 47, more: false, rank: 6 },
    seller: { count: 13, value: 352289, clients: 7, more: false, rank: 2 },
    others: [
      { id: '10120196', code: 'DA39664537', title: 'Aranjamente florale', value: 98448, date: '2026-01-21', done: true },
      { id: '9593263', code: 'DA38381481', title: 'Diferite aranjamente florale', value: 62708, date: '2025-06-23', done: true },
      { id: '9576816', code: 'DA38340653', title: 'Diferite aranjamente florale', value: 62708, date: '2025-06-18', done: false },
    ],
    partial: false,
    ...fields,
  }
}
