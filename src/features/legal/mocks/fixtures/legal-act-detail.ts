import type { LegalActDetail } from '@/schemas/legal'

/**
 * The legal_v2 form fields as the LEGACY source serves them: all null. The
 * two production copies below predate legal_v2, so they carry these.
 */
export const LEGACY_FORM_FIELDS = {
  readable: null,
  caveat: null,
  portalLabelRaw: null,
  portalLabelDate: null,
  held: null,
  formKey: null,
  sourceUrl: null,
} as const

/** The act-level legal_v2 fields as the legacy source serves them. */
const LEGACY_ACT_SOURCE: Pick<
  LegalActDetail,
  | 'dataSource'
  | 'bridgedFields'
  | 'newerNotAvailable'
  | 'defaultBasis'
  | 'defaultOrderReviewed'
  | 'latestAvailableDocumentId'
> = {
  dataSource: 'legal',
  bridgedFields: [],
  newerNotAvailable: null,
  defaultBasis: null,
  defaultOrderReviewed: null,
  latestAvailableDocumentId: null,
}

/**
 * Two real acts, copied verbatim from the production `legalAct` response on
 * 2026-08-01 — not invented. They are the two ends of the corpus (see
 * `docs/design/legal/act-detail.md` §2), so the page can be exercised at both
 * extremes without a live API:
 *
 *  - `103524` Legea nr. 2/2020 — the **median** act. 0 citations, 1 timeline
 *    entry, no article tree. This is what 80% of the corpus looks like.
 *  - `66150` Legea nr. 227/2015 (Codul Fiscal) — the **outlier**. 2.621
 *    citations, 295 amendments, 500 nodes, contradicted abrogations.
 */

/** The median act: a good summary and almost nothing else. */
export const legalActDetailFixture: LegalActDetail = {
  actId: '103524',
  displayCitation: 'Legea nr. 2/2020',
  actType: 'lege',
  actNumber: '2',
  actYear: 2020,
  issuerSlug: 'parlamentul',
  status: 'in-vigoare',
  statusEvidence: {
    modifiedByCount: 0,
    contradictedAbrogations: 0,
    abrogatedByCount: 0,
    futureEventCount: 0,
  },
  entryIntoForce: '2020-01-10',
  inDegree: 0,
  aliases: [],
  amendedAfterPublication: 0,
  ...LEGACY_ACT_SOURCE,
  canonical: {
    documentId: '222901',
    versionKind: 'original',
    versionDate: '2020-01-07',
    den: 'LEGE nr. 2 din 6 ianuarie 2020',
    title: 'LEGE 2 06/01/2020',
    issuerRaw: 'PARLAMENTUL',
    publicationRaw: 'MONITORUL OFICIAL nr. 5 din 7 ianuarie 2020',
    firstPublicationDate: '2020-01-07',
    extractionStatus: 'accepted',
    compatibilityTier: 'standard_articles',
    ...LEGACY_FORM_FIELDS,
  },
  summary: {
    description:
      'Legea nr. 2/2020 aprobă Ordonanța de urgență a Guvernului nr. 17/2019 privind programul de stimulare a înnoirii Parcului auto național.',
    plainLanguageSummary:
      'Această lege aprobă o măsură a Guvernului care încurajează românii să-și cumpere mașini noi. Prin programul de stimulare, statul oferă bani sau tichete ecologice celor care doresc să cumpere un autoturism nou. Scopul este să avem mașini mai puțin poluante pe străzi și să ajutăm industria auto din România. Legea nu este decizia inițială, ci confirmarea unei decizii deja luate de Guvern printr-o ordonanță de urgență.',
    documentCategory: 'lege',
    domains: ['economie-si-comert', 'mediu', 'transport'],
    affectedAudiences: ['cetateni', 'firme'],
    keywords: [
      'program de stimulare',
      'autoturisme noi',
      'prima de casare',
      'ecotichet',
      'Ordonanța de urgență nr. 17/2019',
      'înnoire parc auto',
      'reducere emisii',
    ],
    keyDates: [
      {
        date: '2020-01-06',
        description: 'Data adoptării legii de către Parlamentul României.',
      },
      {
        date: '2020-01-07',
        description: 'Data publicării legii în Monitorul Oficial nr. 5.',
      },
      { date: '2020-01-10', description: 'Data intrării în vigoare a legii.' },
      {
        date: null,
        description:
          'Data de 19 martie 2019 a adoptării Ordonanței de urgență a Guvernului nr. 17/2019.',
      },
    ],
    penaltiesMentioned: false,
    fiscalImpact: null,
    confidence: 0.9,
  },
  timeline: [
    {
      kind: 'status_event',
      effectiveDate: '2020-01-06',
      label: 'promulgare',
      eventSource: 'monitorul-oficial',
      relatedActId: null,
    },
  ],
  timelineComplete: true,
  gazettePublications: [
    {
      moIssueId: '58211',
      partCode: 'PI',
      issueNumber: 5,
      issueYear: 2020,
      issueDate: '2020-01-07',
      pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PI--5--2020.html',
      resolution: 'unique',
      matchedVia: 'act_year',
    },
  ],
  outLinks: {
    totalCount: 2,
    hasMore: false,
    items: [
      {
        relation: 'APROBA',
        resolution: 'unique',
        confidence: 0.95,
        targetRaw: 'Ordonanța de urgență a Guvernului nr. 17/2019',
        act: {
          actId: '99311',
          displayCitation: 'Ordonanța de urgență nr. 17/2019',
          actType: 'oug',
          actNumber: '17',
          actYear: 2019,
          issuerSlug: 'guvernul',
          status: 'modificat',
          inDegree: 14,
        },
      },
      {
        relation: 'FACE_REFERIRE',
        resolution: 'unresolved',
        confidence: 0,
        targetRaw: 'Ordonanța de urgență nr. 66/2014',
        act: null,
      },
    ],
  },
  inLinks: { totalCount: 0, hasMore: false, items: [] },
  incomingAnchors: { totalCount: 0, items: [] },
  documents: [
    {
      documentId: '222901',
      versionKind: 'original',
      versionDate: null,
      isCanonical: true,
      title: 'LEGE nr. 30 din 10 ianuarie 2019',
      firstPublicationDate: '2019-01-17',
      render: { renderStatus: 'served', chunkCount: 1 },
      ...LEGACY_FORM_FIELDS,
    },
  ],
  officialTextUrl: 'https://legislatie.just.ro/Public/DetaliiDocument/222901',
}

/**
 * The outlier: the Codul Fiscal. Exercises the staleness warning (295
 * amendments over a 2015 body), contradicted abrogations, and the "2.621
 * citations" scale problem in one page.
 */
export const legalActDetailRichFixture: LegalActDetail = {
  actId: '66150',
  displayCitation: 'Legea nr. 227/2015',
  actType: 'lege',
  actNumber: '227',
  actYear: 2015,
  issuerSlug: 'parlamentul',
  status: 'abrogat-partial',
  statusEvidence: {
    modifiedByCount: 216,
    contradictedAbrogations: 10,
    abrogatedByCount: 10,
    futureEventCount: 0,
  },
  entryIntoForce: '2016-01-01',
  inDegree: 2621,
  aliases: ['codul fiscal'],
  amendedAfterPublication: 295,
  ...LEGACY_ACT_SOURCE,
  canonical: {
    documentId: '171282',
    versionKind: 'corp',
    versionDate: '2015-09-10',
    den: 'CODUL FISCAL din 8 septembrie 2015',
    title: 'COD FISCAL 08/09/2015',
    issuerRaw: 'PARLAMENTUL',
    publicationRaw: 'MONITORUL OFICIAL nr. 688 din 10 septembrie 2015',
    firstPublicationDate: '2015-09-10',
    extractionStatus: 'accepted',
    compatibilityTier: 'standard_articles',
    ...LEGACY_FORM_FIELDS,
  },
  summary: {
    description:
      'Legea nr. 227/2015 privind Codul fiscal, adoptată de Parlament și publicată în Monitorul Oficial nr. 688 din 10 septembrie 2015, reglementează întregul sistem de impozite, taxe și contribuții sociale obligatorii aplicabil în România, înlocuind fostul Cod fiscal din 2003.',
    plainLanguageSummary:
      'Acest act este noul Cod fiscal al României, care stabilește toate regulile privind impozitele, taxele și contribuțiile pe care le plătesc persoanele fizice și firmele. El a înlocuit, de la 1 ianuarie 2016, vechiul Cod fiscal din 2003. Printre cele mai importante lucruri pe care le reglementează se numără: impozitul pe profit (16% pentru firme, cu excepții și facilități), impozitul pe venit pentru persoane fizice (16% din salarii, pensii, chirii, activități independente), TVA (cotă standard 20% în 2016, 19% din 2017, cu cote reduse de 9% și 5% pentru anumite produse), accizele (pentru alcool, tutun, combustibili, energie), contribuțiile sociale (pentru pensie, sănătate, șomaj) și taxele locale.',
    documentCategory: 'lege',
    domains: [
      'fiscal-si-bugetar',
      'economie-si-comert',
      'munca-si-protectie-sociala',
      'proprietate-si-urbanism',
      'administratie',
    ],
    affectedAudiences: [
      'cetateni',
      'firme',
      'institutii-publice',
      'ong',
      'autoritati-locale',
      'profesii-reglementate',
    ],
    keywords: [
      'cod fiscal',
      'impozit pe profit',
      'impozit pe venit',
      'TVA',
      'accize',
      'microîntreprinderi',
      'contribuții sociale',
      'taxe locale',
    ],
    keyDates: [
      {
        date: '2015-09-08',
        description: 'Data adoptării Codului fiscal (Legea nr. 227/2015).',
      },
      {
        date: '2015-09-10',
        description: 'Publicarea în Monitorul Oficial nr. 688.',
      },
      { date: '2016-01-01', description: 'Intrarea în vigoare a Codului fiscal.' },
    ],
    penaltiesMentioned: true,
    fiscalImpact:
      'Actul reprezintă codificarea integrală a sistemului fiscal românesc. Cota standard TVA de 20% (2016) și 19% (din 2017) asigură venituri bugetare importante; cotele reduse de 9% și 5% reprezintă facilități. Impozitul pe profit de 16% și impozitul pe venit de 16% sunt surse majore de venituri bugetare.',
    confidence: 0.95,
  },
  timeline: [
    {
      kind: 'status_event',
      effectiveDate: '2015-09-07',
      label: 'promulgare',
      eventSource: 'monitorul-oficial',
      relatedActId: '66151',
    },
    {
      kind: 'status_event',
      effectiveDate: '2015-09-30',
      label: 'completare',
      eventSource: 'portal',
      relatedActId: '66461',
    },
    {
      kind: 'status_event',
      effectiveDate: '2015-12-11',
      label: 'modificare',
      eventSource: 'portal',
      relatedActId: '68136',
    },
    {
      kind: 'amendment',
      effectiveDate: '2016-01-01',
      label: 'modifica de OUG nr. 50/2015',
      eventSource: null,
      relatedActId: '67165',
    },
  ],
  timelineComplete: true,
  gazettePublications: [
    {
      moIssueId: '45480',
      partCode: 'PI',
      issueNumber: 688,
      issueYear: 2015,
      issueDate: '2015-09-10',
      pdfUrl:
        'https://monitoruloficial.ro/Monitorul-Oficial--PI--688--2015.html',
      resolution: 'unique',
      matchedVia: 'act_year',
    },
  ],
  outLinks: {
    totalCount: 26,
    hasMore: false,
    items: [
      {
        relation: 'ABROGA',
        resolution: 'unresolved',
        confidence: 0,
        targetRaw: 'Legea nr. 571/2003 privind Codul fiscal',
        act: null,
      },
      {
        relation: 'MODIFICA',
        resolution: 'unique',
        confidence: 0.95,
        targetRaw: 'Legea nr. 1/2011 a educației naționale',
        act: {
          actId: '29384',
          displayCitation: 'Legea nr. 1/2011',
          actType: 'lege',
          actNumber: '1',
          actYear: 2011,
          issuerSlug: 'parlamentul',
          status: 'abrogat-partial',
          inDegree: 812,
        },
      },
      {
        relation: 'FACE_REFERIRE',
        resolution: 'external',
        confidence: 0.8,
        targetRaw: 'Directiva 2006/112/CE privind sistemul comun al TVA',
        act: null,
      },
    ],
  },
  inLinks: {
    totalCount: 2621,
    hasMore: true,
    items: [
      {
        relation: 'MODIFICA',
        resolution: 'cluster',
        confidence: 0.6,
        targetRaw: 'Codul fiscal',
        act: {
          actId: '163217',
          displayCitation: 'Legea nr. 141/2025',
          actType: 'lege',
          actNumber: '141',
          actYear: 2025,
          issuerSlug: 'parlamentul',
          status: 'abrogat-partial',
          inDegree: 3,
        },
      },
    ],
  },
  incomingAnchors: {
    totalCount: 395,
    items: [
      {
        sourceDocumentId: '279811',
        linkText: 'art. 291 alin. (3) din Codul fiscal',
        targetFragment: 'art. 291',
        targetResolution: 'held_fragment_resolved',
        sourceAct: {
          actId: '163217',
          displayCitation: 'Legea nr. 141/2025',
          actType: 'lege',
          actNumber: '141',
          actYear: 2025,
          issuerSlug: 'parlamentul',
          status: 'abrogat-partial',
          inDegree: 3,
        },
      },
      {
        sourceDocumentId: '254102',
        linkText: 'Legea nr. 227/2015 privind Codul fiscal',
        targetFragment: null,
        targetResolution: 'held',
        sourceAct: null,
      },
    ],
  },
  documents: [
    {
      documentId: '171282',
      versionKind: 'corp',
      versionDate: '2015-09-10',
      isCanonical: true,
      title: 'COD FISCAL 08/09/2015',
      firstPublicationDate: '2015-09-10',
      render: { renderStatus: 'served', chunkCount: 4 },
      ...LEGACY_FORM_FIELDS,
    },
    {
      documentId: '171280',
      versionKind: 'stub-header',
      versionDate: '2015-09-10',
      isCanonical: false,
      title: 'LEGE nr. 227 din 8 septembrie 2015',
      firstPublicationDate: '2015-09-10',
      render: null,
      ...LEGACY_FORM_FIELDS,
    },
    {
      documentId: '171282-c2026',
      versionKind: 'consolidare',
      versionDate: '2026-07-01',
      isCanonical: false,
      title: null,
      firstPublicationDate: null,
      render: null,
      ...LEGACY_FORM_FIELDS,
    },
  ],
  officialTextUrl: 'https://legislatie.just.ro/Public/DetaliiDocument/171282',
}

/**
 * legal_v2-SHAPED fixtures (`dataSource: 'legal_v2'`): documents are forms
 * (`f<form_id>`), consolidations carry the LEG-X3AV caveat and the Portal's
 * label date, and status/in-degree/summary are bridged or null.
 *
 * Test-only on purpose — they are NOT in `BY_ID`, so mock mode never shows a
 * synthesized consolidation under a real act's name. Ids are in a range no
 * real act or form uses (9000xx); the text a test serves for them is the
 * server converter's output of a real unit (`render-rows-v2-f900012.json`).
 */
const V2_ORIGINAL = {
  documentId: 'f900011',
  versionKind: 'original',
  versionDate: '1996-04-03',
  isCanonical: false,
  title: null,
  firstPublicationDate: '1996-04-03',
  render: { renderStatus: 'served', chunkCount: 1 },
  readable: true,
  caveat: null,
  portalLabelRaw: null,
  portalLabelDate: null,
  held: false,
  formKey: 'orig',
  sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900011',
} as const

/** The default form: a readable consolidation whose Portal date has passed. */
const V2_CONSOLIDATION = {
  documentId: 'f900012',
  versionKind: 'consolidare',
  versionDate: '2024-03-12',
  isCanonical: true,
  title: null,
  firstPublicationDate: null,
  render: { renderStatus: 'served', chunkCount: 1 },
  readable: true,
  caveat: 'unofficial_consolidation',
  portalLabelRaw: null,
  portalLabelDate: '2024-03-12',
  held: false,
  formKey: 'cons:2024-03-12',
  sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900012',
} as const

/**
 * An OLDER consolidation the Portal lists but whose text is not loaded. Under
 * `latest_any_kind` only the latest form can be the default, so a form
 * without text before it leaves the default current.
 */
const V2_CONSOLIDATION_NOT_LOADED = {
  documentId: 'f900013',
  versionKind: 'consolidare',
  versionDate: '2020-01-15',
  isCanonical: false,
  title: null,
  firstPublicationDate: null,
  render: { renderStatus: 'not_loaded', chunkCount: null },
  readable: false,
  caveat: 'unofficial_consolidation',
  portalLabelRaw: null,
  portalLabelDate: '2020-01-15',
  held: false,
  formKey: 'cons:2020-01-15',
  sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900013',
} as const

const V2_CANONICAL_HEAD = {
  versionKind: 'consolidare',
  versionDate: '2024-03-12',
  den: 'HOTĂRÂRE nr. 206 din 27 martie 1996',
  title: null,
  issuerRaw: null,
  publicationRaw: 'MONITORUL OFICIAL nr. 67 din 3 aprilie 1996',
  firstPublicationDate: null,
  extractionStatus: null,
  compatibilityTier: null,
} as const

/** A bridged legal_v2 act whose default (latest, readable) form is a consolidation. */
export const legalActDetailV2Fixture: LegalActDetail = {
  actId: '900001',
  displayCitation: 'Hotărârea nr. 206/1996',
  actType: 'hotarare',
  actNumber: '206',
  actYear: 1996,
  issuerSlug: 'guvernul',
  status: 'in-vigoare',
  statusEvidence: {
    modifiedByCount: 0,
    contradictedAbrogations: 0,
    abrogatedByCount: 0,
    futureEventCount: 0,
  },
  entryIntoForce: null,
  inDegree: 3,
  aliases: [],
  amendedAfterPublication: 0,
  dataSource: 'legal_v2',
  bridgedFields: [
    'status',
    'statusEvidence',
    'inDegree',
    'entryIntoForce',
    'amendedAfterPublication',
    'links',
    'incomingAnchors',
    'timeline',
    'summary',
  ],
  newerNotAvailable: 0,
  defaultBasis: 'current',
  defaultOrderReviewed: true,
  latestAvailableDocumentId: null,
  canonical: {
    documentId: V2_CONSOLIDATION.documentId,
    ...V2_CANONICAL_HEAD,
    readable: true,
    caveat: 'unofficial_consolidation',
    portalLabelRaw: null,
    portalLabelDate: '2024-03-12',
    held: false,
    formKey: V2_CONSOLIDATION.formKey,
    sourceUrl: V2_CONSOLIDATION.sourceUrl,
  },
  summary: null,
  timeline: [],
  timelineComplete: true,
  gazettePublications: [],
  outLinks: { totalCount: 0, hasMore: false, items: [] },
  inLinks: { totalCount: 0, hasMore: false, items: [] },
  incomingAnchors: { totalCount: 0, items: [] },
  documents: [V2_ORIGINAL, V2_CONSOLIDATION, V2_CONSOLIDATION_NOT_LOADED],
  officialTextUrl: V2_CONSOLIDATION.sourceUrl,
}

/**
 * A legal_v2 act the previous corpus does not hold: nothing bridged, so
 * status, its evidence, in-degree and the amendment count are null. Its
 * default form is the original.
 */
export const legalActDetailV2UnbridgedFixture: LegalActDetail = {
  ...legalActDetailV2Fixture,
  actId: '900002',
  status: null,
  statusEvidence: null,
  inDegree: null,
  amendedAfterPublication: null,
  bridgedFields: [],
  newerNotAvailable: 0,
  defaultBasis: 'current',
  canonical: {
    documentId: V2_ORIGINAL.documentId,
    ...V2_CANONICAL_HEAD,
    versionKind: 'original',
    versionDate: '1996-04-03',
    readable: true,
    caveat: null,
    portalLabelRaw: null,
    portalLabelDate: null,
    held: false,
    formKey: V2_ORIGINAL.formKey,
    sourceUrl: V2_ORIGINAL.sourceUrl,
  },
  documents: [{ ...V2_ORIGINAL, isCanonical: true }],
  officialTextUrl: V2_ORIGINAL.sourceUrl,
}

/** The latest form: a republication the Portal lists, with no text yet. */
const V2_REPUBLICATION_NOT_LOADED = {
  documentId: 'f900014',
  versionKind: 'republicare',
  versionDate: '2025-06-01',
  isCanonical: false,
  title: null,
  firstPublicationDate: '2025-06-01',
  render: { renderStatus: 'not_loaded', chunkCount: null },
  readable: false,
  caveat: null,
  portalLabelRaw: null,
  portalLabelDate: null,
  held: false,
  formKey: 'rep:2025-06-01',
  sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/900014',
} as const

/**
 * `latest_not_available`: the latest form (a 2025 republication) has no
 * text, so NO form is current — `canonical` is null — and the latest form
 * that has text (the 2024 consolidation) is offered as "not the current
 * version".
 */
export const legalActDetailV2LatestNotAvailableFixture: LegalActDetail = {
  ...legalActDetailV2Fixture,
  actId: '900003',
  newerNotAvailable: 1,
  defaultBasis: 'latest_not_available',
  latestAvailableDocumentId: V2_CONSOLIDATION.documentId,
  canonical: null,
  documents: [
    V2_ORIGINAL,
    { ...V2_CONSOLIDATION, isCanonical: false },
    V2_CONSOLIDATION_NOT_LOADED,
    V2_REPUBLICATION_NOT_LOADED,
  ],
  officialTextUrl: null,
}

/** `latest_not_available` with no form that has text: nothing to offer. */
export const legalActDetailV2NoTextFixture: LegalActDetail = {
  ...legalActDetailV2LatestNotAvailableFixture,
  actId: '900004',
  latestAvailableDocumentId: null,
  documents: [V2_REPUBLICATION_NOT_LOADED],
}

/** `no_known_form`: an act legal_v2 holds with no form at all. */
export const legalActDetailV2NoKnownFormFixture: LegalActDetail = {
  ...legalActDetailV2LatestNotAvailableFixture,
  actId: '900005',
  newerNotAvailable: 0,
  defaultBasis: 'no_known_form',
  defaultOrderReviewed: null,
  latestAvailableDocumentId: null,
  documents: [],
}

const BY_ID: Record<string, LegalActDetail> = {
  [legalActDetailFixture.actId]: legalActDetailFixture,
  [legalActDetailRichFixture.actId]: legalActDetailRichFixture,
}

/**
 * Unknown ids resolve to `null`, never to a fallback act.
 *
 * An earlier version returned the median fixture for any id, which put "Legea
 * nr. 2/2020" — a real act, with its real citation and dates — at
 * `/legislation/acts/999`. A shareable URL asserting the wrong act is a worse
 * failure than a not-found page, and no amount of mock labelling makes it
 * acceptable.
 */
export function legalActDetailById(actId: string): LegalActDetail | null {
  return BY_ID[actId] ?? null
}
