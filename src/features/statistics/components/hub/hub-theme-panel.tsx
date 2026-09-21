import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { useLingui } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { cn } from '@/lib/utils'
import type { StatisticsLandingCatalog } from '@/schemas/statistics'
import { LANDING_THEMES } from '../../lib/landing-constants'
import { formatHubNumber } from '../../lib/hub-format'

const THEME_TONES = [
  'bg-primary/85',
  'bg-primary/65',
  'bg-primary/45',
  'bg-primary/30',
  'bg-foreground/30',
  'bg-foreground/22',
  'bg-foreground/15',
  'bg-foreground/10',
] as const

/**
 * The hero's panel: the catalog on its eight official domains — the strip for
 * proportion, one row per domain with count and share, each a saved query
 * into the explorer. It explains the first figure of the band below.
 *
 * The counts are datasets with observations, the destination is the whole
 * catalog for that domain: two populations, so the copy above the panel says
 * which one the number is, and the explorer's rail legend says it again.
 */
export function HubThemePanel({ catalog, className }: { readonly catalog: StatisticsLandingCatalog; readonly className?: string }) {
  const { i18n } = useLingui()
  const themes = LANDING_THEMES.map((theme, index) => ({
    code: theme.code,
    label: i18n._(theme.label),
    count: catalog.themes.find((entry) => entry.code === theme.code)?.count ?? 0,
    tone: THEME_TONES[index] ?? THEME_TONES[THEME_TONES.length - 1],
  }))
  const total = themes.reduce((sum, theme) => sum + theme.count, 0)
  const share = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0)

  return (
    <div className={className}>
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm bg-muted" role="img" aria-label={t`Seturi de date pe domenii`}>
        {themes.map((theme) => (
          <span
            key={theme.code}
            className={cn('block h-full', theme.tone)}
            style={{ width: `${total > 0 ? ((theme.count / total) * 100).toFixed(2) : 0}%` }}
          />
        ))}
      </div>
      <ol className="mt-4 divide-y divide-border/70 border-y border-border/70">
        {themes.map((theme) => (
          <li key={theme.code}>
            <Link
              to="/ins/seturi"
              search={{ context: theme.code }}
              className="flex items-center gap-3 py-2 transition-colors hover:bg-muted/40"
            >
              <span className={cn('size-2 shrink-0 rounded-[1px]', theme.tone)} aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">{theme.label}</span>
              <MonoLabel className="w-10 shrink-0 text-right text-muted-foreground">{share(theme.count)} %</MonoLabel>
              <span className="w-16 shrink-0 text-right text-sm tabular-nums text-foreground">{formatHubNumber(theme.count)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}
