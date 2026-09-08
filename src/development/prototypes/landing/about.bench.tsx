import { ANGELS, FOUNDER } from './about.people'
import {
  BandHead,
  ContributorStrip,
  Frame,
  PROTOTYPE_MARKER,
  PendingPortrait,
  PortraitPicture,
  ReadMoreLink,
  SocialRow,
} from './about.parts'
import { MonoLabel } from './home-refs.mono-label'

/**
 * Bench — everyone on one line, the founder wider rather than separate.
 *
 * The four people sit in one row on a `1.4fr` + three `1fr` track, so the
 * founder is bigger by a measured amount instead of by being in a different
 * block. It reads as a team photograph, and the angels are not visibly a
 * subordinate tier — which is the honest reading if their contribution was
 * decisive rather than supporting.
 *
 * Two things it gives up. The founder's paragraph loses its column and has to
 * live at the head of the band, above everyone; and the row breaks the 5/6
 * split the neighbouring bands stand on, so this section announces itself as a
 * different kind of thing. Whether that is a cost depends on whether people
 * *should* interrupt the page's rhythm.
 */
export function AboutBench() {
  return (
    <section data-dev-marker={PROTOTYPE_MARKER} className="border-y bg-background">
      <Frame className="py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <BandHead title={<>Oamenii proiectului</>} />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-base leading-relaxed text-muted-foreground">
              {FOUNDER.blurb}
            </p>
            <ReadMoreLink className="mt-5" />
          </div>
        </div>

        <ul className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:mt-14 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-x-8">
          <li className="flex h-full flex-col">
            {FOUNDER.portrait === undefined ? null : (
              <PortraitPicture portrait={FOUNDER.portrait} />
            )}
            <h3 className="mt-4 text-base font-semibold leading-tight tracking-tight text-foreground">
              {FOUNDER.name}
            </h3>
            <MonoLabel className="mt-2 block leading-relaxed text-primary">
              {FOUNDER.role}
            </MonoLabel>
            <SocialRow person={FOUNDER} className="mt-auto pt-3" />
          </li>
          {ANGELS.map((angel) => (
            <li key={angel.id} className="flex h-full flex-col">
              {/* The angels' slots are narrower, so their art is smaller by the
                  grid rather than by a second size being specified anywhere. */}
              <PendingPortrait />
              <h3 className="mt-4 text-base font-semibold leading-tight tracking-tight text-foreground">
                {angel.name}
              </h3>
              <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
                {angel.role}
              </MonoLabel>
              <SocialRow person={angel} className="mt-auto pt-3" />
            </li>
          ))}
        </ul>

        <p className="mt-10 text-sm leading-relaxed text-muted-foreground">
          <MonoLabel className="mr-2 text-primary">Îngerii păzitori</MonoLabel>
          Cei trei din dreapta au dat timp, date sau o ușă deschisă atunci când
          conta.
        </p>

        <ContributorStrip className="mt-10" />
      </Frame>
    </section>
  )
}
