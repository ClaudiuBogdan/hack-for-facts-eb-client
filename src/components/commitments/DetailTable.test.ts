import { describe, it, expect } from 'vitest'

import { initialDrillLevel } from './detail-table-utils'

describe('DetailTable helpers', () => {
  describe('initialDrillLevel', () => {
    it('starts at subchapter when parent code is at chapter depth', () => {
      expect(initialDrillLevel('20')).toBe('subchapter')
    })

    it('starts at paragraph when parent code is already at subchapter depth', () => {
      expect(initialDrillLevel('20.01')).toBe('paragraph')
    })

    it('starts at economic when parent code is already at paragraph depth', () => {
      expect(initialDrillLevel('51.01.03')).toBe('economic')
    })
  })
})

