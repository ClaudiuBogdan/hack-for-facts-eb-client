import { describe, expect, it } from 'vitest'
import {
  mapParliamentSpeech,
  mapParliamentSpeeches,
  mapParliamentSpeechActivity,
} from './parliament-speeches-mappers'
import type { RawParliamentSpeech } from './parliament-speeches-queries'

const rawNode: RawParliamentSpeech = {
  speechKey: 'cdep:abc',
  spokenAt: '2026-05-13',
  title: '  Dezbatere buget  ',
  summary: 'Rezumat.',
  chamber: 'camera_deputatilor',
  sourceUrl: 'https://www.cdep.ro/x',
  sourceUrlKind: 'exact',
  fullText: '  Text integral.\nAl doilea rând.  ',
  speakerName: 'Ion Popescu',
  member: {
    mandateKey: '2:2020:12',
    fullName: 'Ion Popescu',
    chamber: 'camera_deputatilor',
    groupName: 'Grupul X',
  },
}

describe('mapParliamentSpeech', () => {
  it('maps a full node (trims text fields, preserves transcript whitespace)', () => {
    const speech = mapParliamentSpeech(rawNode)
    expect(speech.title).toBe('Dezbatere buget')
    // fullText keeps internal whitespace (only null collapses).
    expect(speech.fullText).toBe('  Text integral.\nAl doilea rând.  ')
    expect(speech.speaker).toEqual({
      mandateKey: '2:2020:12',
      fullName: 'Ion Popescu',
      chamber: 'camera_deputatilor',
      groupName: 'Grupul X',
    })
  })

  it('collapses an unmatched speaker to null and keeps speakerName', () => {
    const speech = mapParliamentSpeech({
      ...rawNode,
      member: null,
      speakerName: 'Domnul Prim-Ministru',
    })
    expect(speech.speaker).toBeNull()
    expect(speech.speakerName).toBe('Domnul Prim-Ministru')
  })

  it('falls back to speakerName (then mandateKey) for a blank member name', () => {
    const speech = mapParliamentSpeech({
      ...rawNode,
      member: { ...rawNode.member!, fullName: '  ' },
    })
    expect(speech.speaker?.fullName).toBe('Ion Popescu')
    const anonymous = mapParliamentSpeech({
      ...rawNode,
      speakerName: null,
      member: { ...rawNode.member!, fullName: null },
    })
    expect(anonymous.speaker?.fullName).toBe('2:2020:12')
  })

  it('handles null date/title/fullText (the 80%-null-title reality)', () => {
    const speech = mapParliamentSpeech({
      ...rawNode,
      spokenAt: null,
      title: null,
      fullText: null,
    })
    expect(speech.spokenAt).toBe('')
    expect(speech.title).toBeUndefined()
    expect(speech.fullText).toBeUndefined()
  })
})

describe('mapParliamentSpeeches', () => {
  it('maps the connection incl. cap + depth metadata', () => {
    const list = mapParliamentSpeeches({
      total: 10000,
      totalEstimated: true,
      searchDepth: 'TITLE_SUMMARY',
      edges: [{ cursor: 'c1', node: rawNode }],
      pageInfo: { hasNextPage: true, endCursor: 'c1' },
    })
    expect(list.total).toBe(10000)
    expect(list.totalEstimated).toBe(true)
    expect(list.searchDepth).toBe('TITLE_SUMMARY')
    expect(list.speeches).toHaveLength(1)
    expect(list.endCursor).toBe('c1')
  })
})

describe('mapParliamentSpeechActivity', () => {
  it('maps days and the applied depth', () => {
    const activity = mapParliamentSpeechActivity({
      year: 2026,
      availableYears: [2026, 2025],
      searchDepth: null,
      days: [{ date: '2026-05-13', total: 3, proprie: 2, comun: 1 }],
    })
    expect(activity.days[0]).toEqual({
      date: '2026-05-13',
      total: 3,
      proprie: 2,
      comun: 1,
    })
    expect(activity.searchDepth).toBeNull()
  })
})
