import founderWebp from '@/assets/images/people/portrait-founder.webp'
import founderAvif from '@/assets/images/people/portrait-founder.avif'
import angel1Webp from '@/assets/images/people/portrait-angel-1.webp'
import angel1Avif from '@/assets/images/people/portrait-angel-1.avif'
import angel2Webp from '@/assets/images/people/portrait-angel-2.webp'
import angel2Avif from '@/assets/images/people/portrait-angel-2.avif'
import angel3Webp from '@/assets/images/people/portrait-angel-3.webp'
import angel3Avif from '@/assets/images/people/portrait-angel-3.avif'
import angel4Webp from '@/assets/images/people/portrait-angel-4.webp'
import angel4Avif from '@/assets/images/people/portrait-angel-4.avif'
import ghClaudiu from '@/assets/images/people/gh-claudiubogdan.webp'

/**
 * The people on the landing's `03 / Oameni` band.
 *
 * Three tiers, because they are three different claims: the person who is
 * accountable for the platform, the handful who kept it alive, and everyone who
 * has ever pushed a commit. Flattening them into one grid would say they are
 * the same claim, and the second tier is the one that carries the gratitude.
 *
 * **The people are real now** — names, photographs, institutions and links, all
 * supplied rather than invented. What is still stand-in is the contributor tier
 * below them, which is a list this file holds and which has one human in it.
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
 * All four angels have art now. Two of them arrived recut at source, which is
 * why the bottom fade is off: their busts no longer end on a filled row.
 */
const PORTRAIT_FOUNDER: Portrait = { webp: founderWebp, avif: founderAvif, width: 760, height: 919 }
/* Straightened and reframed rather than taken as it arrived: Vision put this
   head at 7 degrees of roll and the face at 0.414 of the frame width, against
   about 0.46 for everyone else — which is why he read as small and slightly
   tipped. Rotated back, then narrowed until the face was the right share of the
   width. Only the width: head size on screen is set by the face's share of the
   frame width, because every portrait is drawn at the same width in its slot,
   and the build script trims each asset to its own alpha, so vertical framing
   is discarded regardless. Cropping vertically bought nothing and cost the top
   of his hair. */
const PORTRAIT_ANGEL_1: Portrait = { webp: angel1Webp, avif: angel1Avif, width: 520, height: 632 }
const PORTRAIT_ANGEL_2: Portrait = { webp: angel2Webp, avif: angel2Avif, width: 520, height: 620 }
const PORTRAIT_ANGEL_3: Portrait = { webp: angel3Webp, avif: angel3Avif, width: 520, height: 633 }
const PORTRAIT_ANGEL_4: Portrait = { webp: angel4Webp, avif: angel4Avif, width: 520, height: 627 }

export const FOUNDER: Person = {
  id: 'claudiu',
  name: 'Claudiu Constantin Bogdan',
  role: 'Fondator · Transparenta.eu',
  blurb:
    'Datele despre banii publici există deja — dar în zeci de portaluri care nu vorbesc între ele. Transparenta le pune la un loc și spune, de fiecare dată, de unde vine cifra.',
  portrait: PORTRAIT_FOUNDER,
  links: {
    facebook: 'https://www.facebook.com/claudiuconstantin.bogdan',
    linkedin: 'https://www.linkedin.com/in/claudiuconstantinbogdan/',
    github: 'https://github.com/ClaudiuBogdan',
  },
}

/**
 * Real people, in the order they stand in the band.
 *
 * The line under each name is where they work rather than what they did here. A
 * sentence about a contribution is a claim the person has to agree with and that
 * ages the moment the next thing happens; an institution is a fact, it is what
 * they would put on their own page, and next to four faces it says more about
 * why this project has friends than four descriptions of favours would.
 *
 * Names, photographs and links are theirs, so any of it changes on their word
 * rather than on ours.
 */
export const ANGELS: readonly Person[] = [
  {
    id: 'angel-1',
    name: 'Florin Pop',
    role: 'Geeks for Democracy | Banii noștri',
    blurb: 'Geeks for Democracy | Banii noștri',
    portrait: PORTRAIT_ANGEL_1,
    links: {
      facebook: 'https://www.facebook.com/orlat84',
      linkedin: 'https://www.linkedin.com/in/orlat84/',
    },
  },
  {
    id: 'angel-2',
    name: 'Flavia Gheorghe',
    role: 'AmpliFY ONG | How to Web',
    blurb: 'AmpliFY ONG | How to Web',
    portrait: PORTRAIT_ANGEL_2,
    links: {
      facebook: 'https://www.facebook.com/flavia.obreja',
      linkedin: 'https://www.linkedin.com/in/flavia-gheorghe-49b63062/',
    },
  },
  {
    id: 'angel-3',
    name: 'Elena Calistru',
    role: 'Funky Citizens | Member @EESC civil society group',
    blurb: 'Funky Citizens | Member @EESC civil society group',
    portrait: PORTRAIT_ANGEL_3,
    links: {
      facebook: 'https://www.facebook.com/ElenaCalistru',
      linkedin: 'https://www.linkedin.com/in/elena-calistru-753a0a30/',
    },
  },
  {
    id: 'angel-4',
    name: 'Vasile Crăciunescu',
    role: 'Geo-Spatial',
    blurb: 'Geo-Spatial',
    portrait: PORTRAIT_ANGEL_4,
    links: {
      facebook: 'https://www.facebook.com/vasilecraciunescu',
      linkedin: 'https://www.linkedin.com/in/vasilecraciunescu/',
    },
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
 * Only real people are in this list.
 *
 * It used to carry six invented ones — 'Nume Prenume', 'Al Cincilea Nume' —
 * to give the wall its shape before the real names arrived. They were never
 * drawn with a name on screen, so they looked like anonymous placeholders, but
 * the name went to `title` and to an `sr-only` span: a screen reader read six
 * fabricated people, with roles, off the band whose whole subject is who is
 * really behind this. On a site about verifiable public money that is the one
 * place to get this wrong. `DESIGN.md` §Mock-First Contract says it plainly —
 * never present stand-in data as served truth.
 *
 * The shape is kept by `OPEN_SEATS` instead, which claims nothing about anyone.
 */
export const CONTRIBUTORS: readonly Contributor[] = [
  {
    id: 'claudiu',
    name: 'Claudiu Bogdan',
    role: 'Cod și date',
    avatar: ghClaudiu,
    url: 'https://github.com/ClaudiuBogdan',
  },
]

/**
 * Empty chairs drawn after the real faces, so the wall reads as a wall.
 *
 * Not people and not pretending to be: no name, no role, no link, and
 * `aria-hidden`, so nothing is announced and nothing is claimed. They say the
 * list is open — which is true — where six invented names said it was already
 * full, which was not.
 */
export const OPEN_SEATS = 6

export const REPO_URL = 'https://github.com/ClaudiuBogdan/hack-for-facts-eb-client'
