import { describe, expect, it } from 'vitest'

import { tldfBlockSchema, tldfEnvelopeSchema } from './schemas'

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

  it('keeps the source-state facts instead of stripping them (2026-08-26)', () => {
    // Same trap, same proof style: the struck fields must SURVIVE parsing,
    // not merely parse — a strip here would silently serve repealed text
    // with no strike and no legal state, all checks green.
    const parsed = tldfBlockSchema.parse({
      id: '0.2.1',
      kind: 'paragraf',
      type: 'PAR',
      span: [30, 60] as const,
      struck: 'full',
      struck_repealed: true,
      annotation_role: 'amendment_note',
      changed_since_base_form: false,
      content: [
        {
          text: 'Text abrogat.',
          span: [30, 43] as const,
          role: 'ttl',
          struck: 'full',
        },
      ],
    })
    expect(parsed.struck).toBe('full')
    expect(parsed.struck_repealed).toBe(true)
    expect(parsed.annotation_role).toBe('amendment_note')
    // false is a REAL value ("proven unchanged"), distinct from omitted.
    expect(parsed.changed_since_base_form).toBe(false)
    expect(parsed.content[0]?.struck).toBe('full')
  })

  it('rejects a struck scope outside the vocabulary', () => {
    expect(() =>
      tldfBlockSchema.parse({
        id: '0.2.2',
        kind: 'paragraf',
        type: 'PAR',
        span: [0, 1] as const,
        struck: 'struck',
        content: [],
      }),
    ).toThrow()
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

describe('tldf emphasis mark acceptance', () => {
  const envelope = (kind: string) => ({
    format: 'tldf',
    format_version: '1.1',
    compiler_version: 'tldf-compiler-v4',
    document_id: '1',
    generation: {
      run_id: 1,
      body_sha256: 'a'.repeat(64),
      structure_parser_version: 'portal-tree-v5',
      content_parser_version: 'portal-text-v8',
    },
    text_sha256: 'b'.repeat(64),
    offset_unit: 'utf16_code_unit',
    contains_non_bmp: false,
    privacy_class: 'public',
    source_url: 'https://legislatie.just.ro/Public/DetaliiDocument/1',
    shape: 'standard_articles',
    accounting: { emitted_chars: 4, separator_chars: 0, excluded_by_reason: {} },
    marks: [{ ordinal: 0, kind, span: [0, 4] }],
    blocks: [
      {
        id: '0.0',
        kind: 'paragraf',
        type: 'PAR',
        span: [0, 4],
        content: [{ text: 'text', span: [0, 4] }],
      },
    ],
  })

  // The reader must accept emphasis BEFORE the parser emits it; deploy order is
  // client, then server, then the first write. Shipping the write first would
  // serve marks no reader can parse.
  it.each(['italic', 'underline', 'bold'])('accepts a %s mark', (kind) => {
    const parsed = tldfEnvelopeSchema.parse(envelope(kind))
    expect(parsed.marks[0]?.kind).toBe(kind)
  })

  it('still accepts the three reference kinds', () => {
    for (const kind of ['reference', 'legal_ref', 'ref']) {
      expect(tldfEnvelopeSchema.parse(envelope(kind)).marks[0]?.kind).toBe(kind)
    }
  })

  it('rejects a kind outside the closed set', () => {
    expect(() => tldfEnvelopeSchema.parse(envelope('blink'))).toThrow()
  })
})
