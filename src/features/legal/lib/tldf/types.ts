/**
 * TLDF 1.0 — the client READ contract, ported from the scrapper compiler's
 * type mirror (authority: scrapper prod-db/TLDF_SCHEMA_SPEC.md; the server
 * carries the same port in its legal core). Kept dependency-free and exact:
 * spans are half-open [start, end) in UTF-16 code units — JavaScript's native
 * string indexing — so `text.slice(start, end)` is THE addressing operation.
 *
 * Pinned against the committed real artifacts in
 * src/features/legal/mocks/fixtures/tldf/ (byte-identical copies of the
 * scrapper fixtures; the same files feed the mock render lane).
 */

export type TldfSpan = readonly [number, number]

export type TldfRunRole = 'ttl' | 'den' | 'bdy'
export type TldfSep = '\n' | ' '

export interface TldfRun {
  readonly text: string
  readonly span: TldfSpan
  readonly role?: TldfRunRole
  readonly sep?: TldfSep
}

export interface TldfNumber {
  readonly key: string
  readonly system: string
}

export interface TldfBlock {
  /** DOM-path key or `unmarked:N`. Stable within one generation only. */
  readonly id: string
  readonly kind: string
  readonly type: string
  readonly source_element_id?: string
  readonly label?: string
  readonly number?: TldfNumber | null
  readonly span: TldfSpan
  readonly origin?: 'unmarked' | 'facsimil'
  readonly placement?: 'positional'
  /** v1.1: cell geometry, present only when it differs from (1,1). */
  readonly grid?: TldfGrid
  /** v1.1: image description. Never a locator — resolve by block id. */
  readonly asset?: TldfAsset
  readonly content: readonly TldfRun[]
  readonly children?: readonly TldfBlock[]
}

export interface TldfGrid {
  readonly cols: number
  readonly rows: number
}

export interface TldfAsset {
  readonly sha256?: string
  readonly width?: number
  readonly height?: number
  readonly alt?: string
}

/**
 * `italic` / `underline` / `bold` are emphasis carried as MARK EDGES over the
 * text, never as text of their own. Three kinds rather than one collapsed
 * `emphasis` because the distinction is semantic in this corpus: the drug-annex
 * profile uses bold to mark the active substance.
 */
export type TldfMarkKind =
  | 'reference'
  | 'legal_ref'
  | 'ref'
  | 'italic'
  | 'underline'
  | 'bold'
export type TldfLinkKind = 'act' | 'act_missing_id' | 'external' | 'internal'

export type TldfResolutionState =
  | 'held_fragment_resolved'
  | 'held'
  | 'fragment_conflict'
  | 'fragment_not_found'
  | 'unheld_consolidation'
  | 'unheld_other'

export interface TldfLink {
  readonly kind: TldfLinkKind
  readonly target_document_id?: string
  readonly target_act_id?: number
  readonly target_node_path?: string
  readonly target_fragment?: string
  readonly href?: string
  readonly resolution?: TldfResolutionState
}

export interface TldfMark {
  /** Stable occurrence key; equals the array index. */
  readonly ordinal: number
  readonly kind: TldfMarkKind
  /** DOCUMENT-level span over the folded clean text. */
  readonly span: TldfSpan
  readonly link?: TldfLink
}

export interface TldfGeneration {
  readonly run_id: number
  readonly body_sha256: string
  readonly structure_parser_version: string
  readonly content_parser_version: string
}

export interface TldfAccounting {
  readonly emitted_chars: number
  readonly separator_chars: number
  readonly empty_blocks_excluded?: number
  readonly excluded_by_reason: Readonly<Record<string, number>>
}

export interface TldfDefect {
  readonly code: string
  readonly count: number
  readonly detail?: string
  readonly first_owner_id?: string
}

interface TldfHead {
  readonly format: 'tldf'
  readonly format_version: '1.0' | '1.1'
  readonly document_id: string
  readonly generation: TldfGeneration
  readonly text_sha256: string
  readonly privacy_class: 'public' | 'restricted'
}

/** The single-row logical artifact (docs at or under the chunk threshold). */
export interface TldfEnvelope extends TldfHead {
  readonly compiler_version: string
  readonly offset_unit: 'utf16_code_unit'
  readonly contains_non_bmp: boolean
  readonly source_url: string
  readonly shape: 'standard_articles' | 'paragraph_stream' | 'facsimile'
  readonly accounting: TldfAccounting
  readonly defects?: readonly TldfDefect[]
  readonly marks: readonly TldfMark[]
  readonly blocks: readonly TldfBlock[]
}

export interface TldfChunkIndexEntry {
  readonly chunk_index: number
  readonly block_id: string
  readonly block_count: number
  readonly span: TldfSpan
}

/** Chunk 0 of a chunked document: envelope head + a chunk index, no blocks. */
export interface TldfManifestPayload extends Omit<TldfEnvelope, 'blocks'> {
  readonly physical: 'manifest'
  readonly chunks: readonly TldfChunkIndexEntry[]
}

/** Rows 1..N-1 of a chunked document: a group of top-level block subtrees. */
export interface TldfChunkPayload extends TldfHead {
  readonly physical: 'chunk'
  readonly blocks: readonly TldfBlock[]
}
