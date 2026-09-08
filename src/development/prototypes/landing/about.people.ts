import founderWebp from '@/assets/images/people/portrait-founder.webp'
import founderAvif from '@/assets/images/people/portrait-founder.avif'
import angel1Webp from '@/assets/images/people/portrait-angel-1.webp'
import angel1Avif from '@/assets/images/people/portrait-angel-1.avif'
import angel2Webp from '@/assets/images/people/portrait-angel-2.webp'
import angel2Avif from '@/assets/images/people/portrait-angel-2.avif'
import angel3Webp from '@/assets/images/people/portrait-angel-3.webp'
import angel3Avif from '@/assets/images/people/portrait-angel-3.avif'
import ghClaudiu from '@/assets/images/people/gh-claudiubogdan.webp'

/**
 * The people on the landing's `03 / Oameni` band.
 *
 * Three tiers, because they are three different claims: the person who is
 * accountable for the platform, the handful who kept it alive, and everyone who
 * has ever pushed a commit. Flattening them into one grid would say they are
 * the same claim, and the second tier is the one that carries the gratitude.
 *
 * **Provisional content.** Real: the portrait, the name, the LinkedIn and the
 * GitHub. Everything else — the angels, the counts, and the copy — is stand-in
 * or draft, and nothing on screen says so any more: the notice that carried
 * that label was removed on request. `DESIGN.md` §Mock-First Contract is a
 * promotion gate, so this has to be either real or labelled again before the
 * band ships; until then the record is here.
 */

export type SocialLinks = {
  readonly linkedin?: string
  readonly facebook?: string
  readonly github?: string
}

export type Portrait = {
  readonly webp: string
  readonly avif?: string
  readonly width: number
  readonly height: number
}

export type Person = {
  readonly id: string
  readonly name: string
  readonly role: string
  /** One line on the landing. The long version lives on the dedicated page. */
  readonly blurb: string
  readonly portrait?: Portrait
  readonly links: SocialLinks
  /** Renders the pending-portrait silhouette and marks the row as stand-in. */
  readonly provisional?: boolean
}

/**
 * The crop every portrait must share.
 *
 * `DESIGN.md` §Delivery: each format is the same crop at the same pixel
 * dimensions, or the framing changes with the reader's browser. 760x950 is the
 * art at 2x the widest slot it is ever given (380 CSS px, the founder in
 * `duo`), so nothing is ever upscaled.
 */
export const PORTRAIT_RATIO = '4 / 5'

/**
 * The cut-outs, one per person.
 *
 * Built by `scripts/build-people-art.py` from the generated sources: trimmed to
 * their own alpha, desaturated, exposure-matched to the founder's, and faded out
 * at the foot so no bust ends on a straight edge. The props they are composed
 * with live in `home-refs.people-art.tsx`, because which props a person gets is
 * a question about their tier and not about them.
 *
 * There are three angel portraits and four angels. The fourth keeps the drawn
 * silhouette until their picture exists.
 */
const PORTRAIT_FOUNDER: Portrait = { webp: founderWebp, avif: founderAvif, width: 760, height: 919 }
const PORTRAIT_ANGEL_1: Portrait = { webp: angel1Webp, avif: angel1Avif, width: 520, height: 627 }
const PORTRAIT_ANGEL_2: Portrait = { webp: angel2Webp, avif: angel2Avif, width: 520, height: 620 }
const PORTRAIT_ANGEL_3: Portrait = { webp: angel3Webp, avif: angel3Avif, width: 520, height: 633 }

export const FOUNDER: Person = {
  id: 'claudiu',
  name: 'Claudiu Constantin Bogdan',
  role: 'Fondator · scrie platforma',
  blurb:
    'Datele despre banii publici există deja — dar în zeci de portaluri care nu vorbesc între ele. Transparenta le pune la un loc și spune, de fiecare dată, de unde vine cifra.',
  portrait: PORTRAIT_FOUNDER,
  links: {
    linkedin: 'https://www.linkedin.com/in/claudiuconstantinbogdan/',
    /* Asked for, not supplied yet — `SocialRow` renders the glyph in the
       pending state rather than dropping it, so the card is the real width. */
    facebook: '#',
    github: 'https://github.com/ClaudiuBogdan',
  },
}

/**
 * Stand-ins. Names, roles and links are placeholders — the portraits are drawn
 * rather than photographed, so nobody mistakes the tier for finished.
 */
export const ANGELS: readonly Person[] = [
  {
    id: 'angel-1',
    name: 'Nume Prenume',
    role: 'A deschis ușile',
    blurb: 'O propoziție despre ce a făcut, nu un CV.',
    portrait: PORTRAIT_ANGEL_1,
    links: { linkedin: '#', facebook: '#' },
    provisional: true,
  },
  {
    id: 'angel-2',
    name: 'Prenume Nume',
    role: 'A citit fiecare cifră',
    blurb: 'O propoziție despre ce a făcut, nu un CV.',
    portrait: PORTRAIT_ANGEL_2,
    links: { linkedin: '#', facebook: '#' },
    provisional: true,
  },
  {
    id: 'angel-3',
    name: 'Nume de Familie',
    role: 'A ținut proiectul în viață',
    blurb: 'O propoziție despre ce a făcut, nu un CV.',
    portrait: PORTRAIT_ANGEL_3,
    links: { linkedin: '#', facebook: '#' },
    provisional: true,
  },
  {
    id: 'angel-4',
    name: 'Al Patrulea Nume',
    role: 'A dus proiectul mai departe',
    blurb: 'O propoziție despre ce a făcut, nu un CV.',
    links: { linkedin: '#', facebook: '#' },
    provisional: true,
  },
]

export type Contributor = {
  readonly id: string
  readonly name: string
  /** What they gave. Not a job title — the thing they actually did. */
  readonly role: string
  /** A square crop. Absent means the seat is taken but the picture is not in. */
  readonly avatar?: string
  /** Where a click goes: LinkedIn, Facebook, GitHub — whichever they use. */
  readonly url?: string
}

/**
 * Everyone who put something in, not only the people with commits.
 *
 * The code tier is measurable and small: on 8 September 2026, across client,
 * server and scrapper, one human with 6,128 commits. The other two accounts are
 * release machinery — and the filter for them is *not* `type !== 'Bot'`. GitHub
 * types `github-actions[bot]` as a bot but `actions-user`, which pushes the
 * compiled catalogs here and on the server, as a plain `User`. Trusting the
 * field would have put a robot in the grid with 385 commits to its name.
 *
 * So the grid stopped being a mirror of the GitHub API and became a list this
 * file holds: translations, checked figures, a door opened, a bug reported. That
 * cannot be derived from a repository, which is the point — most of what kept
 * this going was never a commit.
 *
 * Everything below the first entry is stand-in.
 */
export const CONTRIBUTORS: readonly Contributor[] = [
  {
    id: 'claudiu',
    name: 'Claudiu Bogdan',
    role: 'Cod și date',
    avatar: ghClaudiu,
    url: 'https://github.com/ClaudiuBogdan',
  },
  /* Six stand-ins, so the row lands on eight with the open seat. Roles are kept
     to two or three words: at a 130px track a longer line wraps to three and the
     row goes ragged, which is the opposite of condensed. */
  { id: 'c2', name: 'Nume Prenume', role: 'Traduceri', url: '#' },
  { id: 'c3', name: 'Prenume Nume', role: 'Verifică cifrele', url: '#' },
  { id: 'c4', name: 'Nume de Familie', role: 'Raportează erori', url: '#' },
  { id: 'c5', name: 'Al Cincilea Nume', role: 'Duce vorba', url: '#' },
  { id: 'c6', name: 'Nume Scurt', role: 'Testează pe teren', url: '#' },
  { id: 'c7', name: 'Al Șaptelea Nume', role: 'Documentație', url: '#' },
]

export const REPO_URL = 'https://github.com/ClaudiuBogdan/hack-for-facts-eb-client'
