import { ANGELS, FOUNDER, type Person } from './about.people'
import {
  ContributorGrid,
  PendingPortrait,
  ReadMoreLink,
  SocialRow,
} from './about.parts'
import { cn } from '@/lib/utils'
import { GroupPicture, PICTURE_ATTR } from './home-refs.image-reveal'
import { MonoLabel } from './home-refs.mono-label'

/**
 * `03 / Oameni` — the landing's people band.
 *
 * The contents only. The `section` and the `Frame` around it belong to the
 * landing, the way they do for every other band; this file owns what is inside
 * one, so the page keeps deciding its own rhythm.
 *
 * Shape settled: the founder anchors the left column and the angels fill the
 * right, on the same 5/6-of-12 split that `01` and `02` already stand on.
 * `about.prototype.tsx` keeps the two it beat — `bench`, which puts everyone on
 * one row, and `stage`, which gives the portrait the whole band — so the
 * question does not get reopened from scratch.
 *
 * Three tiers, because they are three different claims and one grid would say
 * they are the same one: the person accountable for the platform, the handful
 * who kept it alive, and everyone who put something in — which is a longer list
 * than the one with commits on it. All three share the band; the third is under
 * a rule rather than under a number of its own.
 */
/**
 * A portrait that arrives the way the page's other illustrations do.
 *
 * `home-refs.image-reveal.tsx`, round six — rather than the plain block reveal,
 * because it is the same kind of object: a cut-out on transparency at 4:5, the
 * crop the art was made at, so `contain` letterboxes nothing. `.tpz-pic` is
 * absolute, so the cell has to hold the box itself.
 *
 * Anyone without art falls back to the drawn silhouette, which has no arrival
 * of its own — there is nothing to wait for.
 */
function RevealPortrait({
  person,
  className,
}: {
  readonly person: Person
  readonly className?: string
}) {
  if (person.portrait === undefined) return <PendingPortrait className={className} />

  return (
    <div {...{ [PICTURE_ATTR]: '' }} className={cn('relative aspect-4/5 w-full', className)}>
      <GroupPicture
        src={person.portrait.webp}
        avif={person.portrait.avif ?? person.portrait.webp}
        fit="contain"
        position="50% 50%"
        width={person.portrait.width}
        height={person.portrait.height}
      />
    </div>
  )
}

export function PeopleBand() {
  return (
    <>
    {/* One grid, not two stacked ones.
     *
     * The heading used to sit in its own row above the people, which meant the
     * left column ran out of content while the lead and the link beside it kept
     * growing — about 200px of nothing between `platformei` and the portrait at
     * 1440. Putting the heading and the founder in the same column closes it,
     * and the portrait now starts where the heading ends. */}
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-5">
        <MonoLabel className="block text-primary" data-reveal>
          03 / Oameni
        </MonoLabel>
        <h2
          data-reveal
          className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          Cine e în spatele
          <br />
          platformei
        </h2>

        <div data-reveal className="mt-8">
          {/* Capped at 380 rather than left to fill the 5/12 column: the band
              got tighter by losing dead space, not by growing the art. */}
          <RevealPortrait person={FOUNDER} className="max-w-[380px]" />
          <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
            {FOUNDER.name}
          </h3>
          <MonoLabel className="mt-2 block text-muted-foreground">{FOUNDER.role}</MonoLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{FOUNDER.blurb}</p>
          <SocialRow person={FOUNDER} className="mt-4" />
        </div>
      </div>

      <div className="lg:col-span-6 lg:col-start-7">
        <p data-reveal className="text-base leading-relaxed text-muted-foreground">
          Platforma e scrisă de un singur om și a rămas în picioare pentru că
          alți câțiva au dat timp, date sau o ușă deschisă atunci când conta.
          Aici sunt pe scurt; povestea lungă e pe pagina dedicată.
        </p>
        <div data-reveal className="mt-5">
          <ReadMoreLink />
        </div>

        <MonoLabel data-reveal className="mt-12 block text-primary">
          Îngerii păzitori
        </MonoLabel>
        <p data-reveal className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Oamenii fără de care proiectul s-ar fi oprit. Câte o singură propoziție
          despre ce a făcut fiecare — nu un CV.
        </p>
        {/* Two by two. Four across the 6-column half would leave each name about
            120px to wrap in; a row of three plus an orphan is worse.

            The tracks are capped rather than left at half the column each. Two
            free halves put 146px between one 140px portrait and the next — the
            gap was mostly the empty right end of each cell, not the gap
            property. Capped at 13rem the pictures sit 88px apart, and the roles
            still have the width they need to stay on two lines. */}
        <ul
          data-reveal
          className="mt-8 grid grid-cols-2 gap-x-5 gap-y-7 lg:grid-cols-[repeat(2,minmax(0,13rem))]"
        >
          {ANGELS.map((angel) => (
            /* `flex-col` + `mt-auto` on the links: a role that wraps to two
               lines must not push one cell's icons below its neighbours'. */
            <li key={angel.id} className="flex h-full flex-col">
              <RevealPortrait person={angel} className="max-w-[140px]" />
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

      {/* Contributors close the same band rather than opening their own.

          They were `04 /` for a while. But the page numbers *subjects*, and
          this is not a second subject — it is the same one at a third weight,
          after the founder and the angels. The caption alone says that: a
          number said the band above had finished, and a rule said the same
          thing more quietly. Space is enough.

          The caption that used to sit opposite the label is gone too: it
          explained what counts as contributing, and the faces do not need the
          explanation to be understood as people who helped. */}
      <div className="mt-14">
        <MonoLabel data-reveal className="block text-primary">
          Contribuitori
        </MonoLabel>
        <div data-reveal>
          <ContributorGrid className="mt-6" />
        </div>
      </div>
    </>
  )
}
