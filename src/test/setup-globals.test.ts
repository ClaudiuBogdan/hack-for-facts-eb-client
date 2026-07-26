import { describe, expect, it } from 'vitest'

/**
 * The global `IntersectionObserver` stub in `setup.ts` must be constructible.
 *
 * It used to be a `vi.fn()` with a `mockReturnValue`, which vitest 4 refuses
 * when the mock is called with `new` — so every component that actually
 * observes something (the stenogram intervention rail, the PNRR overview)
 * threw inside its effect instead of being exercised. A mock wrapped around a
 * class does not help either: the instance it hands back carries none of the
 * prototype methods. Hence a plain class, and hence this guard.
 */
describe('the global IntersectionObserver stub', () => {
  it('can be constructed and observed through, like the real thing', () => {
    const observer = new IntersectionObserver(() => {})
    expect(() => {
      observer.observe(document.createElement('div'))
      observer.unobserve(document.createElement('div'))
      observer.disconnect()
    }).not.toThrow()
  })
})
