import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { FileQuestion } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { HomeBand, HomeSectionNav } from '@/features/procurement/components/home/home-chrome'
import { HUB_BESIDE_TITLE_CLASS, HubLoadError, HubPending, HubSectionHead } from '@/features/statistics/components/hub/hub-chrome'
import { useClientDocumentTitle } from '@/hooks/use-client-document-title'
import { cn } from '@/lib/utils'
import type { JusticeCaseServerRead } from '../../api/justice-ssr'
import type { CaseSheet } from '../../lib/case-model'
import { countText, dayText, formatHearingTime, formatJudicialDate } from '../../lib/judicial-format'
import { caseCategoryLabel, codeAliasLabel, courtName, hearingsCount, linksCount, partiesCount, partyKindCount, partyRoleLabel } from '../../lib/judicial-labels'
import { buildCaseDocumentTitle } from '../../lib/justice-page-titles'
import { useJusticeCase } from '../../hooks/use-justice-case'
import { JusticeSourceLine } from '../justice-source-line'
import { JusticeCaseHead, JusticeCaseHeadPending } from './justice-case-head'

const BAND_GRID = 'grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8'
const LIST = 'divide-y divide-border/70 border-y border-border/70'

/**
 * `/justice/cases/$code/$` — one case, as a record sheet (design.md §14): the
 * head with the court, the number, what the case is about and its facts;
 * then its hearings, its appeals, its parties by role, the laws it cites and
 * the same file at other courts. The API publishes no party's name and no
 * hearing's outcome; the page asks for neither.
 */
export function JusticeCasePage({ code, number, initialData }: { readonly code: string; readonly number: string; readonly initialData?: JusticeCaseServerRead }) {
  const seeded = initialData?.code === code && initialData.number === number ? initialData.sheet : undefined
  const query = useJusticeCase(code, number, seeded)
  const sheet = query.data
  useClientDocumentTitle(buildCaseDocumentTitle(code, number))

  if (sheet) return <CaseSheetView sheet={sheet} />
  if (sheet === null) return <CaseMissing code={code} number={number} />
  return (
    <div className="bg-background">
      <JusticeCaseHeadPending code={code} number={number}>
        {query.isError ? (
          <div className="mt-8">
            <HubLoadError onRetry={() => void query.refetch()} />
          </div>
        ) : null}
      </JusticeCaseHeadPending>
      {query.isError ? null : (
        <RuledFrame className="py-14">
          <HubPending rows={8} />
        </RuledFrame>
      )}
    </div>
  )
}

/** The API answered and the court has no case of that number — distinct from a failed read. */
function CaseMissing({ code, number }: { readonly code: string; readonly number: string }) {
  return (
    <div className="bg-background">
      <JusticeCaseHeadPending code={code} number={number}>
        <div role="status" className="mt-8 max-w-[60ch]">
          <FileQuestion className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-lg font-semibold text-foreground">
            <Trans>Dosarul nu a fost găsit</Trans>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{t`Portalul nu are dosarul ${number} la ${courtName(code)}.`}</p>
        </div>
      </JusticeCaseHeadPending>
    </div>
  )
}

function CaseSheetView({ sheet }: { readonly sheet: CaseSheet }) {
  const sections = [
    { id: 'sedinte', label: t`Ședințele` },
    { id: 'cai-de-atac', label: t`Căile de atac` },
    { id: 'parti', label: t`Părțile` },
    ...(sheet.laws.length > 0 ? [{ id: 'legi', label: t`Legile invocate` }] : []),
    ...(sheet.related.length > 0 || sheet.relatedUnlisted > 0 ? [{ id: 'alte-instante', label: t`La alte instanțe` }] : []),
  ]
  const indexOf = (id: string) => {
    const position = sections.findIndex((section) => section.id === id)
    return `${String(position + 1).padStart(2, '0')} / ${sections[position]?.label ?? ''}`
  }
  return (
    <div className="relative w-full overflow-x-clip bg-background">
      <JusticeCaseHead sheet={sheet} sourceLine={<CaseSourceLine sheet={sheet} />} />
      <HomeSectionNav title={t`Dosarul ${sheet.case.caseNumber}`} sections={sections} />
      <HearingsBand sheet={sheet} index={indexOf('sedinte')} />
      <AppealsBand sheet={sheet} index={indexOf('cai-de-atac')} />
      <PartiesBand sheet={sheet} index={indexOf('parti')} />
      {sheet.laws.length > 0 ? <LawsBand sheet={sheet} index={indexOf('legi')} /> : null}
      {sheet.related.length > 0 || sheet.relatedUnlisted > 0 ? <RelatedBand sheet={sheet} index={indexOf('alte-instante')} /> : null}
    </div>
  )
}

function CaseSourceLine({ sheet }: { readonly sheet: CaseSheet }) {
  const iccj = sheet.case.sourceSlug === 'iccj'
  const notes: ReactNode[] = iccj
    ? [
        <Trans key="state">Dosarul e așa cum îl arăta arhiva Înaltei Curți la ultima preluare, nu istoria lui completă.</Trans>,
        <Trans key="iccj">Arhiva Curții nu dă părțile, ședințele detaliate și nici obiectul dosarelor.</Trans>,
      ]
    : [
        <Trans key="state">Dosarul e așa cum îl arăta portalul la ultima preluare, nu istoria lui completă.</Trans>,
        <Trans key="privacy">Numele părților și soluțiile din ședințe nu sunt publicate. Persoanele sunt doar numărate.</Trans>,
        <Trans key="object">Obiectul e textul instanței, așa cum apare pe portal.</Trans>,
      ]
  if (sheet.partial) notes.push(<Trans key="partial">Dosarele legate de la alte instanțe nu au putut fi citite acum; pagina le citește din nou.</Trans>)
  return <JusticeSourceLine asOf={sheet.asOf} source={iccj ? 'iccj' : 'portal'} notes={notes} />
}

function HearingsBand({ sheet, index }: { readonly sheet: CaseSheet; readonly index: string }) {
  const iccj = sheet.case.sourceSlug === 'iccj'
  const decisions = sheet.hearings.filter((hearing) => hearing.document?.number).length
  const scheduled = sheet.hearings.filter((hearing) => hearing.scheduled).length
  return (
    <HomeBand id="sedinte" labelledBy="justice-case-hearings-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-case-hearings-title"
            index={index}
            title={<Trans>Ședințele</Trans>}
            lede={
              sheet.hearings.length > 0 ? (
                <Trans>
                  {hearingsCount(sheet.hearings.length)} pe portal, {countText(decisions)} cu un document de hotărâre. Ce s-a hotărât nu e publicat aici.
                </Trans>
              ) : iccj ? (
                <Trans>Arhiva Înaltei Curți nu dă ședințele dosarelor ei.</Trans>
              ) : (
                <Trans>Portalul nu are nicio ședință a acestui dosar.</Trans>
              )
            }
          />
        </div>
        {sheet.hearings.length > 0 ? (
          <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <ol className={LIST}>
              {sheet.hearings.map((hearing) => (
                <li key={hearing.index} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 px-1 py-2.5 text-sm">
                  <span className="tabular-nums text-foreground">{formatHearingTime(hearing.at) ?? <Trans>fără dată</Trans>}</span>
                  <span className="text-right">
                    {hearing.scheduled ? (
                      <MonoLabel className="text-status-partial-fg">
                        <Trans>programată</Trans>
                      </MonoLabel>
                    ) : null}
                  </span>
                  <span className="col-span-2 text-muted-foreground">
                    {[
                      hearing.panel ? t`completul ${hearing.panel}` : null,
                      hearing.document?.number
                        ? hearing.document.date && formatJudicialDate(hearing.document.date)
                          ? t`hotărârea nr. ${hearing.document.number} din ${formatJudicialDate(hearing.document.date) ?? ''}`
                          : t`hotărârea nr. ${hearing.document.number}`
                        : null,
                      hearing.pronouncedOn && formatJudicialDate(hearing.pronouncedOn) ? t`pronunțare ${formatJudicialDate(hearing.pronouncedOn) ?? ''}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ol>
            {scheduled > 0 && sheet.asOf ? (
              <p className="mt-3 text-xs text-muted-foreground">
                <Trans>Ședințele programate erau viitoare la ultima preluare a portalului ({dayText(sheet.asOf)}).</Trans>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </HomeBand>
  )
}

function AppealsBand({ sheet, index }: { readonly sheet: CaseSheet; readonly index: string }) {
  return (
    <HomeBand id="cai-de-atac" labelledBy="justice-case-appeals-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-case-appeals-title"
            index={index}
            title={<Trans>Căile de atac</Trans>}
            lede={
              sheet.appeals.length > 0 ? (
                <Trans>Declarațiile de apel, recurs sau contestație înregistrate la acest dosar.</Trans>
              ) : sheet.case.sourceSlug === 'iccj' ? (
                <Trans>Arhiva Înaltei Curți nu dă căile de atac ale dosarelor ei.</Trans>
              ) : (
                <Trans>Portalul nu are nicio cale de atac declarată la acest dosar.</Trans>
              )
            }
          />
        </div>
        {sheet.appeals.length > 0 ? (
          <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <ol className={LIST}>
              {sheet.appeals.map((appeal) => (
                <li key={appeal.index} className="flex items-baseline justify-between gap-4 px-1 py-2.5 text-sm">
                  <span className="text-foreground">{appeal.type ?? <Trans>Fără tip în sursă</Trans>}</span>
                  <span className="tabular-nums text-muted-foreground">{formatJudicialDate(appeal.declaredOn) ?? <Trans>fără dată</Trans>}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>
    </HomeBand>
  )
}

function PartiesBand({ sheet, index }: { readonly sheet: CaseSheet; readonly index: string }) {
  return (
    <HomeBand id="parti" labelledBy="justice-case-parties-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-case-parties-title"
            index={index}
            title={<Trans>Părțile</Trans>}
            lede={
              sheet.partyCount > 0 ? (
                <Trans>
                  {partiesCount(sheet.partyCount)}, pe roluri. Nu sunt numite: persoanele fizice sunt doar numărate, iar numele firmelor și instituțiilor nu sunt
                  încă publicate.
                </Trans>
              ) : sheet.case.sourceSlug === 'iccj' ? (
                <Trans>Arhiva Înaltei Curți nu dă părțile dosarelor ei.</Trans>
              ) : (
                <Trans>Portalul nu listează nicio parte a acestui dosar.</Trans>
              )
            }
          />
        </div>
        {sheet.parties.length > 0 ? (
          <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
            <dl className={LIST}>
              {sheet.parties.map((group) => (
                <div key={group.role ?? 'none'} className="grid grid-cols-1 gap-x-4 gap-y-0.5 px-1 py-2.5 text-sm sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <dt className="font-medium text-foreground">{partyRoleLabel(group.role)}</dt>
                  <dd className="text-muted-foreground">
                    {group.kinds.map((entry) => `${partyKindCount(entry.kind, entry.count)}${legalFormsText(entry)}`).join(', ')}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>
    </HomeBand>
  )
}

/**
 * The legal forms beside their kind: „(SRL)" when every party of the kind is
 * one, otherwise each form with its count („(4 SRL)"), so a form is never read
 * as every party's.
 */
function legalFormsText(entry: CaseSheet['parties'][number]['kinds'][number]): string {
  if (entry.legalForms.length === 0) return ''
  const [only] = entry.legalForms
  if (entry.legalForms.length === 1 && only && only.count === entry.count) return ` (${only.form})`
  return ` (${entry.legalForms.map((form) => `${countText(form.count)} ${form.form}`).join(', ')})`
}

function LawsBand({ sheet, index }: { readonly sheet: CaseSheet; readonly index: string }) {
  return (
    <HomeBand id="legi" labelledBy="justice-case-laws-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-case-laws-title"
            index={index}
            title={<Trans>Legile invocate</Trans>}
            lede={<Trans>Actele normative citate în obiectul dosarului sau în ședințe. Se deschid cele recunoscute în registrul legislației.</Trans>}
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          <ul className={LIST}>
            {sheet.laws.map((law) => (
              <li key={law.key} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-1 py-2.5 text-sm">
                {law.actId ? (
                  <Link to="/legislation/acts/$actId" params={{ actId: law.actId }} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {law.label}
                  </Link>
                ) : (
                  <span className="font-mono text-foreground">{law.label}</span>
                )}
                <span className="text-muted-foreground">
                  {law.articles.length > 0 ? law.articles.join(', ') : law.code ? codeAliasLabel(law.code) : law.actId ? null : <Trans>nerecunoscut în registru</Trans>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </HomeBand>
  )
}

function RelatedBand({ sheet, index }: { readonly sheet: CaseSheet; readonly index: string }) {
  return (
    <HomeBand id="alte-instante" labelledBy="justice-case-related-title">
      <div className={BAND_GRID}>
        <div className="min-w-0 lg:col-span-5">
          <HubSectionHead
            titleId="justice-case-related-title"
            index={index}
            title={<Trans>Același dosar la alte instanțe</Trans>}
            lede={
              <Trans>
                Dosare cu același număr de bază la alte instanțe: de obicei același proces, în altă etapă. Legătura e dedusă din număr, nu verificată.
              </Trans>
            }
          />
        </div>
        <div className={cn('min-w-0 lg:col-span-7', HUB_BESIDE_TITLE_CLASS)} data-reveal>
          {sheet.related.length > 0 ? (
            <ul className={LIST}>
              {sheet.related.map((other) => (
                <li key={other.caseId}>
                  <Link
                    to="/justice/cases/$code/$"
                    params={{ code: other.institutionCode, _splat: other.caseNumber }}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 px-1 py-2.5 text-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <span className="min-w-0 truncate text-foreground">{courtName(other.institutionCode)}</span>
                    <MonoLabel className={other.status === 'candidate' ? 'text-muted-foreground' : 'text-status-partial-fg'}>
                      {other.status === 'candidate' ? <Trans>posibil</Trans> : <Trans>de verificat</Trans>}
                    </MonoLabel>
                    <span className="col-span-2 min-w-0 truncate text-muted-foreground">
                      <span className="font-mono tabular-nums">{other.caseNumber}</span>
                      {[caseCategoryLabel(other.category), other.stageName, formatJudicialDate(other.sourceOpenedAt)].filter(Boolean).map((part) => ` · ${part ?? ''}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {sheet.relatedUnlisted > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              <Trans>Încă {linksCount(sheet.relatedUnlisted)} nelistate: fără dosar găsit la celălalt capăt, sau peste primele zece.</Trans>
            </p>
          ) : null}
        </div>
      </div>
    </HomeBand>
  )
}
