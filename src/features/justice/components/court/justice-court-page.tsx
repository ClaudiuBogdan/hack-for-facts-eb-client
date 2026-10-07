import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { FileQuestion } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RevealStyles, useRevealOnView } from '@/components/landing-skin/reveal'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { SmearFilters, countUpWithin, stopCounting } from '@/features/landing/components/count-up'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { HubFiguresBand, type HubFact } from '@/features/statistics/components/hub/hub-figures'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { useWarmRouteCode } from '@/hooks/use-warm-route-code'
import { cn } from '@/lib/utils'
import type { JusticeCourtServerRead } from '../../api/justice-ssr'
import { courtLastYear, courtYearBars, courtYearChoices, type CourtSheet } from '../../lib/court-model'
import { JUSTICE_FIRST_WHOLE_YEAR, JUSTICE_REFERENCE_YEAR } from '../../lib/hub-years'
import { countText, dayText, percentText } from '../../lib/judicial-format'
import { caseCategoryLabel, casesCount, courtLevelLabel, courtName, stageLabel } from '../../lib/judicial-labels'
import { buildCourtDocumentTitle } from '../../lib/justice-page-titles'
import { useJusticeCourt } from '../../hooks/use-justice-court'
import { ShareRows } from '../justice-rows'
import { JusticeSourceLine } from '../justice-source-line'
import { JusticeYearsChart } from '../justice-years-chart'
import { JusticeCourtCases } from './justice-court-cases'
import { JusticeCourtHead, JusticeCourtHeadPending } from './justice-court-head'

/** The first year the capture holds whole, as on the front door: the years before are drawn, never picked. */
const FIRST_WHOLE_YEAR = JUSTICE_FIRST_WHOLE_YEAR

const BAND_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8'

function startArrivalEffects(block: Element, delay: number) {
  countUpWithin(block, delay)
}

/**
 * `/justice/courts/$code` — one court, in the procurement profile pages'
 * rhythm (design.md §14): the head with the court, the year it describes and
 * its years beside it, a case lookup; the figures; then what it judges, at
 * which stage, the courts under it and its newest cases. Every count is the
 * judicial API's; parties are never named.
 */
export function JusticeCourtPage({ code, year, initialData }: { readonly code: string; readonly year: number; readonly initialData?: JusticeCourtServerRead }) {
  const query = useJusticeCourt(code, year, initialData?.code === code && initialData.year === year ? initialData.court : undefined)
  const sheet = query.data
  const navigate = useNavigate({ from: '/justice/courts/$code' })
  useClientDocumentTitle(buildCourtDocumentTitle(code))
  useWarmRouteCode('/justice/cases/$code/$')
  const onYear = (next: number) =>
    void navigate({ search: (previous) => ({ ...previous, an: next === JUSTICE_REFERENCE_YEAR ? undefined : next }), resetScroll: false })

  if (sheet) return <CourtSheetView sheet={sheet} onYear={onYear} />
  if (sheet === null) return <CourtMissing code={code} />
  return (
    <div className="bg-background">
      <JusticeCourtHeadPending code={code}>
        {query.isError ? (
          <div className="mt-8">
            <HubLoadError onRetry={() => void query.refetch()} />
          </div>
        ) : null}
      </JusticeCourtHeadPending>
      {query.isError ? null : (
        <RuledFrame className="py-14">
          <HubPending rows={8} />
        </RuledFrame>
      )}
    </div>
  )
}

/** The API answered and has no such court — distinct from a failed read, which says nothing about the court. */
function CourtMissing({ code }: { readonly code: string }) {
  return (
    <div className="bg-background">
      <JusticeCourtHeadPending code={code}>
        <div role="status" className="mt-8 max-w-[60ch]">
          <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            <Trans>Instanța nu a fost găsită</Trans>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t`Portalul instanțelor nu are o instanță cu codul ${code}.`}</p>
        </div>
      </JusticeCourtHeadPending>
    </div>
  )
}

function CourtSheetView({ sheet, onYear }: { readonly sheet: CourtSheet; readonly onYear: (year: number) => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useRevealOnView(rootRef, startArrivalEffects, true)
  useEffect(() => () => stopCounting(), [])
  const lastMonth = sheet.newestAt?.slice(0, 7) ?? null
  const sections = [
    { id: 'materii', label: t`Ce se judecă` },
    { id: 'etape', label: t`Pe etape` },
    ...(sheet.children.length > 0 ? [{ id: 'instante', label: t`Instanțele de sub ea` }] : []),
    { id: 'dosare', label: t`Dosarele` },
  ]
  const indexOf = (id: string) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
  }
  return (
    <div ref={rootRef} className="relative w-full overflow-x-clip bg-background">
      <RevealStyles />
      <SmearFilters />
      <JusticeCourtHead
        sheet={sheet}
        years={courtYearChoices(sheet, FIRST_WHOLE_YEAR)}
        onYear={onYear}
        aside={
          <div>
            <MonoLabel className="block text-muted-foreground">
              {sheet.level === 'inalta_curte' ? <Trans>Dosarele Curții, după anul din arhiva ei</Trans> : <Trans>Dosarele instanței, după anul din portal</Trans>}
            </MonoLabel>
            <JusticeYearsChart className="mt-4" bars={courtYearBars(sheet, FIRST_WHOLE_YEAR)} lastMonth={lastMonth} compact />
            <CourtSourceLine sheet={sheet} className="mt-4" />
          </div>
        }
      />
      <HomeSectionNav title={courtName(sheet.code)} sections={sections} />
      <CourtFigures sheet={sheet} />
      <CourtMattersBand sheet={sheet} index={indexOf('materii')} />
      <CourtStagesBand sheet={sheet} index={indexOf('etape')} />
      {sheet.children.length > 0 ? <CourtChildrenBand sheet={sheet} index={indexOf('instante')} /> : null}
      <HomeBand id="dosare" labelledBy="justice-court-cases-title">
        <div className={BAND_GRID}>
          <div className="min-w-0 lg:col-span-5">
            <HubSectionHead
              titleId="justice-court-cases-title"
              index={indexOf('dosare')}
              title={<Trans>Dosarele</Trans>}
              lede={
                sheet.level === 'inalta_curte' ? (
                  <Trans>Dosarele Curții din arhiva ei. Fiecare se deschide cu ce spune arhiva despre el.</Trans>
                ) : (
                  <Trans>Cele modificate cel mai recent pe portal. Fiecare se deschide cu ședințele, căile de atac și părțile lui, fără nume.</Trans>
                )
              }
            />
          </div>
          <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <JusticeCourtCases sheet={sheet} />
          </div>
        </div>
      </HomeBand>
    </div>
  )
}

function CourtSourceLine({ sheet, className }: { readonly sheet: CourtSheet; readonly className?: string }) {
  const iccj = sheet.level === 'inalta_curte'
  const notes: ReactNode[] = iccj
    ? [<Trans key="date">Anul unui dosar e data lui din arhiva Înaltei Curți, al cărei înțeles nu e stabilit; nu e o dată de înregistrare verificată.</Trans>]
    : [
        <Trans key="date">Anul unui dosar e data din antetul lui pe portal, nu o dată de înregistrare verificată.</Trans>,
        <Trans key="capture">
          Portalul a fost preluat după data ultimei modificări a dosarelor. Înainte de {FIRST_WHOLE_YEAR} sunt doar dosarele încă active după aceea.
        </Trans>,
      ]
  notes.push(
    <Trans key="stage">Etapa e cea de acum a dosarului, nu tot drumul lui.</Trans>,
    <Trans key="privacy">Numele părților și soluțiile din ședințe nu sunt publicate.</Trans>,
  )
  if (sheet.partial) notes.push(<Trans key="partial">Dosarele instanțelor de sub ea nu au putut fi numărate acum; pagina le citește din nou.</Trans>)
  const lastYear = courtLastYear(sheet)
  if (lastYear !== null && sheet.newestAt) {
    notes.push(
      iccj ? (
        <Trans key="frozen">Preluarea s-a oprit: cea mai nouă dată din arhiva Înaltei Curți e din {dayText(sheet.newestAt)}.</Trans>
      ) : (
        <Trans key="frozen">Preluarea s-a oprit: cea mai nouă dată a instanței pe portal e din {dayText(sheet.newestAt)}.</Trans>
      ),
    )
  }
  return <JusticeSourceLine asOf={sheet.newestAt} source={iccj ? 'iccj' : 'portal'} notes={notes} className={className} />
}

function CourtFigures({ sheet }: { readonly sheet: CourtSheet }) {
  const { i18n } = useLingui()
  const [top] = sheet.matters
  const childrenCases = sheet.children.reduce((sum, child) => sum + (child.count ?? 0), 0)
  const band = (hash: string) =>
    function BandLink(label: ReactNode, className: string) {
      return (
        <a href={`#${hash}`} className={className}>
          {label}
        </a>
      )
    }
  const facts: HubFact[] = [
    {
      key: 'year',
      value: sheet.inYear,
      digits: 0,
      label: <Trans>Dosare cu data din {sheet.year}</Trans>,
      note: <Trans>{casesCount(sheet.total)} pe portal, în total</Trans>,
      link: band('dosare'),
    },
    {
      key: 'fond',
      value: sheet.stages.fond,
      digits: 0,
      label: <Trans>La fond, {sheet.year}</Trans>,
      note: <Trans>{countText(sheet.stages.apel)} în apel, {countText(sheet.stages.recurs)} în recurs</Trans>,
      link: band('etape'),
    },
  ]
  if (top) {
    facts.push({
      key: 'matter',
      value: Math.round(top.share * 100),
      digits: 0,
      unit: '%',
      label: <Trans>La materia „{caseCategoryLabel(top.key) ?? top.key}”</Trans>,
      note: <Trans>{casesCount(top.count)} în {sheet.year}</Trans>,
      link: band('materii'),
    })
  }
  if (sheet.children.length > 0) {
    facts.push({
      key: 'children',
      value: sheet.children.length,
      digits: 0,
      label: <Trans>Instanțe în circumscripție</Trans>,
      note: sheet.partial ? <Trans>dosarele lor nu au putut fi numărate</Trans> : <Trans>cu {casesCount(childrenCases)} în {sheet.year}</Trans>,
      link: band('instante'),
    })
  }
  return (
    <section className="border-b bg-muted/20" aria-label={t`Cifre-cheie`}>
      <RuledFrame>
        <HubFiguresBand facts={facts} locale={i18n.locale === 'en' ? 'en' : 'ro'} />
      </RuledFrame>
    </section>
  )
}

function CourtMattersBand({ sheet, index }: { readonly sheet: CourtSheet; readonly index: string }) {
  const top = sheet.matters[0]?.count ?? 1
  return (
    <HomeBand id="materii" labelledBy="justice-court-matters-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-court-matters-title"
            index={index}
            title={<Trans>Ce se judecă</Trans>}
            lede={<Trans>Dosarele cu data din {sheet.year}, după materie.</Trans>}
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          {sheet.matters.length > 0 ? (
            <ShareRows
              numbered={false}
              rows={sheet.matters.map((matter) => ({
                key: matter.key,
                label: caseCategoryLabel(matter.key) ?? matter.key,
                meta: percentText(matter.share),
                value: countText(matter.count),
                fraction: matter.count / top,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans>Niciun dosar cu data din {sheet.year}.</Trans>
            </p>
          )}
        </div>
      </div>
    </HomeBand>
  )
}

function CourtStagesBand({ sheet, index }: { readonly sheet: CourtSheet; readonly index: string }) {
  const rows = (['fond', 'apel', 'recurs', 'contestatie', 'other'] as const).map((key) => ({ key, count: sheet.stages[key] })).filter((row) => row.count > 0)
  const top = Math.max(...rows.map((row) => row.count), 1)
  return (
    <HomeBand id="etape" labelledBy="justice-court-stages-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-court-stages-title"
            index={index}
            title={<Trans>Pe etape</Trans>}
            lede={<Trans>Etapa în care sunt acum dosarele cu data din {sheet.year}: la fond, în apel, în recurs sau în contestație.</Trans>}
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          {rows.length > 0 ? (
            <ShareRows
              numbered={false}
              rows={rows.map((row) => ({
                key: row.key,
                label: row.key === 'other' ? t`Alte etape (revizuiri, contestații în anulare)` : stageLabel(row.key),
                meta: sheet.inYear > 0 ? percentText(row.count / sheet.inYear) : undefined,
                value: countText(row.count),
                fraction: row.count / top,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              <Trans>Niciun dosar cu data din {sheet.year}.</Trans>
            </p>
          )}
        </div>
      </div>
    </HomeBand>
  )
}

function CourtChildrenBand({ sheet, index }: { readonly sheet: CourtSheet; readonly index: string }) {
  const top = Math.max(...sheet.children.map((child) => child.count ?? 0), 1)
  return (
    <HomeBand id="instante" labelledBy="justice-court-children-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-court-children-title"
            index={index}
            title={<Trans>Instanțele de sub ea</Trans>}
            lede={
              <Trans>
                Instanțele din circumscripția ei ({courtLevelLabel(sheet.children[0]?.level ?? sheet.level).toLowerCase()}), după dosarele cu data din {sheet.year}.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <ShareRows
            rows={sheet.children.map((child) => ({
              key: child.code,
              courtCode: child.code,
              label: courtName(child.code),
              value: child.count === null ? '—' : countText(child.count),
              fraction: child.count === null ? 0 : child.count / top,
            }))}
          />
          {sheet.partial ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans>Dosarele lor nu au putut fi numărate acum; pagina le citește din nou.</Trans>
            </p>
          ) : null}
        </div>
      </div>
    </HomeBand>
  )
}
