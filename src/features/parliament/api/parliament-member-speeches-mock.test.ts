import { describe, expect, it } from 'vitest'
import { buildMemberSpeechesFilter } from '../lib/member-speeches-filter'
import {
  fetchParliamentMemberSpeechActivityMock,
  fetchParliamentMemberSpeechesMock,
} from './parliament-api.mock'

/**
 * Mock-mode fetcher checks (VITE_USE_MOCK_DATA path). `dep-001` is a Camera
 * member; the generator yields a fixed 9-turn set spread across 2026 + 2025
 * (own chamber = camera_deputatilor, plus joint sittings). The mock applies the
 * GraphQL-shape filter + free-text `q` client-side, mirroring the server.
 */
const MEMBER = 'dep-001'

describe('fetchParliamentMemberSpeechesMock', () => {
  it('returns the full set, keyset-ordered spokenAt desc', async () => {
    const res = await fetchParliamentMemberSpeechesMock(MEMBER)
    expect(res?.total).toBe(9)
    const dates = res?.speeches.map((s) => s.spokenAt) ?? []
    const sortedDesc = [...dates].sort((a, b) => b.localeCompare(a))
    expect(dates).toEqual(sortedDesc)
  })

  it('null member returns null', async () => {
    expect(await fetchParliamentMemberSpeechesMock('nope')).toBeNull()
  })

  it('session=comun narrows to the joint sittings', async () => {
    const filter = buildMemberSpeechesFilter({ session: 'comun' }, 'camera')
    const res = await fetchParliamentMemberSpeechesMock(MEMBER, undefined, filter)
    expect(res?.total).toBe(3)
    expect(res?.speeches.every((s) => s.chamber === 'comun')).toBe(true)
  })

  it('applies a date-range filter on spokenAt (date parts)', async () => {
    const filter = buildMemberSpeechesFilter({ from: '2026-01-01' }, 'camera')
    const res = await fetchParliamentMemberSpeechesMock(MEMBER, undefined, filter)
    expect(res?.speeches.every((s) => s.spokenAt >= '2026-01-01')).toBe(true)
    expect(res?.total).toBe(5)
  })

  it('applies free-text q over title + summary + transcript', async () => {
    const res = await fetchParliamentMemberSpeechesMock(
      MEMBER,
      undefined,
      undefined,
      'sănăt',
    )
    expect((res?.total ?? 0) > 0).toBe(true)
    expect(
      res?.speeches.every((s) =>
        [s.title, s.summary, s.fullText]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes('sănăt'),
      ),
    ).toBe(true)
  })

  it('a Camera member has only exact (CDEP/joint) sources — no lossy_root', async () => {
    const res = await fetchParliamentMemberSpeechesMock(MEMBER)
    expect(res?.speeches.every((s) => s.sourceUrlKind === 'exact')).toBe(true)
  })
})

describe('fetchParliamentMemberSpeechActivityMock', () => {
  it('aggregates turns per day for the year with proprie/comun split', async () => {
    const res = await fetchParliamentMemberSpeechActivityMock(MEMBER, 2026)
    expect(res?.availableYears).toEqual([2026, 2025])
    // 2026-05-13 has two own-chamber turns.
    const day = res?.days.find((d) => d.date === '2026-05-13')
    expect(day).toMatchObject({ total: 2, proprie: 2, comun: 0 })
    // A joint-sitting day is counted under comun.
    const comunDay = res?.days.find((d) => d.date === '2026-05-11')
    expect(comunDay).toMatchObject({ total: 1, proprie: 0, comun: 1 })
  })

  it('applies non-date filters (session=comun) to the aggregate', async () => {
    const filter = buildMemberSpeechesFilter({ session: 'comun' }, 'camera')
    const res = await fetchParliamentMemberSpeechActivityMock(MEMBER, 2026, filter)
    expect(res?.days.every((d) => d.comun === d.total && d.proprie === 0)).toBe(true)
  })

  it('returns an empty year when no turns fall in it', async () => {
    const res = await fetchParliamentMemberSpeechActivityMock(MEMBER, 2019)
    expect(res?.days).toEqual([])
  })
})
