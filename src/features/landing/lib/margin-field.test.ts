import { afterEach, describe, expect, it, vi } from 'vitest'
import { MARGIN_FIELD_MIN_WIDTH_PX, MARGIN_FIELD_QUERY, marginFieldQuery } from './margin-field'

describe('the margin field breakpoint', () => {
  const original = window.matchMedia
  afterEach(() => {
    window.matchMedia = original
  })

  it('asks for the width the field starts at', () => {
    expect(MARGIN_FIELD_QUERY).toBe(`(min-width: ${MARGIN_FIELD_MIN_WIDTH_PX}px)`)
  })

  it.each([true, false])('answers through the media query (%s), without measuring anything', (matches) => {
    const matchMedia = vi.fn((query: string) => ({ matches, media: query }) as MediaQueryList)
    window.matchMedia = matchMedia
    expect(marginFieldQuery().matches).toBe(matches)
    expect(matchMedia).toHaveBeenCalledWith(MARGIN_FIELD_QUERY)
  })
})
