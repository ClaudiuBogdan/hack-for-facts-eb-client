import { describe, expect, it } from 'vitest'
import { escapeHtml } from './html'

describe('escapeHtml', () => {
  it('turns markup in a name into text', () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
  })

  it('escapes both quotes, so a value cannot leave its attribute', () => {
    expect(escapeHtml(`a" onmouseover='x`)).toBe('a&quot; onmouseover=&#39;x')
  })

  it('escapes the ampersand once, before the entities it introduces', () => {
    expect(escapeHtml('R&D <1>')).toBe('R&amp;D &lt;1&gt;')
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('leaves plain text, diacritics included, as it is', () => {
    expect(escapeHtml('Primăria Municipiului Brașov')).toBe('Primăria Municipiului Brașov')
  })

  it('reads back as the original text once parsed as HTML', () => {
    const name = `Județul "Test" & <b>'Co'</b>`
    const element = document.createElement('div')
    element.innerHTML = `<span title="${escapeHtml(name)}">${escapeHtml(name)}</span>`
    const span = element.querySelector('span')

    expect(span?.textContent).toBe(name)
    expect(span?.getAttribute('title')).toBe(name)
    expect(element.querySelector('b')).toBeNull()
  })
})
