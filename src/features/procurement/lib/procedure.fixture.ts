import type { RawProcedurePage } from '../api/graphql/procurement-procedure-queries'
import { procedureReadOf } from '../api/procurement-procedure-api'
import { NO_NAMES, type DpNames } from './direct-purchase-model'
import type { ProcedureRead } from './procedure-model'

/**
 * The procedure page's test records: the dev API's answers for real notices
 * (2 October 2026), trimmed to what the page reads.
 */

type RawProcedure = RawProcedurePage['procedure']
type RawContract = RawProcedurePage['contracts'][number]

const CNIR = { cui: '36727850', name: 'COMPANIA NATIONALA DE INVESTITII RUTIERE S.A.' }

function procedure(fields: Partial<RawProcedure>): RawProcedure {
  return {
    id: '1',
    noticeNo: null,
    noticeKind: null,
    procedureType: 'Licitatie deschisa',
    title: null,
    authority: CNIR,
    cpvCode: null,
    estimatedValueRon: null,
    awardedValueRon: null,
    status: 'awarded',
    publicationDate: null,
    sourceSystem: 'elicitatie',
    sourceUrl: null,
    value: { valueAccepted: true, valueRonComparable: null },
    ...fields,
  }
}

function contract(id: string, supplier: { readonly cui: string | null; readonly name: string }, fields: Partial<RawContract> = {}): RawContract {
  return { id, contractNo: '101/1888', contractDate: '2025-03-31', recordKind: 'contract_award', valueRon: '6142792901.00', authority: CNIR, supplier, value: { valueAccepted: true, valueRonComparable: null }, ...fields }
}

/** CNIR's motorway (CAN1145385): one contract of a four-firm association, a row per member at the whole value — one member twice, once without a CUI. */
export function cnirRaw(): RawProcedurePage {
  return {
    procedure: procedure({
      id: '337399',
      noticeNo: 'CAN1145385',
      noticeKind: 'award_no_init',
      title: 'Proiectare și Execuție AUTOSTRADA TARGU MURES-TARGU NEAMT SECTIUNEA II MIERCUREA NIRAJULUI – LEGHIN LOT 2 A: DITRAU-GRINTIES.',
      cpvCode: '45233100',
      estimatedValueRon: '6142792901.06',
      awardedValueRon: '6142792901.06',
      sourceUrl: 'https://e-licitatie.ro/api-pub/C_PUBLIC_CANotice/get/100578781',
    }),
    contracts: [
      contract('2435981', { cui: null, name: 'Euro-Asfalt' }),
      contract('2137333', { cui: '17042060', name: 'TEHNOSTRADE S.R.L.' }),
      contract('2137332', { cui: '9942680', name: 'SPEDITION UMB' }),
      contract('2137331', { cui: '31994414', name: 'SA & PE CONSTRUCT SRL' }, { value: { valueAccepted: false, valueRonComparable: null } }),
      contract('2137330', { cui: null, name: 'Euro-Asfalt' }),
    ],
    ted: { tedNoticeNo: '644509-2025' },
  }
}

/** Nuclearelectrica's 2009 call (no. 92137): no title, and two contracts of other institutions joined by the bare number. */
export function legacyRaw(): RawProcedurePage {
  return {
    procedure: procedure({
      id: '35106757',
      noticeNo: '92137',
      noticeKind: 'initiation',
      authority: { cui: '10874881', name: 'Societatea Nationala NUCLEARELECTRICA S.A.' },
      cpvCode: '31711150',
      estimatedValueRon: '183967.29',
      status: 'unknown',
      publicationDate: '2009-12-10',
      sourceSystem: 'seap_notice',
      sourceUrl: 'https://data.gov.ro/dataset/4ef49452/resource/3225df1f/download/anunturi-participare-2009.xls',
      value: { valueAccepted: false, valueRonComparable: null },
    }),
    contracts: [
      contract('183506531', { cui: '1565534', name: 'ROTARY CONSTRUCTII S.R.L.' }, { contractNo: '89', contractDate: '2010-06-30', valueRon: '37817489.22', authority: { cui: '4267117', name: 'MUNICIPIUL BUCURESTI' } }),
      contract('183506532', { cui: '2817250', name: 'SISANELU FOREXIM S.R.L.' }, { contractNo: null, contractDate: '2009-10-26', valueRon: '89469.58', authority: { cui: '2845710', name: 'SCOALA CU CLS.I-VIII MIHAI EMINESCU PLOIESTI' } }),
    ],
    ted: null,
  }
}

/** Municipiul Hunedoara's cancelled award notice (CAN1170259): no contract linked, 0.00 for its values. */
export function cancelledRaw(): RawProcedurePage {
  return {
    procedure: procedure({
      id: '9422546',
      noticeNo: 'CAN1170259',
      noticeKind: 'award_no_init',
      title: 'Execuție lucrări de eficientizare energetică',
      authority: { cui: '4374946', name: 'Municipiul Hunedoara' },
      estimatedValueRon: '0.00',
      awardedValueRon: '0.00',
      status: 'cancelled',
      value: { valueAccepted: false, valueRonComparable: null },
    }),
    contracts: [],
    ted: null,
  }
}

/** A framework notice whose rows fill the API's page: fifty rows, no total. */
export function cappedRaw(): RawProcedurePage {
  return {
    procedure: procedure({ id: '352140', noticeNo: 'CAN1150526', noticeKind: 'award_no_init', title: 'Acord-cadru 48 de luni furnizare Produse farmaceutice', awardedValueRon: '557085.90' }),
    contracts: Array.from({ length: 50 }, (_, index) =>
      contract(String(5000 + index), { cui: String(1000 + (index % 7)), name: `FARMA ${index % 7} SRL` }, { contractNo: `364.${index}`, contractDate: '2025-07-01', recordKind: 'framework_agreement', valueRon: '1000.00' }),
    ),
    ted: null,
  }
}

export function readOf(raw: RawProcedurePage, names: DpNames = NO_NAMES): ProcedureRead {
  return procedureReadOf(raw, names)
}
