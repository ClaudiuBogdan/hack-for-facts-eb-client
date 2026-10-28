import { render, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { usePersistedState } from './usePersistedState'

describe('usePersistedState', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reads the stored value on the first render by default', () => {
    window.localStorage.setItem('prefs', JSON.stringify('compact'))

    const { result } = renderHook(() => usePersistedState('prefs', 'comfortable'))

    expect(result.current[0]).toBe('compact')
  })

  it('renders the default first and the stored value after mount, without overwriting it', async () => {
    window.localStorage.setItem('prefs', JSON.stringify('compact'))
    const rendered: string[] = []

    function Probe() {
      const [value] = usePersistedState('prefs', 'comfortable', { readStoredValueAfterMount: true })
      rendered.push(value)
      return null
    }

    render(<Probe />)

    await waitFor(() => {
      expect(rendered).toContain('compact')
    })
    expect(rendered[0]).toBe('comfortable')
    expect(window.localStorage.getItem('prefs')).toBe('"compact"')
  })

  it('stores nothing until the value changes when nothing was stored', () => {
    const { result } = renderHook(() => usePersistedState('prefs', 'comfortable', { readStoredValueAfterMount: true }))

    expect(result.current[0]).toBe('comfortable')
    expect(window.localStorage.getItem('prefs')).toBeNull()
  })
})
