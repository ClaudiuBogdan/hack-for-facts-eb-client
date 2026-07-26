import { describe, expect, it } from 'vitest'
import type { ParliamentMemberSpeech } from '@/schemas/parliament'
import { groupMemberSpeechesBySitting } from './member-speeches-grouping'

function speech(
  overrides: Partial<ParliamentMemberSpeech> & { speechKey: string },
): ParliamentMemberSpeech {
  return {
    spokenAt: '2026-05-13',
    chamber: 'camera_deputatilor',
    isCanonical: false,
    ...overrides,
  }
}

describe('groupMemberSpeechesBySitting', () => {
  it('groups canonical turns under their PROVEN sitting', () => {
    const groups = groupMemberSpeechesBySitting([
      speech({ speechKey: 'a', isCanonical: true, sessionKey: 'canon:s1' }),
      speech({ speechKey: 'b', isCanonical: true, sessionKey: 'canon:s1' }),
      speech({
        speechKey: 'c',
        isCanonical: true,
        sessionKey: 'canon:s2',
        spokenAt: '2026-05-11',
      }),
    ])

    expect(groups).toHaveLength(2)
    expect(groups[0]?.sessionKey).toBe('canon:s1')
    expect(groups[0]?.speeches.map((s) => s.speechKey)).toEqual(['a', 'b'])
    expect(groups[1]?.sessionKey).toBe('canon:s2')
  })

  it('groups LEGACY turns by date + chamber but offers NO sitting link', () => {
    // Same day, same chamber is almost always the same sitting — but "almost
    // always" is not a link, so the bucket carries no sessionKey.
    const groups = groupMemberSpeechesBySitting([
      speech({ speechKey: 'a' }),
      speech({ speechKey: 'b' }),
    ])

    expect(groups).toHaveLength(1)
    expect(groups[0]?.sessionKey).toBeUndefined()
    expect(groups[0]?.speeches).toHaveLength(2)
  })

  it('never treats a sessionKey on a NON-canonical row as proven', () => {
    // A half-mapped row would otherwise mint a link into a sitting that cannot
    // highlight anything.
    const groups = groupMemberSpeechesBySitting([
      speech({ speechKey: 'a', isCanonical: false, sessionKey: 'canon:s1' }),
    ])
    expect(groups[0]?.sessionKey).toBeUndefined()
  })

  it('separates the same day across different chambers', () => {
    const groups = groupMemberSpeechesBySitting([
      speech({ speechKey: 'a', chamber: 'camera_deputatilor' }),
      speech({ speechKey: 'b', chamber: 'comun' }),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.map((g) => g.chamber)).toEqual(['camera_deputatilor', 'comun'])
  })

  it('preserves the incoming (newest-first) order of groups', () => {
    const groups = groupMemberSpeechesBySitting([
      speech({ speechKey: 'a', spokenAt: '2026-05-13' }),
      speech({ speechKey: 'b', spokenAt: '2026-01-02' }),
      speech({ speechKey: 'c', spokenAt: '2026-05-13' }),
    ])
    expect(groups.map((g) => g.spokenAt)).toEqual(['2026-05-13', '2026-01-02'])
    // Out-of-order duplicates still land in their original bucket.
    expect(groups[0]?.speeches.map((s) => s.speechKey)).toEqual(['a', 'c'])
  })

  it('handles a dateless row without crashing or inventing a date', () => {
    const groups = groupMemberSpeechesBySitting([
      speech({ speechKey: 'a', spokenAt: '' }),
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0]?.spokenAt).toBe('')
  })

  it('returns nothing for an empty list', () => {
    expect(groupMemberSpeechesBySitting([])).toEqual([])
  })
})
