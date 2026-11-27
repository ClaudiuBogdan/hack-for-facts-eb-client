import { describe, expect, it } from 'vitest'
import { fetchLegalActsPageMock } from './legal-acts-api.mock'

describe('fetchLegalActsPageMock', () => {
  it('lists no act under a summary filter: the fixture rows carry no summary (Codex review, round 1)', async () => {
    for (const filter of [{ domain: ['sanatate'] }, { category: ['tratat'] }, { penaltiesMentioned: true }]) {
      expect((await fetchLegalActsPageMock(filter)).items).toEqual([])
    }
    expect((await fetchLegalActsPageMock({})).items.length).toBeGreaterThan(0)
  })
})
