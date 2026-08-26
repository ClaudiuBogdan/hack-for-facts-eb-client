import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import type { DecadeCountyChange, DecadeStory } from '../../lib/decade'
import { DECADE_DATASET_CODE } from '../../lib/landing-constants'
import { statisticsTheme } from '../../lib/statistics-theme'
import { formatObservationValue, formatPercent } from '../../lib/format'

type LandingDecadeSectionProps = {
  readonly story: DecadeStory | null
  /** The wire unit of the decade rows; persoane only as a last resort. */
  readonly unitLabel: string | null
}

/**
 * B2 — the decade story at county level. Top declines and top growth with an
 * inline proportion fill (the PNRR RankedListCard pattern re-implemented on
 * the neutral skin — that component is private to PNRR). Counties missing an
 * endpoint year are EXCLUDED with a footnote, never zero-filled. No „fastest
 * UATs" claim is possible or made — the 1,000-row clamp forbids it.
 */
export function LandingDecadeSection({ story, unitLabel }: LandingDecadeSectionProps) {
  if (!story || (story.declines.length === 0 && story.gains.length === 0)) {
    return null
  }

  return (
    <section className="space-y-4" aria-labelledby="landing-decade-heading">
      <div>
        <h2 id="landing-decade-heading" className={statisticsTheme.sectionTitle}>
          <Trans>
            Un deceniu de schimbare ({story.startYear} → {story.endYear})
          </Trans>
        </h2>
        <p className={statisticsTheme.sectionSubtitle}>
          <Trans>
            Populația după domiciliu, pe județe. Schimbarea procentuală între
            cele două capete de interval.
          </Trans>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <RankedColumn
          title={<Trans>Cele mai mari scăderi</Trans>}
          entries={story.declines}
          maxAbsChange={story.maxAbsChange}
        />
        <RankedColumn
          title={<Trans>Cele mai mari creșteri</Trans>}
          entries={story.gains}
          maxAbsChange={story.maxAbsChange}
        />
      </div>

      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className={statisticsTheme.provenanceChip}>{DECADE_DATASET_CODE}</span>
        <Trans>
          INS Tempo · {unitLabel ?? t`persoane`} · {story.rankedCount} județe
          comparate
        </Trans>
        {story.excludedCount > 0 ? (
          <Trans>
            · {story.excludedCount} județe fără ambele capete de interval au
            fost excluse
          </Trans>
        ) : null}
      </p>
    </section>
  )
}

function RankedColumn({
  title,
  entries,
  maxAbsChange,
}: {
  readonly title: ReactNode
  readonly entries: readonly DecadeCountyChange[]
  readonly maxAbsChange: number
}) {
  if (entries.length === 0) return null

  return (
    <div className={statisticsTheme.band}>
      <h3 className="border-b border-border/70 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ol className="p-1.5">
        {entries.map((entry) => (
          <li key={entry.countyCode}>
            <RankedRow entry={entry} maxAbsChange={maxAbsChange} />
          </li>
        ))}
      </ol>
    </div>
  )
}

function RankedRow({
  entry,
  maxAbsChange,
}: {
  readonly entry: DecadeCountyChange
  readonly maxAbsChange: number
}) {
  const fillPct =
    maxAbsChange > 0 ? (Math.abs(entry.pctChange) / maxAbsChange) * 100 : 0
  const startFormatted = formatObservationValue(String(entry.startValue))
  const endFormatted = formatObservationValue(String(entry.endValue))

  return (
    <Link
      to="/statistici/seturi/$cod"
      params={{ cod: DECADE_DATASET_CODE }}
      search={{ teritoriu: `cod:${entry.countyCode}` }}
      className={statisticsTheme.rankedRow}
    >
      <span
        className={statisticsTheme.rankedFill}
        style={{ width: `${fillPct}%` }}
        aria-hidden="true"
      />
      <span className="relative min-w-0 truncate">
        {entry.countyName ?? entry.countyCode}
        <span className="ml-2 hidden text-xs tabular-nums text-muted-foreground sm:inline">
          {startFormatted} → {endFormatted}
        </span>
      </span>
      <span className={`relative ${statisticsTheme.rankedValue}`}>
        {formatPercent(entry.pctChange, { signed: true })}
      </span>
    </Link>
  )
}
