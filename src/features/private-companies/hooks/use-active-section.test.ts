import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useActiveSection } from './use-active-section'

/** An observer whose callback the test drives: entries in, the hook's choice out. */
let report: (entries: readonly { target: { id: string }; isIntersecting: boolean }[]) => void = () => {}

class DrivenObserver {
  constructor(callback: (entries: unknown[]) => void) {
    report = (entries) => callback([...entries])
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}

function sections(...ids: string[]) {
  for (const id of ids) {
    const element = document.createElement('section')
    element.id = id
    document.body.append(element)
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
  document.body.replaceChildren()
})

describe('useActiveSection', () => {
  it('marks the first section on the line, and keeps one marked when a neighbour leaves on a reversed scroll', () => {
    vi.stubGlobal('IntersectionObserver', DrivenObserver)
    sections('afacerea', 'activitati', 'registru')
    const { result } = renderHook(() => useActiveSection(['afacerea', 'activitati', 'registru']))
    expect(result.current).toBeNull()
    act(() => report([{ target: { id: 'afacerea' }, isIntersecting: true }]))
    expect(result.current).toBe('afacerea')
    // The next band reaches the line while the first is still on it: the first stays current.
    act(() => report([{ target: { id: 'activitati' }, isIntersecting: true }]))
    expect(result.current).toBe('afacerea')
    // The scroll reverses: the lower band leaves; the upper one, still on the line, stays marked.
    act(() => report([{ target: { id: 'activitati' }, isIntersecting: false }]))
    expect(result.current).toBe('afacerea')
    // Scrolling on: the first leaves, the second is current.
    act(() => report([{ target: { id: 'activitati' }, isIntersecting: true }, { target: { id: 'afacerea' }, isIntersecting: false }]))
    expect(result.current).toBe('activitati')
  })
})
