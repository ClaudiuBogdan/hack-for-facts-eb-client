/**
 * Zod boundary schemas for the TLDF render REST payloads
 * (`GET /api/v1/legal/documents/:documentId/render[/chunks/:chunkIndex]`).
 *
 * Every payload schema is annotated `z.ZodType<T>` against the hand-written
 * read contract in `./types.ts`, so the two cannot drift: a schema that stops
 * matching the interface is a type error here, not a runtime surprise in the
 * reader. Validation is DEEP — a malformed block or mark fails the parse
 * rather than reaching the renderer as a plausible-looking object.
 */

import { z } from 'zod'

import type {
  TldfAccounting,
  TldfBlock,
  TldfChunkIndexEntry,
  TldfChunkPayload,
  TldfDefect,
  TldfEnvelope,
  TldfGeneration,
  TldfLink,
  TldfManifestPayload,
  TldfMark,
  TldfNumber,
  TldfRun,
  TldfSpan,
} from './types'

const tldfSpanSchema: z.ZodType<TldfSpan> = z.tuple([z.number().int(), z.number().int()])

const tldfRunSchema: z.ZodType<TldfRun> = z.object({
  text: z.string(),
  span: tldfSpanSchema,
  role: z.enum(['ttl', 'den', 'bdy']).optional(),
  sep: z.enum(['\n', ' ']).optional(),
  struck: z.enum(['partial', 'full']).optional(),
})

const tldfNumberSchema: z.ZodType<TldfNumber> = z.object({
  key: z.string(),
  system: z.string(),
})

/** v1.1 cell geometry. Emitted only when it differs from (1,1). */
export const tldfGridSchema = z.object({
  cols: z.number().int().min(1).max(32767),
  rows: z.number().int().min(1).max(32767),
})

/**
 * v1.1 image description. Deliberately carries NO locator: an image is
 * addressed by its BLOCK ID and resolved by the server, so the reader's browser
 * never contacts the origin directly. `sha256` is content identity, not a
 * fetchable URL.
 */
export const tldfAssetSchema = z.object({
  sha256: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  alt: z.string().optional(),
})

export const tldfBlockSchema: z.ZodType<TldfBlock> = z.lazy(() =>
  z.object({
    id: z.string(),
    kind: z.string(),
    type: z.string(),
    source_element_id: z.string().optional(),
    label: z.string().optional(),
    number: tldfNumberSchema.nullable().optional(),
    span: tldfSpanSchema,
    origin: z.enum(['unmarked', 'facsimil']).optional(),
    placement: z.literal('positional').optional(),
    // v1.1. Added WITH the format_version union on purpose: a plain z.object
    // strips unknown keys instead of rejecting them, so widening the version
    // without these fields would silently drop every cell geometry and image
    // description while every check stayed green.
    grid: tldfGridSchema.optional(),
    asset: tldfAssetSchema.optional(),
    // v1.1 source-state (2026-08-26), same strip hazard as grid/asset: these
    // must land WITH the compiler that emits them or a plain z.object drops
    // every struck fact silently while every check stays green.
    struck: z.enum(['partial', 'full']).optional(),
    struck_repealed: z.literal(true).optional(),
    annotation_role: z.literal('amendment_note').optional(),
    changed_since_base_form: z.boolean().optional(),
    content: z.array(tldfRunSchema),
    children: z.array(tldfBlockSchema).optional(),
  }),
)

const tldfLinkSchema: z.ZodType<TldfLink> = z.object({
  kind: z.enum(['act', 'act_missing_id', 'external', 'internal']),
  target_document_id: z.string().optional(),
  target_act_id: z.number().int().optional(),
  target_node_path: z.string().optional(),
  target_fragment: z.string().optional(),
  href: z.string().optional(),
  resolution: z
    .enum([
      'held_fragment_resolved',
      'held',
      'fragment_conflict',
      'fragment_not_found',
      'unheld_consolidation',
      'unheld_other',
    ])
    .optional(),
})

const tldfMarkSchema: z.ZodType<TldfMark> = z.object({
  ordinal: z.number().int(),
  kind: z.enum([
    'reference',
    'legal_ref',
    'ref',
    'italic',
    'underline',
    'bold',
    'struck',
  ]),
  span: tldfSpanSchema,
  link: tldfLinkSchema.optional(),
})

const tldfGenerationSchema: z.ZodType<TldfGeneration> = z.object({
  run_id: z.number().int(),
  body_sha256: z.string(),
  structure_parser_version: z.string(),
  content_parser_version: z.string(),
})

const tldfAccountingSchema: z.ZodType<TldfAccounting> = z.object({
  emitted_chars: z.number().int(),
  separator_chars: z.number().int(),
  empty_blocks_excluded: z.number().int().optional(),
  excluded_by_reason: z.record(z.string(), z.number()),
})

const tldfDefectSchema: z.ZodType<TldfDefect> = z.object({
  code: z.string(),
  count: z.number().int(),
  detail: z.string().optional(),
  first_owner_id: z.string().optional(),
})

const tldfHeadShape = {
  format: z.literal('tldf'),
  format_version: z.union([z.literal('1.0'), z.literal('1.1')]),
  document_id: z.string(),
  generation: tldfGenerationSchema,
  text_sha256: z.string(),
  privacy_class: z.enum(['public', 'restricted']),
} as const

const tldfEnvelopeHeadShape = {
  ...tldfHeadShape,
  compiler_version: z.string(),
  offset_unit: z.literal('utf16_code_unit'),
  contains_non_bmp: z.boolean(),
  source_url: z.string(),
  shape: z.enum(['standard_articles', 'paragraph_stream', 'facsimile']),
  accounting: tldfAccountingSchema,
  defects: z.array(tldfDefectSchema).optional(),
  marks: z.array(tldfMarkSchema),
} as const

export const tldfEnvelopeSchema: z.ZodType<TldfEnvelope> = z.object({
  ...tldfEnvelopeHeadShape,
  blocks: z.array(tldfBlockSchema),
})

const tldfChunkIndexEntrySchema: z.ZodType<TldfChunkIndexEntry> = z.object({
  chunk_index: z.number().int(),
  block_id: z.string(),
  block_count: z.number().int(),
  span: tldfSpanSchema,
})

export const tldfManifestPayloadSchema: z.ZodType<TldfManifestPayload> = z.object({
  ...tldfEnvelopeHeadShape,
  physical: z.literal('manifest'),
  chunks: z.array(tldfChunkIndexEntrySchema),
})

export const tldfChunkPayloadSchema: z.ZodType<TldfChunkPayload> = z.object({
  ...tldfHeadShape,
  physical: z.literal('chunk'),
  blocks: z.array(tldfBlockSchema),
})

// ── the REST response envelopes ───────────────────────────────────────────────

const legalRenderMetaSchema = z.object({
  requestId: z.string(),
  /** Generation identity — the same values the server's ETag is built from. */
  runId: z.string(),
  textSha256: z.string(),
  compilerVersion: z.string(),
  compiledAt: z.string(),
})

const renderDataCommon = {
  documentId: z.string(),
  chunkIndex: z.number().int(),
  chunkCount: z.number().int(),
} as const

/**
 * `data.kind` names what `tldf` IS, and the union binds each kind to its
 * payload schema: an 'envelope' response carrying a manifest (or vice versa)
 * fails the parse instead of reaching the reader mislabeled.
 */
export const legalRenderResponseSchema = z.object({
  ok: z.literal(true),
  data: z.discriminatedUnion('kind', [
    z.object({ ...renderDataCommon, kind: z.literal('envelope'), tldf: tldfEnvelopeSchema }),
    z.object({ ...renderDataCommon, kind: z.literal('manifest'), tldf: tldfManifestPayloadSchema }),
    z.object({ ...renderDataCommon, kind: z.literal('chunk'), tldf: tldfChunkPayloadSchema }),
  ]),
  meta: legalRenderMetaSchema,
})
export type LegalRenderResponse = z.infer<typeof legalRenderResponseSchema>
export type LegalRenderData = LegalRenderResponse['data']

/** The module error envelope the render routes emit on 4xx/5xx. */
export const legalRenderErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  message: z.string(),
  renderStatus: z.string().optional(),
  detail: z.string().optional(),
})
export type LegalRenderErrorEnvelope = z.infer<typeof legalRenderErrorEnvelopeSchema>
