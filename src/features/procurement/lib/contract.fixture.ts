import { NO_NAMES, type DpNames } from './direct-purchase-model'
import type { ContractRead, ContractRow, CtContext } from './contract-model'

/**
 * Contracts as the dev API served them on 28 September 2026, trimmed: CNI's
 * swimming pool (a three-firm association, three published values, the
 * amendments filed under its number — act nr. 5's reported values disagree
 * with its own text, act nr. 9 changes only the VAT rate) and a plain
 * one-firm contract.
 */

export function contractRow(fields: Partial<ContractRow> = {}): ContractRow {
  return {
    id: '1745168',
    contractNo: '1065',
    contractDate: '2021-12-07',
    noticeNo: 'SCNA1063044',
    title: null,
    supplier: { cui: '18146760', name: 'MASTERCLASS AG' },
    valueRon: '8451291.00',
    currency: null,
    valueState: 'official_exact',
    valueStateRule: 'own_value',
    valueAccepted: true,
    recordKind: 'contract_award',
    ...fields,
  }
}

const CNI_NAMES: DpNames = {
  labels: new Map([
    ['14273221', 'COMPANIA NATIONALA DE INVESTITII C.N.I. SA'],
    ['18146760', 'MASTERCLASS AG SRL'],
    ['34570049', 'PROJECT OFFICE STUDIO S.R.L.'],
  ]),
  authority: null,
  cpv: new Map([['45200000', { ro: 'Lucrări de construcţii complete sau parţiale şi lucrări publice', en: 'Works for complete or part construction and civil engineering work' }]]),
  failed: false,
}

/** The three firms under nr. 1065 at each of its three values; one row names Migifra without its CUI. */
function cniRows(): readonly ContractRow[] {
  const firms = [
    { cui: '34570049', name: 'PROJECT OFFICE STUDIO' },
    { cui: '4880340874', name: 'MIGIFRA SRL' },
    { cui: '18146760', name: 'MASTERCLASS AG' },
  ]
  return [
    ...firms.map((supplier, index) => contractRow({ id: `218806${3 - index}`, supplier, valueRon: '180260321.00' })),
    contractRow({ id: '1745170', supplier: firms[0] }),
    contractRow({ id: '1745169', supplier: { cui: null, name: 'MIGIFRA SRL' } }),
    contractRow({ id: '1745168', supplier: firms[2] }),
    ...firms.map((supplier, index) => contractRow({ id: `263793${5 - index}`, supplier, valueRon: '181271655.00', contractDate: '2021-07-12' })),
  ]
}

export function cniRead(fields: Partial<ContractRead> = {}): ContractRead {
  return {
    contract: {
      ...contractRow(),
      supplier: { cui: '18146760', name: 'MASTERCLASS AG' },
      displayTitle: {
        text: 'Proiectare – faza adaptare la amplasament, executie lucrari si asistenta tehnica din partea proiectantului, aferente obiectivului de investitii – „Bazin de inot didactic, Sanandrei"',
        source: 'matched_award',
        sourceUrl: 'https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100625175',
      },
      authority: { cui: '14273221', name: 'COMPANIA NATIONALA DE INVESTITII SA', displayName: 'COMPANIA NATIONALA DE INVESTITII SA' },
      cpvCode: '45200000-9',
      estimatedValueRon: null,
      sourceSystem: 'seap_contracts',
      sourceUrl: 'https://data.gov.ro/dataset/ed84773a/resource/c5f1fefc/download/datagov-raport-contracte-publicate-t-ii-2024.csv',
      valueComparable: '8451291.00',
      modifications: [
        {
          id: '47228',
          date: '2024-09-04',
          before: null,
          after: null,
          delta: '8451291.00',
          text: 'Prin actul aditional nr. 3/18.04.2023 se modifica termenul de finalizare a lucrarilor pana la data de 14.10.2023.',
          contractNo: '1065',
        },
        {
          id: '59361',
          date: '2025-05-19',
          before: '8451291.18',
          after: '180260321.90',
          delta: '171809030.72',
          text: 'Actul aditional nr. 5./08.04.2024 incheiat in baza art. 221, alin. (1), lit. a) si e) din Legea 98/2016, pretul se majoreaza cu suma de 1.809.030,69 lei (exclusiv TVA).',
          contractNo: '1065',
        },
        {
          id: '68652',
          date: null,
          before: '180260321.90',
          after: '180232112.50',
          delta: '-28209.40',
          text: 'Actul aditional nr. 6./09.05.2025 incheiat in baza art. 221, alin. (1), lit. f) din Legea 98/2016, pretul platibil anteprenorului se diminueaza cu suma de 28.209,40 lei.',
          contractNo: '1065',
        },
        {
          id: '68671',
          date: null,
          before: '181271655.50',
          after: '181271655.50',
          delta: '0.00',
          text: 'Actul aditional nr. 9/28.11.2025 incheiat in baza art. 221, alin. (1), lit. e) din Legea 98/2016, pretul platibil antreprenorului se majoreaza cu suma de 2.302,40 lei, ca urmare a modificarii cotei de TVA de la 19% la 21%.',
          contractNo: '1065',
        },
        // Filed under the notice, but another contract's.
        { id: '90001', date: '2024-01-10', before: '100.00', after: '200.00', delta: '100.00', text: 'Actul aditional nr. 1 la contractul 1066', contractNo: '1066' },
      ],
    },
    procedure: { id: '361648', procedureType: 'Procedura simplificata', authorityCui: '14273221', awardedValueRon: '181887293.77' },
    ted: null,
    duplicates: [],
    notice: { rows: cniRows(), full: false, failed: false },
    names: CNI_NAMES,
    source: null,
    ...fields,
  }
}

/** One firm, one value, an award notice's own entry (its values without VAT). */
export function plainRead(fields: Partial<ContractRead> = {}): ContractRead {
  const row = contractRow({
    id: '51025676',
    contractNo: '92/58718',
    contractDate: '2026-04-29',
    noticeNo: 'CAN1167178',
    title: 'Proiectare si Executie Autostrada Pascani-Suceava Lot 1',
    supplier: { cui: '17042060', name: 'TEHNOSTRADE SRL' },
    valueRon: '3068398862.94',
  })
  return {
    contract: {
      ...row,
      displayTitle: null,
      authority: { cui: '16054368', name: 'COMPANIA NATIONALA DE ADMINISTRARE A INFRASTRUCTURII RUTIERE S.A.', displayName: null },
      cpvCode: '45233100-0',
      estimatedValueRon: null,
      sourceSystem: 'elicitatie_ca_award',
      sourceUrl: 'https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100631627',
      valueComparable: '3068398862.94',
      modifications: [],
    },
    procedure: { id: '51000001', procedureType: 'licitatie deschisa', authorityCui: '16054368', awardedValueRon: '3068398862.94' },
    ted: { tedNoticeNo: '313170-2026' },
    duplicates: [],
    notice: { rows: [row], full: false, failed: false },
    names: { ...NO_NAMES, labels: new Map([['16054368', 'Compania Naţională de Administrare a Infrastructurii Rutiere S.A.'], ['17042060', 'TEHNOSTRADE SRL']]) },
    source: null,
    ...fields,
  }
}

export function ctContext(fields: Partial<CtContext> = {}): CtContext {
  return {
    year: 2021,
    through: null,
    years: [
      { year: 2019, awards: 2, frameworks: 0, direct: 0, directLei: null },
      { year: 2020, awards: 4, frameworks: 0, direct: 1, directLei: 12000 },
      { year: 2021, awards: 15, frameworks: 1, direct: 0, directLei: null },
    ],
    inProgress: null,
    pair: { awards: 15, frameworks: 1 },
    buyer: { awards: 1447, frameworks: 12 },
    seller: { awards: 16 },
    records: 30,
    around: [],
    partial: false,
    ...fields,
  }
}
