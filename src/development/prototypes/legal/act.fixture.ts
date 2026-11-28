import { legalActDetailRichFixture } from '@/features/legal/mocks/fixtures/legal-act-detail'
import { LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT } from '@/schemas/legal'
import type { LegalActDetail, LegalActDocumentVersion, LegalActListItem, LegalReference } from '@/schemas/legal'

/**
 * The act record that goes with the specimen text (`act.specimen.ts`): made up, in the served shape, so the page's
 * head, its form selector and its closing record can be judged with every part filled. Built over the feature's
 * own rich fixture so a field the schema gains is never missing here. NOT served data: the page labels it.
 */

const baseItem = legalActDetailRichFixture.outLinks?.items.find((item) => item.act !== null)?.act
const baseReference = legalActDetailRichFixture.outLinks?.items[0]
const baseVersion = legalActDetailRichFixture.documents[0]
const basePublication = legalActDetailRichFixture.gazettePublications[0]
if (baseItem == null || baseReference === undefined || baseVersion === undefined || basePublication === undefined) throw new Error('the rich act fixture lost the rows the prototype builds on')

const actItem = (actId: string, displayCitation: string, actType: string, actNumber: string, actYear: number, issuerSlug: string, status: LegalActListItem['status']): LegalActListItem => ({
  ...baseItem,
  actId,
  displayCitation,
  actType,
  actNumber,
  actYear,
  issuerSlug,
  status,
})
const reference = (relation: string, targetRaw: string, act: LegalActListItem | null): LegalReference => ({
  ...baseReference,
  relation,
  targetRaw,
  act,
  resolution: act === null ? 'unresolved' : 'unique',
  confidence: act === null ? 0 : 0.95,
})
const version = (documentId: string, versionKind: string, versionDate: string | null, isCanonical: boolean, served: boolean): LegalActDocumentVersion => ({
  ...baseVersion,
  documentId,
  versionKind,
  versionDate,
  isCanonical,
  title: 'LEGE nr. 98 din 19 mai 2016',
  firstPublicationDate: '2016-05-23',
  render: served ? { renderStatus: 'served', chunkCount: 1 } : { renderStatus: 'not_compiled', chunkCount: null },
  // As legal_v2 serves a consolidation: the caveat, the date of the Portal's own note, the Portal's page for the form.
  ...(versionKind === 'consolidare' && { caveat: LEGAL_UNOFFICIAL_CONSOLIDATION_CAVEAT, portalLabelDate: versionDate, sourceUrl: 'https://legislatie.just.ro/Public/DetaliiDocumentAfis/257850' }),
})

const oug107 = actItem('195527', 'OUG nr. 107/2017', 'ordonanta-de-urgenta', '107', 2017, 'guvernul', 'in-vigoare')
const lege208 = actItem('257743', 'Legea nr. 208/2022', 'lege', '208', 2022, 'parlamentul', 'in-vigoare')
const lege99 = actItem('178680', 'Legea nr. 99/2016', 'lege', '99', 2016, 'parlamentul', 'modificat')
const lege101 = actItem('178684', 'Legea nr. 101/2016', 'lege', '101', 2016, 'parlamentul', 'modificat')
const hg395 = actItem('178901', 'HG nr. 395/2016', 'hotarare', '395', 2016, 'guvernul', 'modificat')
const oug34 = actItem('71994', 'OUG nr. 34/2006', 'ordonanta-de-urgenta', '34', 2006, 'guvernul', 'abrogat')

export const SPECIMEN_SHOWN_DOCUMENT_ID = 'specimen-2022'

export const SPECIMEN_ACT: LegalActDetail = {
  ...legalActDetailRichFixture,
  actId: 'specimen',
  displayCitation: 'Legea nr. 98/2016',
  actType: 'lege',
  actNumber: '98',
  actYear: 2016,
  issuerSlug: 'parlamentul',
  status: 'modificat',
  // Both of the page's warnings show on the specimen: references of change recorded, and repeal signals that disagree.
  statusEvidence: { modifiedByCount: 14, contradictedAbrogations: 2, abrogatedByCount: 2, futureEventCount: 0 },
  entryIntoForce: '2016-05-26',
  inDegree: 4120,
  aliases: ['legea achizițiilor publice'],
  amendedAfterPublication: 14,
  canonical:
    legalActDetailRichFixture.canonical === null
      ? null
      : {
          ...legalActDetailRichFixture.canonical,
          documentId: SPECIMEN_SHOWN_DOCUMENT_ID,
          den: 'LEGE nr. 98 din 19 mai 2016',
          title: 'LEGE nr. 98 din 19 mai 2016',
          issuerRaw: 'PARLAMENTUL',
          publicationRaw: 'MONITORUL OFICIAL nr. 390 din 23 mai 2016',
          firstPublicationDate: '2016-05-23',
        },
  summary: {
    description: 'Legea nr. 98/2016 stabilește cum cumpără instituțiile publice produse, servicii și lucrări: procedurile de atribuire, pragurile valorice și regulile pentru ofertanți.',
    plainLanguageSummary:
      'Legea spune cum trebuie să cumpere statul. O primărie, un spital sau un minister care vrea să cumpere ceva peste un anumit prag trebuie să anunțe public, să compare ofertele după reguli stabilite dinainte și să explice alegerea. Legea descrie procedurile (licitație deschisă, negociere, achiziție directă), cine poate fi exclus dintr-o procedură și ce se întâmplă când regulile sunt încălcate.',
    documentCategory: 'lege',
    domains: ['achizitii-publice', 'administratie'],
    affectedAudiences: ['institutii-publice', 'firme'],
    keywords: ['achiziții publice', 'licitație', 'autoritate contractantă'],
    keyDates: [
      { date: '2016-05-23', description: 'Publicarea în Monitorul Oficial nr. 390.' },
      { date: '2016-05-26', description: 'Intrarea în vigoare a legii.' },
    ],
    penaltiesMentioned: true,
    fiscalImpact: null,
    confidence: 0.93,
  },
  timeline: [
    { kind: 'status_event', effectiveDate: '2016-05-23', label: 'publicare', eventSource: 'monitorul-oficial', relatedActId: null },
    { kind: 'amendment', effectiveDate: '2017-12-22', label: 'modificată de OUG nr. 107/2017', eventSource: 'portal', relatedActId: oug107.actId },
    { kind: 'amendment', effectiveDate: '2018-06-04', label: 'modificată de OUG nr. 45/2018', eventSource: 'portal', relatedActId: null },
    { kind: 'amendment', effectiveDate: '2020-02-12', label: 'completată de OUG nr. 23/2020', eventSource: 'portal', relatedActId: null },
    { kind: 'amendment', effectiveDate: '2022-03-21', label: 'modificată de OUG nr. 26/2022', eventSource: 'portal', relatedActId: '252718' },
    { kind: 'amendment', effectiveDate: '2022-07-28', label: 'modificată de Legea nr. 208/2022', eventSource: 'portal', relatedActId: lege208.actId },
  ],
  timelineComplete: false,
  gazettePublications: [{ ...basePublication, moIssueId: '39016', issueNumber: 390, issueYear: 2016, issueDate: '2016-05-23', pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PI--390--2016.html' }],
  outLinks: {
    totalCount: 9,
    hasMore: true,
    items: [reference('ABROGA', 'Ordonanța de urgență a Guvernului nr. 34/2006', oug34), reference('TRIMITE_LA', 'Legea nr. 99/2016 privind achizițiile sectoriale', lege99), reference('TRIMITE_LA', 'Legea nr. 101/2016', lege101), reference('TRIMITE_LA', 'normele metodologice de aplicare', null)],
  },
  inLinks: {
    totalCount: 4120,
    hasMore: true,
    items: [reference('MODIFICA', 'Legea nr. 98/2016', lege208), reference('MODIFICA', 'Legea nr. 98/2016', oug107), reference('PUNE_IN_APLICARE', 'Legea nr. 98/2016', hg395)],
  },
  incomingAnchors: { totalCount: 0, items: [] },
  documents: [
    version(SPECIMEN_SHOWN_DOCUMENT_ID, 'consolidare', '2022-07-28', true, true),
    version('specimen-2020', 'consolidare', '2020-02-12', false, true),
    version('specimen-2024', 'consolidare', '2024-01-01', false, false),
    version('specimen-2016', 'original', '2016-05-23', false, true),
  ],
  officialTextUrl: 'https://legislatie.just.ro/Public/DetaliiDocument/178667',
}
