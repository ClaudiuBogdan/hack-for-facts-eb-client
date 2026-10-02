import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Info } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { countText, localeOf } from '../../lib/company-analytics-format'
import { companyAnalyticsCaveats } from '../../lib/company-analytics-text'

/**
 * Where the figures come from, at the foot: the sources, the release and
 * when it was published, and — behind a click — how the figures were
 * counted and how recent each input was. The caveats the page owes a reader
 * before the numbers sit behind one marker in the head.
 */

function dateText(value: string | null, locale: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' })
}

export function CaveatsMarker({ release, className }: { readonly release: CompanyAnalysisRelease; readonly className?: string }) {
  return (
    <Popover>
      <PopoverTrigger className={cn('inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground sm:min-h-0', className)}>
        <Info className="size-3.5" aria-hidden="true" />
        {t`Ce trebuie știut`}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,28rem)] space-y-2 text-sm">
        {companyAnalyticsCaveats().map((caveat) => (
          <p key={caveat} className="border-l-2 border-amber-600/60 pl-3 text-foreground">
            {caveat}
          </p>
        ))}
        <p className="text-muted-foreground">{t`Ediția ${release.release.releaseId} cuprinde ${release.fiscalYears.length} ani fiscali.`}</p>
      </PopoverContent>
    </Popover>
  )
}

export function SourceLine({ release, className }: { readonly release: CompanyAnalysisRelease; readonly className?: string }) {
  const { i18n } = useLingui()
  const locale = localeOf(i18n.locale)
  const published = dateText(release.release.publishedAt, i18n.locale)
  const first = release.fiscalYears[0]
  const last = release.fiscalYears[release.fiscalYears.length - 1]
  return (
    <footer className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground', className)}>
      <span>{t`Surse: registrul ONRC, declarațiile fiscale ANAF, situațiile financiare depuse la Ministerul Finanțelor (2008–2018) și la ANAF (2019 încoace)`}</span>
      <span aria-hidden="true">·</span>
      <span>{published ? t`ediția ${release.release.releaseId}, publicată pe ${published}` : t`ediția ${release.release.releaseId}`}</span>
      <span aria-hidden="true">·</span>
      <Popover>
        <PopoverTrigger className="min-h-11 underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">{t`Cum am calculat`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,34rem)] space-y-3 text-sm text-muted-foreground">
          <p>{t`Populația: ${countText(release.companies, locale)} persoane juridice publicabile din registru, în orice stare, cu ${countText(release.companyYears, locale)} situații financiare selectate în anii ${first ?? '—'}–${last ?? '—'} (cel mult una pe firmă și an).`}</p>
          <p>{t`O sumă adună doar valorile raportate și admise; o medie împarte la firmele care au raportat, nu la toate. Nicio sumă nu este 0 când nicio firmă nu a raportat.`}</p>
          <p>{t`Regulile: populație ${release.populationPolicyVersion}, admitere ${release.admissionPolicyVersion ?? '—'}, schemă ${release.schemaVersion}.`}</p>
          {release.asOf.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">{t`Cât de recente sunt datele`}</p>
              <ul className="mt-1 space-y-0.5 font-mono text-xs">
                {release.asOf.map((entry) => (
                  <li key={`${entry.kind}-${entry.id ?? ''}`}>
                    {[entry.kind, entry.id, entry.published ? t`publicat ${dateText(entry.published, i18n.locale) ?? entry.published}` : null, entry.retrieved ? t`preluat ${dateText(entry.retrieved, i18n.locale) ?? entry.retrieved}` : null, entry.rows ? t`${countText(entry.rows, locale)} rânduri` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p>{t`Data intrărilor acestei ediții nu a putut fi citită.`}</p>
          )}
        </PopoverContent>
      </Popover>
    </footer>
  )
}
