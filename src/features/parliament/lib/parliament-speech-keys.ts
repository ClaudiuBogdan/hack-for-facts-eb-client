/**
 * Speech-key shapes, and the ONE routing decision that depends on them.
 *
 * The serving database carries two generations of key for the same words:
 *
 *   canonical  `canon:…`            a re-derived reading block — the whole turn,
 *                                   with a provable position in its sitting.
 *   legacy     `cdep:…` / `senat:…` an over-split snippet of that same turn,
 *                                   with no position. Millions of these are in
 *                                   the wild as shared links.
 *
 * `/parlament/stenograme/$speechKey` therefore stays alive forever and becomes
 * a RESOLVER: it asks the server to map the key onto the canonical reading
 * (`parliamentSpeechContext` accepts either generation and walks
 * `parliament.speech_redirects`) and forwards to the sitting reader with
 * `?interventie=`. These predicates are only used to pick the right *loading*
 * copy and the right diagnostics — never to decide the destination, which is
 * always the server's answer. A key we do not recognise is still resolved.
 */

const CANONICAL_PREFIX = 'canon:'
const LEGACY_PREFIXES = ['cdep:', 'senat:'] as const

/** A canonical contribution key (`canon:…`). */
export function isCanonicalSpeechKey(speechKey: string): boolean {
  return speechKey.startsWith(CANONICAL_PREFIX)
}

/**
 * A KNOWN legacy key shape (`cdep:…` / `senat:…`) — e.g. the shared-link form
 * `cdep:cdep_stenogram:9043:9:718`. Used to promise the reader a redirect is
 * coming rather than showing a bare spinner.
 */
export function isLegacySpeechKey(speechKey: string): boolean {
  return LEGACY_PREFIXES.some((prefix) => speechKey.startsWith(prefix))
}

/**
 * The official system a legacy key came from, when it is printed in the key.
 * `undefined` for canonical and unrecognised keys — we do not infer a source
 * system from key shape beyond the prefix the loader itself wrote.
 */
export function legacySpeechKeySourceSystem(
  speechKey: string,
): 'cdep' | 'senat' | undefined {
  if (speechKey.startsWith('cdep:')) return 'cdep'
  if (speechKey.startsWith('senat:')) return 'senat'
  return undefined
}
