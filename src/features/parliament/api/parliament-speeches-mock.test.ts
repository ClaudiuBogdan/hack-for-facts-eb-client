import { describe, expect, it } from 'vitest'
import { ParliamentSpeechesListSchema } from '@/schemas/parliament'
import {
  fetchParliamentSpeechActivityMock,
  fetchParliamentSpeechDetailMock,
  fetchParliamentSpeechesMock,
} from './parliament-speeches-api.mock'

/**
 * Global stenograme mock checks. The generator gives a fixed 20-speaker ×
 * 9-template turn set (5 turns in 2026, 4 in 2025 per speaker). The needle
 * "dezvoltării regionale" exists ONLY in one template's fullText (its summary
 * is the bare "Domnul vorbitor:"), which makes the hybrid-depth rule
 * observable: it matches at FULL_TEXT depth and vanishes at TITLE_SUMMARY.
 */
const FULLTEXT_ONLY_NEEDLE = 'dezvoltării regionale'

describe('fetchParliamentSpeechesMock', () => {
  it('returns schema-valid pages, keyset-ordered spokenAt desc, cursor-paged', async () => {
    const page1 = await fetchParliamentSpeechesMock()
    expect(() => ParliamentSpeechesListSchema.parse(page1)).not.toThrow()
    expect(page1.total).toBe(180)
    expect(page1.totalEstimated).toBe(false)
    expect(page1.searchDepth).toBeNull()
    expect(page1.speeches).toHaveLength(20)
    const dates = page1.speeches.map((s) => s.spokenAt)
    expect(dates).toEqual([...dates].sort((a, b) => b.localeCompare(a)))
    expect(page1.hasNextPage).toBe(true)

    const page2 = await fetchParliamentSpeechesMock(page1.endCursor ?? undefined)
    const keys1 = new Set(page1.speeches.map((s) => s.speechKey))
    expect(page2.speeches.every((s) => !keys1.has(s.speechKey))).toBe(true)
  })

  it('every turn carries a speaker (mock roster is fully matched)', async () => {
    const page = await fetchParliamentSpeechesMock()
    expect(
      page.speeches.every(
        (s) => s.speaker !== null && s.speaker !== undefined && s.speakerName,
      ),
    ).toBe(true)
  })

  it('filters by chamber token and by mandateKey', async () => {
    const comun = await fetchParliamentSpeechesMock(undefined, {
      chamber: { eq: 'comun' },
    })
    expect(comun.total).toBe(60) // 3 joint-sitting templates × 20 speakers
    expect(comun.speeches.every((s) => s.chamber === 'comun')).toBe(true)

    const first = (await fetchParliamentSpeechesMock()).speeches[0]
    const mandateKey = first?.speaker?.mandateKey ?? ''
    const bySpeaker = await fetchParliamentSpeechesMock(undefined, {
      mandateKey: { eq: mandateKey },
    })
    expect(bySpeaker.total).toBe(9)
    expect(
      bySpeaker.speeches.every((s) => s.speaker?.mandateKey === mandateKey),
    ).toBe(true)
  })

  it('applies the spokenAt window on date parts', async () => {
    const res = await fetchParliamentSpeechesMock(undefined, {
      spokenAt: { gte: '2026-01-01', lte: '2026-12-31' },
    })
    expect(res.total).toBe(100) // 5 2026-templates × 20 speakers
    expect(
      res.speeches.every((s) => s.spokenAt >= '2026-01-01'),
    ).toBe(true)
  })

  it('q at TITLE_SUMMARY depth (wide window) does NOT search transcripts', async () => {
    const res = await fetchParliamentSpeechesMock(
      undefined,
      { spokenAt: { gte: '2025-01-01', lte: '2025-12-31' } }, // 365d > 92
      FULLTEXT_ONLY_NEEDLE,
    )
    expect(res.searchDepth).toBe('TITLE_SUMMARY')
    expect(res.total).toBe(0)
  })

  it('q at FULL_TEXT depth (window ≤ 92 days) searches transcripts', async () => {
    const res = await fetchParliamentSpeechesMock(
      undefined,
      { spokenAt: { gte: '2025-06-01', lte: '2025-06-30' } },
      FULLTEXT_ONLY_NEEDLE,
    )
    expect(res.searchDepth).toBe('FULL_TEXT')
    expect(res.total).toBe(20) // one matching turn per speaker
  })

  it('a mandateKey bound also unlocks FULL_TEXT depth', async () => {
    const first = (await fetchParliamentSpeechesMock()).speeches[0]
    const mandateKey = first?.speaker?.mandateKey ?? ''
    const res = await fetchParliamentSpeechesMock(
      undefined,
      { mandateKey: { eq: mandateKey } },
      FULLTEXT_ONLY_NEEDLE,
    )
    expect(res.searchDepth).toBe('FULL_TEXT')
    expect(res.total).toBe(1)
  })
})

describe('fetchParliamentSpeechActivityMock', () => {
  it('aggregates per day with proprie + comun = total; availableYears is year-independent', async () => {
    const activity = await fetchParliamentSpeechActivityMock(2026)
    expect(activity.year).toBe(2026)
    expect(activity.availableYears).toEqual([2026, 2025])
    expect(activity.searchDepth).toBeNull()
    expect(activity.days.length).toBeGreaterThan(0)
    for (const day of activity.days) {
      expect(day.proprie + day.comun).toBe(day.total)
      expect(day.date.startsWith('2026-')).toBe(true)
    }
  })

  it('strips an incoming date filter (the year argument bounds the range)', async () => {
    const withDates = await fetchParliamentSpeechActivityMock(2026, {
      spokenAt: { gte: '2026-05-01', lte: '2026-05-31' },
    })
    const bare = await fetchParliamentSpeechActivityMock(2026)
    expect(withDates.days).toEqual(bare.days)
  })
})

describe('fetchParliamentSpeechDetailMock', () => {
  it('resolves a listed key and misses an unknown one', async () => {
    const first = (await fetchParliamentSpeechesMock()).speeches[0]
    const detail = await fetchParliamentSpeechDetailMock(first?.speechKey ?? '')
    expect(detail?.speechKey).toBe(first?.speechKey)
    expect(await fetchParliamentSpeechDetailMock('nope:sp:99')).toBeNull()
  })
})
