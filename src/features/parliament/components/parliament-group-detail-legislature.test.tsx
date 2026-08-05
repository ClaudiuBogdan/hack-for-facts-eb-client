/**
 * The group dossier's legislature picker, at the render level.
 *
 * The fetch-layer contract is pinned in
 * `api/parliament-group-legislature.test.ts`; this file pins what the page
 * SAYS, because every defect here is a false statement rather than a crash:
 * a current-term claim printed over a historical roster, a cohesion figure
 * computed from a today-bounded vote window shown under a 2016 heading, or a
 * failed read rendered as "this group held no mandates".
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { ParliamentGroup, ParliamentMember } from '@/schemas/parliament'

const useGroupMock = vi.fn()
const useGroupMembersMock = vi.fn()
const useCohesionMock = vi.fn()
const useSearchMock = vi.fn()

vi.mock('../hooks/use-parliament-data', () => ({
  useParliamentGroup: (groupId: string, legislature?: string) =>
    useGroupMock(groupId, legislature),
  useParliamentGroupMembers: (groupId: string, legislature?: string) =>
    useGroupMembersMock(groupId, legislature),
  useParliamentGroupCohesion: () => useCohesionMock(),
}))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, ...rest }: { children: React.ReactNode }) => (
    <a {...(rest as Record<string, unknown>)}>{children}</a>
  ),
  useNavigate: () => vi.fn(),
  useSearch: () => useSearchMock(),
}))

import { ParliamentGroupDetailPage } from './parliament-group-detail-page'

const group = (memberCount: number): ParliamentGroup => ({
  groupId: 'psd-camera_deputatilor',
  chamber: 'camera',
  name: 'PSD',
  memberCount,
})

const member = (id: string): ParliamentMember => ({
  memberId: id,
  firstName: 'Ion',
  lastName: `Popescu${id}`,
  chamber: 'camera',
  groupId: 'psd-camera_deputatilor',
  groupName: 'PSD',
  judetSlug: 'cluj',
  judetName: 'CLUJ',
})

/** `n` roster rows, so the seat arithmetic under test has something to count. */
const roster = (n: number): ParliamentMember[] =>
  Array.from({ length: n }, (_, i) => member(String(i)))

const settled = <T,>(data: T) => ({
  data,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
})

beforeEach(() => {
  useGroupMock.mockReset()
  useGroupMembersMock.mockReset()
  useCohesionMock.mockReset()
  useSearchMock.mockReset()
  useCohesionMock.mockReturnValue({ data: [], isLoading: false, isError: false })
})

describe('the sitting term is unchanged by the picker', () => {
  it('keeps the current-seat framing, the ended-seat gap and the cohesion panel', () => {
    // Live shape (Chronos 2026-08-05): PSD Camera 2024 = 93 mandates, 91 current.
    useSearchMock.mockReturnValue({})
    useGroupMock.mockReturnValue(settled(group(93)))
    useGroupMembersMock.mockReturnValue(settled(roster(91)))

    render(<ParliamentGroupDetailPage groupId="psd-camera_deputatilor" />)

    expect(screen.getByText(/Legislatura 2024/u)).toBeTruthy()
    expect(screen.getByText('91')).toBeTruthy()
    expect(screen.getByText('mandate active')).toBeTruthy()
    // 93 - 91: the seats that ended mid-term, named rather than left as a gap.
    expect(screen.getByText('2')).toBeTruthy()
    expect(screen.getByText('mandate încheiate')).toBeTruthy()
    expect(screen.getByText('Cum a votat grupul')).toBeTruthy()
  })
})

describe('a past term never borrows the present tense', () => {
  beforeEach(() => {
    useSearchMock.mockReturnValue({ legislatura: '2016' })
    useGroupMock.mockImplementation((_id: string, legislature?: string) =>
      settled(legislature === '2016' ? group(156) : group(93)),
    )
    useGroupMembersMock.mockReturnValue(settled(roster(156)))
  })

  it('drops "active" from the seat label and prints the chosen term', () => {
    render(<ParliamentGroupDetailPage groupId="psd-camera_deputatilor" />)
    expect(screen.getByText(/Legislatura 2016/u)).toBeTruthy()
    expect(screen.getByText('156')).toBeTruthy()
    expect(screen.getByText('mandate')).toBeTruthy()
    expect(screen.queryByText('mandate active')).toBeNull()
  })

  it('hides the ended-seat stat, whose arithmetic only holds for the sitting term', () => {
    render(<ParliamentGroupDetailPage groupId="psd-camera_deputatilor" />)
    expect(screen.queryByText('mandate încheiate')).toBeNull()
  })

  it('withholds cohesion, which is computed from a window ending TODAY', () => {
    render(<ParliamentGroupDetailPage groupId="psd-camera_deputatilor" />)
    expect(screen.queryByText('Cum a votat grupul')).toBeNull()
  })
})

describe('an empty roster says WHICH kind of empty it is', () => {
  it('a failed read is reported as a failure, never as an absence of mandates', () => {
    useSearchMock.mockReturnValue({})
    useGroupMock.mockReturnValue(settled(group(93)))
    useGroupMembersMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    })

    render(<ParliamentGroupDetailPage groupId="psd-camera_deputatilor" />)

    expect(screen.getByText(/nu a putut fi încărcată/u)).toBeTruthy()
    expect(screen.queryByText(/nu a deținut mandate/u)).toBeNull()
    // And the whole seat count must not be re-labelled as ended mandates.
    expect(screen.queryByText('mandate încheiate')).toBeNull()
  })

  it('a genuinely absent term says so, with the term named', () => {
    useSearchMock.mockReturnValue({ legislatura: '1992' })
    useGroupMock.mockImplementation((_id: string, legislature?: string) =>
      settled(legislature === '1992' ? null : group(93)),
    )
    useGroupMembersMock.mockReturnValue(settled([]))

    render(<ParliamentGroupDetailPage groupId="psd-camera_deputatilor" />)

    expect(screen.getByText(/nu a deținut mandate în legislatura 1992/u)).toBeTruthy()
  })
})

describe('a group that did not sit in the chosen term is not a dead end', () => {
  it('offers the way back instead of asserting the group does not exist', () => {
    // PSDR last sat in 1992: both the term read and the latest-term fallback
    // resolve to null, which used to render a terminal "not found".
    useSearchMock.mockReturnValue({ legislatura: '2016' })
    useGroupMock.mockReturnValue(settled(null))
    useGroupMembersMock.mockReturnValue(settled([]))

    render(<ParliamentGroupDetailPage groupId="psdr-camera_deputatilor" />)

    expect(screen.getByText(/nu a deținut mandate în legislatura 2016/u)).toBeTruthy()
    expect(screen.getByText(/Vezi legislatura 2024/u)).toBeTruthy()
    expect(screen.queryByText('Grupul parlamentar nu a fost găsit.')).toBeNull()
  })

  it('still says "not found" on the sitting term, where that IS the meaning', () => {
    useSearchMock.mockReturnValue({})
    useGroupMock.mockReturnValue(settled(null))
    useGroupMembersMock.mockReturnValue(settled([]))

    render(<ParliamentGroupDetailPage groupId="nu-exista" />)

    expect(screen.getByText('Grupul parlamentar nu a fost găsit.')).toBeTruthy()
  })
})
