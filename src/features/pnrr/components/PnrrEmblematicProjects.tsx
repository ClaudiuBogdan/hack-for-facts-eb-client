import { useMemo } from 'react'
import { Trans } from '@lingui/react/macro'
import type { PnrrProject } from '@/schemas/pnrr'
import {
  EMBLEMATIC_PROJECTS,
  projectMatchesEmblematicConfig,
  type EmblematicProjectConfig,
} from '../data/emblematic-projects'
import { PNRR_COMPONENTS } from '../data/component-definitions'
import { usePnrrCurrency } from '../lib/usePnrrCurrency'
import {
  formatPnrrCurrency,
  getPnrrCurrencyDisplayParts,
} from '../lib/formatting'

function getAccentColor(componentCode: string): string {
  return PNRR_COMPONENTS[componentCode]?.color ?? 'var(--pnrr-fg)'
}

export function PnrrEmblematicProjects({
  projects,
  onProjectClick,
}: {
  readonly projects: readonly PnrrProject[]
  readonly onProjectClick: (project: PnrrProject) => void
}) {
  const currency = usePnrrCurrency()
  const emblematic = useMemo(() => {
    const matched: Array<{
      readonly config: EmblematicProjectConfig
      readonly project: PnrrProject
    }> = []

    for (const config of EMBLEMATIC_PROJECTS) {
      let bestMatch: PnrrProject | null = null

      for (const project of projects) {
        const isCandidate =
          config.componentCodes.includes(project.componentCode) &&
          projectMatchesEmblematicConfig(project.title, config)

        if (
          isCandidate &&
          (!bestMatch || project.valueEur > bestMatch.valueEur)
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
          p.techProgress === 'in-implementation' ? 15 : (p.techProgress ?? 0)
        const finVal =
          p.finProgress === 'in-implementation' ? 15 : (p.finProgress ?? 0)

        const techDisplay =
          p.techProgress === 'in-implementation' ? '<30%' : `${techVal}%`
        const finDisplay =
          p.finProgress == null
            ? '—'
            : p.finProgress === 'in-implementation'
              ? '<30%'
              : `${finVal}%`

        const formattedAmount = formatPnrrCurrency(p.valueEur, currency)
        const { amount, unit } = getPnrrCurrencyDisplayParts(formattedAmount)

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
                label={<Trans>Technical</Trans>}
                value={techVal}
                display={techDisplay}
                accentColor={accentColor}
              />

              <ProgressRow
                label={<Trans>Financial</Trans>}
                value={finVal}
                display={finDisplay}
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
  accentColor,
}: {
  readonly label: React.ReactNode
  readonly value: number
  readonly display: string
  readonly accentColor: string
}) {
  return (
    <div className="grid grid-cols-[72px_1fr_48px] items-center gap-3">
      <span className="text-sm font-bold text-[var(--pnrr-fg)]">{label}</span>
      <div
        className="h-2 border border-[var(--pnrr-border)] bg-transparent"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label}: ${display}`}
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
    </div>
  )
}
