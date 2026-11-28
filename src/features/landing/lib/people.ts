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
import oanaManKesselheim from '@/assets/images/people/contributor-oana-man-kesselheim.webp'
import raduIamandi from '@/assets/images/people/contributor-radu-iamandi.webp'
import valerianBanu from '@/assets/images/people/contributor-valerian-banu.webp'
import danielFerecatu from '@/assets/images/people/contributor-daniel-ferecatu.webp'
import danielUrsu from '@/assets/images/people/contributor-daniel-ursu.webp'
import vladGrumazescu from '@/assets/images/people/contributor-vlad-grumazescu.webp'
import ionutHodina from '@/assets/images/people/contributor-ionut-hodina.webp'
import { msg } from '@lingui/core/macro'
import type { MessageDescriptor } from '@lingui/core'

/**
 * The founder, supporters and contributors shown in the landing page's people section.
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
  /**
   * Where they work, or what they are here. Plain text where it is an
   * institution's own name, a `msg` descriptor where it is our wording.
   */
  readonly role: string | MessageDescriptor
  /** One line on the landing. The long version lives on the dedicated page. */
  readonly blurb: string | MessageDescriptor
  readonly portrait?: Portrait
  readonly links: SocialLinks
  /** Renders the pending-portrait silhouette and marks the row as stand-in. */
  readonly provisional?: boolean
}

/**
 * The cut-outs, one per person.
 *
 * Built by `scripts/build-people-art.py` from the generated sources: trimmed to
 * their own alpha, desaturated, exposure-matched to the founder's, and faded out
 * at the foot so no bust ends on a straight edge. The props they are composed
 * with live in `people-art.tsx`, because which props a person gets is
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
  role: msg`Fondator`,
  blurb: msg`Am construit Transparenta.eu pentru că datele despre banii publici există, dar în zeci de portaluri care nu vorbesc între ele.`,
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
  /** A square crop. Absent means the seat is taken but the picture is not in. */
  readonly avatar?: string
  /** Where a click goes: LinkedIn, Facebook, GitHub — whichever they use. */
  readonly url?: string
}

/** The curated list credits contributions both inside and outside the repositories. */
export const CONTRIBUTORS: readonly Contributor[] = [
  {
    id: 'oana-man-kesselheim',
    name: 'Oana Man-Kesselheim',
    avatar: oanaManKesselheim,
    url: 'https://www.linkedin.com/in/oana-man-kesselheim/',
  },
  {
    id: 'radu-iamandi',
    name: 'Radu Iamandi',
    avatar: raduIamandi,
    url: 'https://www.linkedin.com/in/raduiamandi',
  },
  {
    id: 'valerian-banu',
    name: 'Valerian Banu',
    avatar: valerianBanu,
    url: 'https://www.linkedin.com/in/valibanu/',
  },
  {
    id: 'daniel-ferecatu',
    name: 'Daniel Ferecatu',
    avatar: danielFerecatu,
    url: 'https://www.linkedin.com/in/danielferecatu',
  },
  {
    id: 'daniel-ursu',
    name: 'Daniel Ursu',
    avatar: danielUrsu,
    url: 'https://www.linkedin.com/in/ursudaniel/',
  },
  {
    id: 'vlad-grumazescu',
    name: 'Vlad Grumazescu',
    avatar: vladGrumazescu,
    url: 'https://www.linkedin.com/in/vladgrumazescu/',
  },
  {
    id: 'ionut-hodina',
    name: 'Ionuț Hodină',
    avatar: ionutHodina,
    url: 'https://www.linkedin.com/in/ionut-hodina/',
  },
]

export const REPO_URL = 'https://github.com/ClaudiuBogdan/hack-for-facts-eb-client'
