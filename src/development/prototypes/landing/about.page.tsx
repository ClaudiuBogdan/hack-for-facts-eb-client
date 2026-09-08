import { ANGELS, CONTRIBUTORS, FOUNDER, REPO_URL } from './about.people'
import {
  ContributorStrip,
  Frame,
  PROTOTYPE_MARKER,
  PendingPortrait,
  PortraitPicture,
  ProvisionalNotice,
  SocialRow,
} from './about.parts'
import { MonoLabel } from './home-refs.mono-label'

/**
 * The page the band links to — a sketch, not a settled design.
 *
 * It exists so the pair can be judged together: the band's job is to say enough
 * that someone wants this page, and this page's job is to be worth the click.
 * Deciding either one alone tends to produce a band that says everything and a
 * page with nothing left to add.
 *
 * On promotion this becomes `/despre`, and the landing band's link stops being
 * a prototype URL.
 */
export function AboutPage() {
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="bg-background">
      <section className="border-b">
        <Frame className="py-14 sm:py-20">
          <ProvisionalNotice />
          <MonoLabel className="block text-primary">Despre</MonoLabel>
          <h1 className="mt-3 max-w-[20ch] text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
            Banii publici sunt publici
          </h1>
          <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-muted-foreground">
            Transparenta adună la un loc execuția bugetară, achizițiile,
            companiile de stat, PNRR-ul și dosarele din instanță — surse care
            există deja, dar în portaluri care nu vorbesc între ele. Fiecare
            cifră de aici își spune sursa și perioada.
          </p>
        </Frame>
      </section>

      <section className="border-b">
        <Frame className="py-14 sm:py-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
            <div className="lg:col-span-4">
              {FOUNDER.portrait === undefined ? null : (
                <div className="max-w-[340px]">
                  <PortraitPicture portrait={FOUNDER.portrait} />
                </div>
              )}
              <h2 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
                {FOUNDER.name}
              </h2>
              <MonoLabel className="mt-2 block text-muted-foreground">{FOUNDER.role}</MonoLabel>
              <SocialRow person={FOUNDER} className="mt-4" />
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              <MonoLabel className="block text-primary">Cum a început</MonoLabel>
              <div className="mt-5 space-y-5 text-base leading-relaxed text-muted-foreground">
                <p>{FOUNDER.blurb}</p>
                <p>
                  [Provizoriu] Aici intră povestea lungă: de ce a pornit
                  proiectul, ce s-a construit întâi, ce a fost greu și ce
                  urmează. Trei-patru paragrafe, la persoana întâi.
                </p>
                <p>
                  [Provizoriu] Și un paragraf despre ce nu face platforma —
                  limitele datelor sunt parte din promisiune, nu o notă de
                  subsol.
                </p>
              </div>
            </div>
          </div>
        </Frame>
      </section>

      <section className="border-b bg-muted/20">
        <Frame className="py-14 sm:py-16">
          <MonoLabel className="block text-primary">Îngerii păzitori</MonoLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Oamenii fără de care s-ar fi oprit
          </h2>
          <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {ANGELS.map((angel) => (
              <li key={angel.id}>
                <PendingPortrait className="max-w-[160px]" />
                <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
                  {angel.name}
                </h3>
                <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
                  {angel.role}
                </MonoLabel>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{angel.blurb}</p>
                <SocialRow person={angel} className="mt-3" />
              </li>
            ))}
          </ul>
        </Frame>
      </section>

      <section>
        <Frame className="py-14 sm:py-16">
          <MonoLabel className="block text-primary">Contribuitori</MonoLabel>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Codul e deschis
          </h2>
          <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-muted-foreground">
            Clientul, serverul și extractoarele sunt publice. Deocamdată{' '}
            {CONTRIBUTORS.length === 1
              ? 'există un singur contribuitor uman'
              : `există ${CONTRIBUTORS.length} contribuitori`}{' '}
            — restul commit-urilor sunt ale roboților de release.{' '}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground underline underline-offset-4 hover:text-primary"
            >
              Depozitul e aici
            </a>
            .
          </p>
          <ContributorStrip className="mt-8" />
        </Frame>
      </section>
    </div>
  )
}
