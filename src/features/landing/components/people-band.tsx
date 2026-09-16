import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import type { I18n, MessageDescriptor } from '@lingui/core'
import { ANGELS, FOUNDER, type Person } from '@/features/landing/lib/people'
import { ContributorGrid, PendingPortrait, SocialRow } from './people-parts'
import { cn } from '@/lib/utils'
import { PersonCollage } from './people-art'
import type { ShardCut } from './shards'
import { MonoLabel } from '@/components/landing-skin/mono-label'

/** A person's line is either an institution's own name or our wording. */
const personText = (i18n: I18n, value: string | MessageDescriptor) =>
  typeof value === 'string' ? value : i18n._(value)

/** Keep each person's artwork stable when the list is reordered. */
const PORTRAIT_CUTS: Readonly<Record<string, ShardCut>> = {
  claudiu: 'a',
  'angel-1': 'b',
  'angel-2': 'c',
  'angel-3': 'd',
  'angel-4': 'e',
}

/**
 * `03 / Oameni` — the landing's people band.
 *
 * The contents only. The `section` and the `Frame` around it belong to the
 * landing, the way they do for every other band; this file owns what is inside
 * one, so the page keeps deciding its own rhythm.
 *
 * Shape settled: the founder anchors the left column and the angels fill the
 * right, on the same 5/6-of-12 split that `01` and `02` already stand on. The
 * two shapes it beat — everyone on one row, and the portrait given the whole
 * band — are recorded in `docs/design/landing/design.md`.
 *
 * Three tiers, because they are three different claims and one grid would say
 * they are the same one: the person accountable for the platform, the handful
 * who kept it alive, and everyone who put something in — which is a longer list
 * than the one with commits on it. All three share the band; the third is under
 * a rule rather than under a number of its own.
 */
/**
 * A person's art, in the shape the slot wants.
 *
 * `home-refs.people-art.tsx` owns the stack; this owns the box it stands in.
 * The box's shape is the caller's, not the art's — `fit`-style containment
 * inside a percentage-placed stack means art of any ratio sits in whatever box
 * it is given without cropping, which is how the angels' slots could be squared
 * off before the art that fills them exists.
 *
 * Anyone without a cut-out falls back to the drawn silhouette, which has no
 * arrival of its own: there is nothing to wait for.
 */
function RevealPortrait({
  person,
  variant,
  ratio = 'aspect-4/5',
  className,
}: {
  readonly person: Person
  readonly variant: 'founder' | 'angel'
  readonly ratio?: string
  readonly className?: string
}) {
  const art = (
    <PersonCollage
      variant={variant}
      cut={PORTRAIT_CUTS[person.id] ?? 'a'}
      portrait={person.portrait}
      fallback={<PendingPortrait className="w-full" />}
      className={cn('w-full', ratio)}
    />
  )

  const facebook = person.links.facebook
  if (facebook === undefined || facebook === '#') {
    return <div className={className}>{art}</div>
  }

  /*
   * The picture is a link to the person's own page.
   *
   * It needs a name of its own: the portrait is decorative — `alt=""`, because
   * the heading beside it already says who this is — and a link wrapping
   * nothing announceable is a link with no name at all. The same profile is
   * reachable from the glyph row below, which is a duplicate on purpose: one is
   * the obvious target and the other is the discoverable one.
   */
  return (
    <a
      href={facebook}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t`${person.name} pe Facebook`}
      className={cn(
        'block rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      {art}
    </a>
  )
}

export function PeopleBand() {
  const { i18n } = useLingui()
  return (
    <>
    {/* One grid, not two stacked ones.
     *
     * The heading used to sit in its own row above the people, which meant the
     * left column ran out of content while the lead and the link beside it kept
     * growing — about 200px of nothing between `platformei` and the portrait at
     * 1440. Putting the heading and the founder in the same column closes it,
     * and the portrait now starts where the heading ends. */}
    {/* Two columns from `md`, not `lg`. Stacked, the angels fill the whole
        frame two abreast — 318px each at 768, bigger than the founder's
        proportion allows and 2116px of band. The 5/6 split at an iPad's
        width gives a 273px founder and 157px angels, which is the desktop
        shape at the desktop's ratios. */}
    <div className="grid grid-cols-1 gap-12 md:grid-cols-12 md:gap-8">
      <div className="md:col-span-5">
        <MonoLabel className="block text-primary" data-reveal>
          <Trans>03 / Oameni</Trans>
        </MonoLabel>
        <h2
          data-reveal
          className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
        >
          <Trans>
            Cine e în spatele
            <br />
            platformei
          </Trans>
        </h2>

        <div data-reveal className="mt-8">
          {/* Capped at 380 rather than left to fill the 5/12 column: the band
              got tighter by losing dead space, not by growing the art. */}
          <RevealPortrait person={FOUNDER} variant="founder" className="max-w-[380px]" />
          <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
            {FOUNDER.name}
          </h3>
          <MonoLabel className="mt-2 block text-muted-foreground">
            {personText(i18n, FOUNDER.role)}
          </MonoLabel>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            {personText(i18n, FOUNDER.blurb)}
          </p>
          {/* The phone margins are the desktop ones less the 12px the taller
              touch targets add above their glyphs and text, so the band looks
              the same and only the hit areas grew. The link to a dedicated
              page sat here in the prototype; it returns with the page. */}
          <SocialRow person={FOUNDER} className="mt-1 sm:mt-4" />
        </div>
      </div>

      <div className="md:col-span-6 md:col-start-7">
        <p data-reveal className="text-base leading-relaxed text-muted-foreground">
          <Trans>
            Platforma e scrisă de un singur om și a rămas în picioare pentru că alți câțiva au
            dat timp, date sau o ușă deschisă atunci când conta.
          </Trans>
        </p>
        {/* The angels start where the founder's portrait starts.

            The two columns used to begin their pictures 200px apart — the lead,
            the link and an explanatory sentence stacked up on this side while
            the other only had a heading to clear. The sentence is gone (it
            explained the one-line rule to the reader rather than to whoever
            writes the lines), the link moved under the founder, and these two
            margins are what is left to tune. */}
        <MonoLabel data-reveal className="mt-5 block text-primary">
          <Trans>Îngerii păzitori</Trans>
        </MonoLabel>
        {/* Two by two, filling the column.

            The tracks were capped at 13rem while the pictures were 140px, which
            is what put 146px of nothing between them. Now the pictures fill
            their tracks, so the cap has nothing left to do except leave 230px
            of column unused and a ragged right edge under a paragraph that runs
            the full width. Without it the art is 264px, the gap is the gap, and
            the block ends where everything above it ends. */}
        <ul data-reveal className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6">
          {ANGELS.map((angel) => (
            /* `flex-col` + `mt-auto` on the links: a role that wraps to two
               lines must not push one cell's icons below its neighbours'. */
            <li key={angel.id} className="flex h-full flex-col">
              {/* Square, not 4:5. The angels' art is going to carry side
                 elements the founder's does not, so the slot is cut to the
                 shape it will need rather than to the shape the stand-in
                 happens to be — which is why it is pillarboxed today. */}
              <RevealPortrait
                person={angel}
                variant="angel"
                ratio="aspect-square"
              />
              <p className="mt-3 text-sm font-medium leading-tight text-foreground">
                {angel.name}
              </p>
              <MonoLabel className="mt-2 block leading-relaxed text-muted-foreground">
                {personText(i18n, angel.role)}
              </MonoLabel>
              <SocialRow person={angel} className="mt-auto pt-0 sm:pt-2.5" />
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
          <Trans>Contribuitori</Trans>
        </MonoLabel>
        <div data-reveal>
          <ContributorGrid className="mt-6" />
        </div>
      </div>
    </>
  )
}
