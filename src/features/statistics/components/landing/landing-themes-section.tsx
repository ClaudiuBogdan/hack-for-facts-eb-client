import { Link } from '@tanstack/react-router'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import { ArrowRight } from 'lucide-react'
import type { StatisticsLandingCatalog } from '@/schemas/statistics'
import { LANDING_THEMES } from '../../lib/landing-constants'
import { statisticsTheme } from '../../lib/statistics-theme'

type LandingThemesSectionProps = {
  readonly catalog: StatisticsLandingCatalog | undefined
}

/**
 * B4 — the eight INS top-level groups as explorer entry points. Counts are
 * live per-theme totals; labels are the translatable theme map (the API's own
 * group names carry raw HTML and shouting caps).
 */
export function LandingThemesSection({ catalog }: LandingThemesSectionProps) {
  const { i18n } = useLingui()
  if (!catalog) return null

  const countByCode = new Map(
    catalog.themes.map((theme) => [theme.code, theme.count]),
  )

  // Orphan-heading guard: no surviving theme, no section shell.
  const visibleThemes = LANDING_THEMES.filter(
    (theme) => (countByCode.get(theme.code) ?? 0) > 0,
  )
  if (visibleThemes.length === 0) return null

  return (
    <section className="space-y-4" aria-labelledby="landing-themes-heading">
      <div>
        <h2 id="landing-themes-heading" className={statisticsTheme.sectionTitle}>
          <Trans>Explorează pe teme</Trans>
        </h2>
        <p className={statisticsTheme.sectionSubtitle}>
          <Trans>Toate seturile INS Tempo, grupate pe domeniile oficiale.</Trans>
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {visibleThemes.map((theme) => {
          const count = countByCode.get(theme.code) ?? 0
          return (
            <li key={theme.code}>
              <Link
                to="/statistici/seturi"
                search={{ context: theme.code, stare: 'available' }}
                className="group flex h-full items-start justify-between gap-2 rounded-lg border border-border/70 bg-card p-4 text-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <span className="min-w-0">
                  <span className="block font-medium">{i18n._(theme.label)}</span>
                  <span className="mt-1 block text-xs tabular-nums text-muted-foreground">
                    <Plural
                      value={count}
                      one="# set de date"
                      few="# seturi de date"
                      other="# de seturi de date"
                    />
                  </span>
                </span>
                <ArrowRight
                  aria-hidden
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
