import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { Trans } from '@lingui/react/macro'
import { ArrowLeft } from 'lucide-react'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { CornerTicks, CruxMarks, TwoLayerLattice } from '@/features/landing/components/hero-chrome'
import { HubPending } from '@/features/statistics/components/hub/hub-chrome'
import type { CaseSheet } from '../../lib/case-model'
import { formatJudicialDate } from '../../lib/judicial-format'
import { caseCategoryLabel, courtName } from '../../lib/judicial-labels'

/** The way back: the case's court. */
function CaseKicker({ code }: { readonly code: string }) {
  return (
    <MonoLabel className="flex flex-wrap items-center gap-2 text-muted-foreground">
      <Link to="/justice/courts/$code" params={{ code }} className="group inline-flex items-center gap-1.5 hover:text-foreground">
        <ArrowLeft className="size-3 transition-transform group-hover:-translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
        <span>{courtName(code)}</span>
      </Link>
    </MonoLabel>
  )
}

function Fact({ term, children }: { readonly term: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="min-w-0 border-t border-border/70 py-2.5">
      <dt>
        <MonoLabel className="text-muted-foreground">{term}</MonoLabel>
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  )
}

/**
 * The case's head: its court, its number, what it is about as the court wrote
 * it (the object, shown on this page only), and its facts — matter, stage,
 * section, the dates the portal gives. Nothing here names a party.
 */
export function JusticeCaseHead({ sheet, sourceLine }: { readonly sheet: CaseSheet; readonly sourceLine: ReactNode }) {
  const record = sheet.case
  const opened = formatJudicialDate(record.sourceOpenedAt)
  const modified = formatJudicialDate(record.latestSourceModifiedAt)
  return (
    <section className="relative border-b" aria-labelledby="justice-case-title">
      <TwoLayerLattice idPrefix="justice-case" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <CaseKicker code={record.institutionCode} />
        <div className="mt-4 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8">
          <div className="min-w-0 lg:col-span-7">
            <h1 id="justice-case-title" className="break-words text-3xl font-extrabold leading-[0.95] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
              <Trans>Dosarul {record.caseNumber}</Trans>
            </h1>
            {record.object ? (
              <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-foreground sm:text-lg">
                <span className="sr-only">
                  <Trans>Obiectul dosarului:</Trans>{' '}
                </span>
                „{record.object.trim()}”
              </p>
            ) : (
              <p className="mt-4 text-base text-muted-foreground">
                {record.sourceSlug === 'iccj' ? <Trans>Arhiva Înaltei Curți nu dă obiectul dosarelor ei.</Trans> : <Trans>Portalul nu spune obiectul dosarului.</Trans>}
              </p>
            )}
            <div className="mt-5">{sourceLine}</div>
          </div>
          <dl className="grid min-w-0 grid-cols-2 gap-x-6 lg:col-span-5 lg:border-l lg:pl-8">
            <Fact term={<Trans>Materia</Trans>}>{caseCategoryLabel(record.category) ?? <Trans>nedeclarată</Trans>}</Fact>
            <Fact term={<Trans>Etapa</Trans>}>{record.stageName ?? record.stage ?? <Trans>nedeclarată</Trans>}</Fact>
            <Fact term={record.sourceSlug === 'iccj' ? <Trans>Data din arhiva ÎCCJ</Trans> : <Trans>Data din portal</Trans>}>{opened ?? <Trans>fără dată</Trans>}</Fact>
            <Fact term={<Trans>Ultima modificare</Trans>}>{modified ?? <Trans>nedeclarată</Trans>}</Fact>
            {record.department && record.department.trim() !== '.' ? (
              <div className="col-span-2">
                <Fact term={<Trans>Secția</Trans>}>{record.department}</Fact>
              </div>
            ) : null}
            {record.caseNumberOld ? (
              <div className="col-span-2">
                <Fact term={<Trans>Număr vechi</Trans>}>
                  <span className="font-mono tabular-nums">{record.caseNumberOld}</span>
                </Fact>
              </div>
            ) : null}
          </dl>
        </div>
        <span className="absolute inset-x-0 top-full z-30 mt-px">
          <CruxMarks />
        </span>
      </RuledFrame>
    </section>
  )
}

/** The head before the case arrives, or when it could not be read or found. */
export function JusticeCaseHeadPending({ code, number, children }: { readonly code: string; readonly number: string; readonly children?: ReactNode }) {
  return (
    <section className="relative border-b" aria-busy={children ? undefined : true} aria-labelledby="justice-case-title">
      <TwoLayerLattice idPrefix="justice-case" />
      <RuledFrame className="py-10 sm:py-12 lg:py-14">
        <CornerTicks />
        <CaseKicker code={code} />
        <h1 id="justice-case-title" className="mt-4 break-words text-3xl font-extrabold leading-[0.95] tracking-tighter text-foreground sm:text-5xl lg:text-6xl">
          <Trans>Dosarul {number}</Trans>
        </h1>
        {children ?? <HubPending className="mt-6 max-w-xl" rows={2} />}
      </RuledFrame>
    </section>
  )
}
