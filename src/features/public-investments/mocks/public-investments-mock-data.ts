/**
 * Public Investments — mock fixtures.
 *
 * Clearly fixture data, shaped close to the design docs (design.md §6) and the
 * scraper parse types. Five representative objectives exercise every trust and
 * privacy boundary:
 *
 *  - `pi-anghel-cj-apahida`: complete high-confidence Anghel objective in
 *    Cluj / Apahida, safe amounts, served contractor + designer.
 *  - `pi-pndl-tm-sagetii`: PNDL precision_warning where decontat > contractat.
 *  - `pi-pnccrs-bv-fagaras`: PNCCRS suspect_x1000 objective whose numeric
 *    amounts must NOT be used in trusted totals/ranges.
 *  - `pi-pnmc-if-magic`: PNMC sparse / no-localization example.
 *  - `pi-anghel-cl-napoca-gated`: objective with a gated party
 *    (served=false, personal_moderate) whose personal-like name appears only
 *    in the internal fixture/raw payload, never in public display outputs.
 *
 * Evidence refs cover every SourceUrlKind: workbook, arcgis_api, dead, unknown.
 */

import type {
  ContractFact,
  DomainDataStatus,
  EvidenceDetail,
  EvidenceRef,
  LandingData,
  ObjectiveDetail,
  ObjectiveDetailBundle,
  ObjectiveSummary,
  Party,
  PaymentFact,
  ProgramCoverage,
  StageFact,
  TerritoryData,
} from '../lib/types'
import type { ProgramCode } from '@/schemas/public-investments'
import { REDACTED_NAME_MARKER } from '../lib/filters'

export const PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE = '2026-05-18'

export const PUBLIC_INVESTMENTS_MOCK_STATUS: DomainDataStatus = {
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  validationGate: 'warning',
  moneyPrecisionWarningRows: 1,
  inflationBugActive: true,
  historyAvailable: false,
}

// ---------------------------------------------------------------------------
// Evidence refs (one per SourceUrlKind + objective primary refs)
// ---------------------------------------------------------------------------

const evidenceAnghelApahidaContract: EvidenceRef = {
  sourceRowKey: 'evidence-anghel-apahida-contract',
  sourceFileId: 'anghel-saligny-2026-05.xlsx',
  objectId: 'minio://anghel/2026-05/objectives-cj-apahida-001.json',
  sourceUrl: 'https://data.gov.ro/dataset/anghel-saligny/resource/workbook-2026-05',
  sourceUrlKind: 'workbook',
  snapshotId: 'snap-anghel-2026-05-18',
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  contentSha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f91',
  rowHash: 'rh-anghel-apahida-001',
}

const evidenceAnghelApahidaPayment: EvidenceRef = {
  sourceRowKey: 'evidence-anghel-apahida-payment',
  sourceFileId: 'anghel-saligny-2026-05-payments.xlsx',
  objectId: 'minio://anghel/2026-05/payments-cj-apahida-001.json',
  sourceUrl: 'https://data.gov.ro/dataset/anghel-saligny/resource/payments-2026-05',
  sourceUrlKind: 'workbook',
  snapshotId: 'snap-anghel-2026-05-18',
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  contentSha256: 'b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f92',
  rowHash: 'rh-anghel-apahida-pay-001',
}

const evidenceAnghelApahidaStage: EvidenceRef = {
  sourceRowKey: 'evidence-anghel-apahida-stage',
  sourceFileId: 'anghel-saligny-2026-05.xlsx',
  objectId: 'minio://anghel/2026-05/stage-cj-apahida-001.json',
  sourceUrl: 'https://data.gov.ro/dataset/anghel-saligny/resource/workbook-2026-05',
  sourceUrlKind: 'workbook',
  snapshotId: 'snap-anghel-2026-05-18',
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  contentSha256: 'c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f93',
  rowHash: 'rh-anghel-apahida-stage-001',
}

const evidencePndlSagetiiContract: EvidenceRef = {
  sourceRowKey: 'evidence-pndl-tm-sagetii-contract',
  sourceFileId: 'pndl-ckan-2026-05.csv',
  objectId: 'minio://pndl/2026-05/objectives-tm-sagetii-001.json',
  sourceUrl: 'https://data.gov.ro/dataset/pndl/resource/ckan-2026-05',
  sourceUrlKind: 'workbook',
  snapshotId: 'snap-pndl-2026-05-18',
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  contentSha256: 'd4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f94',
  rowHash: 'rh-pndl-sagetii-001',
}

const evidencePnccrsFagarasContract: EvidenceRef = {
  sourceRowKey: 'evidence-pnccrs-bv-fagaras-contract',
  sourceFileId: 'pnccrs-arcgis-2026-05.json',
  objectId: 'minio://pnccrs/2026-05/objectives-bv-fagaras-001.json',
  sourceUrl: 'https://arcgis.mlpda.ro/arcgis/rest/services/pnccrs/FeatureServer/0/query?f=json',
  sourceUrlKind: 'arcgis_api',
  snapshotId: 'snap-pnccrs-2026-05-18',
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  contentSha256: 'e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f95',
  rowHash: 'rh-pnccrs-fagaras-001',
}

const evidencePnmcMagicContract: EvidenceRef = {
  sourceRowKey: 'evidence-pnmc-if-magic-contract',
  sourceFileId: 'pnmc-legacy-2024-12.xlsx',
  objectId: 'minio://pnmc/2024-12/objectives-if-magic-001.json',
  sourceUrl: 'https://mlpda.ro/legacy/pnmc/workbook-2024-12',
  sourceUrlKind: 'dead',
  snapshotId: 'snap-pnmc-2024-12-01',
  snapshotDate: '2024-12-01',
  contentSha256: 'f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c',
  rowHash: 'rh-pnmc-magic-001',
}

const evidenceAnghelNapocaGatedContract: EvidenceRef = {
  sourceRowKey: 'evidence-anghel-cl-napoca-gated-contract',
  sourceFileId: 'anghel-saligny-2026-05.xlsx',
  objectId: 'minio://anghel/2026-05/objectives-cl-napoca-gated-001.json',
  sourceUrl: 'https://data.gov.ro/dataset/anghel-saligny/resource/workbook-2026-05',
  sourceUrlKind: 'workbook',
  snapshotId: 'snap-anghel-2026-05-18',
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  contentSha256: '0718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d',
  rowHash: 'rh-anghel-napoca-gated-001',
}

const evidenceUnknownRef: EvidenceRef = {
  sourceRowKey: 'evidence-unknown-orphan',
  sourceFileId: null,
  objectId: null,
  sourceUrl: null,
  sourceUrlKind: 'unknown',
  snapshotId: null,
  snapshotDate: null,
  contentSha256: null,
  rowHash: null,
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

const servedContractorApahida: Party = {
  partyId: 'party-contractor-apahida-srl',
  role: 'executant',
  displayName: 'Construcții Apahida SRL',
  cui: '12345678',
  privacyClass: 'public_aggregate',
  potentialNaturalPerson: false,
  reviewState: 'reviewed',
  served: true,
  evidenceRef: evidenceAnghelApahidaContract,
}

const servedDesignerApahida: Party = {
  partyId: 'party-designer-apahida-sa',
  role: 'proiectant',
  displayName: 'Proiectare Tehnică Cluj SA',
  cui: '87654321',
  privacyClass: 'public_aggregate',
  potentialNaturalPerson: false,
  reviewState: 'reviewed',
  served: true,
  evidenceRef: evidenceAnghelApahidaContract,
}

const servedBeneficiaryApahida: Party = {
  partyId: 'party-beneficiary-apahida-uat',
  role: 'beneficiar',
  displayName: 'Comuna Apahida',
  cui: '45678901',
  privacyClass: 'public_aggregate',
  potentialNaturalPerson: false,
  reviewState: 'reviewed',
  served: true,
  evidenceRef: evidenceAnghelApahidaContract,
}

/**
 * GATED party — sole-trader / PFA-style contractor. The personal-like name
 * `Popescu Ion Aurel` exists ONLY in the internal fixture / raw payload and
 * must NEVER appear in any public display output (summary, party card,
 * related links, CSV, map label, evidence excerpt). The adapter sets
 * `displayName: null` and `served: false`; the raw name is retained only in
 * the raw payload fixture below to exercise the redaction helper.
 */
const gatedContractorNapoca: Party = {
  partyId: 'party-contractor-napoca-pfa',
  role: 'executant',
  displayName: null,
  cui: '99887766',
  privacyClass: 'personal_moderate',
  potentialNaturalPerson: true,
  reviewState: 'unreviewed',
  served: false,
  evidenceRef: evidenceAnghelNapocaGatedContract,
}

// Raw payload fixture (internal only) containing the gated personal name.
// Used by redaction tests and the evidence adapter to prove scrubbing works.
export const GATED_RAW_PAYLOAD_NAPOCA = JSON.stringify(
  {
    source_row_key: 'evidence-anghel-cl-napoca-gated-contract',
    contractor_name: 'Popescu Ion Aurel',
    contractor_cui: '99887766',
    contract_value_ron: '5.200.000',
    stadiu: 'În execuție 35%',
    locality: 'Municipiul Cluj-Napoca',
    siruta: '58349',
  },
  null,
  2,
)

// The redacted excerpt that the evidence adapter should expose to the UI.
export const REDACTED_RAW_PAYLOAD_NAPOCA = JSON.stringify(
  {
    source_row_key: 'evidence-anghel-cl-napoca-gated-contract',
    contractor_name: REDACTED_NAME_MARKER,
    contractor_cui: REDACTED_NAME_MARKER,
    contract_value_ron: '5.200.000',
    stadiu: 'În execuție 35%',
    locality: 'Municipiul Cluj-Napoca',
    siruta: '58349',
  },
  null,
  2,
)

// ---------------------------------------------------------------------------
// Objective summaries
// ---------------------------------------------------------------------------

const anghelApahida: ObjectiveSummary = {
  objectiveId: 'pi-anghel-cj-apahida',
  program: 'ANGHEL_SALIGNY',
  title: 'Reabilitare rețea de apă și canalizare — Comuna Apahida',
  domain: 'Apă și canalizare',
  domainKey: 'apa_canalizare',
  county: 'Cluj',
  countyCode: 'CJ',
  uat: 'Comuna Apahida',
  siruta: '58728',
  lat: 46.795,
  lng: 23.76,
  allocated: { amount: 6_200_000, confidence: 'ok', raw: '6.200.000' },
  contracted: { amount: 5_800_000, confidence: 'ok', raw: '5.800.000' },
  reimbursed: { amount: 2_320_000, confidence: 'ok', raw: '2.320.000' },
  absorptionPct: 40,
  stage: { bucket: 'in_executie', raw: 'În execuție 40%' },
  hasContractorCui: true,
  hasDesignerCui: true,
  identityConfidence: 'high',
  searchTokens: ['Constructii Apahida SRL', 'Construcții Apahida SRL', '12345678'],
  evidenceRef: evidenceAnghelApahidaContract,
}

const pndlSagetii: ObjectiveSummary = {
  objectiveId: 'pi-pndl-tm-sagetii',
  program: 'PNDL',
  title: 'Modernizare drum comunal — Comuna Săgeții',
  domain: 'Drumuri',
  domainKey: 'drumuri',
  county: 'Timiș',
  countyCode: 'TM',
  uat: 'Comuna Săgeții',
  siruta: '155249',
  lat: 45.85,
  lng: 21.23,
  allocated: { amount: 3_100_000, confidence: 'ok', raw: '3.100.000' },
  contracted: { amount: 3_000_000, confidence: 'ok', raw: '3.000.000' },
  // precision_warning: decontat > contractat (real source anomaly).
  reimbursed: { amount: 3_450_000, confidence: 'precision_warning', raw: '3.450.000' },
  // Real percentage preserved (>100) so components can clamp the visual later.
  absorptionPct: 115,
  stage: { bucket: 'in_executie', raw: 'În execuție 78%' },
  hasContractorCui: true,
  hasDesignerCui: false,
  identityConfidence: 'high',
  searchTokens: [],
  evidenceRef: evidencePndlSagetiiContract,
}

const pnccrsFagaras: ObjectiveSummary = {
  objectiveId: 'pi-pnccrs-bv-fagaras',
  program: 'PNCCRS',
  title: 'Centru comunitar de servicii sociale — municipiul Făgăraș',
  domain: 'Educație și sociale',
  domainKey: 'educatie_sociale',
  county: 'Brașov',
  countyCode: 'BV',
  uat: 'Municipiul Făgăraș',
  siruta: '52438',
  lat: 45.84,
  lng: 24.97,
  // suspect_x1000: numeric amounts MUST NOT be used in trusted totals/ranges.
  allocated: { amount: 5_400_000_000, confidence: 'suspect_x1000', raw: '5.400.000.000' },
  contracted: { amount: 5_200_000_000, confidence: 'suspect_x1000', raw: '5.200.000.000' },
  reimbursed: { amount: 1_300_000_000, confidence: 'suspect_x1000', raw: '1.300.000.000' },
  absorptionPct: null,
  stage: { bucket: 'contractat', raw: '2.34e+2%' },
  hasContractorCui: false,
  hasDesignerCui: false,
  identityConfidence: 'medium',
  searchTokens: [],
  evidenceRef: evidencePnccrsFagarasContract,
}

const pnmcMagic: ObjectiveSummary = {
  objectiveId: 'pi-pnmc-if-magic',
  program: 'PNMC',
  title: 'Micro-investiție infrastructură — localitate neidentificată',
  domain: null,
  domainKey: null,
  county: 'Ilfov',
  countyCode: 'IF',
  uat: null,
  siruta: null,
  lat: null,
  lng: null,
  allocated: { amount: 480_000, confidence: 'ok', raw: '480.000' },
  contracted: { amount: 450_000, confidence: 'ok', raw: '450.000' },
  reimbursed: { amount: 90_000, confidence: 'ok', raw: '90.000' },
  absorptionPct: 20,
  stage: { bucket: 'necunoscut', raw: 'N/A' },
  hasContractorCui: false,
  hasDesignerCui: false,
  identityConfidence: 'low',
  searchTokens: [],
  evidenceRef: evidencePnmcMagicContract,
}

const anghelNapocaGated: ObjectiveSummary = {
  objectiveId: 'pi-anghel-cl-napoca-gated',
  program: 'ANGHEL_SALIGNY',
  title: 'Reabilitare clădire școlară — Municipiul Cluj-Napoca',
  domain: 'Educație',
  domainKey: 'educatie',
  county: 'Cluj',
  countyCode: 'CJ',
  uat: 'Municipiul Cluj-Napoca',
  siruta: '58349',
  lat: 46.77,
  lng: 23.59,
  allocated: { amount: 5_500_000, confidence: 'ok', raw: '5.500.000' },
  contracted: { amount: 5_200_000, confidence: 'ok', raw: '5.200.000' },
  reimbursed: { amount: 1_560_000, confidence: 'ok', raw: '1.560.000' },
  absorptionPct: 30,
  stage: { bucket: 'in_executie', raw: 'În execuție 35%' },
  hasContractorCui: true,
  hasDesignerCui: false,
  identityConfidence: 'high',
  searchTokens: [],
  evidenceRef: evidenceAnghelNapocaGatedContract,
}

export const MOCK_OBJECTIVE_SUMMARIES: readonly ObjectiveSummary[] = [
  anghelApahida,
  pndlSagetii,
  pnccrsFagaras,
  pnmcMagic,
  anghelNapocaGated,
]

function mockMapPointFromObjective(objective: ObjectiveSummary) {
  const hasSuspectMapMoney = objective.contracted?.confidence === 'suspect_x1000'
  return {
    objectiveId: objective.objectiveId,
    program: objective.program,
    title: objective.title,
    county: objective.county,
    uat: objective.uat,
    siruta: objective.siruta,
    lat: objective.lat,
    lng: objective.lng,
    contracted:
      hasSuspectMapMoney && objective.contracted
        ? { ...objective.contracted, amount: null }
        : objective.contracted,
    absorptionPct:
      hasSuspectMapMoney || objective.reimbursed?.confidence === 'suspect_x1000'
        ? null
        : objective.absorptionPct,
    stage: objective.stage,
  }
}

// ---------------------------------------------------------------------------
// Objective detail bundles
// ---------------------------------------------------------------------------

const anghelApahidaPayments: readonly PaymentFact[] = [
  {
    paymentId: 'pay-anghel-apahida-001',
    date: '2025-09-12',
    amount: { amount: 1_000_000, confidence: 'ok', raw: '1.000.000' },
    requested: { amount: 1_200_000, confidence: 'ok', raw: '1.200.000' },
    reimbursed: { amount: 1_000_000, confidence: 'ok', raw: '1.000.000' },
    cumulative: { amount: 1_000_000, confidence: 'ok', raw: '1.000.000' },
    evidenceRef: evidenceAnghelApahidaPayment,
  },
  {
    paymentId: 'pay-anghel-apahida-002',
    date: '2026-02-08',
    amount: { amount: 1_320_000, confidence: 'ok', raw: '1.320.000' },
    requested: { amount: 1_500_000, confidence: 'ok', raw: '1.500.000' },
    reimbursed: { amount: 1_320_000, confidence: 'ok', raw: '1.320.000' },
    cumulative: { amount: 2_320_000, confidence: 'ok', raw: '2.320.000' },
    evidenceRef: evidenceAnghelApahidaPayment,
  },
]

const anghelApahidaContracts: readonly ContractFact[] = [
  {
    contractId: 'contract-anghel-apahida-001',
    contractNumber: 'AS/CJ/2024/887',
    contractDate: '2024-11-04',
    contractor: servedContractorApahida,
    designer: servedDesignerApahida,
    beneficiary: servedBeneficiaryApahida,
    value: { amount: 5_800_000, confidence: 'ok', raw: '5.800.000' },
    evidenceRef: evidenceAnghelApahidaContract,
  },
]

const anghelApahidaStages: readonly StageFact[] = [
  {
    snapshotId: 'snap-anghel-2026-05-18',
    snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
    bucket: 'in_executie',
    raw: 'În execuție 40%',
    evidenceRef: evidenceAnghelApahidaStage,
  },
]

const anghelApahidaParties: readonly Party[] = [
  servedContractorApahida,
  servedDesignerApahida,
  servedBeneficiaryApahida,
]

const anghelApahidaDetail: ObjectiveDetail = {
  ...anghelApahida,
  beneficiary: servedBeneficiaryApahida,
  contractorCandidateCount: 1,
  relatedLinks: [
    {
      kind: 'authority',
      cui: servedBeneficiaryApahida.cui,
      siruta: anghelApahida.siruta,
      label: 'Comuna Apahida',
      why: 'potrivire pe CUI beneficiar',
      verified: true,
    },
    {
      kind: 'company',
      cui: servedContractorApahida.cui,
      siruta: null,
      label: 'Construcții Apahida SRL',
      why: 'potrivire pe CUI contractant',
      verified: true,
    },
    {
      kind: 'pnrr',
      cui: null,
      siruta: anghelApahida.siruta,
      label: 'Proiecte PNRR în Cluj',
      why: 'aceeași autoritate/teritoriu',
      verified: false,
    },
  ],
}

const anghelNapocaGatedContracts: readonly ContractFact[] = [
  {
    contractId: 'contract-anghel-napoca-gated-001',
    contractNumber: 'AS/CJ/2025/014',
    contractDate: '2025-03-21',
    contractor: gatedContractorNapoca,
    designer: null,
    beneficiary: servedBeneficiaryApahida,
    value: { amount: 5_200_000, confidence: 'ok', raw: '5.200.000' },
    evidenceRef: evidenceAnghelNapocaGatedContract,
  },
]

const anghelNapocaGatedParties: readonly Party[] = [
  gatedContractorNapoca,
  servedBeneficiaryApahida,
]

const anghelNapocaGatedDetail: ObjectiveDetail = {
  ...anghelNapocaGated,
  beneficiary: servedBeneficiaryApahida,
  contractorCandidateCount: 0,
  relatedLinks: [
    {
      kind: 'authority',
      cui: servedBeneficiaryApahida.cui,
      siruta: anghelNapocaGated.siruta,
      label: 'Municipiul Cluj-Napoca',
      why: 'potrivire pe CUI beneficiar',
      verified: true,
    },
  ],
}

export const MOCK_OBJECTIVE_DETAIL_BUNDLES: Readonly<Record<string, ObjectiveDetailBundle>> = {
  'pi-anghel-cj-apahida': {
    objective: anghelApahidaDetail,
    payments: anghelApahidaPayments,
    contracts: anghelApahidaContracts,
    stages: anghelApahidaStages,
    parties: anghelApahidaParties,
    status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  },
  'pi-pndl-tm-sagetii': {
    objective: {
      ...pndlSagetii,
      beneficiary: servedBeneficiaryApahida,
      contractorCandidateCount: 0,
      relatedLinks: [],
    },
    payments: [],
    contracts: [],
    stages: [
      {
        snapshotId: 'snap-pndl-2026-05-18',
        snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
        bucket: 'in_executie',
        raw: 'În execuție 78%',
        evidenceRef: evidencePndlSagetiiContract,
      },
    ],
    parties: [servedBeneficiaryApahida],
    status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  },
  'pi-pnccrs-bv-fagaras': {
    objective: {
      ...pnccrsFagaras,
      beneficiary: null,
      contractorCandidateCount: 0,
      relatedLinks: [],
    },
    payments: [],
    contracts: [],
    stages: [
      {
        snapshotId: 'snap-pnccrs-2026-05-18',
        snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
        bucket: 'contractat',
        raw: '2.34e+2%',
        evidenceRef: evidencePnccrsFagarasContract,
      },
    ],
    parties: [],
    status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  },
  'pi-pnmc-if-magic': {
    objective: {
      ...pnmcMagic,
      beneficiary: null,
      contractorCandidateCount: 0,
      relatedLinks: [],
    },
    payments: [],
    contracts: [],
    stages: [
      {
        snapshotId: 'snap-pnmc-2024-12-01',
        snapshotDate: '2024-12-01',
        bucket: 'necunoscut',
        raw: 'N/A',
        evidenceRef: evidencePnmcMagicContract,
      },
    ],
    parties: [],
    status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  },
  'pi-anghel-cl-napoca-gated': {
    objective: anghelNapocaGatedDetail,
    payments: [],
    contracts: anghelNapocaGatedContracts,
    stages: [
      {
        snapshotId: 'snap-anghel-2026-05-18',
        snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
        bucket: 'in_executie',
        raw: 'În execuție 35%',
        evidenceRef: evidenceAnghelNapocaGatedContract,
      },
    ],
    parties: anghelNapocaGatedParties,
    status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  },
}

// ---------------------------------------------------------------------------
// Evidence detail fixtures (raw payload excerpts — gated ones pre-scrubbed)
// ---------------------------------------------------------------------------

export const MOCK_EVIDENCE_DETAILS: Readonly<Record<string, EvidenceDetail>> = {
  'evidence-anghel-apahida-contract': {
    ref: evidenceAnghelApahidaContract,
    sourceFileName: 'anghel-saligny-2026-05.xlsx',
    evidenceTable: 'objectives_source_facts',
    evidenceKey: 'pi-anghel-cj-apahida',
    rawPayloadExcerpt: JSON.stringify(
      {
        source_row_key: 'evidence-anghel-apahida-contract',
        titlu: 'Reabilitare rețea de apă și canalizare — Comuna Apahida',
        contractat_ron: '5.800.000',
        decontat_ron: '2.320.000',
        stadiu: 'În execuție 40%',
        siruta: '58728',
      },
      null,
      2,
    ),
    amountConfidence: 'ok',
    amountRaw: '5.800.000',
    linkHealth: 'ok',
  },
  'evidence-pnccrs-bv-fagaras-contract': {
    ref: evidencePnccrsFagarasContract,
    sourceFileName: 'pnccrs-arcgis-2026-05.json',
    evidenceTable: 'objectives_source_facts',
    evidenceKey: 'pi-pnccrs-bv-fagaras',
    rawPayloadExcerpt: JSON.stringify(
      {
        source_row_key: 'evidence-pnccrs-bv-fagaras-contract',
        attributes: {
          CONTRACT_VALUE: 5_200_000_000,
          REIMBURSED: 1_300_000_000,
          STADIU: '2.34e+2%',
        },
        note: 'valoare posibil ×1000 — în verificare',
      },
      null,
      2,
    ),
    amountConfidence: 'suspect_x1000',
    amountRaw: '5.200.000.000',
    linkHealth: 'ok',
  },
  'evidence-pnmc-if-magic-contract': {
    ref: evidencePnmcMagicContract,
    sourceFileName: 'pnmc-legacy-2024-12.xlsx',
    evidenceTable: 'objectives_source_facts',
    evidenceKey: 'pi-pnmc-if-magic',
    rawPayloadExcerpt: null,
    amountConfidence: 'ok',
    amountRaw: '450.000',
    linkHealth: 'dead',
  },
  // Gated party evidence — the raw payload is served pre-scrubbed so no
  // personal-like name ever reaches the evidence viewer.
  'evidence-anghel-cl-napoca-gated-contract': {
    ref: evidenceAnghelNapocaGatedContract,
    sourceFileName: 'anghel-saligny-2026-05.xlsx',
    evidenceTable: 'objectives_source_facts',
    evidenceKey: 'pi-anghel-cl-napoca-gated',
    rawPayloadExcerpt: REDACTED_RAW_PAYLOAD_NAPOCA,
    amountConfidence: 'ok',
    amountRaw: '5.200.000',
    linkHealth: 'ok',
  },
  'evidence-unknown-orphan': {
    ref: evidenceUnknownRef,
    sourceFileName: null,
    evidenceTable: null,
    evidenceKey: null,
    rawPayloadExcerpt: null,
    amountConfidence: null,
    amountRaw: null,
    linkHealth: 'unknown',
  },
}

// ---------------------------------------------------------------------------
// Program coverage (landing)
// ---------------------------------------------------------------------------

export const MOCK_PROGRAM_COVERAGE: readonly ProgramCoverage[] = [
  {
    program: 'ANGHEL_SALIGNY',
    objectiveCount: 5772,
    loaded: true,
    note: null,
  },
  {
    program: 'PNDL',
    objectiveCount: 11636,
    loaded: true,
    note: null,
  },
  {
    program: 'PNCCRS',
    objectiveCount: 227,
    loaded: true,
    note: 'doar 227 obiective (SIRUTA valide)',
  },
  {
    program: 'PNMC',
    objectiveCount: 7,
    loaded: true,
    note: 'doar 7 obiective; unele fără SIRUTA',
  },
]

// ---------------------------------------------------------------------------
// Landing data (aggregate provenance note)
// ---------------------------------------------------------------------------

const landingAggregateEvidence: EvidenceRef = {
  sourceRowKey: 'evidence-landing-aggregate',
  sourceFileId: 'anghel-saligny-2026-05.xlsx',
  objectId: 'minio://aggregate/2026-05/landing.json',
  sourceUrl: 'https://data.gov.ro/dataset/anghel-saligny',
  sourceUrlKind: 'workbook',
  snapshotId: 'snap-landing-2026-05-18',
  snapshotDate: PUBLIC_INVESTMENTS_MOCK_SNAPSHOT_DATE,
  contentSha256: 'aggregate-sha-2026-05-18',
  rowHash: 'rh-landing-aggregate',
}

export const MOCK_LANDING_DATA: LandingData = {
  status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  coverage: MOCK_PROGRAM_COVERAGE,
  kpis: {
    // Aggregate counts include suspect rows (counts are safe); money totals
    // exclude them (the adapter precomputes these).
    objectiveCount: 17642,
    mappedObjectiveCount: 17641,
    unmappedObjectiveCount: 1,
    contractedTotal: { amount: 28_900_000, confidence: 'precision_warning', raw: '28.900.000' },
    reimbursedTotal: { amount: 7_320_000, confidence: 'ok', raw: '7.320.000' },
    absorptionPct: 25,
    evidenceRef: landingAggregateEvidence,
  },
  mapPoints: MOCK_OBJECTIVE_SUMMARIES.map(mockMapPointFromObjective),
  topStalled: [
    anghelApahida,
    anghelNapocaGated,
    pnmcMagic,
  ],
}

// ---------------------------------------------------------------------------
// Territory data (locality + county)
// ---------------------------------------------------------------------------

export const MOCK_LOCALITY_TERRITORY_DATA: Readonly<Record<string, TerritoryData>> = {
  // Apahida locality (SIRUTA 58728) — has the Anghel objective.
  '58728': {
    scope: 'locality',
    siruta: '58728',
    countyCode: 'CJ',
    countyName: 'Cluj',
    localityName: 'Comuna Apahida',
    authority: {
      cui: servedBeneficiaryApahida.cui,
      name: 'Comuna Apahida',
      isPrimarie: true,
      evidenceRef: evidenceAnghelApahidaContract,
    },
    summary: {
      objectiveCount: 1,
      contractedTotal: { amount: 5_800_000, confidence: 'ok', raw: '5.800.000' },
      reimbursedTotal: { amount: 2_320_000, confidence: 'ok', raw: '2.320.000' },
      absorptionPct: 40,
      stalledCount: 1,
    },
    byProgram: [
      {
        program: 'ANGHEL_SALIGNY',
        count: 1,
        contracted: { amount: 5_800_000, confidence: 'ok', raw: '5.800.000' },
      },
    ],
    byDomain: [
      {
        key: 'apa_canalizare',
        label: 'Apă și canalizare',
        count: 1,
        contracted: { amount: 5_800_000, confidence: 'ok', raw: '5.800.000' },
      },
    ],
    objectives: [anghelApahida],
    mapPoints: [anghelApahida].map(mockMapPointFromObjective),
    status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  },
}

export const MOCK_COUNTY_TERRITORY_DATA: Readonly<Record<string, TerritoryData>> = {
  CJ: {
    scope: 'county',
    siruta: null,
    countyCode: 'CJ',
    countyName: 'Cluj',
    localityName: null,
    authority: null,
    summary: {
      objectiveCount: 3,
      // Excludes the suspect PNCCRS row (BV) — but here we aggregate only CJ
      // objectives (anghelApahida, anghelNapocaGated), both trusted.
      contractedTotal: { amount: 11_000_000, confidence: 'ok', raw: '11.000.000' },
      reimbursedTotal: { amount: 3_880_000, confidence: 'ok', raw: '3.880.000' },
      absorptionPct: 35,
      stalledCount: 2,
    },
    byProgram: [
      {
        program: 'ANGHEL_SALIGNY',
        count: 2,
        contracted: { amount: 11_000_000, confidence: 'ok', raw: '11.000.000' },
      },
    ],
    byDomain: [
      {
        key: 'apa_canalizare',
        label: 'Apă și canalizare',
        count: 1,
        contracted: { amount: 5_800_000, confidence: 'ok', raw: '5.800.000' },
      },
      {
        key: 'educatie',
        label: 'Educație',
        count: 1,
        contracted: { amount: 5_200_000, confidence: 'ok', raw: '5.200.000' },
      },
    ],
    objectives: [anghelApahida, anghelNapocaGated],
    mapPoints: [anghelApahida, anghelNapocaGated].map(mockMapPointFromObjective),
    childUats: [
      {
        siruta: '58728',
        name: 'Comuna Apahida',
        objectiveCount: 1,
        absorptionPct: 40,
      },
      {
        siruta: '58349',
        name: 'Municipiul Cluj-Napoca',
        objectiveCount: 1,
        absorptionPct: 30,
      },
    ],
    status: PUBLIC_INVESTMENTS_MOCK_STATUS,
  },
}

// Re-export program coverage helpers for the API layer.
export function mockProgramCountByCode(
  program: ProgramCode,
): number {
  const entry = MOCK_PROGRAM_COVERAGE.find((item) => item.program === program)
  return entry?.objectiveCount ?? 0
}
