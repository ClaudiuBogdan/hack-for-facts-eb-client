import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { CookieState } from '@/features/privacy/lib/consent-categories'
import { CookieIllustration } from './cookie-illustration'

const renderCookie = (state: CookieState) =>
  renderToStaticMarkup(createElement(CookieIllustration, { state }))

describe('cookie illustration', () => {
  it.each(['whole', 'bitten', 'plain'] as const)('server-renders the %s state with accessible artwork', (state) => {
    const html = renderCookie(state)
    const container = document.createElement('div')
    container.innerHTML = html
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('data-cookie')).toBe(state)
    expect(svg?.getAttribute('role')).toBe('img')
    expect(svg?.getAttribute('aria-label')).toBeTruthy()
    expect(container.querySelectorAll('path').length).toBeGreaterThan(0)
  })

  it('keeps mask references unique when several illustrations share a page', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToStaticMarkup(createElement('div', {},
      createElement(CookieIllustration, { state: 'whole' }),
      createElement(CookieIllustration, { state: 'bitten' }),
    ))
    const ids = [...container.querySelectorAll('[id]')].map((element) => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const svg of container.querySelectorAll('svg')) {
      for (const element of svg.querySelectorAll('[mask], [fill^="url"]')) {
        const reference = element.getAttribute('mask') ?? element.getAttribute('fill')
        const id = reference?.slice(5, -1)
        expect([...svg.querySelectorAll('[id]')].some((definition) => definition.id === id)).toBe(true)
      }
    }
  })
})
