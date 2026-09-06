import { DomainIndex, FeaturedBand, LandingSearch, PROTOTYPE_MARKER } from './home.shared'
import { visibleGroups } from './home.data'

/**
 * Index — search stays the hero, and everything the platform holds is listed
 * below it, grouped by the kind of question it answers.
 *
 * The claim: the landing page's job is to be an honest table of contents. The
 * shipped page names four surfaces out of roughly fifteen, so a reader who
 * arrives wanting a court case or a law has no way to learn either exists. The
 * sidebar lists more, but it is collapsed to a FAB on mobile, it is a bare list
 * of labels, and it is itself missing Parlament, PNRR, Justiție and Investiții
 * publice. Each tile carries one line on what it answers — the thing a nav
 * label cannot say.
 */
export function LandingIndex() {
  const groups = visibleGroups()

  return (
    <div className="w-full px-4 py-10" data-dev-marker={PROTOTYPE_MARKER}>
      <div className="mx-auto flex w-full max-w-5xl flex-col space-y-10">
        <div className="flex flex-col items-center space-y-3 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Transparenta.eu
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
            Toți banii publici ai României, într-un singur loc.
          </p>
        </div>

        <LandingSearch className="mx-auto max-w-3xl" />

        <FeaturedBand />

        <DomainIndex groups={groups} />
      </div>
    </div>
  )
}
