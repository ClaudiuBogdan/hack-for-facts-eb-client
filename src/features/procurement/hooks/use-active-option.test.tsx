import type { KeyboardEvent } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useActiveOption } from './use-active-option'

/** A key pressed in the field, as the hook reads it. */
function press(key: string) {
  const preventDefault = vi.fn()
  return { event: { key, preventDefault } as unknown as KeyboardEvent<HTMLInputElement>, preventDefault }
}

const THREE = ['judet:SB', 'localitate:143450', 'localitate:144928']
const activeOf = (result: { readonly current: ReturnType<typeof useActiveOption> }) => result.current.input(true)['aria-activedescendant']

describe('useActiveOption', () => {
  it('walks the options with the arrows, round from either end', () => {
    const { result } = renderHook(() => useActiveOption(THREE))
    expect(activeOf(result)).toBeUndefined()
    act(() => result.current.onKeyDown(press('ArrowDown').event, vi.fn()))
    expect(activeOf(result)).toBe(result.current.option(0).id)
    act(() => result.current.onKeyDown(press('ArrowUp').event, vi.fn()))
    expect(activeOf(result)).toBe(result.current.option(2).id)
    act(() => result.current.onKeyDown(press('ArrowDown').event, vi.fn()))
    expect(activeOf(result)).toBe(result.current.option(0).id)
    expect(result.current.option(0)['aria-selected']).toBe(true)
  })

  it('picks the active option on Enter, and leaves Enter to the form with none active', () => {
    const pick = vi.fn()
    const { result } = renderHook(() => useActiveOption(THREE))
    const idle = press('Enter')
    act(() => result.current.onKeyDown(idle.event, pick))
    expect(pick).not.toHaveBeenCalled()
    expect(idle.preventDefault).not.toHaveBeenCalled()
    act(() => result.current.onKeyDown(press('ArrowDown').event, pick))
    act(() => result.current.onKeyDown(press('ArrowDown').event, pick))
    const enter = press('Enter')
    act(() => result.current.onKeyDown(enter.event, pick))
    expect(pick).toHaveBeenCalledWith(1)
    expect(enter.preventDefault).toHaveBeenCalled()
  })

  it('leaves the text’s own keys alone: Space, Home, End', () => {
    const { result } = renderHook(() => useActiveOption(THREE))
    for (const key of [' ', 'Home', 'End']) {
      const keyPress = press(key)
      act(() => result.current.onKeyDown(keyPress.event, vi.fn()))
      expect(keyPress.preventDefault).not.toHaveBeenCalled()
    }
    expect(activeOf(result)).toBeUndefined()
  })

  it('keeps the highlight on its option when the list shifts under it, and drops it when the option goes', () => {
    const { result, rerender } = renderHook(({ options }) => useActiveOption(options), { initialProps: { options: THREE.slice(1) } })
    act(() => result.current.onKeyDown(press('ArrowDown').event, vi.fn()))
    expect(activeOf(result)).toBe(result.current.option(0).id)
    // A late read adds the county above: the municipality is still the one highlighted, one row down.
    rerender({ options: THREE })
    expect(activeOf(result)).toBe(result.current.option(1).id)
    const pick = vi.fn()
    act(() => result.current.onKeyDown(press('Enter').event, pick))
    expect(pick).toHaveBeenCalledWith(1)
    rerender({ options: ['judet:CJ'] })
    expect(activeOf(result)).toBeUndefined()
  })

  it('says nothing is active while the list is closed, and forgets its option once it closes', () => {
    const { result, rerender } = renderHook(({ options }) => useActiveOption(options), { initialProps: { options: THREE } })
    act(() => result.current.onKeyDown(press('ArrowDown').event, vi.fn()))
    expect(result.current.input(false)['aria-activedescendant']).toBeUndefined()
    expect(result.current.input(false)['aria-controls']).toBe(result.current.listId)
    rerender({ options: [] })
    rerender({ options: THREE })
    expect(activeOf(result)).toBeUndefined()
  })

  it('keeps the options out of the Tab order: the field is the way in', () => {
    const { result } = renderHook(() => useActiveOption(THREE))
    expect(result.current.option(1).tabIndex).toBe(-1)
  })
})
