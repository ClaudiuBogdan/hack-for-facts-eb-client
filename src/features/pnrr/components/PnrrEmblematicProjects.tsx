import { useMemo } from 'react'
import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import type { PnrrReportedProgress } from '@/schemas/pnrr'
import type { PnrrWorkerProjectRow } from '../workers/pnrr-worker-types'
import {
  EMBLEMATIC_PROJECTS,
  projectMatchesEmblematicConfig,
  type EmblematicProjectConfig,
} from '../data/emblematic-projects'
import { PNRR_COMPONENTS } from '../data/component-definitions'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import { formatPnrrCurrency, formatPnrrPercentage } from '../lib/formatting'
import { formatPnrrCompactCurrencyDisplayParts } from './pnrr-compact-currency-display'

function getAccentColor(componentCode: string): string {
  return PNRR_COMPONENTS[componentCode]?.color ?? 'var(--pnrr-fg)'
}

function getProgressDisplay(progress: PnrrReportedProgress): string {
  if (progress === null) return t`No data`
  if (progress === 'under-30-reported') {
    return t`Under 30% (reported category)`
  }
  if (progress === 'in-implementation') {
    return t`In implementation (percentage not published)`
  }
  return formatPnrrPercentage(progress)
}

export function PnrrEmblematicProjects({
  projects,
  onProjectClick,
}: {
  readonly projects: readonly PnrrWorkerProjectRow[]
  readonly onProjectClick: (project: PnrrWorkerProjectRow) => void
}) {
  const currency = usePnrrCurrency()
  const emblematic = useMemo(() => {
    const matched: Array<{
      readonly config: EmblematicProjectConfig
      readonly project: PnrrWorkerProjectRow
    }> = []

    for (const config of EMBLEMATIC_PROJECTS) {
      let bestMatch: PnrrWorkerProjectRow | null = null

      for (const project of projects) {
        const isCandidate =
          config.componentCodes.includes(project.componentCode) &&
          projectMatchesEmblematicConfig(project.title, config)

        if (
          isCandidate &&
          (!bestMatch ||
            (project.totalValueEur ?? project.valueEur) >
              (bestMatch.totalValueEur ?? bestMatch.valueEur))
        ) {
          bestMatch = project
        }
      }

      if (bestMatch) {
        matched.push({ config, project: bestMatch })
      }
    }

    return matched.slice(0, 9)
  }, [projects])

  if (emblematic.length === 0) return null

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {emblematic.map(({ config, project: p }) => {
        const accentColor = getAccentColor(p.componentCode)
        const comp = PNRR_COMPONENTS[p.componentCode]

        const techVal =
          typeof p.techProgress === 'number' ? p.techProgress : null
        const finVal =
          typeof p.finProgress === 'number' ? p.finProgress : null
        const techDisplay = getProgressDisplay(p.techProgress)
        const finDisplay = getProgressDisplay(p.finProgress)

        const projectValue = p.totalValueEur ?? p.valueEur
        const formattedAmount = formatPnrrCurrency(projectValue, currency)
        const { amount, unit } = formatPnrrCompactCurrencyDisplayParts(projectValue, currency)

        return (
          <button
            key={config.id}
            onClick={() => onProjectClick(p)}
            className="flex min-h-[220px] flex-col border-2 border-[var(--pnrr-border)] bg-[var(--pnrr-card)] p-6 text-left transition-colors hover:bg-[var(--pnrr-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pnrr-blue)]"
            style={{ borderRadius: '6px' }}
            aria-label={`${config.labelRo} — ${formattedAmount}`}
          >
            {/* Title + amount */}
            <div className="grid grid-cols-[1fr_auto] gap-4">
              <h3 className="text-xl font-black leading-tight text-[var(--pnrr-fg)]">
                {config.labelRo}
              </h3>
              <div className="text-right">
                <span className="block text-2xl font-black leading-none text-[var(--pnrr-fg)]">
                  {amount}
                </span>
                {unit && (
                  <span className="block text-sm font-bold text-[var(--pnrr-fg)]">
                    {unit}
                  </span>
                )}
              </div>
            </div>

            {/* Component code + category */}
            <div className="mt-5 flex items-center gap-3">
              <span
                className="inline-flex h-8 min-w-[3rem] items-center justify-center border-2 px-2 text-sm font-black"
                style={{ borderColor: accentColor, color: accentColor }}
              >
                {p.componentCode}
              </span>
              {comp && (
                <span className="text-sm font-bold text-[var(--pnrr-fg)]">
                  {comp.nameRo}
                </span>
              )}
            </div>

            {/* Divider */}
            <div className="my-5 border-t-2 border-[var(--pnrr-border)]" />

            {/* Progress rows */}
            <div className="mt-auto space-y-3">
              <ProgressRow
                label={<Trans>Tehnic raportat</Trans>}
                value={techVal}
                display={techDisplay}
                ariaLabel={t`Reported technical progress`}
                accentColor={accentColor}
              />

              <ProgressRow
                label={<Trans>Financiar raportat</Trans>}
                value={finVal}
                display={finDisplay}
                ariaLabel={t`Reported financial progress`}
                accentColor={accentColor}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function ProgressRow({
  label,
  value,
  display,
  ariaLabel,
  accentColor,
}: {
  readonly label: React.ReactNode
  readonly value: number | null
  readonly display: string
  readonly ariaLabel: string
  readonly accentColor: string
}) {
  return (
    <div className="grid grid-cols-[72px_1fr_auto] items-center gap-3">
      <span className="text-sm font-bold text-[var(--pnrr-fg)]">{label}</span>
      {value === null ? (
        <span
          className="col-span-2 border border-dashed border-[var(--pnrr-border)] px-2 py-1 text-right text-xs font-bold text-[var(--pnrr-muted)]"
          aria-label={`${ariaLabel}: ${display}`}
        >
          {display}
        </span>
      ) : (
        <>
          <div
            className="h-2 border border-[var(--pnrr-border)] bg-transparent"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={ariaLabel}
          >
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(value, 100)}%`,
                backgroundColor: accentColor,
              }}
            />
          </div>
          <span className="text-right text-sm font-black text-[var(--pnrr-fg)]">
            {display}
          </span>
        </>
      )}
    </div>
  )
}
