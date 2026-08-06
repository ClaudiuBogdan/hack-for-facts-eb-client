import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ParliamentCommitteeDetail } from '@/schemas/parliament'

const useCommitteeMock = vi.fn()
const useDocumentsMock = vi.fn()
vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentCommittee: (key: string) => useCommitteeMock(key),
  useParliamentCommitteeDocuments: (key: string) => useDocumentsMock(key),
}))

/** The documents section is its own query; default it to "empty, settled". */
const noDocuments = {
  data: { pages: [{ documents: [], total: 0, hasNextPage: false, endCursor: null }] },
  isLoading: false,
  isError: false,
  hasNextPage: false,
  isFetchingNextPage: false,
  fetchNextPage: vi.fn(),
}
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as Record<string, unknown>)}>{children}</a>
  ),
}))

import { ParliamentCommitteeDetailPage } from './parliament-committee-detail-page'

const detail: ParliamentCommitteeDetail = {
  committeeKey: 'camera_deputatilor:buget|2024',
  chamber: 'camera_deputatilor',
  name: 'Comisia pentru buget',
  legislature: '2024',
  committeeType: 'permanenta',
  sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
  members: [
    {
      membershipKey: 'k1',
      member: { mandateKey: 'dep-001', fullName: 'Ana Nord', groupName: 'PSD' },
      role: 'presedinte',
      joinedDate: '2024-12-20',
      isBureau: true,
      sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
    },
    {
      // Unresolved roster row — NO member ref. Must render name-free, never a
      // fabricated placeholder.
      membershipKey: 'k2',
      role: 'membru',
      joinedDate: '2020-01-15',
      leftDate: '2024-12-01',
      sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
    },
  ],
  linkedBills: [],
  linkedBillsTotal: 0,
  meetingsCount: 12,
}

describe('ParliamentCommitteeDetailPage roster (codex MAJOR: no fabricated names)', () => {
  beforeEach(() => {
    useCommitteeMock.mockReset()
    useDocumentsMock.mockReset()
    useDocumentsMock.mockReturnValue(noDocuments)
    useCommitteeMock.mockReturnValue({ data: detail, isLoading: false })
  })

  it('never renders a fabricated placeholder name for an unresolved roster row', () => {
    render(<ParliamentCommitteeDetailPage committeeKey="camera_deputatilor:buget|2024" />)
    expect(screen.queryByText('Membru (neasociat)')).not.toBeInTheDocument()
    // The resolved member still renders (and deep-links) — from the Conducere
    // band, which lifts the bureau out of the roster.
    expect(screen.getByText('Ana Nord')).toBeInTheDocument()

    // The rank-and-file sit in collapsed per-group panels now, so open the one
    // holding the unresolved row before asserting on its name slot.
    fireEvent.click(screen.getByRole('button', { name: /Neafiliat/ }))

    // The name-free slot exposes an accessible label instead of a made-up name.
    expect(
      screen.getByLabelText('Mandat neasociat unui profil'),
    ).toBeInTheDocument()
    // A footnote explains the unassociated mandates.
    expect(
      screen.getByText('Unele mandate nu sunt încă asociate unui profil.'),
    ).toBeInTheDocument()
  })

  it('omits the footnote when every roster row resolves to a member', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...detail, members: [detail.members[0]!] },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey="camera_deputatilor:buget|2024" />)
    expect(
      screen.queryByText('Unele mandate nu sunt încă asociate unui profil.'),
    ).not.toBeInTheDocument()
  })
})

/**
 * The empty state is a property of the PAYLOAD, not of the chamber.
 *
 * This page used to branch `isSenate ? <notice> : <bills>`, so every Senate
 * committee rendered "we don't have the bills yet" no matter what the server
 * sent. On live data that hid real rows: `senate:1d044a32-…` is served with
 * 24 linked bills and 2 meetings and still showed the notice.
 */
const senateBill = {
  billId: 'senat:123',
  number: 'L123/2026',
  title: 'Lege privind comunicațiile electronice',
  billType: 'parlamentar' as const,
  originatingChamber: 'senat' as const,
  currentLocation: 'senat' as const,
  currentStageLabel: 'La comisie',
  lastUpdatedAt: '2026-06-01',
  legislatureId: '2024',
}

const senateDetail: ParliamentCommitteeDetail = {
  ...detail,
  committeeKey: 'senate:1d044a32-1bad-4adf-925e-0abab63af58a',
  chamber: 'senat',
  name: 'Comisia pentru drepturile omului',
  // Every Senate committee carries no legislature — 191/191 on live data.
  legislature: undefined,
  sourceUrl: 'https://www.senat.ro/EnumComisii.aspx?Permanenta=1',
  linkedBills: [senateBill],
  linkedBillsTotal: 24,
  meetingsCount: 2,
}

/**
 * The empty-bills notice. It is deliberately NOT chamber-specific any more: the
 * old copy fired on `isSenate` and explained the absence with "sub 5% … sunt
 * legate de un proiect de lege", a measurement of the document-link path alone.
 * Committee referrals now also come from the step-links, so that explanation is
 * false — and an empty CDep committee had no notice at all.
 */
const EMPTY_BILLS_NOTICE = /Nu am găsit proiecte de lege asociate acestei comisii/

describe('ParliamentCommitteeDetailPage — Senate activity is served, not assumed absent', () => {
  beforeEach(() => {
    useCommitteeMock.mockReset()
    useDocumentsMock.mockReset()
    useDocumentsMock.mockReturnValue(noDocuments)
  })

  it('renders a Senate committee’s linked bills instead of the "not published" notice', () => {
    useCommitteeMock.mockReturnValue({ data: senateDetail, isLoading: false })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText('Proiecte de lege')).toBeInTheDocument()
    expect(screen.getByText(senateBill.title)).toBeInTheDocument()
    expect(screen.queryByText(EMPTY_BILLS_NOTICE)).not.toBeInTheDocument()
  })

  it('shows the Senate counters when they are non-zero (a zero stays omitted)', () => {
    useCommitteeMock.mockReturnValue({ data: senateDetail, isLoading: false })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText('proiecte repartizate')).toBeInTheDocument()
    expect(screen.getByText('ședințe')).toBeInTheDocument()
  })

  it('omits an AMBIGUOUS Senate zero rather than printing "0 ședințe" as a fact', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...senateDetail, linkedBills: [], linkedBillsTotal: 0, meetingsCount: 0 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.queryByText('proiecte repartizate')).not.toBeInTheDocument()
    expect(screen.queryByText('ședințe')).not.toBeInTheDocument()
    expect(screen.getByText(EMPTY_BILLS_NOTICE)).toBeInTheDocument()
  })

  it('names the missing meetings figure when a Senate committee HAS bills but no meetings', () => {
    // Otherwise the page shows bills, silently omits the meetings figure, and
    // says nothing — the absent-vs-zero ambiguity this change set out to remove.
    useCommitteeMock.mockReturnValue({
      data: { ...senateDetail, meetingsCount: 0 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText(senateBill.title)).toBeInTheDocument()
    expect(screen.queryByText('ședințe')).not.toBeInTheDocument()
    expect(
      screen.getByText('Numărul de ședințe pentru această comisie nu este încă disponibil.'),
    ).toBeInTheDocument()
  })

  it('renders the bills section for a CAMERA committee too (the restructured branch)', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...detail, linkedBills: [senateBill], linkedBillsTotal: 3 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={detail.committeeKey} />)

    expect(screen.getByText('Proiecte de lege')).toBeInTheDocument()
    expect(screen.getByText(senateBill.title)).toBeInTheDocument()
    // No Senate-only notice may leak onto a Camera page.
    expect(screen.queryByText(EMPTY_BILLS_NOTICE)).not.toBeInTheDocument()
    expect(
      screen.queryByText('Numărul de ședințe pentru această comisie nu este încă disponibil.'),
    ).not.toBeInTheDocument()
  })

  it('still prints a Camera zero — there a zero is a better-founded floor', () => {
    useCommitteeMock.mockReturnValue({
      data: { ...detail, linkedBills: [], linkedBillsTotal: 0, meetingsCount: 0 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={detail.committeeKey} />)

    expect(screen.getByText('proiecte repartizate')).toBeInTheDocument()
    expect(screen.getByText('ședințe')).toBeInTheDocument()
    // …and it gets the SAME notice a Senate zero gets. An empty Camera committee
    // used to render nothing where the bills section would be, which reads as a
    // layout gap rather than as "we found none".
    expect(screen.getByText(EMPTY_BILLS_NOTICE)).toBeInTheDocument()
  })

  it('never explains an empty list with a chamber-specific coverage claim', () => {
    for (const data of [
      { ...detail, linkedBills: [], linkedBillsTotal: 0, meetingsCount: 0 },
      { ...senateDetail, linkedBills: [], linkedBillsTotal: 0, meetingsCount: 0 },
    ]) {
      useCommitteeMock.mockReturnValue({ data, isLoading: false })
      const { unmount } = render(
        <ParliamentCommitteeDetailPage committeeKey={data.committeeKey} />,
      )
      // The retired copy, in the two forms that carried a number we no longer
      // measure. A notice may say we found nothing; it may not say why.
      expect(screen.queryByText(/sub 5%/)).not.toBeInTheDocument()
      expect(screen.queryByText(/documentele comisiilor Senatului/)).not.toBeInTheDocument()
      unmount()
    }
  })

  it('attributes the truncation to us, not to the source', () => {
    // The cap notice sits behind "arată toate", which only appears past the
    // preview size — so the served page has to exceed it.
    const served = Array.from({ length: 12 }, (_, i) => ({
      ...senateBill,
      billId: `senat:${String(200 + i)}`,
      title: `Lege ${String(i)} privind comunicațiile electronice`,
    }))
    useCommitteeMock.mockReturnValue({
      data: { ...detail, linkedBills: served, linkedBillsTotal: 3352 },
      isLoading: false,
    })
    render(<ParliamentCommitteeDetailPage committeeKey={detail.committeeKey} />)

    // The cap notice is behind "arată toate" — open it.
    fireEvent.click(screen.getByRole('button', { name: /Arată toate/ }))
    expect(screen.getByText(/Afișăm primele/)).toBeInTheDocument()
    // The header count prints the same total, so both occurrences are expected.
    expect(screen.getAllByText('3.352').length).toBeGreaterThan(0)
    // …and it does NOT promise where the rest are. A Senate committee's
    // sourceUrl is the shared committee index, so "restul se găsesc pe pagina
    // oficială" asserts something the payload does not establish.
    expect(screen.queryByText(/Restul se găsesc/)).not.toBeInTheDocument()
    // The bound is the API's, not the chamber's. "Sursa returnează cel mult N"
    // told the reader cdep.ro refuses to publish more, which it does not.
    expect(screen.queryByText(/Sursa returnează/)).not.toBeInTheDocument()
  })
})

/**
 * The Documente section. Every assertion here is a shape the LIVE data forces:
 * a Senate row usually has no date and never a type badge, and a document row
 * may carry no file at all. Rendering a date, a badge or a download button
 * anyway would print something the source never said.
 */
describe('ParliamentCommitteeDetailPage — Documente', () => {
  const page = (documents: readonly unknown[], over: Record<string, unknown> = {}) => ({
    data: {
      pages: [
        { documents, total: documents.length, hasNextPage: false, endCursor: null },
      ],
    },
    isLoading: false,
    isError: false,
    hasNextPage: false,
    isFetchingNextPage: false,
    fetchNextPage: vi.fn(),
    ...over,
  })

  beforeEach(() => {
    useCommitteeMock.mockReset()
    useDocumentsMock.mockReset()
    useCommitteeMock.mockReturnValue({ data: senateDetail, isLoading: false })
  })

  it('omits the date line and the badge when the source carries neither', () => {
    useDocumentsMock.mockReturnValue(
      page([
        {
          documentId: 'senate-doc-002',
          title: 'Aviz comun cu Comisia pentru buget',
          sourceUrl: 'https://www.senat.ro/ComisiiDetaliu.aspx',
        },
      ]),
    )
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText('Documente')).toBeInTheDocument()
    const title = screen.getByText('Aviz comun cu Comisia pentru buget')
    // Scoped to THIS row's info block: the page carries dates elsewhere, and a
    // page-wide search would pass while the row printed a borrowed one. The
    // block must hold the title and nothing else — no date line, no badge.
    expect(title.parentElement?.textContent).toBe('Aviz comun cu Comisia pentru buget')
  })

  it('links to the source instead of offering a download when there is no file', () => {
    useDocumentsMock.mockReturnValue(
      page([
        {
          documentId: 'senate-doc-003',
          title: 'Proces-verbal',
          sourceUrl: 'https://www.senat.ro/ComisiiDetaliu.aspx',
        },
      ]),
    )
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText('Vezi pe senat.ro')).toBeInTheDocument()
    expect(screen.queryByText('Descarcă')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Vezi pe senat\.ro/ })).toHaveAttribute(
      'href',
      'https://www.senat.ro/ComisiiDetaliu.aspx',
    )
  })

  it('offers the download, the date and the badge when all three are present', () => {
    useCommitteeMock.mockReturnValue({ data: detail, isLoading: false })
    useDocumentsMock.mockReturnValue(
      page([
        {
          documentId: 'cdep-doc-001',
          title: 'Raport asupra bugetului',
          docType: 'raport',
          publishedAt: '2026-03-14',
          documentUrl: 'https://www.cdep.ro/rp123.pdf',
          sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
        },
      ]),
    )
    render(<ParliamentCommitteeDetailPage committeeKey={detail.committeeKey} />)

    expect(screen.getByText('raport')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Descarcă/ })).toHaveAttribute(
      'href',
      'https://www.cdep.ro/rp123.pdf',
    )
  })

  it('says it found none — never removes the section', () => {
    // Removing it made "this committee published nothing we hold" look exactly
    // like "this page has no documents section", and a reader cannot tell those
    // apart, so they read it as the second.
    useDocumentsMock.mockReturnValue(page([]))
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText('Documente')).toBeInTheDocument()
    expect(
      screen.getByText(/Nu am găsit documente publicate de această comisie/),
    ).toBeInTheDocument()
    // …and it is NOT the failure notice, which says the opposite thing.
    expect(screen.queryByText(/nu au putut fi încărcate/)).not.toBeInTheDocument()
  })

  it('renders the date the source printed, not a timezone-shifted one', () => {
    // The mapper used to weld T00:00:00+03:00 onto a calendar date, so this row
    // rendered "13 martie 2026" in every timezone including Bucharest.
    useCommitteeMock.mockReturnValue({ data: detail, isLoading: false })
    useDocumentsMock.mockReturnValue(
      page([
        {
          documentId: 'cdep-doc-001',
          title: 'Raport asupra bugetului',
          docType: 'raport',
          publishedAt: '2026-03-14',
          documentUrl: 'https://www.cdep.ro/rp123.pdf',
          sourceUrl: 'https://www.cdep.ro/co/comisii.dc?comi=1',
        },
      ]),
    )
    render(<ParliamentCommitteeDetailPage committeeKey={detail.committeeKey} />)

    expect(screen.getByText('14 martie 2026')).toBeInTheDocument()
    expect(screen.queryByText('13 martie 2026')).not.toBeInTheDocument()
  })

  it('names the document in each link, not just the action', () => {
    // Twenty rows all announcing "Descarcă" name nothing in a screen reader's
    // link list.
    useDocumentsMock.mockReturnValue(
      page([
        {
          documentId: 'd1',
          title: 'Raport asupra sănătății publice',
          documentUrl: 'https://www.senat.ro/raport.pdf',
          sourceUrl: 'https://www.senat.ro/ComisiiDetaliu.aspx',
        },
        {
          documentId: 'd2',
          title: 'Aviz comun',
          sourceUrl: 'https://www.senat.ro/ComisiiDetaliu.aspx',
        },
      ]),
    )
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(
      screen.getByRole('link', { name: 'Descarcă Raport asupra sănătății publice' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Vezi pe senat.ro: Aviz comun' }),
    ).toBeInTheDocument()
  })

  it('announces the loading state instead of going silently blank', () => {
    useDocumentsMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(
      screen.getByRole('status', { name: 'Se încarcă documentele comisiei' }),
    ).toBeInTheDocument()
  })

  it('says a failed fetch failed — never that the committee published nothing', () => {
    useDocumentsMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: vi.fn(),
    })
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    expect(screen.getByText(/nu au putut fi încărcate/)).toBeInTheDocument()
    // The bills section above is unaffected — that is the point of fetching the
    // documents through their own query rather than the committee detail.
    expect(screen.getByText(senateBill.title)).toBeInTheDocument()
  })

  it('offers "load more" only while the connection has another page', () => {
    const fetchNextPage = vi.fn()
    useDocumentsMock.mockReturnValue(
      page(
        [
          {
            documentId: 'd1',
            title: 'Primul document',
            sourceUrl: 'https://www.senat.ro/ComisiiDetaliu.aspx',
          },
        ],
        { hasNextPage: true, fetchNextPage },
      ),
    )
    render(<ParliamentCommitteeDetailPage committeeKey={senateDetail.committeeKey} />)

    fireEvent.click(screen.getByRole('button', { name: /Încarcă mai multe documente/ }))
    expect(fetchNextPage).toHaveBeenCalledTimes(1)
  })
})
