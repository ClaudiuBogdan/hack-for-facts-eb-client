import { describe, expect, it } from 'vitest'

import { expandRecordKinds } from './record-kind'

describe('expandRecordKinds', () => {
  it('returns undefined for an empty selection (no constraint)', () => {
    expect(expandRecordKinds([])).toBeUndefined()
  })

  it('maps purchases and frameworks to the server tokens', () => {
    expect(expandRecordKinds(['purchases'])).toEqual(['contract_award'])
    expect(expandRecordKinds(['frameworks'])).toEqual(['framework_agreement'])
  })

  it('selecting both options is the full population — omits the predicate', () => {
    expect(expandRecordKinds(['purchases', 'frameworks'])).toBeUndefined()
  })
})
