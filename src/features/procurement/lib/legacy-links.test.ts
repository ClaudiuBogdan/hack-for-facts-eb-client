import { describe, expect, it } from 'vitest'
import { procurementHubSearchSchema } from '@/schemas/procurement-hub'
import { EXPLORER_SEARCH_KEYS } from './legacy-links'

describe('the explorer keys', () => {
  it('are the explorer schema’s keys, in its order', () => {
    expect([...EXPLORER_SEARCH_KEYS]).toEqual(Object.keys(procurementHubSearchSchema.shape))
  })
})
