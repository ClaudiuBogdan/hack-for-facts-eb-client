import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { DecimalLocale } from '@/lib/exact-decimal'
import { cn } from '@/lib/utils'
import type { CompanyAnalysisRelease } from '@/schemas/company-analytics'
import { countText, localeOf } from '../../lib/company-analytics-format'
import { sourceEditionText } from '../../lib/company-analytics-source'

/**
 * Where the figures come from, at the foot: the sources, the release and
 * when it was published, the ONRC edition its company facts were exported
 * from and when ONRC published it (the exact civil date) and — behind a
 * click — how the figures were counted, the edition's whole pin and how
 * recent each input was. The caveats the page owes a reader before the
 * numbers sit behind one marker in the head.
 */

function dateText(value: string | null, locale: string): string | null {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale === 'en' ? 'en-GB' : 'ro-RO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Bucharest' })
}

type AsOfEntry = CompanyAnalysisRelease['asOf'][number]

/** A financial year's source family, as its `<year>:<source>` id names it. */
function financialSource(source: string | undefined): string {
  if (source === 'mfp') return t`Ministerul Finanțelor`
  if (source === 'anaf') return t`ANAF`
  return source || '—'
}

/** The fiscal entry's `<first>/<last>` retrieval span, both ends as dates; null when it is not two readable times. */
function spanText(value: string | null, locale: string): { readonly from: string; readonly to: string } | null {
  const ends = value?.split('/') ?? []
  if (ends.length !== 2) return null
  const [from, to] = ends.map((end) => (Number.isNaN(new Date(end).getTime()) ? null : dateText(end, locale)))
  return from && to ? { from, to } : null
}

/**
 * One input's line, by what the export puts in its fields (FRONTIER_SQL):
 * the ONRC edition carries ONRC's own publication date; a financial year
 * carries the extraction rule and when its values were derived — neither is
 * a publication or a capture date; the fiscal entry carries the span of the
 * loader's retrieval times. A kind this page does not know is shown as it
 * comes, without naming what its fields mean.
 */
function asOfText(entry: AsOfEntry, dateLocale: string, locale: DecimalLocale): string {
  const rows = entry.rows ? t`${countText(entry.rows, locale)} rânduri` : null
  const parts = (() => {
    switch (entry.kind) {
      case 'onrc_edition':
        return [t`registrul ONRC, ediția ${entry.id ?? '—'}`, entry.published ? t`publicată de ONRC pe ${dateText(entry.published, dateLocale) ?? entry.published}` : null]
      case 'financials_year': {
        const [year, source] = (entry.id ?? '').split(':')
        return [
          t`situațiile financiare ${year || '—'} (${financialSource(source)})`,
          entry.published ? t`regula de extragere ${entry.published}` : null,
          entry.retrieved ? t`valori derivate pe ${dateText(entry.retrieved, dateLocale) ?? entry.retrieved}` : null,
        ]
      }
      case 'fiscal_retrieved': {
        const span = spanText(entry.retrieved, dateLocale)
        return [t`starea fiscală ANAF`, span ? t`preluată de platformă între ${span.from} și ${span.to}` : entry.retrieved]
      }
      default:
        return [entry.kind, entry.id, entry.published, entry.retrieved]
    }
  })()
  return [...parts, rows].filter(Boolean).join(' · ')
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
      <span data-testid="companies-analytics-source-edition">{sourceEditionText(release.release, locale)}</span>
      <span aria-hidden="true">·</span>
      <Popover>
        <PopoverTrigger className="min-h-11 underline-offset-4 hover:text-foreground hover:underline sm:min-h-0">{t`Cum am calculat`}</PopoverTrigger>
        <PopoverContent align="start" className="w-[min(92vw,34rem)] space-y-3 text-sm text-muted-foreground">
          <p>{t`Populația: ${countText(release.companies, locale)} persoane juridice publicabile din registru, în orice stare, cu ${countText(release.companyYears, locale)} situații financiare selectate în anii ${first ?? '—'}–${last ?? '—'} (cel mult una pe firmă și an).`}</p>
          <p>{t`O sumă adună doar valorile raportate și admise; o medie împarte la firmele care au raportat o valoare, inclusiv 0, nu la toate. Nicio sumă nu este 0 când nicio firmă nu a raportat.`}</p>
          <p>{t`Regulile: populație ${release.populationPolicyVersion}, admitere ${release.admissionPolicyVersion ?? '—'}, schemă ${release.schemaVersion}.`}</p>
          <p>
            {t`Ediția ONRC a analizei: ${release.release.source.editionId} (publicarea ${release.release.source.publicationEpoch}, captura ${release.release.source.sourceSnapshotId}); reguli ONRC: interpretare ${release.release.source.interpretationVersion}, confidențialitate ${release.release.source.privacyPolicyVersion}, dimensiuni ${release.release.source.dimensionPolicyVersion}, eligibilitate ${release.release.source.eligibilityPolicyVersion}. Analiza răspunde doar cât timp aceasta e ediția publicată de ONRC.`}
          </p>
          {release.asOf.length > 0 ? (
            <div>
              <p className="font-medium text-foreground">{t`Cât de recente sunt datele`}</p>
              <ul className="mt-1 space-y-0.5 font-mono text-xs">
                {release.asOf.map((entry) => (
                  <li key={`${entry.kind}-${entry.id ?? ''}`}>{asOfText(entry, i18n.locale, locale)}</li>
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
