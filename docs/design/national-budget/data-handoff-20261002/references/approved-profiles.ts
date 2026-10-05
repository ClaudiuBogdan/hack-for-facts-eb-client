import unitEvidence2018 from './approved-budget-unit-evidence-2018.json' with { type: 'json' };
import unitEvidence2019 from './approved-budget-unit-evidence-2019.json' with { type: 'json' };
import unitEvidence2020 from './approved-budget-unit-evidence-2020.json' with { type: 'json' };
import unitEvidence2021 from './approved-budget-unit-evidence-2021.json' with { type: 'json' };
import unitEvidence2022 from './approved-budget-unit-evidence-2022.json' with { type: 'json' };
import unitEvidence2023 from './approved-budget-unit-evidence-2023.json' with { type: 'json' };
import unitEvidence2024 from './approved-budget-unit-evidence-2024.json' with { type: 'json' };
import unitEvidence from './approved-budget-unit-evidence.json' with { type: 'json' };
import { sha256Hex } from './hash.js';
import { canonicalExecutionJson } from './raw-import.js';

/** Reviewed interpretation profiles of the budget-law XML forms, one per
 * budget edition (the law's budget year): the five pinned originals already
 * registered in source_budget_law.files, their CKAN publication, the
 * publication vintage and the official unit evidence per form. Changing
 * anything here changes the config digest and so the interpretation identity;
 * stored interpretations are never rewritten. The 2025 edition is the
 * released one: its values and config serialization are frozen. */
export const APPROVED_BUDGET_PARSER_VERSION = 'budget-law-approved-xml-v1';

/** DENUMIRE of a credit-type row; it carries the amounts of its context row. */
export const CREDIT_LABELS = {
  'I.Credite de angajament': 'commitment_credits',
  'II.Credite bugetare': 'budget_credits',
} as const;

/** Every amount token of these profiles, measured on all pinned files: an
 * optional leading minus, dot-grouped thousands or plain digits. No decimal
 * comma, brackets or other forms are admitted. */
export const AMOUNT_TOKEN = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)$/u;

export interface PinnedDocument {
  url: string;
  sha256: string;
  bytes: number;
}
/** How a synthesis page was witnessed when the pinned PDF has no usable text
 * layer (2021, 2022 and 2024): the pinned page itself, visually reviewed; any OCR is an
 * auxiliary transcription, never the evidence. */
export interface PageWitness {
  kind: 'visual_page_review';
  review: string;
  transcription: string;
}
/** The primary's masked review of a pinned print page (2023): the reviewed
 * render and receipt, the printed years, and one pattern per printed token in
 * which '?' is an unconfirmed glyph (never a reading). */
export interface PrintMask {
  patterns: readonly [string, string, string, string];
  printYears: readonly [number, number, number, number];
  review: { file: string; sha256: string; renderSha256: string };
}
/** 2020 unemployment only: the adjacent same-annex continuation page that
 * supplies the value-column year headings of a visually reviewed witness page
 * on which one heading glyph is unreadable. The witness page's own headings
 * are kept as observed (`null` = unreadable, never inferred; its label keeps
 * `?` over the unread digit). The continuation page is the next physical page
 * of the same pinned document, the same annex's page 2 (printed page + 1),
 * with the same unit and value-column indices; it supplies year headings
 * only, never amounts. Pinned to the primary's receipt and both renders. */
export interface ContinuationHeader {
  witnessPage: {
    printedPage: number;
    annexPage: number;
    observedYearHeaders: readonly (number | null)[];
    observedColumnLabels: readonly string[];
  };
  page: {
    documentSha256: string;
    pdfPageOneBased: number;
    printedPage: number;
    annexLabel: string;
    annexPage: number;
    unit: string;
    columnIndices: readonly number[];
    columnLabels: readonly string[];
    yearHeaders: readonly number[];
    renderSha256: string;
  };
  review: { file: string; sha256: string; witnessRenderSha256: string };
}
/** How a held source document was acquired: a research response (HTTP 200)
 * retained before this lane existed and transferred into custody as held
 * bytes, never relabelled as a fresh capture. */
export interface HeldAcquisition {
  origin: 'held_research_transfer';
  requestedUrl: string;
  finalUrl: string;
  httpStatus: 200;
  contentType: string;
  fetchedAt: string;
  sha256: string;
  bytes: number;
  receipt: { file: string; lineSha256: string };
}
export type HeldDocument = PinnedDocument & { acquisition: HeldAcquisition };
/** A separately pinned official law page (legislatie.just.ro) that supplies
 * one uniquely identified anchor of a masked print page: the annex table,
 * its legend covering all four value columns, the four value-column labels
 * as printed (a conflict with the edition years is recorded, never used), and
 * the anchor located by annex, label, printed codes and role only, with its
 * four position-preserved tokens. Evidence for unit and source binding, not a
 * claim of document equality; the XML supplies every amount. */
export interface TextWitness {
  kind: 'legislatie_annex_anchor';
  document: PinnedDocument;
  annexTitle: string;
  legend: '- mii lei -';
  columnLabels: readonly [string, string, string, string];
  yearLabelConflict: boolean;
  anchor: {
    label: string;
    printedCodes: readonly [string, string, string, string, string, string];
    role: 'descriptor';
  };
  tokens: readonly [string, string, string, string];
  portalActions: {
    url: string;
    form: Record<string, string>;
    fetchedAt: string;
    responseSha256: string;
    statement: string;
  };
}
/** External, source-bound unit assertions (no native XML unit claim and no
 * complete PDF value-equivalence claim). A synthesis is bound to its annex
 * page in the published law; the per-authority detail to the Ministry's
 * published Anexa 3 PDFs (two credit-row anchors per authority) and, for the
 * national revenue section 999, to the state synthesis rows it repeats. */
export type UnitProvenance =
  | {
      status: 'proven';
      kind: 'synthesis_page';
      unit: 'thousand_lei';
      legend: '- mii lei -';
      document: PinnedDocument;
      page: number;
      annexLabel: string;
      rowLabel: string;
      /** The record whose four tokens equal the printed row. */
      recordIndex: number;
      tokens: readonly [string, string, string, string];
      /** Absent for 2025 (text layer); present only where it was needed. */
      witness?: PageWitness;
      /** 2023 only: the masked review; any '?' requires `textWitness`. */
      mask?: PrintMask;
      textWitness?: TextWitness;
      /** 2020 unemployment only: see ContinuationHeader. */
      continuationHeader?: ContinuationHeader;
    }
  | {
      status: 'proven';
      kind: 'authority_annexes';
      unit: 'thousand_lei';
      legend: 'mii lei';
      document: PinnedDocument;
      authorities: {
        code: string;
        member: string;
        memberSha256: string;
        memberBytes: number;
        page: number;
        anchors: { recordIndex: number; label: string; tokens: string[] }[];
      }[];
      revenueSection: {
        code: string;
        label: string;
        comparisonForm: 'state_budget_synthesis';
        comparisonSha256: string;
        /** [detail record, synthesis record] pairs, in order. */
        rowMap: [number, number][];
      };
    };

export type SynthesisPageUnit = Extract<
  UnitProvenance,
  { kind: 'synthesis_page' }
>;

export interface ApprovedBudgetSlot {
  field: string;
  measure: 'approved' | 'forecast';
  measureYear: number;
}

export interface ApprovedBudgetForm {
  form: string;
  fund:
    | 'state_budget'
    | 'state_social_insurance'
    | 'health_insurance'
    | 'unemployment_insurance';
  root: string;
  fields: readonly string[];
  /** The native annex: exact value, or a pattern whose first group is the
   * authority code (COD_ORDONATOR) of per-authority annexes. */
  annex: string | RegExp;
  resource: {
    id: string;
    url: string;
    fileName: string;
    sha256: string;
    bytes: number;
  };
  /** The existing registration (source_budget_law.files) of the same bytes. */
  legacyFileId: string;
  unit: UnitProvenance;
}

/** One reviewed budget edition: the unit of capture, verification and
 * atomic five-form publication. `publication` is the source-backed identity
 * of the vintage (its contents document's reviewed passage, or, where the
 * contents document carries no passage, content parity with the law as
 * published: 2018); it is not a date and not the time a forecast was
 * prepared. */
export interface ApprovedBudgetEdition {
  profileId: string;
  budgetYear: number;
  publication: string;
  ckan: { id: string; name: string; showUrl: string };
  vintage: PinnedDocument & {
    resourceId: string;
    /** The contents document's reviewed vintage passage; null when it has
     * none and the identity is proven by content parity instead (2018: the
     * witnessed synthesis pages of the laws as published in Monitorul
     * Oficial equal the XML, and every Anexa 3 authority page carries its
     * XML credit anchors). */
    passage: string | null;
    publication: string;
  };
  unitDocuments: readonly PinnedDocument[];
  /** Held witnesses transferred into custody before capture (2023). */
  heldDocuments?: readonly HeldDocument[];
  /** The approved year and the three forecast years, in source order. */
  slots: readonly ApprovedBudgetSlot[];
  forms: readonly ApprovedBudgetForm[];
}

/** Mandatory record fields in source order; exactly one of GRUPA/TITLU. */
const fieldsOf = (
  economic: 'GRUPA' | 'TITLU',
  slots: readonly ApprovedBudgetSlot[]
) =>
  [
    'TITLU_RAPORT',
    'ANEXA',
    'COD_ORDONATOR',
    'ORDONATOR',
    'CAPITOL',
    'SUBCAPITOL',
    'PARAGRAF',
    economic,
    'ARTICOL',
    'ALINEAT',
    'DENUMIRE',
    ...slots.map((s) => s.field),
  ] as const;

/** The approved plan of the edition year and forecasts for the next three. */
const slotsOf = (year: number): readonly ApprovedBudgetSlot[] => [
  { field: `PROGRAM_${String(year)}`, measure: 'approved', measureYear: year },
  ...[1, 2, 3].map((n) => ({
    field: `ESTIMARI${String(year + n)}`,
    measure: 'forecast' as const,
    measureYear: year + n,
  })),
];

const ckanPackage = (id: string, name: string) => ({
  id,
  name,
  showUrl: `https://data.gov.ro/api/3/action/package_show?id=${id}`,
});
const ckanResource =
  (packageId: string) =>
  (id: string, fileName: string, sha256: string, bytes: number) => ({
    id,
    fileName,
    sha256,
    bytes,
    url: `https://data.gov.ro/dataset/${packageId}/resource/${id}/download/${fileName}`,
  });
const synthesisPage = (
  document: PinnedDocument,
  page: number,
  annexLabel: string,
  tokens: readonly [string, string, string, string],
  witness?: PageWitness,
  continuationHeader?: ContinuationHeader
): SynthesisPageUnit => ({
  status: 'proven',
  kind: 'synthesis_page',
  unit: 'thousand_lei',
  legend: '- mii lei -',
  document,
  page,
  annexLabel,
  rowLabel: 'VENITURI - TOTAL',
  recordIndex: 0,
  tokens,
  ...(witness === undefined ? {} : { witness }),
  ...(continuationHeader === undefined ? {} : { continuationHeader }),
});
const authorityAnnexes = (
  evidence:
    | typeof unitEvidence.f02
    | typeof unitEvidence2024.f02
    | typeof unitEvidence2018.f02
    | typeof unitEvidence2019.f02
    | typeof unitEvidence2020.f02
    | typeof unitEvidence2021.f02
    | typeof unitEvidence2022.f02
    | typeof unitEvidence2023.f02,
  comparisonSha256: string
): UnitProvenance => ({
  status: 'proven',
  kind: 'authority_annexes',
  unit: 'thousand_lei',
  legend: 'mii lei',
  document: {
    url: evidence.archive.url,
    sha256: evidence.archive.sha256,
    bytes: evidence.archive.bytes,
  },
  authorities: evidence.authorities,
  revenueSection: {
    code: evidence.revenueSection.code,
    label: evidence.revenueSection.label,
    comparisonForm: 'state_budget_synthesis',
    comparisonSha256,
    rowMap: evidence.revenueSection.rowMap as [number, number][],
  },
});
/** The per-authority annex of the detail; 999 is the native revenue holder
 * ("Titular Venituri"). The annex's authority segment must equal
 * COD_ORDONATOR. */
const AUTHORITY_ANNEX = /^Anexa nr\.3\/(\d{2}|999)\/02$/u;
const PASSAGE = 'varianta plecată la Monitorul Oficial pentru publicare';

// ---- 2025 (released; frozen) ----------------------------------------------

const SLOTS_2025 = slotsOf(2025);
const CKAN_2025 = ckanPackage(
  'e78cd672-b097-4bbc-8056-b4e3c0c20b22',
  'bugetuldestat2025'
);
const resource2025 = ckanResource(CKAN_2025.id);
const LAW_9_2025 = {
  url: 'https://static.anaf.ro/static/10/Anaf/legislatie/L_9_2025.pdf',
  sha256: '7f0cbdeeec85b31929138ff08197e0619988562b4fb04a36047f2a49c973a632',
  bytes: 28_109_776,
};
const LAW_10_2025 = {
  url: 'https://static.anaf.ro/static/10/Anaf/legislatie/L_10_2025.pdf',
  sha256: 'b4559262dd42d15633814066280cbc79687d80d3dcc54b8ed965750af926fcfd',
  bytes: 10_465_005,
};
const SYNTHESIS_2025_SHA256 =
  '4afeed0e57fb50381b24db524306e077f394f49126bb5a025461b340ead1510e';
const DETAIL_UNIT_2025 = authorityAnnexes(
  unitEvidence.f02,
  unitEvidence.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2025: ApprovedBudgetEdition = {
  profileId: 'budget-law-2025-approved-slice-v1',
  budgetYear: 2025,
  /** Bound to the package's own contents document (cuprins), whose reviewed
   * passage says the XMLs are the 2025 budget "varianta plecată la Monitorul
   * Oficial pentru publicare". */
  publication: 'law_2025_as_sent_to_monitorul_oficial',
  ckan: CKAN_2025,
  vintage: {
    resourceId: 'e6bfd73a-227d-49fd-aee5-71d3d661f700',
    url: `https://data.gov.ro/dataset/${CKAN_2025.id}/resource/e6bfd73a-227d-49fd-aee5-71d3d661f700/download/cuprins_xml_lege-buget2025_monitor.doc`,
    sha256: '634fc68d24d7e8582188d28f95b669eb43735602bd6037ee7c88b3d323dc0f1f',
    bytes: 66_048,
    passage: PASSAGE,
    publication: 'law_2025_as_sent_to_monitorul_oficial',
  },
  unitDocuments: [LAW_9_2025, LAW_10_2025, DETAIL_UNIT_2025.document],
  slots: SLOTS_2025,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE12',
      fields: fieldsOf('GRUPA', SLOTS_2025),
      annex: 'Anexa nr.1',
      resource: resource2025(
        'c0c926ae-6d57-4ba2-a09e-ddbc6ac7a842',
        'anexa1_bs_2025.xml',
        SYNTHESIS_2025_SHA256,
        887_822
      ),
      legacyFileId:
        'budget-law-file:c7e83ca553d705b068ef213040b4b8a21e57ce6fd192cf2ddd344af16171995e',
      unit: synthesisPage(LAW_9_2025, 51, 'Anexa Nr. 1', [
        '357.353.033',
        '349.169.360',
        '349.399.128',
        '367.798.364',
      ]),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE15',
      fields: fieldsOf('TITLU', SLOTS_2025),
      annex: AUTHORITY_ANNEX,
      resource: resource2025(
        '34e2183b-43a7-420c-bb9f-eafaa9958e9a',
        'f02_bs_2025.xml',
        'e7259ec15dd1701e41a64c2792489fbe7be5cdf5d8952c888570437b8d545dfb',
        9_657_716
      ),
      legacyFileId:
        'budget-law-file:cc71e3f11181752e994f2f5225910c4eeed4189ac0685a169da143e48c85188b',
      unit: DETAIL_UNIT_2025,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE3',
      fields: fieldsOf('GRUPA', SLOTS_2025),
      annex: 'Anexa nr.1/03',
      resource: resource2025(
        '88571330-5924-42e5-a58f-9dc003e643bc',
        'anexa1_bass_2025.xml',
        '5c18e1068d73b8d4101ebf9340ff9e5e9ceab95b29226e5d28a595ef720aab47',
        137_216
      ),
      legacyFileId:
        'budget-law-file:2cded5bd40a6434830fbd9884744e40d541c451ca7d758370c2043abed94aa97',
      unit: synthesisPage(LAW_10_2025, 8, 'Anexa Nr. 1/03', [
        '155.110.881',
        '169.981.142',
        '178.430.674',
        '189.558.100',
      ]),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE6',
      fields: fieldsOf('GRUPA', SLOTS_2025),
      annex: 'Anexa nr.10/01',
      resource: resource2025(
        'a9fb8892-1b28-43a0-9895-37e63d0aff2d',
        'anexa1_bsan_2025.xml',
        '0ddc58e0922026a5bfb92ab42c72d2c85034a5303eb2f04d4450d19e0aef086c',
        147_071
      ),
      legacyFileId:
        'budget-law-file:17934e163a33e42b4caaa11a7c117c153382289a338ab2e8274143a77a6fa841',
      unit: synthesisPage(LAW_9_2025, 674, 'Anexa Nr. 10/01', [
        '77.220.381',
        '79.309.691',
        '84.489.423',
        '90.210.560',
      ]),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE9',
      fields: fieldsOf('GRUPA', SLOTS_2025),
      annex: 'Anexa nr.1/04',
      resource: resource2025(
        'e9c470ff-d7d5-4da6-af24-b5e1b3dc4e66',
        'anexa1_bsom_2025.xml',
        '6dc3e1cf218d7ce54175d0121570f7749cc2748190fd1013acfb25ad58afcc77',
        176_858
      ),
      legacyFileId:
        'budget-law-file:1d9599866de6097a83c4b97360dbe37185bd4f4b3bc4c9597f7a94256e7f5a9a',
      unit: synthesisPage(LAW_10_2025, 54, 'Anexa Nr. 1/04', [
        '2.857.392',
        '3.260.253',
        '3.334.407',
        '3.415.664',
      ]),
    },
  ],
};

// ---- 2024 ------------------------------------------------------------------

const SLOTS_2024 = slotsOf(2024);
const CKAN_2024 = ckanPackage(
  '4a309d6e-e1f0-400e-962c-0abf44c07d2a',
  'bugetuldestat2024'
);
const resource2024 = ckanResource(CKAN_2024.id);
/** Monitorul Oficial Partea I nr. 1187/29.XII.2023 (Legea nr. 421/2023) and
 * nr. 1188/29.XII.2023 (Legea nr. 422/2023), as hosted by the Ministry. */
const LAW_421_2023: PinnedDocument =
  unitEvidence2024.syntheses.forms.state_budget_synthesis.document;
const LAW_422_2023: PinnedDocument =
  unitEvidence2024.syntheses.forms.state_social_insurance_synthesis.document;
const page2024 = (form: keyof typeof unitEvidence2024.syntheses.forms) => {
  const p = unitEvidence2024.syntheses.forms[form];
  const [a, b, c, d, ...rest] = p.tokens;
  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined ||
    rest.length !== 0
  )
    throw new Error(`${form}: four witnessed tokens required`);
  return synthesisPage(
    p.document,
    p.page,
    p.annexLabel,
    [a, b, c, d],
    unitEvidence2024.syntheses.witness as PageWitness
  );
};
const SYNTHESIS_2024_SHA256 =
  '6778ebac4527adb74137a47e66607bdcc1b0cef8d29b991197fb64b68333fe7c';
const DETAIL_UNIT_2024 = authorityAnnexes(
  unitEvidence2024.f02,
  unitEvidence2024.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2024: ApprovedBudgetEdition = {
  profileId: 'budget-law-2024-approved-v1',
  budgetYear: 2024,
  publication: 'law_2024_as_sent_to_monitorul_oficial',
  ckan: CKAN_2024,
  vintage: {
    resourceId: '02a0db82-2d07-4260-b4f5-6f90ce1b9ef6',
    url: `https://data.gov.ro/dataset/${CKAN_2024.id}/resource/02a0db82-2d07-4260-b4f5-6f90ce1b9ef6/download/cuprins_xml_legebuget2024_monitor.doc`,
    sha256: '138ed7b8919e4dbd521dc138e7bed30440a0c87d166f7e817e05c71c32ba6d25',
    bytes: 56_832,
    passage: PASSAGE,
    publication: 'law_2024_as_sent_to_monitorul_oficial',
  },
  unitDocuments: [LAW_421_2023, LAW_422_2023, DETAIL_UNIT_2024.document],
  slots: SLOTS_2024,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE10',
      fields: fieldsOf('GRUPA', SLOTS_2024),
      annex: 'Anexa nr.1',
      resource: resource2024(
        'fe431984-3d2e-4e3e-ab39-844e06c98591',
        'anexa1_bs_2024.xml',
        SYNTHESIS_2024_SHA256,
        879_627
      ),
      legacyFileId:
        'budget-law-file:b12d4558e1ac94c0a17e11512d15f041c62e2ab554caf9dc80a045e297be234c',
      unit: page2024('state_budget_synthesis'),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE13',
      fields: fieldsOf('TITLU', SLOTS_2024),
      annex: AUTHORITY_ANNEX,
      resource: resource2024(
        'f4a02fbe-1231-4f8c-8a7b-97346199a0aa',
        'f02_bs_2024.xml',
        unitEvidence2024.f02.sourceXmlSha256,
        9_221_342
      ),
      legacyFileId:
        'budget-law-file:dc0dfa6a87a1699da4db068e35f86efd788173c3e7b201863f8cc01bc8a6123a',
      unit: DETAIL_UNIT_2024,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE2',
      fields: fieldsOf('GRUPA', SLOTS_2024),
      annex: 'Anexa nr.1/03',
      resource: resource2024(
        '34cd08f9-2f73-45b7-97fa-fefa1a6c4fd6',
        'anexa1_bass_2024.xml',
        'd5268847703702ebf113bfdc7966cd8e9ce5363a40189affa6a9e405dd482ebb',
        137_981
      ),
      legacyFileId:
        'budget-law-file:f29daae60120601de77a403c6c33e6c1bc2a489ba2d2d57c85a4634daa0bd459',
      unit: page2024('state_social_insurance_synthesis'),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE4',
      fields: fieldsOf('GRUPA', SLOTS_2024),
      annex: 'Anexa nr.11/01',
      resource: resource2024(
        '0467cce4-eb5f-46e6-9926-ed09bf81e964',
        'anexa1_bsan_2024.xml',
        '54f762c2e2a50dd15f60638b91e3f8c50554820e1a82e2a111cc41fe61884362',
        157_444
      ),
      legacyFileId:
        'budget-law-file:1985a4c27ff7c974fffa6a4556d02ae65ab20d08a4918498b0724401fdfedc68',
      unit: page2024('health_insurance_synthesis'),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE7',
      fields: fieldsOf('GRUPA', SLOTS_2024),
      annex: 'Anexa nr.1/04',
      resource: resource2024(
        '1435a82e-0156-4d02-8b5c-c4e434434cb4',
        'anexa1_bsom_2024.xml',
        '68ac6bd8f5edd97f0448bb35b98d8c674a1aeb901f3042c077b8f693da307b99',
        168_449
      ),
      legacyFileId:
        'budget-law-file:4e118b72f956251125202f6bdff5d9cb1266abc1d0722d5bfc2611676a3f3e61',
      unit: page2024('unemployment_insurance_synthesis'),
    },
  ],
};

// ---- 2021 and 2022 -----------------------------------------------------------

/** A synthesis witnessed on its pinned physical PDF page (primary visual
 * review of the 120 dpi render; the annex pages have no usable text layer). */
const witnessedPage = (
  evidence:
    | typeof unitEvidence2018
    | typeof unitEvidence2019
    | typeof unitEvidence2021
    | typeof unitEvidence2022,
  form: keyof typeof unitEvidence2021.syntheses.forms
) => {
  const p = evidence.syntheses.forms[form];
  const [a, b, c, d, ...rest] = p.tokens;
  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined ||
    rest.length !== 0
  )
    throw new Error(`${form}: four witnessed tokens required`);
  return synthesisPage(
    p.document,
    p.page,
    p.annexLabel,
    [a, b, c, d],
    evidence.syntheses.witness as PageWitness
  );
};

const SLOTS_2021 = slotsOf(2021);
const CKAN_2021 = ckanPackage(
  'bb3711ce-0e6e-42e0-9118-5fcf132580bd',
  'bugetstat2021'
);
const resource2021 = ckanResource(CKAN_2021.id);
/** The Ministry-hosted prints of Monitorul Oficial Partea I nr. 236/9.III.2021
 * (state budget law) and nr. 238/9.III.2021 (social insurance budget law);
 * the witnessed BASS pages are physical PDF pages 4 and 46 (printed 5 and
 * 47). The authority detail's Anexa 3 is a RAR5 archive. */
const STATE_LAW_2021: PinnedDocument =
  unitEvidence2021.syntheses.forms.state_budget_synthesis.document;
const BASS_LAW_2021: PinnedDocument =
  unitEvidence2021.syntheses.forms.state_social_insurance_synthesis.document;
const DETAIL_UNIT_2021 = authorityAnnexes(
  unitEvidence2021.f02,
  unitEvidence2021.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2021: ApprovedBudgetEdition = {
  profileId: 'budget-law-2021-approved-v1',
  budgetYear: 2021,
  publication: 'law_2021_as_sent_to_monitorul_oficial',
  ckan: CKAN_2021,
  vintage: {
    resourceId: '9adc48b0-5580-4dce-9bad-55d6e9ef745d',
    url: `https://data.gov.ro/dataset/${CKAN_2021.id}/resource/9adc48b0-5580-4dce-9bad-55d6e9ef745d/download/cuprins_xml_lege-buget2021_monitor.doc`,
    sha256: '243b7c5293751a471745a827dcfce2069ed5093a2c4f87291884633257ffba89',
    bytes: 67_584,
    passage: PASSAGE,
    publication: 'law_2021_as_sent_to_monitorul_oficial',
  },
  unitDocuments: [STATE_LAW_2021, BASS_LAW_2021, DETAIL_UNIT_2021.document],
  slots: SLOTS_2021,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE24',
      fields: fieldsOf('GRUPA', SLOTS_2021),
      annex: 'Anexa nr.1',
      resource: resource2021(
        'e398270e-73a3-4fcb-99d5-839c21e4101c',
        'anexa1_bs.xml',
        'fb21537acad37d70887019413c433276aef7b33069a838ab8aeec369c37cfa03',
        813_111
      ),
      legacyFileId:
        'budget-law-file:f4cd2371ca16d482885bc83aec256a547ba25f9f0d3d77cbb3d569cc3209f36f',
      unit: witnessedPage(unitEvidence2021, 'state_budget_synthesis'),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE27',
      fields: fieldsOf('TITLU', SLOTS_2021),
      annex: AUTHORITY_ANNEX,
      resource: resource2021(
        'f534885a-ddc2-4917-890c-d64b7b13bb91',
        'f02_bs.xml',
        unitEvidence2021.f02.sourceXmlSha256,
        8_801_970
      ),
      legacyFileId:
        'budget-law-file:f64b8c3936f9781f2a17bf1ff39d949d98589a18c1209bd487c2ecccf000ead9',
      unit: DETAIL_UNIT_2021,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE14',
      fields: fieldsOf('GRUPA', SLOTS_2021),
      annex: 'Anexa nr.1/03',
      resource: resource2021(
        'c91e4df3-1d96-4263-8934-1b2fb5cac188',
        'anexa1_bass.xml',
        'e5a1a487f0ef441a2ddf2db319bfa1e99e83d9a08676bd5639364e57580644a0',
        159_553
      ),
      legacyFileId:
        'budget-law-file:877cb65b00f63ebeed8b894a36590aff9ef51a7c9283e095240af2fe91b04505',
      unit: witnessedPage(unitEvidence2021, 'state_social_insurance_synthesis'),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE17',
      fields: fieldsOf('GRUPA', SLOTS_2021),
      annex: 'Anexa nr.11/01',
      resource: resource2021(
        '911c5f9d-fa33-4972-b492-c71a389d51e2',
        'anexa1_bsan.xml',
        'f9bc1c91df45cd493a97cf86654f7b25276e1e069689b6f4ba3c4dd7dee1145a',
        140_295
      ),
      legacyFileId:
        'budget-law-file:dfa527b8e247d471affd605b260f384ac63f227d96f8b95b4111f0dc7e8da3b8',
      unit: witnessedPage(unitEvidence2021, 'health_insurance_synthesis'),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE20',
      fields: fieldsOf('GRUPA', SLOTS_2021),
      annex: 'Anexa nr.1/04',
      resource: resource2021(
        '63e525df-e2cc-4489-823f-7d80a12ef4b2',
        'anexa1_bsom.xml',
        'bf1c11ceafdece1dddd85e4b36171972b0a68bde7b345d3d7112257324e12a4e',
        187_131
      ),
      legacyFileId:
        'budget-law-file:d34380e5c6ee0e0a135e66fe119dfa394868278e3029ecce2098d890ebb6c61b',
      unit: witnessedPage(unitEvidence2021, 'unemployment_insurance_synthesis'),
    },
  ],
};

const SLOTS_2022 = slotsOf(2022);
const CKAN_2022 = ckanPackage(
  '63b1c7f7-de0e-4a95-b2e5-8d8d2825a765',
  'bugetstat2022'
);
const resource2022 = ckanResource(CKAN_2022.id);
/** The Ministry's own PDF of Monitorul Oficial Partea I nr. 1238/28.XII.2021
 * (state budget law; the annex tables use an unmapped font) and the
 * Ministry-hosted print of the social insurance budget law; the witnessed
 * pages are physical PDF pages. The authority detail's Anexa 3 is a RAR4
 * archive. */
const STATE_LAW_2022: PinnedDocument =
  unitEvidence2022.syntheses.forms.state_budget_synthesis.document;
const BASS_LAW_2022: PinnedDocument =
  unitEvidence2022.syntheses.forms.state_social_insurance_synthesis.document;
const DETAIL_UNIT_2022 = authorityAnnexes(
  unitEvidence2022.f02,
  unitEvidence2022.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2022: ApprovedBudgetEdition = {
  profileId: 'budget-law-2022-approved-v1',
  budgetYear: 2022,
  publication: 'law_2022_as_sent_to_monitorul_oficial',
  ckan: CKAN_2022,
  vintage: {
    resourceId: 'e7b0f197-0981-4efe-8bf3-a962e50edc8e',
    url: `https://data.gov.ro/dataset/${CKAN_2022.id}/resource/e7b0f197-0981-4efe-8bf3-a962e50edc8e/download/cuprins_xml_legebuget2022_monitor.doc`,
    sha256: '9cce69802782f221550a82ae3db98da7566f74a9fd97d86adabb0cc7e54d0c44',
    bytes: 68_096,
    passage: PASSAGE,
    publication: 'law_2022_as_sent_to_monitorul_oficial',
  },
  unitDocuments: [STATE_LAW_2022, BASS_LAW_2022, DETAIL_UNIT_2022.document],
  slots: SLOTS_2022,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE19',
      fields: fieldsOf('GRUPA', SLOTS_2022),
      annex: 'Anexa nr.1',
      resource: resource2022(
        '0055e796-3d51-4b3b-95c9-e12a61cd77f1',
        'anexa1_bs_2022.xml',
        '0477fa75844b12d414d98d5aca13dd35fa9451efecac282564f2f5acc2a4ef21',
        822_945
      ),
      legacyFileId:
        'budget-law-file:170634dfd2339d24113b0073b781637337642acdf977bed65bc37f7dec958847',
      unit: witnessedPage(unitEvidence2022, 'state_budget_synthesis'),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE23',
      fields: fieldsOf('TITLU', SLOTS_2022),
      annex: AUTHORITY_ANNEX,
      resource: resource2022(
        '0cd6bcf2-d8bf-41e3-83cd-2ad31a75d3ba',
        'f02_bs_2022.xml',
        unitEvidence2022.f02.sourceXmlSha256,
        9_090_562
      ),
      legacyFileId:
        'budget-law-file:f49369be4cf36676420768d57885714fcb7de9958f36632a45d06957d95096df',
      unit: DETAIL_UNIT_2022,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE10',
      fields: fieldsOf('GRUPA', SLOTS_2022),
      annex: 'Anexa nr.1/03',
      resource: resource2022(
        '1bcc735c-3c2c-4bd2-ab77-98c5f6893192',
        'anexa1_bass_2022.xml',
        '5c053eaf2d6fa4e9bd21d041c637ed9701275e6ecfcb3fa9c81a76fd8030f491',
        147_546
      ),
      legacyFileId:
        'budget-law-file:c6bb2e9424d5468d356619e475870a325f58b1d135a482c9c94ce069027bd28b',
      unit: witnessedPage(unitEvidence2022, 'state_social_insurance_synthesis'),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE12',
      fields: fieldsOf('GRUPA', SLOTS_2022),
      annex: 'Anexa nr.11/01',
      resource: resource2022(
        '33f6c54e-db48-4157-adeb-c9d9c45f76fa',
        'anexa1_bsan_2022.xml',
        'e641516a02d65a54239ad4247a1673d978c77e1c6d785433f72c439b6f78c7c6',
        138_058
      ),
      legacyFileId:
        'budget-law-file:70e4abc20866e2de01f160caeb737122862774f50b106ac73c02834d379de604',
      unit: witnessedPage(unitEvidence2022, 'health_insurance_synthesis'),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE15',
      fields: fieldsOf('GRUPA', SLOTS_2022),
      annex: 'Anexa nr.1/04',
      resource: resource2022(
        'e23532a5-ba2a-46c3-a2d8-a4c3e11edbfc',
        'anexa1_bsom_2022.xml',
        '64269e4246862ebc0b1eee9ee62bd387792b0dea1982e145b283a6e08da937a2',
        189_134
      ),
      legacyFileId:
        'budget-law-file:48b2501fbe8a65cf0782e76ba4607fe4c794bc0914ace4cfa1fc631d9896ca74',
      unit: witnessedPage(unitEvidence2022, 'unemployment_insurance_synthesis'),
    },
  ],
};

// ---- 2023 ------------------------------------------------------------------

const four = <T>(values: readonly T[], what: string): [T, T, T, T] => {
  const [a, b, c, d, ...rest] = values;
  if (
    a === undefined ||
    b === undefined ||
    c === undefined ||
    d === undefined ||
    rest.length !== 0
  )
    throw new Error(`${what}: exactly four values required`);
  return [a, b, c, d];
};
/** A masked print page (primary review of held renders; '?' = unconfirmed
 * glyph) and, where a glyph is masked, the separately pinned law-page anchor
 * that supplies the four exact tokens. */
const maskedPage2023 = (
  form: keyof typeof unitEvidence2023.syntheses.forms
): SynthesisPageUnit => {
  const p = unitEvidence2023.syntheses.forms[form];
  const witness =
    'textWitness' in p
      ? (() => {
          const t = p.textWitness;
          const [c0, c1, c2, c3, c4, c5, ...more] = t.anchor.printedCodes;
          if (
            c0 === undefined ||
            c1 === undefined ||
            c2 === undefined ||
            c3 === undefined ||
            c4 === undefined ||
            c5 === undefined ||
            more.length !== 0 ||
            t.legend !== '- mii lei -' ||
            t.kind !== 'legislatie_annex_anchor' ||
            t.anchor.role !== 'descriptor'
          )
            throw new Error(`${form}: text witness shape`);
          const textWitness: TextWitness = {
            kind: 'legislatie_annex_anchor',
            document: t.document,
            annexTitle: t.annexTitle,
            legend: '- mii lei -',
            columnLabels: four(t.columnLabels, `${form} column labels`),
            yearLabelConflict: t.yearLabelConflict,
            anchor: {
              label: t.anchor.label,
              printedCodes: [c0, c1, c2, c3, c4, c5],
              role: 'descriptor',
            },
            tokens: four(t.tokens, `${form} anchor tokens`),
            portalActions: t.portalActions,
          };
          return { textWitness };
        })()
      : {};
  return {
    ...synthesisPage(
      p.document,
      p.page,
      p.annexLabel,
      four(p.tokens, `${form} tokens`),
      unitEvidence2023.syntheses.witness as PageWitness
    ),
    mask: {
      patterns: four(p.mask.patterns, `${form} mask`),
      printYears: four(p.mask.printYears, `${form} print years`),
      review: p.mask.review,
    },
    ...witness,
  };
};

const SLOTS_2023 = slotsOf(2023);
const CKAN_2023 = ckanPackage(
  '319133ad-fb42-4ed1-b866-6cdb4fb24f5a',
  'bugetul_stat_2023'
);
const resource2023 = ckanResource(CKAN_2023.id);
/** The Ministry-hosted LexMonitor prints of Monitorul Oficial Partea I nr.
 * 1214/19.XII.2022 (Legea 368/2022, state) and nr. 1215/19.XII.2022 (Legea
 * 369/2022, social insurance); the Anexa 3 ZIP of native per-authority PDFs. */
const STATE_LAW_2023: PinnedDocument =
  unitEvidence2023.syntheses.forms.state_budget_synthesis.document;
const BASS_LAW_2023: PinnedDocument =
  unitEvidence2023.syntheses.forms.state_social_insurance_synthesis.document;
const DETAIL_UNIT_2023 = authorityAnnexes(
  unitEvidence2023.f02,
  unitEvidence2023.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2023: ApprovedBudgetEdition = {
  profileId: 'budget-law-2023-approved-v1',
  budgetYear: 2023,
  publication: 'law_2023_as_sent_to_monitorul_oficial',
  ckan: CKAN_2023,
  vintage: {
    resourceId: 'f36a46e8-0369-48f1-a982-7cede0082d68',
    url: `https://data.gov.ro/dataset/${CKAN_2023.id}/resource/f36a46e8-0369-48f1-a982-7cede0082d68/download/cuprins_xml_lege-buget2023_monitor.doc`,
    sha256: '0c817883ca32e5ec50659bad1530bd1fc96b4b7f0df62d09e39fe7c6da66f5f7',
    bytes: 65_024,
    passage: PASSAGE,
    publication: 'law_2023_as_sent_to_monitorul_oficial',
  },
  unitDocuments: [STATE_LAW_2023, BASS_LAW_2023, DETAIL_UNIT_2023.document],
  heldDocuments: unitEvidence2023.heldDocuments.map((d) => ({
    url: d.url,
    sha256: d.sha256,
    bytes: d.bytes,
    acquisition: {
      ...d.acquisition,
      origin: 'held_research_transfer' as const,
      httpStatus: 200 as const,
    },
  })),
  slots: SLOTS_2023,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE22',
      fields: fieldsOf('GRUPA', SLOTS_2023),
      annex: 'Anexa nr.1',
      resource: resource2023(
        '33b1df57-5364-43f4-95a1-e119e7b005df',
        'anexa1_bs_2023.xml',
        'b5bfd1958a19d5d3c493e73b4b2540caab456bdaefdddd1dc0e867baf2a99d4f',
        896_717
      ),
      legacyFileId:
        'budget-law-file:a9b9188c679119f62607376541867e912d2c8af255d63f48b0369515ca742f6f',
      unit: maskedPage2023('state_budget_synthesis'),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE15',
      fields: fieldsOf('TITLU', SLOTS_2023),
      annex: AUTHORITY_ANNEX,
      resource: resource2023(
        '745c4ca3-2f0b-4eee-8c87-dffb0589c039',
        'f02_bs_2023.xml',
        unitEvidence2023.f02.sourceXmlSha256,
        9_819_303
      ),
      legacyFileId:
        'budget-law-file:10d07a5947f789c9852302ecfc1cc2b0431965fc6975108b80fb5948b65643ce',
      unit: DETAIL_UNIT_2023,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE4',
      fields: fieldsOf('GRUPA', SLOTS_2023),
      annex: 'Anexa nr.1/03',
      resource: resource2023(
        '44b1a4cf-e202-4030-ac1e-d9b6715c3be3',
        'anexa1_bass_2023.xml',
        'c522ac14c1d2904db4984ec5cc6c2062c5631fe50cf9dafb22a7d81ebd2cf744',
        148_483
      ),
      legacyFileId:
        'budget-law-file:ac1fae67183bfe6a5c716e70c2c66924eec45a5c71bd98414f39ded6979345ba',
      unit: maskedPage2023('state_social_insurance_synthesis'),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE6',
      fields: fieldsOf('GRUPA', SLOTS_2023),
      annex: 'Anexa nr.11/01',
      resource: resource2023(
        '13f95eed-a1f2-466c-a096-6a6de456d116',
        'anexa1_bsan_2023.xml',
        'bbccb7b314ed9fd5083db3ec363733c0047db6be2c48b59d96d37c0c0180068f',
        138_504
      ),
      legacyFileId:
        'budget-law-file:20c8036296756a407ae2f25ff2156eb7a62ea7313b4eebe0a7bcbd6de72f15cc',
      unit: maskedPage2023('health_insurance_synthesis'),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE9',
      fields: fieldsOf('GRUPA', SLOTS_2023),
      annex: 'Anexa nr.1/04',
      resource: resource2023(
        '9e6c768f-27d7-4a2c-87b4-1cd4c067a908',
        'anexa1_bsom_2023.xml',
        '0d474d53449810d12deb4d3497a3d02597205e7406bc72b5c506d14ac66c8f98',
        191_015
      ),
      legacyFileId:
        'budget-law-file:62939f94ac04c116116b410fd42207fe56bc9a9fe7f6b72cc2a095a21607251d',
      unit: maskedPage2023('unemployment_insurance_synthesis'),
    },
  ],
};

// ---- 2020 ------------------------------------------------------------------

/** A 2020 synthesis witnessed on its pinned physical PDF page (the primary's
 * visual review of the 120 dpi render; the LexMonitor prints have no usable
 * text layer). Unemployment additionally carries its continuation-header
 * witness (see ContinuationHeader). */
const witnessedPage2020 = (
  form: keyof typeof unitEvidence2020.syntheses.forms
): SynthesisPageUnit => {
  const p: {
    document: PinnedDocument;
    page: number;
    annexLabel: string;
    tokens: readonly string[];
    continuationHeader?: ContinuationHeader;
  } = unitEvidence2020.syntheses.forms[form];
  return synthesisPage(
    p.document,
    p.page,
    p.annexLabel,
    four(p.tokens, `${form} tokens`),
    unitEvidence2020.syntheses.witness as PageWitness,
    p.continuationHeader
  );
};

const SLOTS_2020 = slotsOf(2020);
const CKAN_2020 = ckanPackage(
  'c57200b4-87dd-4cb2-b0ce-2b85dcf7f15c',
  'bugetstat2020'
);
const resource2020 = ckanResource(CKAN_2020.id);
/** The Ministry-hosted LexMonitor prints of Monitorul Oficial Partea I nr.
 * 2/6.I.2020 (Legea 5/2020, state) and nr. 3/6.I.2020 (Legea 6/2020, social
 * insurance); the witnessed pages are physical PDF pages 14, 213, 4 and 50
 * (printed 15, 214, 5 and 51). The authority detail's Anexa 3 is a RAR4
 * archive; authority 58's page is an explicit frozen provenance pin (page 4;
 * the member also prints the annex on page 8). */
const STATE_LAW_2020: PinnedDocument =
  unitEvidence2020.syntheses.forms.state_budget_synthesis.document;
const BASS_LAW_2020: PinnedDocument =
  unitEvidence2020.syntheses.forms.state_social_insurance_synthesis.document;
const DETAIL_UNIT_2020 = authorityAnnexes(
  unitEvidence2020.f02,
  unitEvidence2020.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2020: ApprovedBudgetEdition = {
  profileId: 'budget-law-2020-approved-v1',
  budgetYear: 2020,
  publication: 'law_2020_as_sent_to_monitorul_oficial',
  ckan: CKAN_2020,
  vintage: {
    resourceId: '12bc93cd-689f-48f3-bb45-fa89cb7afc2e',
    url: `https://data.gov.ro/dataset/${CKAN_2020.id}/resource/12bc93cd-689f-48f3-bb45-fa89cb7afc2e/download/cuprins_xml_lege-buget2020_monitor.doc`,
    sha256: '0135ca6353e3959e0f12cc63f4da66e0bcb498745f15892d1af5b1d5e30c7071',
    bytes: 66_048,
    passage: PASSAGE,
    publication: 'law_2020_as_sent_to_monitorul_oficial',
  },
  unitDocuments: [STATE_LAW_2020, BASS_LAW_2020, DETAIL_UNIT_2020.document],
  slots: SLOTS_2020,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE20',
      fields: fieldsOf('GRUPA', SLOTS_2020),
      annex: 'Anexa nr.1',
      resource: resource2020(
        'caeb59ce-acb3-4ff2-ab82-579fb3f4722b',
        'anexa1_bs.xml',
        '50aab7a0bab6045266cc021d0d66f1bfcc084a620627ce98333e9927ece58d80',
        803_602
      ),
      legacyFileId:
        'budget-law-file:e474536507022e44de557f718537f7d198b5ce43aa47c6cf89df96bed5c7d4aa',
      unit: witnessedPage2020('state_budget_synthesis'),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE23',
      fields: fieldsOf('TITLU', SLOTS_2020),
      annex: AUTHORITY_ANNEX,
      resource: resource2020(
        '164df365-6688-46b1-bf2a-b2ca3120ef27',
        'f02_bs.xml',
        unitEvidence2020.f02.sourceXmlSha256,
        15_162_630
      ),
      legacyFileId:
        'budget-law-file:267ea272962be5c901b02145745e43c736cd33c796690083ebdc8da94d283890',
      unit: DETAIL_UNIT_2020,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE10',
      fields: fieldsOf('GRUPA', SLOTS_2020),
      annex: 'Anexa nr.1/03',
      resource: resource2020(
        '0ce39402-9336-4cb8-8694-efd2daae3da3',
        'anexa1_bass.xml',
        '0de87167563eec7345418c0fab2bed6f7d08141c1ea020d0a998ed64f7d9f418',
        157_919
      ),
      legacyFileId:
        'budget-law-file:f63ea880f64261ef6dbcbf0859d1ade226ff786b195c01970a5361513351bf6a',
      unit: witnessedPage2020('state_social_insurance_synthesis'),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE13',
      fields: fieldsOf('GRUPA', SLOTS_2020),
      annex: 'Anexa nr.11/01',
      resource: resource2020(
        '84c79027-c804-4598-ae1c-e0ce4dfdfd77',
        'anexa1_bsan.xml',
        '1a5a7e88c9555ac088aea855addbb6c51d7c4344a1cad65bd265ab98c9ffd0ef',
        139_277
      ),
      legacyFileId:
        'budget-law-file:52c402cf6dda098a3d46b1fb049e594ed2811cdcd3bee068ca832ca7bc1c7df3',
      unit: witnessedPage2020('health_insurance_synthesis'),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE16',
      fields: fieldsOf('GRUPA', SLOTS_2020),
      annex: 'Anexa nr.1/04',
      resource: resource2020(
        '05a3595c-4ae9-4a7a-8082-dfffc19e01d5',
        'anexa1_bsomaj.xml',
        'a65f35f58100885a7fa0e4212c35083849df3cb18eeb1a83186a939bf4081954',
        186_288
      ),
      legacyFileId:
        'budget-law-file:d4886881a70583422b5649f0862ccd5c5885a92c9c0302a8dafec6c64c34a833',
      unit: witnessedPage2020('unemployment_insurance_synthesis'),
    },
  ],
};

// ---- 2019 ------------------------------------------------------------------

const SLOTS_2019 = slotsOf(2019);
const CKAN_2019 = ckanPackage(
  'fc78ddbe-0b9e-46ed-b84b-c55a387ee98e',
  'bugetuldestat2019'
);
const resource2019 = ckanResource(CKAN_2019.id);
/** The Ministry-hosted image-only prints of Monitorul Oficial Partea I nr.
 * 209/15.III.2019 (state budget law) and nr. 196/12.III.2019 (social insurance
 * budget law), as their pages' running headers read; the witnessed pages are
 * physical PDF pages 15, 216, 4 and 46 (printed 16, 217, 5 and 47), each
 * under the primary's per-page review. The authority detail's Anexa 3 is a
 * RAR4 archive with one annex page per authority. */
const STATE_LAW_2019: PinnedDocument =
  unitEvidence2019.syntheses.forms.state_budget_synthesis.document;
const BASS_LAW_2019: PinnedDocument =
  unitEvidence2019.syntheses.forms.state_social_insurance_synthesis.document;
const DETAIL_UNIT_2019 = authorityAnnexes(
  unitEvidence2019.f02,
  unitEvidence2019.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2019: ApprovedBudgetEdition = {
  profileId: 'budget-law-2019-approved-v1',
  budgetYear: 2019,
  publication: 'law_2019_as_sent_to_monitorul_oficial',
  ckan: CKAN_2019,
  vintage: {
    resourceId: '9c8b58b6-e437-4d6b-9f38-88f24fcb92aa',
    url: `https://data.gov.ro/dataset/${CKAN_2019.id}/resource/9c8b58b6-e437-4d6b-9f38-88f24fcb92aa/download/cuprins_xml_lege-buget2019_monitor.doc`,
    sha256: '10209de3e53a072e7d4d5b59ee30738d3b2e178e3a94e9553fd42069c9cc8b65',
    bytes: 89_088,
    passage: PASSAGE,
    publication: 'law_2019_as_sent_to_monitorul_oficial',
  },
  unitDocuments: [STATE_LAW_2019, BASS_LAW_2019, DETAIL_UNIT_2019.document],
  slots: SLOTS_2019,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE21',
      fields: fieldsOf('GRUPA', SLOTS_2019),
      annex: 'Anexa nr.1',
      resource: resource2019(
        '9003796d-c6e4-4e4c-84e3-40d1660a30ee',
        'anexa001_bugstat.xml',
        '4bf12511f6b9a03edada95a1dca2438b30378c903b59329f3799f4d3c4b4fa63',
        829_218
      ),
      legacyFileId:
        'budget-law-file:ccdd59f3fa8c5578bad3b607f202ac70947834b4ccd692e9809f8c1d213fd107',
      unit: witnessedPage(unitEvidence2019, 'state_budget_synthesis'),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE24',
      fields: fieldsOf('TITLU', SLOTS_2019),
      annex: AUTHORITY_ANNEX,
      resource: resource2019(
        '6dfa9e6b-acda-480e-b1d2-ce2dee328224',
        'f02_bugcash.xml',
        unitEvidence2019.f02.sourceXmlSha256,
        17_422_685
      ),
      legacyFileId:
        'budget-law-file:674a355566b2bf8c22bc73e46e1dad89f235a002e328d57e9a0032eec867ba51',
      unit: DETAIL_UNIT_2019,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE10',
      fields: fieldsOf('GRUPA', SLOTS_2019),
      annex: 'Anexa nr.1/03',
      resource: resource2019(
        '3ee8ea69-1dd7-4ef5-bf39-aafe285f4eaf',
        'anexa1_bass.xml',
        '673e8dd9673d40fc11a66c8ee994818c7bee6d7b4213e1efd48e8bf4d52e38c8',
        156_388
      ),
      legacyFileId:
        'budget-law-file:4d7485e143b84e80f24668cabfc2f217526a984755355d589252a7a34b2c7151',
      unit: witnessedPage(unitEvidence2019, 'state_social_insurance_synthesis'),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE13',
      fields: fieldsOf('GRUPA', SLOTS_2019),
      annex: 'Anexa nr.11/01',
      resource: resource2019(
        '4e7be1b1-6fb0-4623-bfd8-b53d1069b1af',
        'anexa1_bsan.xml',
        '92449fd20127120089942b1ae79266a4e03c499c298bde19ecefca094c70e09f',
        138_940
      ),
      legacyFileId:
        'budget-law-file:c2a320882c2988f88367f85f6bf320d4fe65f2416c2f1bb7d55993fc7b0e5944',
      unit: witnessedPage(unitEvidence2019, 'health_insurance_synthesis'),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE17',
      fields: fieldsOf('GRUPA', SLOTS_2019),
      annex: 'Anexa nr.1/04',
      resource: resource2019(
        'f6a85e30-0775-4f31-bcd9-689ca4454c18',
        'anexa1_bsomaj.xml',
        'b21930530d87b0c75eafb29c722ada194c304583ce7fb7ba9ccbb7627ee71864',
        183_101
      ),
      legacyFileId:
        'budget-law-file:1edab7abe54f2fdf46b546b623333a826bcb39b9afa9bca05c2c93c2479b2fe7',
      unit: witnessedPage(unitEvidence2019, 'unemployment_insurance_synthesis'),
    },
  ],
};

// ---- 2018 ------------------------------------------------------------------

const SLOTS_2018 = slotsOf(2018);
const CKAN_2018 = ckanPackage(
  'f6cefeee-4a4a-487f-8eca-b5271670eb43',
  'bugetul-de-stat-2018'
);
const resource2018 = ckanResource(CKAN_2018.id);
/** The Ministry-hosted image-only prints of Monitorul Oficial Partea I nr.
 * 4/3.I.2018 (Law 2/2018, state budget) and nr. 5/3.I.2018 (Law 3/2018,
 * social insurance budget), as their pages' running headers read; the
 * witnessed pages are physical PDF pages 13, 246, 4 and 46 (printed 14, 247,
 * 5 and 47), each under the user-authorized per-page review. The contents
 * document carries no vintage passage: the publication identity is content
 * parity with the law as published (the four witnessed record-0 rows and the
 * 62 Anexa 3 authority pages). The authority detail's Anexa 3 is a RAR4
 * archive with one annex page per authority. */
const STATE_LAW_2018: PinnedDocument =
  unitEvidence2018.syntheses.forms.state_budget_synthesis.document;
const BASS_LAW_2018: PinnedDocument =
  unitEvidence2018.syntheses.forms.state_social_insurance_synthesis.document;
const DETAIL_UNIT_2018 = authorityAnnexes(
  unitEvidence2018.f02,
  unitEvidence2018.f02.revenueSection.comparisonSourceXmlSha256
);

export const EDITION_2018: ApprovedBudgetEdition = {
  profileId: 'budget-law-2018-approved-v1',
  budgetYear: 2018,
  publication: 'law_2018_as_published_in_monitorul_oficial',
  ckan: CKAN_2018,
  vintage: {
    resourceId: '6fbc7374-9762-4e72-b88c-10b15042caf6',
    url: `https://data.gov.ro/dataset/${CKAN_2018.id}/resource/6fbc7374-9762-4e72-b88c-10b15042caf6/download/cuprins_xml_legebuget2018_mo.doc`,
    sha256: '5566880cf2a95b204187708d36708543ca07f4957a6af30dd8aaa2698575d14d',
    bytes: 78_336,
    passage: null,
    publication: 'law_2018_as_published_in_monitorul_oficial',
  },
  unitDocuments: [STATE_LAW_2018, BASS_LAW_2018, DETAIL_UNIT_2018.document],
  slots: SLOTS_2018,
  forms: [
    {
      form: 'state_budget_synthesis',
      fund: 'state_budget',
      root: 'MODULE1',
      fields: fieldsOf('GRUPA', SLOTS_2018),
      annex: 'Anexa nr.1',
      resource: resource2018(
        'e9572ab3-b9ac-4611-acea-b67d8b310450',
        'bugetcash_anexa001.xml',
        '27ef4186ebdd2cecb5fb1b58314de72bd4ffe4fcdbfa17129a222f63456d09ab',
        828_070
      ),
      legacyFileId:
        'budget-law-file:2f155d195b57fc9d44cee42ecde78acae36209af21f9fc07e8f9bd37056ca2cb',
      unit: witnessedPage(unitEvidence2018, 'state_budget_synthesis'),
    },
    {
      form: 'state_budget_authority_detail',
      fund: 'state_budget',
      root: 'MODULE4',
      fields: fieldsOf('TITLU', SLOTS_2018),
      annex: AUTHORITY_ANNEX,
      resource: resource2018(
        '76e56b4d-5ebc-41a8-ae83-1d62e1b50147',
        'bugetcash_f02.xml',
        unitEvidence2018.f02.sourceXmlSha256,
        16_963_833
      ),
      legacyFileId:
        'budget-law-file:b484b172da3b50ebda5cc82b9480d39af6c3e2e45c63aa8a76f209849a21bbb1',
      unit: DETAIL_UNIT_2018,
    },
    {
      form: 'state_social_insurance_synthesis',
      fund: 'state_social_insurance',
      root: 'MODULE8',
      fields: fieldsOf('GRUPA', SLOTS_2018),
      annex: 'Anexa nr.1/03',
      resource: resource2018(
        '0b6ae1a8-824f-4bf1-b904-9f5f08b74056',
        'bass_anexa1.xml',
        'ecf4b8d3024c7cf56e3447a8f2354e01d4217ab4233049e8b732754e779aad9a',
        157_364
      ),
      legacyFileId:
        'budget-law-file:d15993165607a2e3557565dee116744781ae78a541e2ec25728f79e0ee799cd7',
      unit: witnessedPage(unitEvidence2018, 'state_social_insurance_synthesis'),
    },
    {
      form: 'health_insurance_synthesis',
      fund: 'health_insurance',
      root: 'MODULE11',
      fields: fieldsOf('GRUPA', SLOTS_2018),
      annex: 'Anexa nr.12/01',
      resource: resource2018(
        '1730e247-33a1-4872-a222-6c1b9cc40020',
        'bsan_anexa1201.xml',
        '9f9618d2f1d79a3b7b927c4e0115c44736325988166c4c3e51e0d9608e08fe04',
        148_626
      ),
      legacyFileId:
        'budget-law-file:86d5527bfa111aa4bdf51d7f86cd8e0eeccf1711e93dddb34b6ee30fbc945c67',
      unit: witnessedPage(unitEvidence2018, 'health_insurance_synthesis'),
    },
    {
      form: 'unemployment_insurance_synthesis',
      fund: 'unemployment_insurance',
      root: 'MODULE14',
      fields: fieldsOf('GRUPA', SLOTS_2018),
      annex: 'Anexa nr.1/04',
      resource: resource2018(
        '5e40a2b8-7667-4036-9021-5788408c8e55',
        'bsom_anexa1.xml',
        '1b3b36bc8ea156172349cd211bf3c6045f207b0934c057188068d96c8a7154f5',
        180_907
      ),
      legacyFileId:
        'budget-law-file:4a09c850cda06a9884a5cf33fa0918a0274bd94276a4df970725882819b271a1',
      unit: witnessedPage(unitEvidence2018, 'unemployment_insurance_synthesis'),
    },
  ],
};

/** The reviewed editions by budget year; nothing selects a "latest" one. */
export const APPROVED_BUDGET_EDITIONS: ReadonlyMap<
  number,
  ApprovedBudgetEdition
> = new Map(
  [
    EDITION_2018,
    EDITION_2019,
    EDITION_2020,
    EDITION_2021,
    EDITION_2022,
    EDITION_2023,
    EDITION_2024,
    EDITION_2025,
  ].map((e) => [e.budgetYear, e])
);

// ---- 2025 compatibility aliases (the released slice's names) ----------------

export const APPROVED_BUDGET_PROFILE_ID = EDITION_2025.profileId;
export const APPROVED_BUDGET_YEAR = EDITION_2025.budgetYear;
export const APPROVED_BUDGET_PUBLICATION = EDITION_2025.publication;
export const CKAN_PACKAGE = EDITION_2025.ckan;
export const APPROVED_BUDGET_SLOTS = EDITION_2025.slots;
export const UNIT_DOCUMENTS = EDITION_2025.unitDocuments;
export const PUBLICATION_VINTAGE = EDITION_2025.vintage;
export const APPROVED_BUDGET_FORMS = EDITION_2025.forms;

/** Capture and publication run only for a reviewed edition itself (object
 * identity with the registry): never a copy with another profile, year or
 * publication. */
export function requireReviewedEdition(edition: ApprovedBudgetEdition) {
  if (APPROVED_BUDGET_EDITIONS.get(edition.budgetYear) !== edition)
    throw new Error(
      `${edition.profileId}: not a reviewed approved-budget edition`
    );
}

/** The form must be one of the edition's own reviewed forms (object
 * identity): a form is never admitted under another edition's defaults. */
export function requireEditionForm(
  edition: ApprovedBudgetEdition,
  form: ApprovedBudgetForm
) {
  if (!edition.forms.includes(form))
    throw new Error(
      `${form.form}: not a reviewed form of the ${String(edition.budgetYear)} edition`
    );
  const slots = edition.slots.map((s) => s.field);
  if (
    canonicalExecutionJson(form.fields.slice(-slots.length)) !==
    canonicalExecutionJson(slots)
  )
    throw new Error(`${form.form}: value fields differ from the edition slots`);
}

/** The versioned interpretation config of one form of one edition: its
 * digest is part of the interpretation identity. The key set is the released
 * 2025 serialization. */
export function approvedBudgetConfig(
  edition: ApprovedBudgetEdition,
  form: ApprovedBudgetForm
) {
  requireEditionForm(edition, form);
  const config = {
    parserVersion: APPROVED_BUDGET_PARSER_VERSION,
    profileId: edition.profileId,
    budgetYear: edition.budgetYear,
    publication: edition.publication,
    form: form.form,
    fund: form.fund,
    root: form.root,
    fields: form.fields,
    annex:
      form.annex instanceof RegExp
        ? { pattern: form.annex.source }
        : form.annex,
    slots: edition.slots,
    creditLabels: CREDIT_LABELS,
    amountToken: AMOUNT_TOKEN.source,
    encoding: 'ISO-8859-2',
    unit: form.unit,
  };
  return { config, sha256: sha256Hex(canonicalExecutionJson(config)) };
}
