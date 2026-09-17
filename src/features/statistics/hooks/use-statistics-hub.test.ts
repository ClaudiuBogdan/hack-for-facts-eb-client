import { describe, expect, it } from 'vitest'
import { hubData } from '../test/hub-fixtures'
import { statisticsHubQueryOptions } from './use-statistics-hub'

describe('statisticsHubQueryOptions', () => {
  it('seeds a complete server read as data', () => {
    const options = statisticsHubQueryOptions(hubData())
    expect(options.initialData).toBeDefined()
    expect(options.placeholderData).toBeUndefined()
  })

  it('shows a partial server read as a placeholder so the browser reads again', () => {
    const partial = hubData({ counties: null, failures: ['counties'] })
    const options = statisticsHubQueryOptions(partial)
    expect(options.initialData).toBeUndefined()
    expect(options.placeholderData).toBe(partial)
  })

  it('treats a partial payload as stale at once and a complete one as fresh', () => {
    const options = statisticsHubQueryOptions()
    const resolve = options.staleTime as (query: { state: { data?: ReturnType<typeof hubData> } }) => number
    expect(resolve({ state: { data: hubData({ counties: null, failures: ['counties'] }) } })).toBe(0)
    expect(resolve({ state: { data: hubData() } })).toBeGreaterThan(0)
  })

  it('ignores a payload from another contract', () => {
    const options = statisticsHubQueryOptions({ ...hubData(), nativeContract: 'hub-v0' as 'hub-v1' })
    expect(options.initialData).toBeUndefined()
    expect(options.placeholderData).toBeUndefined()
  })
})
