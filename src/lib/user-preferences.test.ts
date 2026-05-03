import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  readClientCurrencyPreference,
  readClientInflationAdjustedPreference,
  USER_CURRENCY_STORAGE_KEY,
  USER_INFLATION_ADJUSTED_STORAGE_KEY,
} from './user-preferences'

const originalLocalStorage = window.localStorage

describe('user preference readers', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    })
    window.localStorage.clear()
    document.cookie = `${USER_CURRENCY_STORAGE_KEY}=; Max-Age=0; Path=/`
    document.cookie = `${USER_INFLATION_ADJUSTED_STORAGE_KEY}=; Max-Age=0; Path=/`
  })

  afterEach(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    })
  })

  it('falls back to the currency cookie when localStorage is unavailable', () => {
    document.cookie = `${USER_CURRENCY_STORAGE_KEY}=EUR; Path=/`
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('localStorage blocked')
        },
      },
    })

    expect(readClientCurrencyPreference()).toBe('EUR')
  })

  it('falls back to the inflation cookie when localStorage is unavailable', () => {
    document.cookie = `${USER_INFLATION_ADJUSTED_STORAGE_KEY}=true; Path=/`
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error('localStorage blocked')
        },
      },
    })

    expect(readClientInflationAdjustedPreference()).toBe(true)
  })
})
