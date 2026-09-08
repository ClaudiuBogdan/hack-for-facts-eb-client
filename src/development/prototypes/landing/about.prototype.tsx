import type { PrototypeDefinition } from '@/development/harness/entry'
import { AboutDuo } from './about.duo'
import { AboutBench } from './about.bench'
import { AboutStage } from './about.stage'
import { AboutPage } from './about.page'

/**
 * The landing's people band — `03 / Oameni`, and the page it opens.
 *
 * The band goes between `02 / Proveniență` and the promo cards. That is not an
 * arbitrary slot: Proveniență's own comment calls itself "the home of every
 * figure that describes *us* rather than the country", and the people are the
 * same claim in a different form — first where the data comes from, then who
 * stands behind it. Promoting any of these means that comment stops being true
 * as written.
 *
 * Three tiers, because they are three different claims and flattening them
 * would say they are one:
 *
 * | tier          | weight                  | carries                                  |
 * |---------------|-------------------------|------------------------------------------|
 * | fondator      | the collage, largest    | nume, rol, 2–3 propoziții, LinkedIn/FB/GH |
 * | îngeri        | the collage, ~half      | nume, o linie, LinkedIn/FB               |
 * | contribuitori | avatar rotund, 32px     | login, link, `+N`                        |
 *
 * The three variants differ in what they say about the relationship between the
 * first two tiers, not merely in where the boxes sit — `duo` says founder and
 * then others, `bench` says one team, `stage` says one person with help. That
 * is the decision; the geometry follows from it.
 *
 * **Two findings that shaped this.**
 *
 * The contributors tier has no content. Measured across all three repositories
 * on 8 September 2026: one human, plus `actions-user` and `github-actions`,
 * which are release bots. A wall of faces would be one face and two robots, so
 * the tier is written as the invitation it actually is and the avatar row is
 * built to fill later without a redesign.
 *
 * lucide has no brand glyphs — there is no `Linkedin` or `Facebook` export in
 * v1. `AppFooter.tsx` already inlines the LinkedIn path; `about.parts.tsx`
 * carries the same one plus Facebook and GitHub, so the app keeps one drawing
 * of each mark rather than two that drift apart.
 *
 * **Not settled here:** the angels' real names, photographs and links, and
 * their consent to be named and pictured on a public site. Everything in
 * `about.people.ts` below the founder is stand-in, and since the provisional
 * notice was removed nothing on screen distinguishes it from the real founder
 * beside it — `DESIGN.md` §Mock-First has to be answered before promotion.
 */
export const prototype = {
  title: 'Landing — people band',
  spec: 'docs/design/prototyping.md',
  variants: {
    duo: {
      title: 'Duo — fondatorul în stânga, îngerii în dreapta',
      component: AboutDuo,
      note: 'Stands on the same 5/6-of-12 split as bands 01 and 02. Says: founder, then the others.',
    },
    bench: {
      title: 'Bench — toți pe un rând, fondatorul mai lat',
      component: AboutBench,
      note: 'One row on a 1.4fr + 3x1fr track. Says: one team. Breaks the page rhythm on purpose.',
    },
    stage: {
      title: 'Stage — portretul mare, îngerii pe rânduri dedesubt',
      component: AboutStage,
      note: 'The cut-out overruns the band. Most weight on one person, roughly a screen more height.',
    },
    page: {
      title: 'Pagina dedicată — schiță',
      component: AboutPage,
      note: 'What the band links to. Sketch, kept out of the comparison — judge it after the band.',
    },
  },
  compare: ['duo', 'bench', 'stage'],
} satisfies PrototypeDefinition
