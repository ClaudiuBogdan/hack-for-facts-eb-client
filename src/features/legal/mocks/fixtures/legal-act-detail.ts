import type { LegalActDetail } from '@/schemas/legal'

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
  structure: [],
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
  structure: [
    { nodeId: '1551923', nodeKind: 'preambul', label: null, path: '00000' },
    { nodeId: '1551924', nodeKind: 'articol', label: 'Articolul 1', path: '00001' },
    { nodeId: '1551925', nodeKind: 'articol', label: 'Articolul 2', path: '00002' },
    { nodeId: '1551926', nodeKind: 'articol', label: 'Articolul 3', path: '00003' },
    { nodeId: '1551927', nodeKind: 'articol', label: 'Articolul 4', path: '00004' },
    { nodeId: '1551928', nodeKind: 'articol', label: 'Articolul 5', path: '00005' },
    { nodeId: '1551929', nodeKind: 'articol', label: 'Articolul 6', path: '00006' },
    { nodeId: '1551930', nodeKind: 'articol', label: 'Articolul 7', path: '00007' },
    { nodeId: '1551931', nodeKind: 'articol', label: 'Articolul 8', path: '00008' },
    { nodeId: '1551932', nodeKind: 'articol', label: 'Articolul 9', path: '00009' },
    { nodeId: '1551933', nodeKind: 'articol', label: 'Articolul 10', path: '00010' },
    { nodeId: '1551934', nodeKind: 'articol', label: 'Articolul 11', path: '00011' },
  ],
  officialTextUrl: 'https://legislatie.just.ro/Public/DetaliiDocument/171282',
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
