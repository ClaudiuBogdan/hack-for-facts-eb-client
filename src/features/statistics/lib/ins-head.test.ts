import { describe, expect, it } from 'vitest'
import { insPageMeta } from './ins-head'

describe('insPageMeta', () => {
  it('names the page for the tab and for a shared link’s card alike', () => {
    expect(insPageMeta({ title: 'Seturi de date INS — Transparenta.eu', description: 'Catalogul INS Tempo.' })).toEqual([
      { title: 'Seturi de date INS — Transparenta.eu' },
      { property: 'og:title', content: 'Seturi de date INS — Transparenta.eu' },
      { name: 'twitter:title', content: 'Seturi de date INS — Transparenta.eu' },
      { name: 'description', content: 'Catalogul INS Tempo.' },
      { property: 'og:description', content: 'Catalogul INS Tempo.' },
      { name: 'twitter:description', content: 'Catalogul INS Tempo.' },
    ])
  })

  it('leaves the description to the site when the page has none of its own yet', () => {
    expect(insPageMeta({ title: 'Set de date INS — Transparenta.eu' })).toEqual([
      { title: 'Set de date INS — Transparenta.eu' },
      { property: 'og:title', content: 'Set de date INS — Transparenta.eu' },
      { name: 'twitter:title', content: 'Set de date INS — Transparenta.eu' },
    ])
  })
})
