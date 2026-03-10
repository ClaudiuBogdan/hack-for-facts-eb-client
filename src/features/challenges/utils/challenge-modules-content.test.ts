import { describe, expect, it } from 'vitest'
import { getChallengeModules } from './modules'

describe('challenge module content', () => {
  it('places the new budget basics module first for /buget', () => {
    const modules = getChallengeModules()

    expect(modules[0]?.slug).toBe('budget-basics')
    expect(modules.some((module) => module.slug === 'explore-budgets')).toBe(true)
  })
})
