// Trimmed from real `ngoOrganizationProfile` reads (dev-chronos-api, 29 September 2026): Funky Citizens with
// three statements around its missing 2022, and Asociația Absolut, whose statements are not loaded.
import type { NgoOrganization, NgoStatement } from '../api'

export const FUNKY: NgoOrganization = {
  cui: '30339344',
  name: 'FUNKY CITIZENS',
  registryNumber: '1471/A/2012',
  category: 'association',
  county: 'BUCURESTI',
  locality: 'SECTORUL 3 - BUCURESTI',
  sourceRegistryStatus: 'Inregistrat',
  identity: { cui: '30339344', method: 'document_registration_bridge' },
  conflicts: [],
  snapshot: {
    sourceUrl: 'https://rnong.just.ro/registru-ong',
    capturedAt: '2026-09-20T06:11:58.733Z',
    refreshOverdue: true,
  },
  registryRecords: [
    {
      id: 'mj_rnong:ngos:mj_rnong:registry_export:955ec3c867a0507797c73c9f:row:73746',
      name: 'FUNKY CITIZENS',
      nameWithheld: false,
    },
  ],
  anafRegistration: {
    availability: 'available',
    data: {
      registrationStateText: 'INREGISTRAT din data 20.06.2012',
      registrationDate: '2012-06-20',
      queryDate: '2026-09-25',
    },
  },
  fiscal: {
    availability: 'available',
    data: {
      vatPayer: true,
      declaredFiscallyInactive: false,
      mainCaenCode: '9300',
      queryDate: '2026-09-25',
    },
  },
  legalForm: null,
  sourceReportsPublicUtility: false,
  sourceRegistrationDate: null,
  financials: { availability: 'available', fiscalYears: [2021, 2023, 2024] },
}

export const FUNKY_STATEMENTS: readonly NgoStatement[] = [
  {
    fiscalYear: 2024,
    sourceUrl:
      'https://data.gov.ro/dataset/cc8de892-f661-4f6e-97c0-15f5271d8a13/resource/d330113b-3dfd-499e-a1fa-27aeea1c7d19/download/web_ong_an2024.txt',
    dictionaryUrl:
      'https://data.gov.ro/dataset/d3caacb6-2c08-445e-94e6-8d36d00ab250/resource/f160b7bb-6f15-4c87-ae08-71cf51306713/download/web_ong_an2024.csv',
    indicators: [
      { code: 'I1', label: 'Active imobilizate  -  total', value: '48270' },
      { code: 'I2', label: 'Active circulante  -  total', value: '5992067' },
      { code: 'I3', label: 'Stocuri', value: null },
      { code: 'I4', label: 'Creante', value: '3295431' },
      { code: 'I5', label: 'Casa si conturi la banci', value: '2496636' },
      { code: 'I6', label: 'CHELTUIELI IN AVANS', value: '16006' },
      { code: 'I7', label: 'DATORII', value: '343732' },
      { code: 'I8', label: 'VENITURI IN AVANS', value: '2682756' },
      { code: 'I9', label: 'PROVIZIOANE', value: null },
      { code: 'I10', label: 'CAPITALURI - TOTAL, din care:', value: '3029855' },
      {
        code: 'I11',
        label: 'Fonduri privind activitatile fara scop patrimonial',
        value: '0',
      },
      { code: 'I12', label: 'Capitaluri proprii', value: '3029855' },
      {
        code: 'I13',
        label: 'Venituri din activitatile fara scop patrimonial - prevederi anuale',
        value: null,
      },
      {
        code: 'I14',
        label: 'Venituri din activitatile fara scop patrimonial - la 31.12.2024',
        value: '4876162',
      },
      {
        code: 'I15',
        label: 'Cheltuieli privind activitatile fara scop patrimonial - prevederi anuale',
        value: '0',
      },
      {
        code: 'I16',
        label: 'Cheltuieli privind activitatile fara scop patrimonial - la 31.12.2024',
        value: '4936251',
      },
      {
        code: 'I17',
        label: 'Excedent din activitatile fara scop patrimonial  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I18',
        label: 'Excedent din activitatile fara scop patrimonial  - la 31.12.2024',
        value: '0',
      },
      {
        code: 'I19',
        label: 'Deficit din activitatile fara scop patrimonial - prevederi anuale',
        value: '0',
      },
      {
        code: 'I20',
        label: 'Deficit din activitatile fara scop patrimonial - la 31.12.2024',
        value: '60089',
      },
      {
        code: 'I21',
        label: 'Venituri din activitatile cu destinatie speciala - prevederi anuale',
        value: null,
      },
      {
        code: 'I22',
        label: 'Venituri din activitatile cu destinatie speciala - la 31.12.2024',
        value: '0',
      },
      {
        code: 'I23',
        label: 'Cheltuieli privind activitatile cu destinatie speciala - prevederi anuale',
        value: null,
      },
      {
        code: 'I24',
        label: 'Cheltuieli privind activitatile cu destinatie speciala - la 31.12.2024',
        value: '0',
      },
      {
        code: 'I25',
        label: 'Excedent din activitatile cu destinatie speciala  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I26',
        label: 'Excedent din activitatile cu destinatie speciala  - la 31.12.2024',
        value: '0',
      },
      {
        code: 'I27',
        label: 'Deficit din activitatile cu destinatie speciala  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I28',
        label: 'Deficit din activitatile cu destinatie speciala  - la 31.12.2024',
        value: '0',
      },
      {
        code: 'I29',
        label: 'Venituri din activitatile economice - prevederi anuale',
        value: null,
      },
      {
        code: 'I30',
        label: 'Venituri din activitatile economice - la 31.12.2024',
        value: '1032027',
      },
      {
        code: 'I31',
        label: 'Cheltuieli privind activitatile economice - prevederi anuale',
        value: null,
      },
      {
        code: 'I32',
        label: 'Cheltuieli privind activitatile economice - la 31.12.2024',
        value: '0',
      },
      {
        code: 'I33',
        label: 'Profit din activitatile economice - prevederi anuale',
        value: '0',
      },
      {
        code: 'I34',
        label: 'Profit din activitatile economice - la 31.12.2024',
        value: '1032027',
      },
      {
        code: 'I35',
        label: 'Pierdere din activitatile economice - prevederi anuale',
        value: '0',
      },
      {
        code: 'I36',
        label: 'Pierdere din activitatile economice - la 31.12.2024',
        value: '0',
      },
      { code: 'I37', label: 'Venituri totale - prevederi anuale', value: '0' },
      {
        code: 'I38',
        label: 'Venituri totale - la 31.12.2024',
        value: '5908189',
      },
      {
        code: 'I39',
        label: 'Cheltuieli totale  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I40',
        label: 'Cheltuieli totale - la 31.12.2024',
        value: '4936251',
      },
      { code: 'I41', label: 'Excedent/Profit - prevederi anuale', value: '0' },
      {
        code: 'I42',
        label: 'Excedent/Profit - la 31.12.2024',
        value: '971938',
      },
      { code: 'I43', label: 'Deficit/Pierdere - prevederi anuale', value: '0' },
      { code: 'I44', label: 'Deficit/Pierdere - la 31.12.2024', value: '0' },
      {
        code: 'I45',
        label: 'Efectivul de personal privind activitatile fara scop patrimonial',
        value: null,
      },
      {
        code: 'I46',
        label: 'Efectivul de personal privind activitatile economice',
        value: '14',
      },
    ],
  },
  {
    fiscalYear: 2023,
    sourceUrl:
      'https://data.gov.ro/dataset/7861a98f-4d5c-4faa-90d4-8e934ebd1782/resource/137f73ef-e1e4-466e-b1ab-1912c9be7c83/download/web_ong_an2023.txt',
    dictionaryUrl:
      'https://data.gov.ro/dataset/7861a98f-4d5c-4faa-90d4-8e934ebd1782/resource/6c57477c-c032-4fb8-8764-2393fd8bdf5e/download/web_ong_an2023.csv',
    indicators: [
      { code: 'I1', label: 'A. Active imobilizate  -  total', value: '26453' },
      {
        code: 'I2',
        label: 'B. Active circulante  -  total',
        value: '10109396',
      },
      { code: 'I3', label: 'C. Cheltuieli in avans', value: '2122' },
      {
        code: 'I4',
        label: 'D. Datorii ce trebuie platite intr-o perioada de pana la un an',
        value: '5727741',
      },
      {
        code: 'I5',
        label: 'E. Active circulante nete, respectiv datorii curente nete',
        value: '-338965',
      },
      {
        code: 'I6',
        label: 'F. Total active minus datorii curente',
        value: '-312512',
      },
      {
        code: 'I7',
        label: 'G. Datorii ce trebuie platite intr-o perioada mai mare de un an',
        value: null,
      },
      { code: 'I8', label: 'H. Provizioane', value: null },
      { code: 'I9', label: 'I. Venituri in avans', value: '4722742' },
      { code: 'I10', label: 'J. Capitaluri proprii - total', value: '-312512' },
      {
        code: 'I11',
        label: 'Fonduri privind activitatile fara scop patrimonial',
        value: '0',
      },
      { code: 'I12', label: 'Capitaluri - total', value: '-312512' },
      {
        code: 'I13',
        label: 'Venituri din activitatile fara scop patrimonial - prevederi anuale',
        value: null,
      },
      {
        code: 'I14',
        label: 'Venituri din activitatile fara scop patrimonial - la 31.12.2020',
        value: '3728316',
      },
      {
        code: 'I15',
        label: 'Cheltuieli privind activitatile fara scop patrimonial - prevederi anuale',
        value: '0',
      },
      {
        code: 'I16',
        label: 'Cheltuieli privind activitatile fara scop patrimonial - la 31.12.2020',
        value: '3216754',
      },
      {
        code: 'I17',
        label: 'Excedent din activitatile fara scop patrimonial  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I18',
        label: 'Excedent din activitatile fara scop patrimonial  - la 31.12.2020',
        value: '511562',
      },
      {
        code: 'I19',
        label: 'Deficit din activitatile fara scop patrimonial - prevederi anuale',
        value: '0',
      },
      {
        code: 'I20',
        label: 'Deficit din activitatile fara scop patrimonial - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I21',
        label: 'Venituri din activitatile cu destinatie speciala - prevederi anuale',
        value: null,
      },
      {
        code: 'I22',
        label: 'Venituri din activitatile cu destinatie speciala - la 31.12.2020',
        value: null,
      },
      {
        code: 'I23',
        label: 'Cheltuieli privind activitatile cu destinatie speciala - prevederi anuale',
        value: null,
      },
      {
        code: 'I24',
        label: 'Cheltuieli privind activitatile cu destinatie speciala - la 31.12.2020',
        value: null,
      },
      {
        code: 'I25',
        label: 'Excedent din activitatile cu destinatie speciala  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I26',
        label: 'Excedent din activitatile cu destinatie speciala  - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I27',
        label: 'Deficit din activitatile cu destinatie speciala  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I28',
        label: 'Deficit din activitatile cu destinatie speciala  - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I29',
        label: 'Venituri din activitatile economice - prevederi anuale',
        value: null,
      },
      {
        code: 'I30',
        label: 'Venituri din activitatile economice - la 31.12.2020',
        value: '867076',
      },
      {
        code: 'I31',
        label: 'Cheltuieli privind activitatile economice - prevederi anuale',
        value: null,
      },
      {
        code: 'I32',
        label: 'Cheltuieli privind activitatile economice - la 31.12.2020',
        value: null,
      },
      {
        code: 'I33',
        label: 'Profit din activitatile economice - prevederi anuale',
        value: '0',
      },
      {
        code: 'I34',
        label: 'Profit din activitatile economice - la 31.12.2020',
        value: '867076',
      },
      {
        code: 'I35',
        label: 'Pierdere din activitatile economice - prevederi anuale',
        value: '0',
      },
      {
        code: 'I36',
        label: 'Pierdere din activitatile economice - la 31.12.2020',
        value: '0',
      },
      { code: 'I37', label: 'Venituri totale - prevederi anuale', value: '0' },
      {
        code: 'I38',
        label: 'Venituri totale - la 31.12.2020',
        value: '4595392',
      },
      {
        code: 'I39',
        label: 'Cheltuieli totale  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I40',
        label: 'Cheltuieli totale - la 31.12.2020',
        value: '3216754',
      },
      { code: 'I41', label: 'Excedent/Profit - prevederi anuale', value: '0' },
      {
        code: 'I42',
        label: 'Excedent/Profit - la 31.12.2020',
        value: '1378638',
      },
      { code: 'I43', label: 'Deficit/Pierdere - prevederi anuale', value: '0' },
      { code: 'I44', label: 'Deficit/Pierdere - la 31.12.2020', value: '0' },
      {
        code: 'I45',
        label: 'Efectivul de personal privind activitatile fara scop patrimonial',
        value: null,
      },
      {
        code: 'I46',
        label: 'Efectivul de personal privind activitatile economice',
        value: '12',
      },
    ],
  },
  {
    fiscalYear: 2021,
    sourceUrl:
      'https://data.gov.ro/dataset/f8353c0e-fee9-4aa3-b26d-be0e96c328a7/resource/2a1ef5c1-8160-4ccd-a631-d945d4a9b00a/download/web_ong_an2021.txt',
    dictionaryUrl:
      'https://data.gov.ro/dataset/f8353c0e-fee9-4aa3-b26d-be0e96c328a7/resource/91f55390-1845-4171-ace5-3ae46cd1fd2e/download/web_ong_an2021.csv',
    indicators: [
      { code: 'I1', label: 'A. Active imobilizate  -  total', value: '0' },
      { code: 'I2', label: 'B. Active circulante  -  total', value: '1203077' },
      { code: 'I3', label: 'C. Cheltuieli in avans', value: null },
      {
        code: 'I4',
        label: 'D. Datorii ce trebuie platite intr-o perioada de pana la un an',
        value: '276485',
      },
      {
        code: 'I5',
        label: 'E. Active circulante nete, respectiv datorii curente nete',
        value: '926592',
      },
      {
        code: 'I6',
        label: 'F. Total active minus datorii curente',
        value: '926592',
      },
      {
        code: 'I7',
        label: 'G. Datorii ce trebuie platite intr-o perioada mai mare de un an',
        value: null,
      },
      { code: 'I8', label: 'H. Provizioane', value: null },
      { code: 'I9', label: 'I. Venituri in avans', value: null },
      { code: 'I10', label: 'J. Capitaluri proprii - total', value: '926592' },
      {
        code: 'I11',
        label: 'Fonduri privind activitatile fara scop patrimonial',
        value: '0',
      },
      { code: 'I12', label: 'Capitaluri - total', value: '926592' },
      {
        code: 'I13',
        label: 'Venituri din activitatile fara scop patrimonial - prevederi anuale',
        value: null,
      },
      {
        code: 'I14',
        label: 'Venituri din activitatile fara scop patrimonial - la 31.12.2020',
        value: '1935852',
      },
      {
        code: 'I15',
        label: 'Cheltuieli privind activitatile fara scop patrimonial - prevederi anuale',
        value: null,
      },
      {
        code: 'I16',
        label: 'Cheltuieli privind activitatile fara scop patrimonial - la 31.12.2020',
        value: '1872971',
      },
      {
        code: 'I17',
        label: 'Excedent din activitatile fara scop patrimonial  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I18',
        label: 'Excedent din activitatile fara scop patrimonial  - la 31.12.2020',
        value: '62881',
      },
      {
        code: 'I19',
        label: 'Deficit din activitatile fara scop patrimonial - prevederi anuale',
        value: '0',
      },
      {
        code: 'I20',
        label: 'Deficit din activitatile fara scop patrimonial - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I21',
        label: 'Venituri din activitatile cu destinatie speciala - prevederi anuale',
        value: null,
      },
      {
        code: 'I22',
        label: 'Venituri din activitatile cu destinatie speciala - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I23',
        label: 'Cheltuieli privind activitatile cu destinatie speciala - prevederi anuale',
        value: null,
      },
      {
        code: 'I24',
        label: 'Cheltuieli privind activitatile cu destinatie speciala - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I25',
        label: 'Excedent din activitatile cu destinatie speciala  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I26',
        label: 'Excedent din activitatile cu destinatie speciala  - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I27',
        label: 'Deficit din activitatile cu destinatie speciala  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I28',
        label: 'Deficit din activitatile cu destinatie speciala  - la 31.12.2020',
        value: '0',
      },
      {
        code: 'I29',
        label: 'Venituri din activitatile economice - prevederi anuale',
        value: null,
      },
      {
        code: 'I30',
        label: 'Venituri din activitatile economice - la 31.12.2020',
        value: '59260',
      },
      {
        code: 'I31',
        label: 'Cheltuieli privind activitatile economice - prevederi anuale',
        value: null,
      },
      {
        code: 'I32',
        label: 'Cheltuieli privind activitatile economice - la 31.12.2020',
        value: '11436',
      },
      {
        code: 'I33',
        label: 'Profit din activitatile economice - prevederi anuale',
        value: '0',
      },
      {
        code: 'I34',
        label: 'Profit din activitatile economice - la 31.12.2020',
        value: '47824',
      },
      {
        code: 'I35',
        label: 'Pierdere din activitatile economice - prevederi anuale',
        value: '0',
      },
      {
        code: 'I36',
        label: 'Pierdere din activitatile economice - la 31.12.2020',
        value: '0',
      },
      { code: 'I37', label: 'Venituri totale - prevederi anuale', value: '0' },
      {
        code: 'I38',
        label: 'Venituri totale - la 31.12.2020',
        value: '1995112',
      },
      {
        code: 'I39',
        label: 'Cheltuieli totale  - prevederi anuale',
        value: '0',
      },
      {
        code: 'I40',
        label: 'Cheltuieli totale - la 31.12.2020',
        value: '1884407',
      },
      { code: 'I41', label: 'Excedent/Profit - prevederi anuale', value: '0' },
      {
        code: 'I42',
        label: 'Excedent/Profit - la 31.12.2020',
        value: '110705',
      },
      { code: 'I43', label: 'Deficit/Pierdere - prevederi anuale', value: '0' },
      { code: 'I44', label: 'Deficit/Pierdere - la 31.12.2020', value: '0' },
      {
        code: 'I45',
        label: 'Efectivul de personal privind activitatile fara scop patrimonial',
        value: '7',
      },
      {
        code: 'I46',
        label: 'Efectivul de personal privind activitatile economice',
        value: null,
      },
    ],
  },
]

export const ABSOLUT: NgoOrganization = {
  cui: '45781343',
  name: 'ASOCIATIA ABSOLUT',
  registryNumber: '26083/A/2019',
  category: 'association',
  county: 'CLUJ',
  locality: 'FLORESTI - CJ',
  sourceRegistryStatus: 'Inregistrat',
  identity: { cui: '45781343', method: 'registry_cui' },
  conflicts: [],
  snapshot: {
    sourceUrl: 'https://rnong.just.ro/registru-ong',
    capturedAt: '2026-09-20T06:11:58.733Z',
    refreshOverdue: true,
  },
  registryRecords: [
    {
      id: 'mj_rnong:ngos:mj_rnong:registry_export:955ec3c867a0507797c73c9f:row:35164',
      name: 'ASOCIATIA ABSOLUT',
      nameWithheld: false,
    },
  ],
  anafRegistration: {
    availability: 'available',
    data: {
      registrationStateText: 'INREGISTRAT din data 11.03.2022',
      registrationDate: '2022-03-11',
      queryDate: '2026-09-28',
    },
  },
  fiscal: {
    availability: 'available',
    data: {
      vatPayer: true,
      declaredFiscallyInactive: false,
      mainCaenCode: null,
      queryDate: '2026-09-28',
    },
  },
  legalForm: null,
  sourceReportsPublicUtility: false,
  sourceRegistrationDate: null,
  financials: { availability: 'not_loaded', fiscalYears: [] },
}
