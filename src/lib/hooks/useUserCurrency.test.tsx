import { render, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { USER_CURRENCY_STORAGE_KEY } from '@/lib/user-preferences'
import { useUserCurrency } from './useUserCurrency'

describe('useUserCurrency', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('reads the persisted client value synchronously without SSR input', () => {
    window.localStorage.setItem(USER_CURRENCY_STORAGE_KEY, JSON.stringify('USD'))

    const { result } = renderHook(() => useUserCurrency())

    expect(result.current[0]).toBe('USD')
  })

  it('uses the SSR currency for hydration before reconciling client storage', async () => {
    window.localStorage.setItem(USER_CURRENCY_STORAGE_KEY, JSON.stringify('EUR'))
    const renderedCurrencies: string[] = []

    function Probe() {
      const [currency] = useUserCurrency('RON')
      renderedCurrencies.push(currency)
      return null
    }

    render(<Probe />)

    await waitFor(() => {
      expect(renderedCurrencies).toContain('EUR')
    })
    expect(renderedCurrencies[0]).toBe('RON')
    expect(window.localStorage.getItem(USER_CURRENCY_STORAGE_KEY)).toBe('"EUR"')
  })
})
