import { describe, expect, it } from 'vitest'
import { Route } from './route'

describe('/alegeri layout', () => {
  it('lets the elections pages through the area’s gate while the area is on', () => {
    const beforeLoad = (Route as unknown as { readonly options: { readonly beforeLoad: () => void } }).options.beforeLoad
    expect(beforeLoad).not.toThrow()
  })
})
