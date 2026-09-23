import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => options,
}))

describe('/ins/comparatii head', () => {
  it('names the page for the tab and for a shared link’s card, never with the site’s English defaults', async () => {
    const { Route } = await import('./index')
    const { meta } = (Route as unknown as { head: () => { readonly meta: ReadonlyArray<Record<string, unknown>> } }).head()
    const title = 'Compară teritorii · Statistici INS — Transparenta.eu'
    expect(meta).toContainEqual({ title })
    expect(meta).toContainEqual({ property: 'og:title', content: title })
    expect(meta).toContainEqual({ name: 'twitter:title', content: title })
    expect(String(meta.find((tag) => tag.property === 'og:description')?.content)).toContain('șase locuri')
  })
})
