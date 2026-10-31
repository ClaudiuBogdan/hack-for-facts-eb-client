import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { familyPlural } from '../shared/labels'
import { PROTOTYPE_HREF } from '../shared/parts'
import { OFFICE_ROLES, isDisputedYear, officeRole, type PlaceEdition, type PlaceEvent, type PlaceSheet } from './model'
import { ContestChip, OfficeName, PlacePage, editionsCount, electionsCount, roleLabel, rowsCount } from './parts'

/**
 * Variant B — the spine is a timeline of the elections reported here, newest
 * first: the year and family at the left, and at the right one column per
 * edition of that election, each listing its rows (the place's own offices
 * first, then the wider races reported here, then the source's labels). A
 * citizen reads by election, not by office; the editions stay side by side.
 */
function TimelineSpine({ sheet }: { readonly sheet: PlaceSheet }) {
  return (
    <ol className="divide-y divide-border/70 border-y border-border/70">
      {sheet.events.map((entry) => (
        <EventBlock key={entry.event.key} entry={entry} />
      ))}
    </ol>
  )
}

function EventBlock({ entry }: { readonly entry: PlaceEvent }) {
  const disputed = isDisputedYear(entry.event)
  return (
    <li className="grid grid-cols-1 gap-5 py-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-8">
      <div className="min-w-0">
        <a href={PROTOTYPE_HREF.election(entry.event.key)} className="group block">
          <span className="block text-3xl font-semibold tabular-nums tracking-tight text-foreground group-hover:underline group-hover:underline-offset-4">
            {disputed ? `„${String(entry.event.year)}”` : entry.event.year}
            {disputed ? (
              <>
                <span className="text-status-partial-fg" aria-hidden="true">
                  ✱
                </span>
                <span className="sr-only"> {t`(an disputat: date din 2016)`}</span>
              </>
            ) : null}
          </span>
          <MonoLabel className="mt-1 block text-muted-foreground">
            {familyPlural(entry.event.family)}
            {entry.event.instance === 'partial' ? ` · ${t`parțiale`}` : null}
          </MonoLabel>
        </a>
        <p className="mt-2 text-xs tabular-nums text-muted-foreground">
          {entry.editions.length > 1 ? <Trans>{editionsCount(entry.editions.length)}, care nu se adună</Trans> : editionsCount(entry.editions.length)}
        </p>
      </div>
      {/* Always three columns from a wide screen, so one edition takes the width two or three would: the blocks align down the page. */}
      <div className="grid min-w-0 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {entry.editions.map((edition) => (
          <EditionColumn key={edition.edition.key} entry={entry} edition={edition} />
        ))}
      </div>
    </li>
  )
}

function EditionColumn({ entry, edition }: { readonly entry: PlaceEvent; readonly edition: PlaceEdition }) {
  const rows = OFFICE_ROLES.flatMap((role) => edition.rows.filter((row) => officeRole(row.office) === role))
  return (
    <div className="min-w-0">
      <a
        href={PROTOTYPE_HREF.election(entry.event.key)}
        className="block truncate font-mono text-[11px] leading-4 text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4"
        title={edition.edition.key}
      >
        {edition.edition.key}
      </a>
      {/* Each edition's own rows here: the editions of one election are never added. */}
      <span className="block text-xs tabular-nums text-muted-foreground">{rowsCount(edition.rows.length)}</span>
      <ul className="mt-2 divide-y divide-border/60 border-y border-border/60">
        {rows.map((row) => {
          const role = officeRole(row.office)
          return (
            <li key={row.contestKey} className="flex items-center justify-between gap-3 py-1.5">
              <span className="min-w-0">
                <OfficeName office={row.office} className={cn('text-sm', role === 'own' ? 'text-foreground' : 'text-muted-foreground')} />
                {role === 'wider' ? (
                  <MonoLabel className="ml-2 text-muted-foreground/80" title={roleLabel(role)}>
                    <Trans>loc de raportare</Trans>
                  </MonoLabel>
                ) : null}
              </span>
              <ContestChip round={row.round} editionKey={row.edition.key} />
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function LocalitateCronologie() {
  return (
    <PlacePage
      spine={{
        id: 'cronologie',
        label: t`Cronologie`,
        title: <Trans>Alegerile raportate aici, de la cea mai nouă</Trans>,
        lede: (sheet) => (
          <Trans>
            {electionsCount(sheet.elections)}, în {editionsCount(sheet.editions)}, fiecare cu rândurile ei. Edițiile unei alegeri stau una lângă alta și nu se adună; „loc de
            raportare” marchează o cursă mai largă decât localitatea.
          </Trans>
        ),
        full: true,
        render: (sheet) => <TimelineSpine sheet={sheet} />,
      }}
    />
  )
}
