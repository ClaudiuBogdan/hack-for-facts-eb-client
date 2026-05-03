import { render, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { USER_INFLATION_ADJUSTED_STORAGE_KEY } from '@/lib/user-preferences'
import { useUserInflationAdjusted } from './useUserInflationAdjusted'

describe('useUserInflationAdjusted', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.cookie = `${USER_INFLATION_ADJUSTED_STORAGE_KEY}=; Max-Age=0; Path=/`
  })

  it('reads the persisted client value synchronously without SSR input', () => {
    window.localStorage.setItem(
      USER_INFLATION_ADJUSTED_STORAGE_KEY,
      JSON.stringify(true),
    )

    const { result } = renderHook(() => useUserInflationAdjusted())

    expect(result.current[0]).toBe(true)
  })

  it('reads the cookie-only client value synchronously without SSR input', () => {
    document.cookie = `${USER_INFLATION_ADJUSTED_STORAGE_KEY}=true; Path=/`

    const { result } = renderHook(() => useUserInflationAdjusted())

    expect(result.current[0]).toBe(true)
  })

  it('uses the SSR inflation setting for hydration before reconciling client storage', async () => {
    window.localStorage.setItem(
      USER_INFLATION_ADJUSTED_STORAGE_KEY,
      JSON.stringify(true),
    )
    const renderedInflationSettings: boolean[] = []

    function Probe() {
      const [inflationAdjusted] = useUserInflationAdjusted(false)
      renderedInflationSettings.push(inflationAdjusted)
      return null
    }

    render(<Probe />)

    await waitFor(() => {
      expect(renderedInflationSettings).toContain(true)
    })
    expect(renderedInflationSettings[0]).toBe(false)
    expect(window.localStorage.getItem(USER_INFLATION_ADJUSTED_STORAGE_KEY)).toBe(
      'true',
    )
  })
})
