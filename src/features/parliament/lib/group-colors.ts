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

import { foldSlug } from './text-fold'

export interface GroupColorInput {
  /** `<slug>-<chamber>` or a bare party slug/name. */
  readonly groupId?: string | null
  /** Display name ("PSD", "Neafiliaţi"). */
  readonly name?: string | null
}

/** Strip a trailing chamber suffix so `psd-senat` → `psd`. */
function partyKey(input: GroupColorInput): string {
  const raw = (input.name?.trim() || input.groupId?.trim() || '').toString()
  const folded = foldSlug(raw)
  return folded.replace(/-(camera_deputatilor|camera-deputatilor|senat|comun)$/, '')
}

/**
 * Official brand colours keyed by normalized party identity. Hex chosen to match
 * each party's brand while guaranteeing pairwise visual separation (see the
 * distinctness test). Aliases (e.g. `sos-ro` / `sos-romania`) map to the same key.
 */
export const GROUP_BRAND_COLORS: Readonly<Record<string, string>> = {
  // ── USER-AUTHORITATIVE, FIXED (never auto-adjust these 7) ──────────────────
  psd: '#E4002B', // PSD — red
  aur: '#111111', // AUR — black (AUR is black/yellow)
  pnl: '#FFD200', // PNL — yellow
  usr: '#002A59', // USR — official dark blue (NOT cyan)
  pace: '#F05A28', // PACE — orange (logo is orange + dark blue)
  udmr: '#00843D', // UDMR/RMDSZ — green
  rmdsz: '#00843D',
  neafiliati: '#6B7280', // Neafiliați / independent — grey
  neafiliat: '#6B7280',
  // ── other parties (adjustable to preserve distinctness vs the fixed 7) ─────
  'sos-ro': '#5b8def', // SOS România — light/medium blue (kept clear of USR dark-navy)
  'sos-romania': '#5b8def',
  pot: '#d6448c', // POT — pink (infobox: indigo + pastel pink; clear of PACE orange)
  upr: '#13b5b1', // UPR — teal
  pmp: '#7a2f9e', // PMP — violet (clear of USR dark-navy)
  'pro-romania': '#1d4ed8', // Pro România — medium blue
  minoritati: '#8a6d3b', // Grupul minorităților — bronze/brown (has members → distinct, not grey)
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
  '#2f4f4f', // dark slate (clear of the Neafiliați brand grey)
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
