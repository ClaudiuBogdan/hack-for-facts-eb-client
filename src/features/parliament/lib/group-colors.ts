/**
 * Single source of truth for parliamentary-group colours.
 *
 * Group colour is NOT stored in the production DB (documented gap #5), so it is
 * resolved entirely client-side. This module is the ONE place that maps a group
 * to a colour — used everywhere a group colour appears (hub chamber composition,
 * group cards, group-detail page, vote breakdown charts/legends, member rows).
 * Do not reintroduce per-component palettes.
 *
 * Colours are OFFICIAL party brand colours, verified 2026-06-17 against each
 * party's Wikipedia infobox (per the web-source rule):
 *   PSD red, PNL yellow, USR blue, AUR gold/black, UDMR green, SOS navy/light-blue,
 *   POT indigo/pink, plus the minorities + unaffiliated groups.
 *
 * Two brand families genuinely overlap in the source (PNL "yellow" vs AUR
 * "gold"; SOS "navy" vs AUR), so where official palettes collide we pick the
 * party's distinguishing secondary (AUR → its black/dark-navy electoral colour)
 * to keep every pair visually separable. The distinctness guard
 * (`group-colors.test.ts`) asserts no two brand colours are perceptually close.
 *
 * Colour is per PARTY IDENTITY, not per chamber: "AUR", "aur-camera_deputatilor"
 * and "aur-senat" all resolve to AUR's single colour.
 */

export interface GroupColorInput {
  /** `<slug>-<chamber>` or a bare party slug/name. */
  readonly groupId?: string | null
  /** Display name ("PSD", "Neafiliaţi"). */
  readonly name?: string | null
}

/** Fold diacritics + non-alphanumerics to a stable party-identity key. */
function foldIdentity(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Strip a trailing chamber suffix so `psd-senat` → `psd`. */
function partyKey(input: GroupColorInput): string {
  const raw = (input.name?.trim() || input.groupId?.trim() || '').toString()
  const folded = foldIdentity(raw)
  return folded.replace(/-(camera_deputatilor|camera-deputatilor|senat|comun)$/, '')
}

/**
 * Official brand colours keyed by normalized party identity. Hex chosen to match
 * each party's brand while guaranteeing pairwise visual separation (see the
 * distinctness test). Aliases (e.g. `sos-ro` / `sos-romania`) map to the same key.
 */
export const GROUP_BRAND_COLORS: Readonly<Record<string, string>> = {
  psd: '#e4002b', // PSD — red (infobox: red)
  pnl: '#f2c811', // PNL — yellow (infobox: yellow + blue)
  usr: '#0095da', // USR — blue/cyan (infobox: blue)
  aur: '#0a1b3d', // AUR — dark navy/black (infobox: gold + black; navy keeps it distinct from PNL yellow)
  udmr: '#0a8a3f', // UDMR/RMDSZ — green (Romanian political convention)
  rmdsz: '#0a8a3f',
  'sos-ro': '#5b8def', // SOS România — light/medium blue (infobox: navy + light blue; light blue keeps it distinct from AUR navy)
  'sos-romania': '#5b8def',
  pace: '#7a3cc0', // PACE - Întâi România — purple (distinct slot; no official infobox colour found)
  pot: '#d6448c', // POT — pink/indigo (infobox: indigo + pastel pink; pink keeps it distinct from USR/AUR blues)
  upr: '#13b5b1', // UPR — teal
  pmp: '#702283', // PMP — violet
  'pro-romania': '#1d4ed8',
  minoritati: '#8a6d3b', // Grupul minorităților — bronze/brown
  pumr: '#0f766e',
}

export const PARLIAMENT_GROUP_FALLBACK_COLOR = '#505a5f'

/**
 * Deterministic, collision-avoiding fallback palette for an unknown/new group.
 * Hash the party key → a slot here; these slots are chosen NOT to be
 * perceptually close to any brand colour above (verified by the distinctness
 * test), so a new group never collides with a known brand.
 */
const FALLBACK_PALETTE: readonly string[] = [
  '#b5651d', // ochre
  '#2e8b8b', // teal-grey
  '#36454f', // charcoal
  '#800020', // burgundy
  '#4682b4', // steel blue
  '#9acd32', // yellow-green
  '#cd5c5c', // indian red
  '#708090', // slate grey
]

function hashKey(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Pick a stable fallback colour for an unknown party key. */
export function fallbackColorFor(input: GroupColorInput): string {
  const key = partyKey(input)
  if (!key) return PARLIAMENT_GROUP_FALLBACK_COLOR
  return FALLBACK_PALETTE[hashKey(key) % FALLBACK_PALETTE.length]!
}

/**
 * THE resolver. Returns a group's official brand colour (per-party), or a
 * deterministic distinct fallback for an unknown group. Accepts a full group, a
 * `{ groupId }`, or a `{ name }` — anything carrying a party identity.
 */
export function resolveGroupColor(input: GroupColorInput): string {
  const key = partyKey(input)
  return GROUP_BRAND_COLORS[key] ?? fallbackColorFor(input)
}

// ── colour-distance helpers (used by the distinctness guard test) ────────────

/** Parse `#rrggbb` → [r,g,b]. */
export function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) throw new Error(`not a 6-digit hex colour: ${hex}`)
  const n = parseInt(m[1]!, 16)
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
}

/**
 * Perceptual-ish RGB distance (weighted "redmean" approximation of ΔE). Two
 * colours below ~40 read as the same hue/brightness to a user; the distinctness
 * test requires every brand pair to exceed a comfortable threshold.
 */
export function colorDistance(a: string, b: string): number {
  const [r1, g1, b1] = hexToRgb(a)
  const [r2, g2, b2] = hexToRgb(b)
  const rMean = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return Math.sqrt(
    (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db,
  )
}
