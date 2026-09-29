import { describe, expect, it } from 'vitest'
import { serializeForInlineScript } from './inline-script-json'

describe('serializeForInlineScript', () => {
  it('cannot close the script it is written into', () => {
    const name = '</script><script>alert(1)</script><!--'
    const serialized = serializeForInlineScript({ name })

    expect(serialized).not.toContain('<')
    expect(JSON.parse(serialized)).toEqual({ name })
  })

  it('escapes the line separators a pre-ES2019 parser reads as line ends', () => {
    const text = 'a\u2028b\u2029c'
    const serialized = serializeForInlineScript({ text })

    expect(serialized).not.toMatch(/[\u2028\u2029]/)
    expect(serialized).toContain('\\u2028')
    expect(JSON.parse(serialized)).toEqual({ text })
  })

  it('leaves everything else as JSON.stringify writes it', () => {
    const node = { '@type': 'Dataset', name: 'Bugetul „2026" & anexe > 1', count: 3, tags: ['a', 'b'] }

    expect(serializeForInlineScript(node)).toBe(JSON.stringify(node))
  })
})
