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

/** The line under a name: small plain text, in the person's own casing. */
const PERSON_LINE_CLASS = 'mt-1 text-xs leading-snug text-muted-foreground'

/**
 * The landing's people band, the page's last.
 *
 * The contents only. The `section` and the `Frame` around it belong to the
 * landing, the way they do for every other band.
 *
 * Three tiers, because they are three different claims: the person accountable
 * for the platform (the founder), the handful who kept it alive (the
 * supporters), and everyone who put something in (the contributors). The
 * shapes this beat are recorded in `docs/design/landing/design.md`.
 */

/**
 * A person's art, in the shape the slot wants. A plain picture: the social row
 * under the name is the link to the person's page.
 *
 * `people-art.tsx` owns the stack; this owns the box it stands in. Anyone
 * without a cut-out falls back to the drawn silhouette.
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
  return (
    <div className={className}>
      <PersonCollage
        variant={variant}
        cut={PORTRAIT_CUTS[person.id] ?? 'a'}
        portrait={person.portrait}
        fallback={<PendingPortrait className="w-full" />}
        className={cn('w-full', ratio)}
      />
    </div>
  )
}

export function PeopleBand() {
  const { i18n } = useLingui()
  return (
    <>
      {/* One grid, four blocks. On a phone they stack in reading order:
          heading, the lead that introduces the band, the founder, the angels.
          From `md` they sit in two rows on the 5/6-of-12 split — heading and
          lead, then the founder and the angels, so the founder's portrait and
          the angels' label start on the same line. The vertical rhythm is in
          the items' margins, since a phone and a desktop want different gaps. */}
      <div className="grid grid-cols-1 md:grid-cols-12 md:gap-x-8">
        <h2 data-reveal className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:col-span-5">
          <Trans>
            Oamenii din spatele
            <br />
            platformei
          </Trans>
        </h2>

        <p data-reveal className="mt-4 text-base leading-relaxed text-muted-foreground md:col-span-6 md:col-start-7 md:mt-0">
          <Trans>
            Transparenta există datorită oamenilor care o susțin: cu timp, idei, date sau o ușă
            deschisă atunci când conta.
          </Trans>
        </p>

        <div data-reveal className="mt-8 md:col-span-5">
          {/* Capped at 380 rather than left to fill the 5/12 column. */}
          <RevealPortrait person={FOUNDER} variant="founder" className="max-w-[380px]" />
          <h3 className="mt-5 text-lg font-semibold tracking-tight text-foreground">
            {FOUNDER.name}
          </h3>
          <p className={PERSON_LINE_CLASS}>{personText(i18n, FOUNDER.role)}</p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {personText(i18n, FOUNDER.blurb)}
          </p>
          {/* The phone margin is the desktop one less the 12px the taller touch
              targets add above their glyphs. */}
          <SocialRow person={FOUNDER} className="mt-1 sm:mt-4" />
        </div>

        <div className="mt-12 md:col-span-6 md:col-start-7 md:mt-8">
          <MonoLabel data-reveal className="block text-primary">
            <Trans>Principalii promotori</Trans>
          </MonoLabel>
          {/* Two by two, the pictures filling their tracks. */}
          <ul data-reveal className="mt-4 grid grid-cols-2 gap-x-5 gap-y-6">
            {ANGELS.map((angel) => (
              /* `flex-col` + `mt-auto` on the links: a line that wraps to two
                 must not push one cell's icons below its neighbours'. */
              <li key={angel.id} className="flex h-full flex-col">
                {/* Square, not 4:5: the angels' art is cut to the shape it
                    will need rather than to the stand-in's. */}
                <RevealPortrait person={angel} variant="angel" ratio="aspect-square" />
                <p className="mt-3 text-sm font-medium leading-tight text-foreground">
                  {angel.name}
                </p>
                <p className={PERSON_LINE_CLASS}>{personText(i18n, angel.role)}</p>
                <SocialRow person={angel} className="mt-auto pt-0 sm:pt-2.5" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Contributors close the band, under a caption of their own. */}
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
