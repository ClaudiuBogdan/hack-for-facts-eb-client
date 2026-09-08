import claudiuWebp from '@/assets/images/people/claudiu.webp'
import claudiuAvif from '@/assets/images/people/claudiu.avif'
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

export const FOUNDER: Person = {
  id: 'claudiu',
  name: 'Claudiu Constantin Bogdan',
  role: 'Fondator · scrie platforma',
  blurb:
    'Datele despre banii publici există deja — dar în zeci de portaluri care nu vorbesc între ele. Transparenta le pune la un loc și spune, de fiecare dată, de unde vine cifra.',
  portrait: {
    webp: claudiuWebp,
    avif: claudiuAvif,
    width: 760,
    height: 950,
  },
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
    links: { linkedin: '#', facebook: '#' },
    provisional: true,
  },
  {
    id: 'angel-2',
    name: 'Prenume Nume',
    role: 'A citit fiecare cifră',
    blurb: 'O propoziție despre ce a făcut, nu un CV.',
    links: { linkedin: '#', facebook: '#' },
    provisional: true,
  },
  {
    id: 'angel-3',
    name: 'Nume de Familie',
    role: 'A ținut proiectul în viață',
    blurb: 'O propoziție despre ce a făcut, nu un CV.',
    links: { linkedin: '#', facebook: '#' },
    provisional: true,
  },
]

export type Contributor = {
  readonly login: string
  readonly avatar: string
  readonly url: string
}

/**
 * Measured, not guessed: on 8 September 2026 the three repositories carry one
 * human contributor between them — plus `actions-user` and `github-actions`,
 * which are the release bots and are not people.
 *
 * So the tier is written as the invitation it actually is. The avatar row is
 * the same component either way; when a second human lands, it fills.
 */
export const CONTRIBUTORS: readonly Contributor[] = [
  {
    login: 'ClaudiuBogdan',
    avatar: ghClaudiu,
    url: 'https://github.com/ClaudiuBogdan',
  },
]

export const REPO_URL = 'https://github.com/ClaudiuBogdan/hack-for-facts-eb-client'
