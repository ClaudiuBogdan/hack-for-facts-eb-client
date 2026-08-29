import type { TldfBlock } from './types'

/**
 * The document masthead — the self-identifying block run every portal text
 * opens with: "LEGE nr. 98 din 19 mai 2016" (titlu_act), "privind achizițiile
 * publice" (subtitlu_act), "EMITENT / PARLAMENTUL" (emitent), "Publicat în
 * MONITORUL OFICIAL nr. 390…" (publicare). On the one-page act route these
 * repeat the page header sitting 700px above them (user decision 2026-08-11:
 * the header owns the act's identity, the text should not restate it).
 *
 * The suppression rule compares VALUES, never mere existence: a masthead
 * line is hidden only when the header provably displays *the same* fact —
 * the den line textually covers the titlu, the issuer label matches the
 * emitent, the MO issue number AND year match the publicare. Existence
 * checks are not enough: `gazettePublications` is plural, and a header line
 * built from one publication must not swallow a body line naming another
 * (republicări, rectificări — a field can mean different things per row).
 *
 * `titlu_act` + `subtitlu_act` are ONE sentence the portal breaks across two
 * blocks — so they move together: when the titlu is lifted, the subject is
 * extracted and handed back for the header's den line rather than stranding
 * a lowercase half-sentence at the top of the body.
 *
 * Only the LEADING masthead REGION is considered: a quoted amending act
 * deeper in the body may legally contain the same kinds, and those are the
 * law's content, not our chrome. The region is not a contiguous kind-run —
 * the Codul fiscal interleaves a covering-law paragraph, `titlu_act →
 * paragraf "( Legea nr. 227/2015 )" → emitent → publicare` — so the scan
 * skips over non-masthead blocks (always kept) and ends at the first
 * STRUCTURAL block or at a measured cap, whichever comes first.
 */
const MASTHEAD_KINDS: ReadonlySet<string> = new Set([
  'titlu_act',
  'subtitlu_act',
  'emitent',
  'publicare',
])

/** Structure begins here — nothing past these is masthead. */
const MASTHEAD_REGION_END: ReadonlySet<string> = new Set([
  'carte',
  'parte',
  'titlu',
  'capitol',
  'subcapitol',
  'sectiune',
  'articol',
  'anexa',
  'apendice',
])

/**
 * Blocks scanned at most. Measured: portal mastheads run ≤5 blocks
 * (98/2016 doc 178667: 4 + adoption formula; Codul fiscal doc 171282: 4 +
 * interstitial + formula) — re-validate if a masthead ever survives visibly.
 */
const MASTHEAD_SCAN_CAP = 8

/**
 * What the page header actually DISPLAYS, as comparable values. `null`
 * anywhere means "the header does not show this fact" — the matching body
 * line is then kept, never dropped.
 */
export type MastheadFactsInHeader = {
  /** The formal denumire shown under the H1 (canonical `den`). */
  readonly den: string | null
  /** The issuer label named in the classification line. */
  readonly issuerLabel: string | null
  /** The MO issue number in the header's publication line. */
  readonly issueNumber: number | null
  /** The year of the issue date shown next to it (null when no date shown). */
  readonly issueYear: number | null
}

export type MastheadSplit = {
  /** The blocks to render — the input minus the lifted masthead lines. */
  readonly blocks: readonly TldfBlock[]
  /**
   * The act's subject ("privind achizițiile publice"), extracted for the
   * header's den line. Non-null only when the titlu was also lifted — the
   * two halves of the sentence travel together — and only when `den` does
   * not already contain it (guard against dens that carry their subject).
   */
  readonly subject: string | null
  /** Whether anything was lifted — drives the fidelity note's wording. */
  readonly lifted: boolean
}

/** The renderer's fold, flattened to one line. */
const blockText = (block: TldfBlock): string =>
  block.content
    .map((run) => (run.sep ?? '') + run.text)
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

/** Case-, diacritic- and whitespace-insensitive comparison form. */
export const normalizeLegalText = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Every number in the text, with Romanian thousands separators folded
 * ("nr. 1.027" → 1027) — MO issue numbers pass 1000 late every year.
 */
const numbersIn = (text: string): ReadonlySet<string> => {
  const folded = text.replace(/(\d)\.(?=\d)/g, '$1')
  return new Set(folded.match(/\d+/g) ?? [])
}

const titluMatchesDen = (block: TldfBlock, den: string | null): boolean => {
  if (den === null) return false
  const titlu = normalizeLegalText(blockText(block))
  return titlu !== '' && normalizeLegalText(den).includes(titlu)
}

const emitentMatchesIssuer = (
  block: TldfBlock,
  issuerLabel: string | null,
): boolean => {
  if (issuerLabel === null) return false
  // "EMITENT PARLAMENTUL" → "parlamentul"; label "Parlamentul României".
  const emitent = normalizeLegalText(blockText(block)).replace(/^emitent\s*/, '')
  const issuer = normalizeLegalText(issuerLabel)
  return (
    emitent !== '' && (issuer.includes(emitent) || emitent.includes(issuer))
  )
}

const publicareMatchesIssue = (
  block: TldfBlock,
  issueNumber: number | null,
  issueYear: number | null,
): boolean => {
  // Both number AND year must be shown and match: issue numbers repeat
  // every year, so a number alone identifies nothing.
  if (issueNumber === null || issueYear === null) return false
  const numbers = numbersIn(blockText(block))
  return numbers.has(String(issueNumber)) && numbers.has(String(issueYear))
}

/**
 * Split the leading masthead off a block list: drop the lines whose exact
 * fact the header already displays, extract the subject when its titlu went
 * with it. Returns the input array untouched (same reference) when nothing
 * lifts.
 */
export function splitMasthead(
  blocks: readonly TldfBlock[],
  facts: MastheadFactsInHeader,
): MastheadSplit {
  const drop = new Set<number>()
  let titluDropped = false
  let subject: string | null = null
  for (const [index, block] of blocks.entries()) {
    if (index >= MASTHEAD_SCAN_CAP || MASTHEAD_REGION_END.has(block.kind)) break
    if (!MASTHEAD_KINDS.has(block.kind)) continue
    if (block.kind === 'titlu_act' && titluMatchesDen(block, facts.den)) {
      drop.add(index)
      titluDropped = true
    } else if (block.kind === 'subtitlu_act' && titluDropped) {
      drop.add(index)
      const text = blockText(block)
      // Guard: some den values may already end with the subject — appending
      // it again would duplicate it on the page's most prominent line.
      subject =
        text === '' ||
        facts.den === null ||
        normalizeLegalText(facts.den).includes(normalizeLegalText(text))
          ? null
          : text
    } else if (
      block.kind === 'emitent' &&
      emitentMatchesIssuer(block, facts.issuerLabel)
    ) {
      drop.add(index)
    } else if (
      block.kind === 'publicare' &&
      publicareMatchesIssue(block, facts.issueNumber, facts.issueYear)
    ) {
      drop.add(index)
    }
  }
  if (drop.size === 0) return { blocks, subject: null, lifted: false }
  return {
    blocks: blocks.filter((_, index) => !drop.has(index)),
    subject,
    lifted: true,
  }
}
