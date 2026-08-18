import { describe, expect, it } from 'vitest'

import { tldfBlockSchema } from './schemas'

/**
 * The v1.1 acceptance contract.
 *
 * The trap this file exists for: zod's plain `z.object` STRIPS unknown keys
 * rather than rejecting them. Widening `format_version` to accept '1.1' without
 * also declaring the new block fields would parse successfully, discard every
 * cell geometry and image description, and leave every check green — the
 * renderer would simply receive nothing. So the assertion that matters is not
 * "a v1.1 payload parses" but "the v1.1 fields SURVIVE parsing".
 */
describe('tldf v1.1 block acceptance', () => {
  const cell = {
    id: '0.1.2',
    kind: 'celula',
    type: 'CEL',
    span: [10, 20] as const,
    grid: { cols: 2, rows: 3 },
    content: [],
  }

  const image = {
    id: '0.1.3',
    kind: 'imagine',
    type: 'IMG',
    span: [20, 20] as const,
    asset: { sha256: 'a'.repeat(64), width: 640, height: 480, alt: 'Sigiliu' },
    content: [],
  }

  it('keeps cell geometry instead of stripping it', () => {
    const parsed = tldfBlockSchema.parse(cell)
    expect(parsed.grid).toEqual({ cols: 2, rows: 3 })
  })

  it('keeps the image description instead of stripping it', () => {
    const parsed = tldfBlockSchema.parse(image)
    expect(parsed.asset).toEqual({
      sha256: 'a'.repeat(64),
      width: 640,
      height: 480,
      alt: 'Sigiliu',
    })
  })

  it('never accepts a locator on an asset', () => {
    // The served envelope must not carry a portal URL: an image is addressed by
    // its block id and resolved by the server, so a reader's browser never
    // reaches the origin. If a payload ever carries `src`, zod strips it — this
    // pins that it does NOT survive into anything the renderer could use.
    const parsed = tldfBlockSchema.parse({
      ...image,
      asset: { ...image.asset, src: '../../../ImaginiDinActe/1_A1.jpg' },
    })
    expect(parsed.asset).not.toHaveProperty('src')
  })

  it('still accepts a v1.0 block that carries neither field', () => {
    const parsed = tldfBlockSchema.parse({
      id: '0.1',
      kind: 'articol',
      type: 'ART',
      span: [0, 5] as const,
      content: [],
    })
    expect(parsed.grid).toBeUndefined()
    expect(parsed.asset).toBeUndefined()
  })
})
