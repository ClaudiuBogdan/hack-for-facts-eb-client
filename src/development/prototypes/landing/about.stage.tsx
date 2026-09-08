import { ANGELS, FOUNDER } from './about.people'
import {
  ContributorStrip,
  Frame,
  PROTOTYPE_MARKER,
  PendingPortrait,
  PortraitPicture,
  ProvisionalNotice,
  ReadMoreLink,
  SocialRow,
} from './about.parts'
import { MonoLabel } from './home-refs.mono-label'

/**
 * Stage — the portrait is the picture, not an illustration of a paragraph.
 *
 * The collage runs the full height of the band opposite the text and is allowed
 * to overrun the band's padding, which only works because the art is a cut-out
 * on transparency: there is no edge to line anything up with, so the silhouette
 * itself becomes the column. `DESIGN.md` §Imagery is the reason the reference
 * art can carry this at all — a photograph in a box could not.
 *
 * The angels drop below as rows rather than cards: a small pending portrait,
 * the name, the one line, the links. Horizontal rows read as a list of people
 * you can scan; the 3-up grids in the other two read as a gallery.
 *
 * It is the most expensive of the three in vertical space — roughly a screen
 * more on a page that is already long — and it puts the most weight on one
 * person. Both are deliberate, and both are the reason to reject it.
 */
export function AboutStage() {
  return (
    <section data-dev-marker={PROTOTYPE_MARKER} className="overflow-hidden border-y bg-background">
      <Frame className="pt-14 pb-14 sm:pt-16">
        <ProvisionalNotice />

        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-6">
            <MonoLabel className="block text-primary">03 / Oameni</MonoLabel>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl">
              Am construit asta pentru că nimeni altcineva nu o făcea
            </h2>
            <p className="mt-6 max-w-[52ch] text-base leading-relaxed text-muted-foreground">
              {FOUNDER.blurb}
            </p>
            <div className="mt-7 border-t pt-5">
              <p className="text-sm font-semibold text-foreground">{FOUNDER.name}</p>
              <MonoLabel className="mt-2 block text-muted-foreground">{FOUNDER.role}</MonoLabel>
              <SocialRow person={FOUNDER} className="mt-3" />
            </div>
            <ReadMoreLink className="mt-8" />
          </div>

          {/* `-mb-14` pulls the silhouette's cut edge past the band's own
              padding so it sits on the rule instead of floating above it. */}
          <div className="lg:col-span-6 lg:-mb-14">
            {FOUNDER.portrait === undefined ? null : (
              <div className="mx-auto max-w-[520px]">
                <PortraitPicture portrait={FOUNDER.portrait} />
              </div>
            )}
          </div>
        </div>
      </Frame>

      <div className="border-t bg-muted/20">
        <Frame className="py-12">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
            <MonoLabel className="text-primary">Îngerii păzitori</MonoLabel>
            <p className="text-sm text-muted-foreground">
              Oamenii fără de care proiectul s-ar fi oprit.
            </p>
          </div>
          <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {ANGELS.map((angel) => (
              <li key={angel.id} className="flex items-start gap-4 border-t pt-5">
                <PendingPortrait className="w-16 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight text-foreground">{angel.name}</p>
                  <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
                    {angel.role}
                  </MonoLabel>
                  <SocialRow person={angel} className="mt-2.5" />
                </div>
              </li>
            ))}
          </ul>
          <ContributorStrip className="mt-12" />
        </Frame>
      </div>
    </section>
  )
}
