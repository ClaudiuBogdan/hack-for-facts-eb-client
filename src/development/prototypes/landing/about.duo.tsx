import { useRef } from 'react'
import { Frame, PROTOTYPE_MARKER } from './about.parts'
import { PictureRevealStyles, usePictureReveal } from './home-refs.image-reveal'
import { PeopleBand } from './home-refs.people'
import { RevealStyles, useRevealOnView } from './home-refs.reveal'

/**
 * Duo — the founder anchors the left column, the angels fill the right.
 *
 * The band reuses the 5/6-of-12 split that `01 / Ce găsești aici` and
 * `02 / Proveniență` already stand on, twice: once for the heading and its
 * lead, once for the people. Nothing about the page's geometry changes to
 * accommodate faces, which is the argument for this one — the reader has been
 * taught this rhythm by the two bands above it.
 *
 * The cost is that it says, structurally, *founder and then others*. That is
 * true here, and the tier weights are deliberate; a version that denies it is
 * `bench`.
 *
 * **This is the shipped shape**, and it is not drawn twice: the contents are
 * `home-refs.people.tsx`, the same module the landing renders. What is left
 * here is the shell the landing would otherwise provide — the section, the
 * frame, and the two reveal hooks, without which the portrait would sit
 * `pending` and never arrive.
 */
export function AboutDuo() {
  const rootRef = useRef<HTMLElement>(null)
  useRevealOnView(rootRef)
  usePictureReveal(rootRef)

  return (
    <section ref={rootRef} data-dev-marker={PROTOTYPE_MARKER} className="border-y bg-background">
      <RevealStyles />
      <PictureRevealStyles />
      <Frame className="py-14 sm:py-16">
        <PeopleBand />
      </Frame>
    </section>
  )
}
