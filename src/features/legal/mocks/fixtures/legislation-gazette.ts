import type {
  GazetteDirectoryIssue,
  GazetteIssueContents,
} from '@/schemas/legal'

/**
 * Gazette directory fixture.
 *
 * The rows are REAL issues copied from the live API (2026-08-26) — ids,
 * labels, dates, part codes and flag values are production values, so the
 * mock exercises the true shapes: the newest corpus issue (566/2026, frozen
 * frontier), same-day siblings, an e-Monitor-linked Partea a II-a issue, a
 * Partea a IV-a issue with NO archive index, and a Hungarian-edition (PIM)
 * issue. Only the 1225Bis row's id is invented (its id was not captured).
 */
export const legislationGazetteIssuesFixture: readonly GazetteDirectoryIssue[] =
  [
    {
      moIssueId: '621458',
      partCode: 'PI',
      issueLabel: '566',
      issueNumber: 566,
      issueYear: 2026,
      issueDate: '2026-07-09',
      pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PI--566--2026.html',
      hasArchiveIndex: true,
      hasEmonitorLink: false,
    },
    {
      moIssueId: '621457',
      partCode: 'PI',
      issueLabel: '565',
      issueNumber: 565,
      issueYear: 2026,
      issueDate: '2026-07-09',
      pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PI--565--2026.html',
      hasArchiveIndex: true,
      hasEmonitorLink: false,
    },
    {
      moIssueId: '621456',
      partCode: 'PI',
      issueLabel: '563',
      issueNumber: 563,
      issueYear: 2026,
      issueDate: '2026-07-08',
      pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PI--563--2026.html',
      hasArchiveIndex: true,
      hasEmonitorLink: false,
    },
    {
      moIssueId: '63522',
      partCode: 'PII',
      issueLabel: '61',
      issueNumber: 61,
      issueYear: 2026,
      issueDate: '2026-05-28',
      pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PII--61--2026.html',
      hasArchiveIndex: false,
      hasEmonitorLink: true,
    },
    {
      moIssueId: '63286',
      partCode: 'PIV',
      issueLabel: '3208',
      issueNumber: 3208,
      issueYear: 2026,
      issueDate: '2026-05-28',
      pdfUrl:
        'https://monitoruloficial.ro/Monitorul-Oficial--PIV--3208--2026.html',
      hasArchiveIndex: false,
      hasEmonitorLink: true,
    },
    {
      moIssueId: '62007',
      partCode: 'PIM',
      issueLabel: '55',
      issueNumber: 55,
      issueYear: 2025,
      issueDate: '2025-12-31',
      pdfUrl: 'https://monitoruloficial.ro/Monitorul-Oficial--PIM--55--2025.html',
      hasArchiveIndex: false,
      hasEmonitorLink: true,
    },
    {
      moIssueId: '618900',
      partCode: 'PI',
      issueLabel: '1225Bis',
      issueNumber: 1225,
      issueYear: 2025,
      issueDate: '2025-12-31',
      pdfUrl:
        'https://monitoruloficial.ro/Monitorul-Oficial--PI--1225Bis--2025.html',
      hasArchiveIndex: true,
      hasEmonitorLink: true,
    },
  ]

/**
 * Archive-index fixture for issue 566/2026 — the three real publications the
 * live `contents` connection returns for it, all `unmatched` (the newest
 * issues' publications rarely resolve to a Portal act yet).
 */
export const legislationGazetteContentsFixture: Readonly<
  Record<string, GazetteIssueContents>
> = {
  '621458': {
    items: [
      {
        moActKey:
          '827efd76fed7ab96afbf8e2fc0e2ac38507e6b307733795ee19208fe25cc56e3',
        title:
          'Ordin privind acordarea acreditării unității de învățământ preuniversitar particular Grădinița cu Program Normal și Prelungit „Christophori“ din municipiul București, sectorul 1.',
        actType: 'ordin',
        actNumberNorm: '4123',
        actYear: 2026,
        issuerSlug: 'ministerul-educatiei-si-cercetarii',
        actDate: '2026-06-11',
        resolution: 'unmatched',
        act: null,
      },
      {
        moActKey:
          'a640b7772c3f8ca7060922a3917ae4e0aa3ad353599036d05d9aee757ddb2f1e',
        title:
          'Ordin pentru aprobarea Reglementării aeronautice civile române RACR-LPAN AUN „Licențierea personalului aeronautic civil navigant - aeronave ultraușoare nemotorizate“, ediția 2/2026, și pentru modificarea Ordinului ministrului transporturilor, construcțiilor și turismului nr. 630/2007 privind modul de reglementare a domeniului aeronauticii civile cu aeronave ultraușoare din România.',
        actType: 'ordin',
        actNumberNorm: '609',
        actYear: 2026,
        issuerSlug: 'ministerul-transporturilor-si-infrastructurii',
        actDate: '2026-06-17',
        resolution: 'unmatched',
        act: null,
      },
      {
        moActKey:
          'baaab29b216b87df84efa4ff32d68f3923b47211e85a174c812c4eccf0be547d',
        title:
          'Ordin privind acordarea acreditării unității de învățământ preuniversitar particular Grădinița cu Program Normal și Prelungit „Zkids“ din municipiul Iași, județul Iași.',
        actType: 'ordin',
        actNumberNorm: '4121',
        actYear: 2026,
        issuerSlug: 'ministerul-educatiei-si-cercetarii',
        actDate: '2026-06-11',
        resolution: 'unmatched',
        act: null,
      },
    ],
    hasMore: false,
  },
}
