import { ANGELS, FOUNDER } from './about.people'
import {
  BandHead,
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
 */
export function AboutDuo() {
  return (
    <section data-dev-marker={PROTOTYPE_MARKER} className="border-y bg-background">
      <Frame className="py-14 sm:py-16">
        <ProvisionalNotice />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <BandHead
              title={
                <>
                  Cine e în spatele
                  <br />
                  platformei
                </>
              }
            />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="text-base leading-relaxed text-muted-foreground">
              Platforma e scrisă de un singur om și a rămas în picioare pentru
              că alți câțiva au dat timp, date sau o ușă deschisă atunci când
              conta. Aici sunt pe scurt; povestea lungă e pe pagina dedicată.
            </p>
            <ReadMoreLink className="mt-5" />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            {FOUNDER.portrait === undefined ? null : (
              <div className="max-w-[380px]">
                <PortraitPicture portrait={FOUNDER.portrait} />
              </div>
            )}
            <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
              {FOUNDER.name}
            </h3>
            <MonoLabel className="mt-2 block text-muted-foreground">{FOUNDER.role}</MonoLabel>
            <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-muted-foreground">
              {FOUNDER.blurb}
            </p>
            <SocialRow person={FOUNDER} className="mt-4" />
          </div>

          <div className="lg:col-span-6 lg:col-start-7">
            <MonoLabel className="block text-primary">Îngerii păzitori</MonoLabel>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Oamenii fără de care proiectul s-ar fi oprit. Câte o singură
              propoziție despre ce a făcut fiecare — nu un CV.
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3">
              {ANGELS.map((angel) => (
                /* `flex-col` + `mt-auto` on the links: a role that wraps to two
                   lines must not push one cell’s icons below its neighbours’. */
                <li key={angel.id} className="flex h-full flex-col">
                  <PendingPortrait className="max-w-[128px]" />
                  <p className="mt-3 text-sm font-medium leading-tight text-foreground">
                    {angel.name}
                  </p>
                  <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
                    {angel.role}
                  </MonoLabel>
                  <SocialRow person={angel} className="mt-auto pt-2.5" />
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ContributorStrip className="mt-14" />
      </Frame>
    </section>
  )
}
