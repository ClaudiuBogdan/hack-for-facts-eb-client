/**
 * A local stand-in for the entity page's data, for when the API is not running.
 *
 * The harness is a `yarn dev` surface and the GraphQL server is a separate
 * repo, so the common case while working on this page is that every query
 * fails. The identity, totals, population and the three-year trend below are
 * the recorded response in `tests/fixtures/entity-details-flow/`
 * (Municipiul Cluj-Napoca, 2025); the line items, the two earlier trend years,
 * the subordinates and the reports are invented to be *plausible in shape*,
 * and are derived from the recorded totals so the ledger sums to the headline.
 *
 * Three things keep it honest (same rules as `home-refs.search-local.ts`):
 * 1. `source: 'local'` travels with the data and the page labels it on screen.
 * 2. It is imported only by the prototype, which is DEV-only.
 * 3. Nothing here is asserted as a fact about Cluj-Napoca beyond the recorded
 *    fields.
 */
import type { ExecutionLineItem } from '@/lib/api/entities'
import type { EntityPageData, EntityPageTrendPoint } from './entity-page.types'

const TOTAL_INCOME = 2_113_522_844.1
const TOTAL_EXPENSES = 1_627_387_390.88
const YEAR = 2025

type Share = {
  readonly fn: readonly [code: string, name: string]
  readonly ec: readonly [code: string, name: string]
  readonly share: number
  readonly expenseType?: 'dezvoltare' | 'functionare'
  readonly anomaly?: ExecutionLineItem['anomaly']
}

/** Expense composition by functional chapter and economic title. Shares sum to 1. */
const EXPENSE_SHARES: readonly Share[] = [
  { fn: ['65', 'Învățământ'], ec: ['10', 'Cheltuieli de personal'], share: 0.062, expenseType: 'functionare' },
  { fn: ['65', 'Învățământ'], ec: ['20', 'Bunuri și servicii'], share: 0.041, expenseType: 'functionare' },
  { fn: ['65', 'Învățământ'], ec: ['71', 'Active nefinanciare'], share: 0.058, expenseType: 'dezvoltare' },
  { fn: ['84', 'Transporturi'], ec: ['40', 'Subvenții'], share: 0.094, expenseType: 'functionare' },
  { fn: ['84', 'Transporturi'], ec: ['71', 'Active nefinanciare'], share: 0.121, expenseType: 'dezvoltare' },
  { fn: ['84', 'Transporturi'], ec: ['20', 'Bunuri și servicii'], share: 0.037, expenseType: 'functionare' },
  { fn: ['70', 'Locuințe, servicii și dezvoltare publică'], ec: ['71', 'Active nefinanciare'], share: 0.083, expenseType: 'dezvoltare' },
  { fn: ['70', 'Locuințe, servicii și dezvoltare publică'], ec: ['20', 'Bunuri și servicii'], share: 0.052, expenseType: 'functionare' },
  { fn: ['68', 'Asigurări și asistență socială'], ec: ['57', 'Asistență socială'], share: 0.061, expenseType: 'functionare' },
  { fn: ['68', 'Asigurări și asistență socială'], ec: ['10', 'Cheltuieli de personal'], share: 0.034, expenseType: 'functionare' },
  { fn: ['51', 'Autorități publice și acțiuni externe'], ec: ['10', 'Cheltuieli de personal'], share: 0.049, expenseType: 'functionare' },
  { fn: ['51', 'Autorități publice și acțiuni externe'], ec: ['20', 'Bunuri și servicii'], share: 0.018, expenseType: 'functionare' },
  { fn: ['67', 'Cultură, recreere și religie'], ec: ['51', 'Transferuri între unități ale administrației publice'], share: 0.036, expenseType: 'functionare' },
  { fn: ['67', 'Cultură, recreere și religie'], ec: ['71', 'Active nefinanciare'], share: 0.027, expenseType: 'dezvoltare' },
  { fn: ['66', 'Sănătate'], ec: ['51', 'Transferuri între unități ale administrației publice'], share: 0.031, expenseType: 'functionare' },
  { fn: ['66', 'Sănătate'], ec: ['71', 'Active nefinanciare'], share: 0.022, expenseType: 'dezvoltare', anomaly: 'YTD_ANOMALY' },
  { fn: ['74', 'Protecția mediului'], ec: ['20', 'Bunuri și servicii'], share: 0.046, expenseType: 'functionare' },
  { fn: ['74', 'Protecția mediului'], ec: ['71', 'Active nefinanciare'], share: 0.019, expenseType: 'dezvoltare' },
  { fn: ['61', 'Ordine publică și siguranță națională'], ec: ['10', 'Cheltuieli de personal'], share: 0.028, expenseType: 'functionare' },
  { fn: ['81', 'Combustibili și energie'], ec: ['40', 'Subvenții'], share: 0.033, expenseType: 'functionare' },
  { fn: ['55', 'Tranzacții privind datoria publică'], ec: ['30', 'Dobânzi'], share: 0.014, expenseType: 'functionare' },
  { fn: ['55', 'Tranzacții privind datoria publică'], ec: ['81', 'Rambursări de credite'], share: 0.021, expenseType: 'functionare' },
  { fn: ['54', 'Alte servicii publice generale'], ec: ['20', 'Bunuri și servicii'], share: 0.008, expenseType: 'functionare' },
  { fn: ['87', 'Alte acțiuni economice'], ec: ['59', 'Alte cheltuieli'], share: 0.005, expenseType: 'functionare' },
]

/** Income composition by chapter. Shares sum to 1. */
const INCOME_SHARES: readonly Share[] = [
  { fn: ['04.02', 'Cote și sume defalcate din impozitul pe venit'], ec: ['04.02.01', 'Cote defalcate din impozitul pe venit'], share: 0.412 },
  { fn: ['11.02', 'Sume defalcate din TVA'], ec: ['11.02.02', 'Sume defalcate din TVA pentru finanțarea cheltuielilor descentralizate'], share: 0.118 },
  { fn: ['07.02', 'Impozite și taxe pe proprietate'], ec: ['07.02.01', 'Impozit și taxă pe clădiri'], share: 0.097 },
  { fn: ['07.02', 'Impozite și taxe pe proprietate'], ec: ['07.02.02', 'Impozit și taxă pe teren'], share: 0.021 },
  { fn: ['16.02', 'Taxe pe utilizarea bunurilor'], ec: ['16.02.02', 'Impozit pe mijloacele de transport'], share: 0.034 },
  { fn: ['48.02', 'Sume primite de la UE'], ec: ['48.02.01', 'Fondul European de Dezvoltare Regională'], share: 0.126 },
  { fn: ['42.02', 'Subvenții de la bugetul de stat'], ec: ['42.02.65', 'Finanțarea PNDL / Anghel Saligny'], share: 0.071 },
  { fn: ['33.02', 'Venituri din prestări de servicii'], ec: ['33.02.08', 'Venituri din prestări de servicii'], share: 0.043 },
  { fn: ['30.02', 'Venituri din proprietate'], ec: ['30.02.05', 'Venituri din concesiuni și închirieri'], share: 0.039 },
  { fn: ['35.02', 'Amenzi, penalități și confiscări'], ec: ['35.02.01', 'Venituri din amenzi'], share: 0.022 },
  { fn: ['39.02', 'Venituri din valorificarea unor bunuri'], ec: ['39.02.07', 'Venituri din vânzarea unor bunuri'], share: 0.017 },
]

function toLineItems(
  shares: readonly Share[],
  category: 'ch' | 'vn',
  total: number,
): readonly ExecutionLineItem[] {
  return shares.map((row, index) => {
    const ytd = Math.round(total * row.share * 100) / 100
    return {
      line_item_id: `${category}-${String(index + 1).padStart(3, '0')}`,
      account_category: category,
      funding_source_id: 1,
      expense_type: row.expenseType,
      anomaly: row.anomaly,
      functionalClassification: { functional_code: row.fn[0], functional_name: row.fn[1] },
      economicClassification: { economic_code: row.ec[0], economic_name: row.ec[1] },
      ytd_amount: ytd,
      quarterly_amount: Math.round((ytd / 2) * 100) / 100,
      monthly_amount: Math.round((ytd / 6) * 100) / 100,
      amount: ytd,
    }
  })
}

/** 2023–2025 are recorded; 2021–2022 are invented to give the chart a run-up. */
const TREND: readonly EntityPageTrendPoint[] = [
  { year: 2021, income: 1_402_118_640.55, expenses: 1_298_402_117.3 },
  { year: 2022, income: 1_611_940_226.9, expenses: 1_524_671_805.12 },
  { year: 2023, income: 1_812_905_715.22, expenses: 1_469_069_553.2 },
  { year: 2024, income: 2_100_458_265.43, expenses: 3_322_835_352.44 },
  { year: 2025, income: TOTAL_INCOME, expenses: TOTAL_EXPENSES },
]

export const ENTITY_PAGE_FIXTURE: EntityPageData = {
  source: 'local',
  entity: {
    cui: '4305857',
    name: 'MUNICIPIUL CLUJ-NAPOCA',
    address: 'Cluj, Municipiul Cluj-Napoca, Strada Moților nr. 1-3, cod poștal 400001',
    default_report_type: 'PRINCIPAL_AGGREGATED',
    entity_type: 'admin_municipality',
    is_uat: true,
    is_territorial_executive: false,
    uat: {
      county_name: 'CLUJ',
      county_code: 'CJ',
      name: 'MUNICIPIUL CLUJ-NAPOCA',
      siruta_code: 54975,
      population: 286_598,
      county_entity: { cui: '4288110', name: 'JUDETUL CLUJ' },
    },
    parents: [],
    totalIncome: TOTAL_INCOME,
    totalExpenses: TOTAL_EXPENSES,
    budgetBalance: TOTAL_INCOME - TOTAL_EXPENSES,
  },
  entityKindLabel: 'Municipiu',
  period: {
    year: YEAR,
    label: 'Ian.–Iun. 2025',
    provenance: 'MFIN · execuție la 30 iun. 2025 · date operative',
    availableYears: [2021, 2022, 2023, 2024, 2025],
  },
  lineItems: [
    ...toLineItems(EXPENSE_SHARES, 'ch', TOTAL_EXPENSES),
    ...toLineItems(INCOME_SHARES, 'vn', TOTAL_INCOME),
  ],
  trend: TREND,
  subordinates: [
    { cui: '13929670', name: 'Direcția de Asistență Socială și Medicală Cluj-Napoca', kind: 'Serviciu public', totalExpenses: 98_214_500.4 },
    { cui: '4288055', name: 'Spitalul Clinic Municipal Cluj-Napoca', kind: 'Unitate sanitară', totalExpenses: 71_902_311.15 },
    { cui: '4547340', name: 'Casa de Cultură a Municipiului Cluj-Napoca', kind: 'Instituție de cultură', totalExpenses: 12_480_902.7 },
    { cui: '4305946', name: 'Serviciul Public pentru Administrarea Parcărilor', kind: 'Serviciu public', totalExpenses: 9_733_120.02 },
    { cui: '4305971', name: 'Grădina Botanică „Alexandru Borza”', kind: 'Instituție de cultură', totalExpenses: 6_118_004.33 },
    { cui: '4305989', name: 'Centrul Bugetar de Administrare Creșe', kind: 'Serviciu public', totalExpenses: 27_045_812.9 },
  ],
  subordinatesTotal: 41,
  reports: [
    { reportId: 'r-2025-06', reportingYear: 2025, periodLabel: 'Iun. 2025', reportType: 'Execuție agregată · ordonator principal', reportDate: '2025-07-25', mainCreditorName: 'Municipiul Cluj-Napoca', budgetSector: 'Bugetul local', downloadUrl: '#' },
    { reportId: 'r-2025-03', reportingYear: 2025, periodLabel: 'Mar. 2025', reportType: 'Execuție agregată · ordonator principal', reportDate: '2025-04-25', mainCreditorName: 'Municipiul Cluj-Napoca', budgetSector: 'Bugetul local', downloadUrl: '#' },
    { reportId: 'r-2024-12', reportingYear: 2024, periodLabel: 'Dec. 2024', reportType: 'Execuție agregată · ordonator principal', reportDate: '2025-01-31', mainCreditorName: 'Municipiul Cluj-Napoca', budgetSector: 'Bugetul local', downloadUrl: '#' },
  ],
}
