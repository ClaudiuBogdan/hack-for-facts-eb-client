import { describe, expect, it, vi } from 'vitest'

vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: Record<string, unknown>) => ({ options }) }))

const { Route } = await import('./map')
const options = (Route as unknown as { options: { headers: () => Record<string, string> } }).options

describe('the map page route', () => {
  it('is kept nowhere: private, never stored, not by a CDN either', () => {
    expect(options.headers()).toEqual({ 'Cache-Control': 'private, no-store', 'CDN-Cache-Control': 'no-store' })
  })

})
