import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { lazySchema } from './route-contract'

const build = () =>
  z.object({
    page: z.number().int().min(1).optional().catch(undefined),
    q: z.string().min(1),
  })

describe('lazySchema', () => {
  it('builds nothing until it is used, then builds once', () => {
    const factory = vi.fn(build)
    const schema = lazySchema(factory)
    expect(factory).not.toHaveBeenCalled()

    schema['~standard'].validate({ q: 'a' })
    schema.parse({ q: 'b' })
    schema.safeParse({ q: 'c' })
    schema.schema()
    expect(factory).toHaveBeenCalledTimes(1)
  })

  it('validates through ~standard exactly as the schema itself does', () => {
    const lazy = lazySchema(build)
    const eager = build()
    for (const input of [{ q: 'x', page: 2 }, { q: 'x', page: 0 }, { q: '' }, {}, { q: 1 }]) {
      expect(lazy['~standard'].validate(input)).toEqual(eager['~standard'].validate(input))
      expect(lazy.safeParse(input)).toEqual(eager.safeParse(input))
    }
  })

  it('throws the schema’s own error from parse', () => {
    expect(() => lazySchema(build).parse({ q: '' })).toThrow(z.ZodError)
  })

  it('looks like a Standard Schema to the router', () => {
    const standard = lazySchema(build)['~standard']
    expect(standard.version).toBe(1)
    expect(standard.vendor).toBe('zod')
    expect(typeof standard.validate).toBe('function')
  })
})
