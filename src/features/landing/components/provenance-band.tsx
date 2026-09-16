import { Trans } from '@lingui/react/macro'
import { t } from '@lingui/core/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { useInstitutionCount } from '@/features/landing/hooks/use-institution-count'
import type { PlatformCoverage } from '@/features/landing/lib/platform-coverage'
import { formatValue } from '@/features/landing/lib/national-facts'

/**
 * Provenance — the home of every figure that describes *us* rather than the
 * country. Saying "5 servite live" out of 23 registered datasets only works
 * next to the sentence that explains it; left in the facts strip it reads as
 * a shortfall. `DESIGN.md` §Data Trust makes stating it at all a requirement.
 *
 * The institution count is served, not derived, and is listed only once it has
 * arrived. Nothing here ever prints a placeholder number.
 */
export function ProvenanceBand({ coverage }: { readonly coverage: PlatformCoverage }) {
  const institutions = useInstitutionCount()

  const items: readonly { readonly value: string; readonly label: string }[] = [
    ...(institutions.count === undefined
      ? []
      : [
          {
            value: formatValue(institutions.count, 0),
            label: t`instituții cu execuție ${institutions.year}`,
          },
        ]),
    { value: String(coverage.datasets), label: t`seturi de date` },
    { value: String(coverage.servedLive), label: t`servite live` },
    { value: String(coverage.surfaces), label: t`suprafețe` },
    { value: String(coverage.groups.length), label: t`domenii` },
  ]

  return (
    <section className="border-b">
      <RuledFrame className="py-14 sm:py-16">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <MonoLabel className="block text-primary" data-reveal>
              <Trans>02 / Proveniență</Trans>
            </MonoLabel>
            <h2
              data-reveal
              className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl"
            >
              <Trans>
                Fiecare cifră
                <br />
                își spune sursa
              </Trans>
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p data-reveal className="text-base leading-relaxed text-muted-foreground">
              <Trans>
                Datele vin din surse oficiale — ANAF, Ministerul Finanțelor, SEAP, Monitorul
                Oficial, INS. Unele seturi sunt încă în curs de conectare și sunt marcate ca atare
                acolo unde apar. Nicio cifră nu este prezentată fără să spună de unde vine și din
                ce perioadă.
              </Trans>
            </p>
            <ul data-reveal className="mt-7 flex flex-wrap gap-x-6 gap-y-3 border-t pt-5">
              {items.map((item) => (
                <li key={item.label}>
                  <MonoLabel className="text-muted-foreground">
                    <span className="text-foreground tabular-nums">{item.value}</span> {item.label}
                  </MonoLabel>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </RuledFrame>
    </section>
  )
}
