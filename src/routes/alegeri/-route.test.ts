import { describe, expect, it } from 'vitest'
import { Route } from './route'

describe('/alegeri layout', () => {
  it('answers every elections page with a 404 while the area is off', () => {
    const beforeLoad = (Route as unknown as { readonly options: { readonly beforeLoad: () => void } }).options.beforeLoad
    expect(beforeLoad).toThrow(expect.objectContaining({ isNotFound: true }))
  })
})
