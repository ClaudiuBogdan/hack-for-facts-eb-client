import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { BLANK_IMAGE_SRC, WIDE_SCREEN_ART_MEDIA } from '@/lib/wide-screen-art'
import { LegislationHeaderVisual } from './legislation-header-visual'

describe('LegislationHeaderVisual', () => {
  it('server-renders the art without a preload, behind a wide-screen source', () => {
    const html = renderToString(<LegislationHeaderVisual />)

    // React hoists an eager <img> into a head preload, which phones fetched
    // although the column is hidden below `xl`.
    expect(html).not.toContain('rel="preload"')
    expect(html).toContain(`<source media="${WIDE_SCREEN_ART_MEDIA}"`)
    expect(html).toContain(`src="${BLANK_IMAGE_SRC}"`)
    // Only one image ships: the effect's target waits for pointer intent.
    expect(html.match(/<img /g)).toHaveLength(1)
    expect(html).not.toContain('future-registered')
  })
})
