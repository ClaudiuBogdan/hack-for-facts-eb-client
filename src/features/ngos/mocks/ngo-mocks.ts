import type {
  DomainCoverage,
  EvidenceRecord,
  LinkReviewCase,
  NgoProfile,
  PublicFunding,
  ServiceDiscoveryResult,
  SnapshotProvenance,
  SocialService,
  SocialServiceProvider,
  SourceSnapshot,
  ValidationIssue,
} from '@/schemas/ngos'

// ---------------------------------------------------------------------------
// Source snapshots — mirror `source_snapshots`. Stale social-service dates
// (providers 10.04.2024, services 11.12.2023) are deliberately old so the UI
// can flag them. ANAF is pending (no rows). MJ/SGG are name-only.
// ---------------------------------------------------------------------------

export const ngoSourceSnapshots: Readonly<Record<string, SourceSnapshot>> = {
  anofm_rueis_2026_06_20: {
    sourceSnapshotId: 'anofm_rueis_2026_06_20',
    sourceId: 'ANOFM',
    sourceUrl: 'https://rueis.anofm.ro/rueis/public/export',
    contentSha256:
      'a1b2c3d4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516',
    contentLengthBytes: 1_842_113,
    parserVersion: 'rueis-xlsx@2.4.1',
    schemaFingerprint: 'rueis.members.v3',
    headerFingerprint: 'rueis.header.v2',
    rowCount: 9176,
    status: 'accepted',
    isCurrent: true,
    sourceDeclaredSnapshotDate: '2026-06-20',
    acceptedAt: '2026-06-20T08:14:00Z',
  },
  anofm_accred_2026_06_20: {
    sourceSnapshotId: 'anofm_accred_2026_06_20',
    sourceId: 'ANOFM',
    sourceUrl: 'https://anofm.ro/servicii-ocupare/acreditare',
    contentSha256:
      'b2c3d4e5f60718293a4b5c6d7e8f900102030405060708091011121314151617',
    contentLengthBytes: 312_990,
    parserVersion: 'anofm-accred@1.7.0',
    schemaFingerprint: 'anofm.accred.v2',
    headerFingerprint: 'anofm.accred.header.v1',
    rowCount: 1313,
    status: 'accepted',
    isCurrent: true,
    sourceDeclaredSnapshotDate: '2026-06-20',
    acceptedAt: '2026-06-20T08:22:00Z',
  },
  mmuncii_providers_2024_04_10: {
    sourceSnapshotId: 'mmuncii_providers_2024_04_10',
    sourceId: 'MMuncii',
    sourceUrl: 'https://mmuncii.ro/j33/meniu/3228/furnizori-servicii-sociale',
    contentSha256:
      'c3d4e5f60718293a4b5c6d7e8f90010203040506070809101112131415161718',
    contentLengthBytes: 988_220,
    parserVersion: 'mmuncii-providers@3.1.2',
    schemaFingerprint: 'mmuncii.providers.v4',
    headerFingerprint: 'mmuncii.providers.header.v2',
    rowCount: 4033,
    status: 'accepted',
    isCurrent: true,
    // Stale by design — flagged in the UI.
    sourceDeclaredSnapshotDate: '2024-04-10',
    acceptedAt: '2024-04-11T07:05:00Z',
  },
  mmuncii_services_2023_12_11: {
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
    sourceId: 'MMuncii',
    sourceUrl: 'https://mmuncii.ro/j33/meniu/3229/servicii-sociale-licentiate',
    contentSha256:
      'd4e5f60718293a4b5c6d7e8f9001020304050607080910111213141516171819',
    contentLengthBytes: 1_204_556,
    parserVersion: 'mmuncii-services@3.1.2',
    schemaFingerprint: 'mmuncii.services.v4',
    headerFingerprint: 'mmuncii.services.header.v2',
    rowCount: 5407,
    status: 'accepted',
    isCurrent: true,
    // Stale by design — flagged in the UI.
    sourceDeclaredSnapshotDate: '2023-12-11',
    acceptedAt: '2023-12-12T07:11:00Z',
  },
  anaf_financial_pending: {
    sourceSnapshotId: 'anaf_financial_pending',
    sourceId: 'ANAF',
    sourceUrl: 'https://static.anaf.ro/decl',
    contentSha256: null,
    contentLengthBytes: null,
    parserVersion: null,
    schemaFingerprint: 'anaf.financial.v1',
    headerFingerprint: null,
    rowCount: 0,
    status: 'pending',
    isCurrent: false,
    sourceDeclaredSnapshotDate: null,
    acceptedAt: null,
  },
  mj_registry_2024_06: {
    sourceSnapshotId: 'mj_registry_2024_06',
    sourceId: 'MJ',
    sourceUrl: 'https://www.just.ro/registrul-ong/',
    contentSha256:
      'e5f60718293a4b5c6d7e8f900102030405060708091011121314151617181920',
    contentLengthBytes: 24_113_008,
    parserVersion: 'mj-registry@0.9.0',
    schemaFingerprint: 'mj.registry.v1',
    headerFingerprint: 'mj.registry.header.v1',
    rowCount: 126011,
    status: 'accepted_name_only',
    isCurrent: true,
    sourceDeclaredSnapshotDate: '2024-06-03',
    acceptedAt: '2024-06-04T09:00:00Z',
  },
  sgg_public_utility_2024_06: {
    sourceSnapshotId: 'sgg_public_utility_2024_06',
    sourceId: 'SGG',
    sourceUrl: 'https://sgg.gov.ro/utilitate-publica',
    contentSha256:
      'f60718293a4b5c6d7e8f90010203040506070809101112131415161718192021',
    contentLengthBytes: 88_410,
    parserVersion: 'sgg-utility@0.4.0',
    schemaFingerprint: 'sgg.utility.v1',
    headerFingerprint: 'sgg.utility.header.v1',
    rowCount: 229,
    status: 'accepted_name_only',
    isCurrent: true,
    sourceDeclaredSnapshotDate: '2024-06-05',
    acceptedAt: '2024-06-06T09:30:00Z',
  },
}

// ---------------------------------------------------------------------------
// Validation issues — the "excluded CUI counts" DQ feature noted in the UX doc.
// ---------------------------------------------------------------------------

export const ngoValidationIssues: Readonly<Record<string, ValidationIssue[]>> =
  {
    anofm_accred_2026_06_20: [
      {
        sourceSnapshotId: 'anofm_accred_2026_06_20',
        severity: 'warning',
        code: 'excluded_cui_missing',
        message:
          '412 CUI lipsă + 64 CUI invalide excluse corect la încărcare.',
        count: 476,
      },
      {
        sourceSnapshotId: 'anofm_accred_2026_06_20',
        severity: 'warning',
        code: 'employment_cui_overlong',
        message: '180 CUI de ocupare prea lungi excluși corect.',
        count: 180,
      },
    ],
    mmuncii_services_2023_12_11: [
      {
        sourceSnapshotId: 'mmuncii_services_2023_12_11',
        severity: 'warning',
        code: 'siruta_missing',
        message: '38 de servicii fără cod SIRUTA afișați cu localitate necunoscută.',
        count: 38,
      },
    ],
  }

// ---------------------------------------------------------------------------
// Domain coverage matrix (landing). Reflects the source facts exactly.
// ---------------------------------------------------------------------------

export const ngoDomainCoverage: DomainCoverage = {
  rows: [
    {
      sourceId: 'ANOFM_RUEIS',
      authorityLabel: 'ANOFM (RUEIS)',
      contentLabel: 'Membri economie socială',
      lastSnapshotDate: '2026-06-20',
      status: 'loaded',
      rowCount: 9176,
      isNameOnly: false,
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
    },
    {
      sourceId: 'ANOFM_ACCRED',
      authorityLabel: 'ANOFM (acreditare ocupare)',
      contentLabel: 'Furnizori servicii de ocupare',
      lastSnapshotDate: '2026-06-20',
      status: 'loaded',
      rowCount: 1313,
      isNameOnly: false,
      sourceSnapshotId: 'anofm_accred_2026_06_20',
    },
    {
      sourceId: 'MMUNCII_PROV',
      authorityLabel: 'MMuncii (furnizori)',
      contentLabel: 'Furnizori servicii sociale',
      lastSnapshotDate: '2024-04-10',
      status: 'loaded_stale',
      rowCount: 4033,
      isNameOnly: false,
      sourceSnapshotId: 'mmuncii_providers_2024_04_10',
    },
    {
      sourceId: 'MMUNCII_SERV',
      authorityLabel: 'MMuncii (servicii)',
      contentLabel: 'Servicii sociale licențiate',
      lastSnapshotDate: '2023-12-11',
      status: 'loaded_stale',
      rowCount: 5407,
      isNameOnly: false,
      sourceSnapshotId: 'mmuncii_services_2023_12_11',
    },
    {
      sourceId: 'ANAF_FIN',
      authorityLabel: 'ANAF (financiar)',
      contentLabel: 'Indicatori financiari',
      lastSnapshotDate: null,
      status: 'pending',
      rowCount: 0,
      isNameOnly: false,
      sourceSnapshotId: 'anaf_financial_pending',
    },
    {
      sourceId: 'MJ_REGISTRY',
      authorityLabel: 'MJ (registru ONG)',
      contentLabel: 'Registrul național ONG',
      lastSnapshotDate: '2024-06-03',
      status: 'name_only',
      rowCount: 126011,
      isNameOnly: true,
      sourceSnapshotId: 'mj_registry_2024_06',
    },
    {
      sourceId: 'SGG_UTILITY',
      authorityLabel: 'SGG (utilitate publică)',
      contentLabel: 'Recunoașteri utilitate publică',
      lastSnapshotDate: '2024-06-05',
      status: 'name_only',
      rowCount: 229,
      isNameOnly: true,
      sourceSnapshotId: 'sgg_public_utility_2024_06',
    },
  ],
  lastFullLoad: {
    runId: '4931',
    date: '2026-06-20',
    rowsLoaded: 19929,
    gate: '15/15 structural checks',
  },
  knownGaps: [
    'Datele financiare (ANAF) sunt în curs de actualizare.',
    'Instantaneele pentru servicii sociale sunt din 2023–2024.',
    'Înregistrările MJ/SGG sunt referințe neconfirmate (doar după nume).',
  ],
}

// ---------------------------------------------------------------------------
// Social-service providers + services (discovery mocks).
// ---------------------------------------------------------------------------

const providers: SocialServiceProvider[] = [
  {
    cui: '12345678',
    providerName: 'Asociația Diaconia Socială',
    providerType: 'ong',
    county: 'Cluj',
    locality: 'Cluj-Napoca',
    sirutaCode: '59773',
    address: 'Str. Memorandumului nr. 10',
    licenseNumber: 'SV/CJ/001/2020',
    status: 'licențiat',
    sourceSnapshotId: 'mmuncii_providers_2024_04_10',
    sourceRecordKey: 'mmuncii_prov_12345678',
    sourceRowHash: 'row-12345678',
  },
  {
    cui: '12345678',
    providerName: 'Asociația Diaconia Socială',
    providerType: 'ong',
    county: 'Cluj',
    locality: 'Cluj-Napoca',
    sirutaCode: '59773',
    address: 'Str. Memorandumului nr. 10',
    licenseNumber: 'SV/CJ/001/2020',
    status: 'licențiat',
    sourceSnapshotId: 'mmuncii_providers_2024_04_10',
    sourceRecordKey: 'mmuncii_prov_12345678_b',
    sourceRowHash: 'row-12345678-b',
  },
  {
    cui: '87654321',
    providerName: 'Fundația Inima de Copil',
    providerType: 'fundatie',
    county: 'Bihor',
    locality: 'Oradea',
    sirutaCode: '27742',
    address: 'Calea Republicii nr. 22',
    licenseNumber: 'SV/BH/014/2019',
    status: 'licențiat',
    sourceSnapshotId: 'mmuncii_providers_2024_04_10',
    sourceRecordKey: 'mmuncii_prov_87654321',
    sourceRowHash: 'row-87654321',
  },
  {
    cui: '5550001',
    providerName: 'Asociația Handicap Ușor',
    providerType: 'ong',
    county: 'Timiș',
    locality: 'Timișoara',
    sirutaCode: '35433',
    address: 'Bd. Revoluției 1989 nr. 5',
    licenseNumber: 'SV/TM/077/2018',
    status: 'licențiat',
    sourceSnapshotId: 'mmuncii_providers_2024_04_10',
    sourceRecordKey: 'mmuncii_prov_5550001',
    sourceRowHash: 'row-5550001',
  },
  {
    cui: '7770002',
    providerName: 'Atelierul Protejat «Speranța»',
    providerType: 'ong',
    county: 'Timiș',
    // Missing locality on purpose — exercises the "Localitate necunoscută" case.
    locality: null,
    sirutaCode: '35433',
    address: null,
    licenseNumber: 'SV/TM/102/2017',
    status: 'licențiat',
    sourceSnapshotId: 'mmuncii_providers_2024_04_10',
    sourceRecordKey: 'mmuncii_prov_7770002',
    sourceRowHash: 'row-7770002',
  },
]

const services: SocialService[] = [
  {
    providerCui: '12345678',
    providerName: 'Asociația Diaconia Socială',
    serviceName: 'Centru de zi pentru seniori',
    serviceType: 'elderly_care',
    serviceCode: 'SS-01',
    county: 'Cluj',
    locality: 'Cluj-Napoca',
    sirutaCode: '59773',
    address: 'Str. Memorandumului nr. 10',
    licenseNumber: 'SV/CJ/001/2020',
    validFrom: '2021-01-01',
    validUntil: '2026-12-31',
    capacity: 40,
    status: 'activ',
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
  },
  {
    providerCui: '12345678',
    providerName: 'Asociația Diaconia Socială',
    serviceName: 'Serviciu de asistență la domiciliu',
    serviceType: 'home_care',
    serviceCode: 'SS-04',
    county: 'Cluj',
    locality: 'Cluj-Napoca',
    sirutaCode: '59773',
    address: 'Str. Memorandumului nr. 10',
    licenseNumber: 'SV/CJ/001/2020',
    validFrom: '2021-01-01',
    validUntil: '2025-08-01',
    capacity: 25,
    status: 'activ',
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
  },
  {
    providerCui: '12345678',
    providerName: 'Asociația Diaconia Socială',
    serviceName: 'Adăpost de noapte',
    serviceType: 'shelter',
    serviceCode: 'SS-09',
    county: 'Cluj',
    locality: 'Cluj-Napoca',
    sirutaCode: '59773',
    address: 'Str. Memorandumului nr. 10',
    licenseNumber: 'SV/CJ/001/2020',
    validFrom: '2019-06-01',
    validUntil: '2022-06-01',
    capacity: 15,
    status: 'expirat',
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
  },
  {
    providerCui: '87654321',
    providerName: 'Fundația Inima de Copil',
    serviceName: 'Centru de zi pentru copii',
    serviceType: 'child_protection',
    serviceCode: 'SS-02',
    county: 'Bihor',
    locality: 'Oradea',
    sirutaCode: '27742',
    address: 'Calea Republicii nr. 22',
    licenseNumber: 'SV/BH/014/2019',
    validFrom: '2020-03-01',
    validUntil: '2026-07-15',
    capacity: 60,
    status: 'activ',
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
  },
  {
    providerCui: '5550001',
    providerName: 'Asociația Handicap Ușor',
    serviceName: 'Servicii pentru persoane cu dizabilități',
    serviceType: 'disability',
    serviceCode: 'SS-05',
    county: 'Timiș',
    locality: 'Timișoara',
    sirutaCode: '35433',
    address: 'Bd. Revoluției 1989 nr. 5',
    licenseNumber: 'SV/TM/077/2018',
    validFrom: '2018-09-01',
    validUntil: '2026-09-01',
    capacity: 30,
    status: 'activ',
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
  },
  {
    providerCui: '5550001',
    providerName: 'Asociația Handicap Ușor',
    serviceName: 'Atelier protejat',
    serviceType: 'sheltered_workshop',
    serviceCode: 'SS-08',
    county: 'Timiș',
    locality: 'Timișoara',
    sirutaCode: '35433',
    address: 'Bd. Revoluției 1989 nr. 5',
    licenseNumber: 'SV/TM/077/2018',
    validFrom: '2017-01-01',
    validUntil: '2021-12-31',
    capacity: 12,
    status: 'expirat',
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
  },
  {
    providerCui: '7770002',
    providerName: 'Atelierul Protejat «Speranța»',
    serviceName: 'Atelier protejat (muncă protejată)',
    serviceType: 'sheltered_workshop',
    serviceCode: 'SS-08',
    county: 'Timiș',
    // Missing locality — exercises the "Localitate necunoscută" case.
    locality: null,
    sirutaCode: '35433',
    address: null,
    licenseNumber: 'SV/TM/102/2017',
    validFrom: '2018-01-01',
    validUntil: '2026-08-20',
    capacity: 18,
    status: 'activ',
    sourceSnapshotId: 'mmuncii_services_2023_12_11',
  },
]

// ---------------------------------------------------------------------------
// Evidence records (citation spine) per CUI.
// ---------------------------------------------------------------------------

function evidenceFor(
  entries: ReadonlyArray<
    Pick<
      EvidenceRecord,
      | 'evidenceKind'
      | 'identityBasis'
      | 'reviewStatus'
      | 'sourceSnapshotId'
      | 'sourceId'
      | 'sourceRecordKey'
    > & { confidence?: number | null; sourceUrl?: string | null }
  >,
): EvidenceRecord[] {
  return entries.map((e) => ({
    evidenceKind: e.evidenceKind,
    identityBasis: e.identityBasis,
    reviewStatus: e.reviewStatus,
    confidence: e.confidence ?? null,
    sourceId: e.sourceId,
    sourceRecordKey: e.sourceRecordKey,
    sourceSnapshotId: e.sourceSnapshotId,
    sourceUrl: e.sourceUrl ?? null,
    attrs: null,
  }))
}

// ---------------------------------------------------------------------------
// Profiles (the five mock states + unknown → null).
// ---------------------------------------------------------------------------

const fullProfile: NgoProfile = {
  header: {
    cui: '12345678',
    name: 'Asociația Diaconia Socială',
    kind: 'ngo',
    alsoKinds: [],
    county: 'Cluj',
    locality: 'Cluj-Napoca',
    identityBasis: 'direct_cui',
  },
  sectorMemberships: [
    {
      cui: '12345678',
      organizationName: 'Asociația Diaconia Socială',
      sector: 'social_economy',
      membershipType: 'rueis',
      certificateNumber: 'RUEIS-CJ-0142',
      certificateDate: '2019-04-12',
      validUntil: '2027-04-12',
      status: 'activ',
      sanctionStatus: null,
      county: 'Cluj',
      locality: 'Cluj-Napoca',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
    },
  ],
  accreditations: [
    {
      cui: '12345678',
      organizationName: 'Asociația Diaconia Socială',
      authority: 'ANOFM',
      accreditationType: 'employment_service_providers',
      registrationCode: 'ANOFM-CJ-220',
      accreditationNumber: 'AOC-2021-0142',
      validFrom: '2021-06-01',
      validUntil: '2026-06-01',
      status: 'activ',
      county: 'Cluj',
      locality: 'Cluj-Napoca',
      sourceSnapshotId: 'anofm_accred_2026_06_20',
    },
  ],
  provider: providers[0],
  services: services.filter((s) => s.providerCui === '12345678'),
  publicUtility: [
    {
      organizationName: 'Asociația Diaconia Socială',
      recognizingAuthority: 'SGG',
      hgNumber: 'HG 845/2020',
      hgDate: null,
      orderNumber: null,
      recognitionYear: null,
      status: 'recunoscut',
      linkStatus: 'review_pending',
      sourceSnapshotId: 'sgg_public_utility_2024_06',
    },
  ],
  legalRegistry: [],
  financials: [],
  evidence: evidenceFor([
    {
      evidenceKind: 'sector_membership',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
      sourceId: 'ANOFM',
      sourceRecordKey: 'rueis_12345678',
    },
    {
      evidenceKind: 'accreditation',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'anofm_accred_2026_06_20',
      sourceId: 'ANOFM',
      sourceRecordKey: 'accred_12345678',
    },
    {
      evidenceKind: 'social_service_provider',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'mmuncii_providers_2024_04_10',
      sourceId: 'MMuncii',
      sourceRecordKey: 'mmuncii_prov_12345678',
    },
    {
      evidenceKind: 'social_service',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'mmuncii_services_2023_12_11',
      sourceId: 'MMuncii',
      sourceRecordKey: 'mmuncii_serv_12345678_1',
    },
    {
      evidenceKind: 'public_utility',
      identityBasis: 'name_review',
      reviewStatus: 'review_pending',
      sourceSnapshotId: 'sgg_public_utility_2024_06',
      sourceId: 'SGG',
      sourceRecordKey: 'sgg_12345678_name',
    },
  ]),
  snapshotsById: ngoSourceSnapshots,
  candidateMatches: [],
}

const collisionProfile: NgoProfile = {
  ...fullProfile,
  header: {
    ...fullProfile.header,
    cui: '87654321',
    name: 'Fundația Inima de Copil',
    alsoKinds: ['company'],
    county: 'Bihor',
    locality: 'Oradea',
  },
  sectorMemberships: [
    {
      ...fullProfile.sectorMemberships[0],
      cui: '87654321',
      organizationName: 'Fundația Inima de Copil',
      county: 'Bihor',
      locality: 'Oradea',
      certificateNumber: 'RUEIS-BH-0089',
    },
  ],
  accreditations: [],
  provider: providers.find((p) => p.cui === '87654321') ?? null,
  services: services.filter((s) => s.providerCui === '87654321'),
  publicUtility: [],
  legalRegistry: [],
  evidence: evidenceFor([
    {
      evidenceKind: 'sector_membership',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
      sourceId: 'ANOFM',
      sourceRecordKey: 'rueis_87654321',
    },
    {
      evidenceKind: 'social_service_provider',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'mmuncii_providers_2024_04_10',
      sourceId: 'MMuncii',
      sourceRecordKey: 'mmuncii_prov_87654321',
    },
    {
      evidenceKind: 'social_service',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'mmuncii_services_2023_12_11',
      sourceId: 'MMuncii',
      sourceRecordKey: 'mmuncii_serv_87654321_1',
    },
  ]),
}

const sanctionedProfile: NgoProfile = {
  header: {
    cui: '5550001',
    name: 'Asociația Handicap Ușor',
    kind: 'ngo',
    alsoKinds: [],
    county: 'Timiș',
    locality: 'Timișoara',
    identityBasis: 'direct_cui',
  },
  sectorMemberships: [
    {
      cui: '5550001',
      organizationName: 'Asociația Handicap Ușor',
      sector: 'social_economy',
      membershipType: 'rueis',
      certificateNumber: 'RUEIS-TM-0411',
      certificateDate: '2016-02-01',
      validUntil: '2026-02-01',
      status: 'sancționat',
      sanctionStatus: 'suspendat_temporar',
      county: 'Timiș',
      locality: 'Timișoara',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
    },
  ],
  accreditations: [],
  provider: providers.find((p) => p.cui === '5550001') ?? null,
  services: services.filter((s) => s.providerCui === '5550001'),
  publicUtility: [],
  legalRegistry: [],
  financials: [],
  evidence: evidenceFor([
    {
      evidenceKind: 'sector_membership',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
      sourceId: 'ANOFM',
      sourceRecordKey: 'rueis_5550001',
    },
    {
      evidenceKind: 'social_service_provider',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'mmuncii_providers_2024_04_10',
      sourceId: 'MMuncii',
      sourceRecordKey: 'mmuncii_prov_5550001',
    },
    {
      evidenceKind: 'social_service',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'mmuncii_services_2023_12_11',
      sourceId: 'MMuncii',
      sourceRecordKey: 'mmuncii_serv_5550001_1',
    },
  ]),
  snapshotsById: ngoSourceSnapshots,
  candidateMatches: [],
}

const sparseProfile: NgoProfile = {
  header: {
    cui: '7770002',
    name: 'Atelierul Protejat «Speranța»',
    kind: 'ngo',
    alsoKinds: [],
    // Missing county/locality — exercises "Localitate necunoscută".
    county: null,
    locality: null,
    identityBasis: 'direct_cui',
  },
  sectorMemberships: [
    {
      cui: '7770002',
      organizationName: 'Atelierul Protejat «Speranța»',
      sector: 'social_economy',
      membershipType: 'rueis',
      certificateNumber: 'RUEIS-TM-0518',
      certificateDate: '2017-09-15',
      validUntil: '2027-09-15',
      status: 'activ',
      sanctionStatus: null,
      county: null,
      locality: null,
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
    },
  ],
  accreditations: [],
  provider: null,
  services: [],
  publicUtility: [],
  legalRegistry: [],
  financials: [],
  evidence: evidenceFor([
    {
      evidenceKind: 'sector_membership',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
      sourceId: 'ANOFM',
      sourceRecordKey: 'rueis_7770002',
    },
  ]),
  snapshotsById: ngoSourceSnapshots,
  candidateMatches: [],
}

const candidateMatch: LinkReviewCase = {
  candidateOrgId: null,
  candidateCui: '9990003',
  evidenceName: 'Asociația Lumina',
  candidateName: 'Asociația Lumina pentru Copii',
  method: 'name_token_jaccard',
  confidence: 0.62,
  reviewStatus: 'needs_more_evidence',
  comparedFields: { name: 'Asociația Lumina', county: 'București' },
  decisionNotes: 'Potrivire probabilă pe nume; CUI lipsă în sursa MJ.',
}

const nameOnlyHeavyProfile: NgoProfile = {
  header: {
    cui: '9990003',
    name: 'Asociația Lumina',
    kind: 'ngo',
    alsoKinds: [],
    county: 'București',
    locality: 'București',
    identityBasis: 'direct_cui',
  },
  sectorMemberships: [
    {
      cui: '9990003',
      organizationName: 'Asociația Lumina',
      sector: 'social_economy',
      membershipType: 'rueis',
      certificateNumber: 'RUEIS-B-0099',
      certificateDate: '2018-11-10',
      validUntil: '2026-11-10',
      status: 'activ',
      sanctionStatus: null,
      county: 'București',
      locality: 'București',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
    },
  ],
  accreditations: [],
  provider: null,
  services: [],
  // MJ + SGG name-only references whose linkStatus is review_pending.
  publicUtility: [
    {
      organizationName: 'Asociația Lumina pentru Copii',
      recognizingAuthority: 'SGG',
      hgNumber: 'HG 120/2019',
      hgDate: null,
      orderNumber: null,
      recognitionYear: null,
      status: 'recunoscut',
      linkStatus: 'review_pending',
      sourceSnapshotId: 'sgg_public_utility_2024_06',
    },
  ],
  legalRegistry: [
    {
      entityKind: 'ong',
      registryNumber: 'J40/7781/2019',
      courtName: 'Judecătoria Sector 1 București',
      organizationName: 'Asociația Lumina pentru Copii',
      legalForm: 'Asociație',
      registryStatus: 'înregistrat',
      county: 'București',
      locality: 'București',
      address: 'Str. Luminii nr. 7',
      linkStatus: 'review_pending',
      sourceSnapshotId: 'mj_registry_2024_06',
    },
  ],
  financials: [],
  evidence: evidenceFor([
    {
      evidenceKind: 'sector_membership',
      identityBasis: 'direct_cui',
      reviewStatus: 'accepted',
      sourceSnapshotId: 'anofm_rueis_2026_06_20',
      sourceId: 'ANOFM',
      sourceRecordKey: 'rueis_9990003',
    },
    {
      evidenceKind: 'legal_registry',
      identityBasis: 'name_review',
      reviewStatus: 'review_pending',
      sourceSnapshotId: 'mj_registry_2024_06',
      sourceId: 'MJ',
      sourceRecordKey: 'mj_lumina_name',
    },
    {
      evidenceKind: 'public_utility',
      identityBasis: 'name_review',
      reviewStatus: 'review_pending',
      sourceSnapshotId: 'sgg_public_utility_2024_06',
      sourceId: 'SGG',
      sourceRecordKey: 'sgg_lumina_name',
    },
  ]),
  snapshotsById: ngoSourceSnapshots,
  candidateMatches: [candidateMatch],
}

const mockProfilesByCui: Readonly<Record<string, NgoProfile | null>> = {
  '12345678': fullProfile,
  '87654321': collisionProfile,
  '5550001': sanctionedProfile,
  '7770002': sparseProfile,
  '9990003': nameOnlyHeavyProfile,
}

export function getMockNgoProfile(cui: string): NgoProfile | null {
  return mockProfilesByCui[cui] ?? null
}

export const mockNgoCuis = Object.keys(mockProfilesByCui).filter(
  (cui) => mockProfilesByCui[cui] !== null,
) as string[]

// ---------------------------------------------------------------------------
// Public funding (cross-links) per CUI.
// ---------------------------------------------------------------------------

const fundingByCui: Readonly<Record<string, PublicFunding>> = {
  '12345678': {
    cui: '12345678',
    siruta: '59773',
    funding: [
      {
        source: 'procurement',
        label: 'Achiziții publice',
        joinKey: 'cui',
        joinValue: '12345678',
        available: true,
        recordCount: 3,
        totalAmount: { value: 480_000, currency: 'RON' },
        href: null,
        lastSeen: '2025-11-02',
      },
      {
        source: 'pnrr',
        label: 'Plăți PNRR',
        joinKey: 'cui',
        joinValue: '12345678',
        available: true,
        recordCount: 1,
        totalAmount: { value: 120_000, currency: 'EUR' },
        href: null,
        lastSeen: '2025-09-18',
      },
      {
        source: 'money_flows',
        label: 'Fluxuri banesti',
        joinKey: 'cui',
        joinValue: '12345678',
        available: true,
        recordCount: 0,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
      {
        source: 'legea_350',
        label: 'Legea 350 (granturi locale)',
        joinKey: 'cui',
        joinValue: '12345678',
        available: false,
        recordCount: null,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
    ],
    related: [
      {
        kind: 'company',
        label: 'Acest CUI apare și ca firmă',
        href: '/companies/12345678?from=ong',
        joinKey: 'cui',
        joinValue: '12345678',
      },
      {
        kind: 'public_entity',
        label: 'Profil entitate (CUI)',
        href: '/entities/12345678?from=ong',
        joinKey: 'cui',
        joinValue: '12345678',
      },
      {
        kind: 'territory',
        label: 'Hartă SIRUTA (Cluj-Napoca)',
        href: '/map?from=ong&siruta=59773',
        joinKey: 'siruta',
        joinValue: '59773',
      },
    ],
  },
  '87654321': {
    cui: '87654321',
    siruta: '27742',
    funding: [
      {
        source: 'procurement',
        label: 'Achiziții publice',
        joinKey: 'cui',
        joinValue: '87654321',
        available: true,
        recordCount: 0,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
      {
        source: 'pnrr',
        label: 'Plăți PNRR',
        joinKey: 'cui',
        joinValue: '87654321',
        available: true,
        recordCount: 0,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
      {
        source: 'legea_350',
        label: 'Legea 350 (granturi locale)',
        joinKey: 'cui',
        joinValue: '87654321',
        available: false,
        recordCount: null,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
    ],
    related: [
      {
        kind: 'company',
        label: 'Acest CUI apare și ca firmă',
        href: '/companies/87654321?from=ong',
        joinKey: 'cui',
        joinValue: '87654321',
      },
    ],
  },
}

export function getMockPublicFunding(cui: string): PublicFunding | null {
  if (cui in fundingByCui) {
    return fundingByCui[cui]
  }
  // Generic absence-of-evidence funding for the other mock CUIs.
  return {
    cui,
    siruta: null,
    funding: [
      {
        source: 'procurement',
        label: 'Achiziții publice',
        joinKey: 'cui',
        joinValue: cui,
        available: true,
        recordCount: 0,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
      {
        source: 'pnrr',
        label: 'Plăți PNRR',
        joinKey: 'cui',
        joinValue: cui,
        available: true,
        recordCount: 0,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
      {
        source: 'legea_350',
        label: 'Legea 350 (granturi locale)',
        joinKey: 'cui',
        joinValue: cui,
        available: false,
        recordCount: null,
        totalAmount: null,
        href: null,
        lastSeen: null,
      },
    ],
    related:
      cui in mockProfilesByCui && mockProfilesByCui[cui]?.header.county
        ? [
            {
              kind: 'public_entity' as const,
              label: `Profil entitate (CUI)`,
              href: `/entities/${cui}?from=ong`,
              joinKey: 'cui' as const,
              joinValue: cui,
            },
          ]
        : [],
  }
}

// ---------------------------------------------------------------------------
// Service discovery result (derived from the mock services above).
// ---------------------------------------------------------------------------

function deriveValidity(validUntil: string | null): 'active' | 'expiring' | 'expired' {
  if (!validUntil) return 'active'
  const until = new Date(validUntil).getTime()
  const now = Date.now()
  const sixtyDays = 60 * 24 * 60 * 60 * 1000
  if (until < now) return 'expired'
  if (until < now + sixtyDays) return 'expiring'
  return 'active'
}

function buildServiceDiscovery(): ServiceDiscoveryResult {
  const rows = services.map((s) => ({
    ...s,
    derivedStatus: deriveValidity(s.validUntil),
    snapshotDate: ngoSourceSnapshots[s.sourceSnapshotId]
      ?.sourceDeclaredSnapshotDate ?? null,
  }))

  const byCounty = new Map<string, { name: string; providers: Set<string>; byType: Map<string, number> }>()
  for (const r of rows) {
    const code = r.county ?? 'NEC'
    if (!byCounty.has(code)) {
      byCounty.set(code, { name: r.county ?? 'Necunoscut', providers: new Set(), byType: new Map() })
    }
    const entry = byCounty.get(code)
    if (entry) {
      if (r.providerCui) entry.providers.add(r.providerCui)
      const type = r.serviceType ?? 'necunoscut'
      entry.byType.set(type, (entry.byType.get(type) ?? 0) + 1)
    }
  }

  const aggregates = Array.from(byCounty.entries()).map(([code, entry]) => ({
    countyCode: code,
    countyName: entry.name,
    providerCount: entry.providers.size,
    serviceCount: rows.filter((r) => (r.county ?? 'NEC') === code).length,
    byServiceType: Object.fromEntries(entry.byType),
  }))

  return {
    rows,
    total: rows.length,
    aggregates,
    snapshot: {
      providerDate: ngoSourceSnapshots.mmuncii_providers_2024_04_10.sourceDeclaredSnapshotDate,
      serviceDate: ngoSourceSnapshots.mmuncii_services_2023_12_11.sourceDeclaredSnapshotDate,
      stale: true,
    },
  }
}

export const mockServiceDiscovery: ServiceDiscoveryResult = buildServiceDiscovery()

// ---------------------------------------------------------------------------
// Snapshot provenance (per-snapshot page).
// ---------------------------------------------------------------------------

function evidenceRowsForSnapshot(snapshotId: string): EvidenceRecord[] {
  const out: EvidenceRecord[] = []
  for (const profile of Object.values(mockProfilesByCui)) {
    if (!profile) continue
    for (const e of profile.evidence) {
      if (e.sourceSnapshotId === snapshotId) out.push(e)
    }
  }
  return out
}

const authorityLabels: Readonly<Record<string, string>> = {
  ANOFM: 'Agenția Națională pentru Ocuparea Forței de Muncă (ANOFM)',
  MMuncii: 'Ministerul Muncii și Solidarității Sociale (MMuncii)',
  ANAF: 'Agenția Națională de Administrare Fiscală (ANAF)',
  MJ: 'Ministerul Justiției (MJ)',
  SGG: 'Secretariatul General al Guvernului (SGG)',
}

export function getMockSnapshotProvenance(
  snapshotId: string,
): SnapshotProvenance | null {
  const snapshot = ngoSourceSnapshots[snapshotId]
  if (!snapshot) return null
  return {
    snapshot,
    authorityLabel: authorityLabels[snapshot.sourceId] ?? snapshot.sourceId,
    evidenceRows: evidenceRowsForSnapshot(snapshotId),
    validationIssues: ngoValidationIssues[snapshotId] ?? [],
  }
}

export const mockSnapshotIds = Object.keys(ngoSourceSnapshots)
