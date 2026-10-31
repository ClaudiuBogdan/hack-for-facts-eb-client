import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import { familyPlural } from '../shared/labels'
import { PROTOTYPE_HREF } from '../shared/parts'
import { OFFICE_ROLES, isDisputedYear, type PlaceSheet } from './model'
import { ContestChip, OfficeName, PlacePage, editionsCount, electionsCount, roleLabel } from './parts'

/**
 * Variant A — the spine is an offices × elections matrix: a row per reported
 * office (grouped by what it is to the place), a column per election
 * reported here, and in each cell one chip per edition and round, linking to
 * the contest row. Two editions of one election sit side by side in the cell;
 * nothing is added. The editions' keys sit in the foot of each column.
 */
function MatrixSpine({ sheet }: { readonly sheet: PlaceSheet }) {
  const groups = OFFICE_ROLES.map((role) => ({ role, offices: sheet.offices.filter((office) => office.role === role) })).filter((group) => group.offices.length > 0)
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{t`Funcțiile raportate la această localitate, pe alegeri; fiecare celulă deschide rândul de scrutin`}</caption>
        <thead>
          <tr className="align-bottom">
            <th scope="col" className="sticky left-0 z-10 w-44 min-w-36 bg-background pb-2 pr-3 text-left font-normal">
              <MonoLabel className="text-muted-foreground">
                <Trans>Funcția raportată</Trans>
              </MonoLabel>
            </th>
            {sheet.columns.map((column) => (
              <th key={column.event.key} scope="col" className="min-w-24 px-1 pb-2 text-left font-normal">
                <a href={PROTOTYPE_HREF.election(column.event.key)} className="group block">
                  <MonoLabel className="block text-muted-foreground">{familyPlural(column.event.family)}</MonoLabel>
                  <span className="mt-0.5 block text-base font-semibold tabular-nums tracking-tight text-foreground group-hover:underline group-hover:underline-offset-4">
                    {isDisputedYear(column.event) ? `„${String(column.event.year)}”` : column.event.year}
                    {isDisputedYear(column.event) ? (
                      <>
                        <span className="text-status-partial-fg" aria-hidden="true">
                          ✱
                        </span>
                        <span className="sr-only"> {t`(an disputat: date din 2016)`}</span>
                      </>
                    ) : null}
                    {column.event.instance === 'partial' ? <span className="ml-1 text-xs font-normal text-muted-foreground">{t`parțiale`}</span> : null}
                  </span>
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((group) => (
            <GroupRows key={group.role} label={roleLabel(group.role)} sheet={sheet} offices={group.offices.map((office) => office.office)} muted={group.role !== 'own'} />
          ))}
        </tbody>
        <tfoot>
          <tr className="align-top">
            <th scope="row" className="sticky left-0 z-10 bg-background pr-3 pt-3 text-left font-normal">
              <MonoLabel className="text-muted-foreground">
                <Trans>Edițiile</Trans>
              </MonoLabel>
            </th>
            {sheet.columns.map((column) => (
              <td key={column.event.key} className="px-1 pt-3 align-top">
                <ul className="space-y-1">
                  {column.editions.map((entry) => (
                    <li key={entry.edition.key}>
                      <a
                        href={PROTOTYPE_HREF.election(column.event.key)}
                        className="block truncate font-mono text-[11px] leading-4 text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4"
                        title={entry.edition.key}
                      >
                        {entry.edition.key}
                      </a>
                    </li>
                  ))}
                </ul>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function GroupRows({ label, sheet, offices, muted }: { readonly label: string; readonly sheet: PlaceSheet; readonly offices: readonly string[]; readonly muted: boolean }) {
  return (
    <>
      <tr>
        <th scope="colgroup" colSpan={sheet.columns.length + 1} className="sticky left-0 border-b border-border/70 pb-1.5 pt-5 text-left font-normal first:pt-0">
          <MonoLabel className={cn('block', muted ? 'text-muted-foreground' : 'text-primary')}>{label}</MonoLabel>
        </th>
      </tr>
      {offices.map((office) => (
        <tr key={office} className="border-b border-border/60">
          <th scope="row" className="sticky left-0 z-10 bg-background py-1.5 pr-3 text-left font-normal">
            <OfficeName office={office} className="text-foreground" />
          </th>
          {sheet.columns.map((column) => {
            const rows = column.rows.filter((row) => row.office === office)
            return (
              <td key={column.event.key} className="px-1 py-1.5 align-top">
                {rows.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {rows.map((row) => (
                      <ContestChip key={row.contestKey} round={row.round} editionKey={row.edition.key} />
                    ))}
                  </span>
                ) : (
                  <span className="flex h-6 items-center">
                    <span className="size-1 rounded-full bg-muted-foreground/40" aria-hidden="true" />
                    <span className="sr-only">{t`niciun rând`}</span>
                  </span>
                )}
              </td>
            )
          })}
        </tr>
      ))}
    </>
  )
}

export function LocalitateMatrice() {
  return (
    <PlacePage
      spine={{
        id: 'ani',
        label: t`Pe alegeri`,
        title: <Trans>Funcțiile raportate, pe alegeri</Trans>,
        lede: (sheet) => (
          <Trans>
            {electionsCount(sheet.elections)}, în {editionsCount(sheet.editions)}: un cip e un rând de scrutin al unei ediții, cu turul așa cum îl etichetează sursa. Două ediții
            ale unei alegeri stau una lângă alta, nu se adună.
          </Trans>
        ),
        full: true,
        render: (sheet) => <MatrixSpine sheet={sheet} />,
      }}
    />
  )
}
