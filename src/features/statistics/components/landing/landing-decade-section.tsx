import { landingSourceSearch } from '../../lib/landing-source-search'
import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import type {
  NativeCountyChange,
  buildNativeCountyStory,
} from '../../lib/native-landing'
import type { NativeLandingProvenance } from '../../lib/native-landing-types'
import { statisticsTheme } from '../../lib/statistics-theme'
import {
  LandingIssues,
  LandingSource,
  LandingSourceCell,
} from './landing-source'

type Story = ReturnType<typeof buildNativeCountyStory>
/** A ranking is meaningful only when all 42 canonical counties are eligible. */
export function LandingDecadeSection({ story }: { readonly story: Story }) {
  return (
    <section className="space-y-4" aria-labelledby="landing-decade-heading">
      <div>
        <h2
          id="landing-decade-heading"
          className={statisticsTheme.sectionTitle}
        >
          <Trans>
            Schimbarea populației ({story.startYear} → {story.endYear})
          </Trans>
        </h2>
        <p className={statisticsTheme.sectionSubtitle}>
          <Trans>
            Populația după domiciliu la 1 ianuarie, pe județe și municipiul
            București. Schimbarea procentuală între cele două capete de
            interval.
          </Trans>
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        <Trans>
          Acoperire: {story.eligibleCount} din {story.expectedCount} teritorii
          eligibile.
        </Trans>
      </p>
      {story.status === 'UNAVAILABLE' ? (
        <>
          <p role="status" className="text-sm">
            <Trans>
              Clasamentul este indisponibil până când toate teritoriile au
              observații comparabile.
            </Trans>
          </p>
          <LandingIssues issues={story.issues} source={story.source} />
        </>
      ) : (
        <>
          {story.unchangedCount === story.expectedCount ? (
            <p role="status">
              <Trans>
                Toate teritoriile au aceeași populație la cele două capete de
                interval.
              </Trans>
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <RankedColumn
              title={<Trans>Cele mai mari scăderi</Trans>}
              entries={story.declines}
              maxAbsChange={story.maxAbsChange}
              source={story.source}
            />
            <RankedColumn
              title={<Trans>Cele mai mari creșteri</Trans>}
              entries={story.gains}
              maxAbsChange={story.maxAbsChange}
              source={story.source}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            <Trans>
              Primele cinci teritorii în fiecare direcție. Procente rotunjite la
              o zecimală; ordinea folosește valorile exacte.
            </Trans>
          </p>
        </>
      )}
      <LandingSource source={story.source} />
    </section>
  )
}
function RankedColumn({
  title,
  entries,
  maxAbsChange,
  source,
}: {
  readonly title: ReactNode
  readonly entries: readonly NativeCountyChange[]
  readonly maxAbsChange: number
  readonly source: NativeLandingProvenance
}) {
  if (!entries.length) return null
  return (
    <div className={statisticsTheme.band}>
      <h3 className="border-b border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ol className="p-1.5">
        {entries.map((entry) => (
          <li key={entry.code}>
            <Link
              to="/statistici/seturi/$cod"
              params={{ cod: source.descriptor.code }}
              search={{
                ...landingSourceSearch(source, entry.code, entry.start),
                din: entry.start.time_period.year,
                pana: entry.end.time_period.year,
              }}
              className={statisticsTheme.rankedRow}
            >
              <span
                className={statisticsTheme.rankedFill}
                style={{
                  width: `${maxAbsChange > 0 ? (Math.abs(entry.plotChange) / maxAbsChange) * 100 : 0}%`,
                }}
                aria-hidden="true"
              />
              <span className="relative min-w-0">
                <span>{entry.name ?? entry.code}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  <LandingSourceCell observation={entry.start} /> →{' '}
                  <LandingSourceCell observation={entry.end} />
                </span>
              </span>
              <span className={`relative ${statisticsTheme.rankedValue}`}>
                {entry.plotChange > 0 ? '+' : ''}
                {entry.pctChange}%
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
