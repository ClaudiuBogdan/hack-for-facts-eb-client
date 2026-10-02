import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { TriangleAlert } from 'lucide-react'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import type { QuestionProblem } from '../../api/company-analytics-plan'
import { metricLabel } from '../../lib/company-analytics-text'

/**
 * What the page says instead of figures it cannot give: a release the API
 * no longer serves (refreshed only when the reader asks, never replaced in
 * silence), the service down, a question the release cannot answer, an
 * address it could not read.
 */

const ACTION = 'inline-flex min-h-11 items-center border px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:min-h-9'

function Notice({ title, children, action }: { readonly title: string; readonly children?: ReactNode; readonly action?: ReactNode }) {
  return (
    <section role="alert" className="border-b bg-amber-50/60 dark:bg-amber-950/20">
      <RuledFrame className="flex flex-col gap-3 py-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">{title}</p>
            {children ? <div className="text-muted-foreground">{children}</div> : null}
          </div>
        </div>
        {action}
      </RuledFrame>
    </section>
  )
}

/** The pinned release is no longer published or retained: no figure is shown from another one until the reader asks for the current one. */
export function ReleaseRefusedNotice({ pin, onRefresh }: { readonly pin: string | null; readonly onRefresh: () => void }) {
  return (
    <Notice
      title={pin ? t`Ediția ${pin} a analizei nu mai este disponibilă` : t`Ediția analizei nu mai este disponibilă`}
      action={
        <button type="button" onClick={onRefresh} className={ACTION}>
          {t`Deschide ediția curentă`}
        </button>
      }
    >
      <p>{t`Cifrele acestei adrese au fost calculate pe o ediție care între timp a fost înlocuită. Nu le arătăm din altă ediție fără să știi: deschide ediția curentă pentru aceeași întrebare, iar cifrele pot fi diferite.`}</p>
    </Notice>
  )
}

export function UnavailableNotice({ onRetry, unavailable }: { readonly onRetry: () => void; readonly unavailable: boolean }) {
  return (
    <Notice
      title={unavailable ? t`Analiza firmelor nu este disponibilă acum` : t`Analiza nu s-a putut încărca`}
      action={
        <button type="button" onClick={onRetry} className={ACTION}>
          {t`Încearcă din nou`}
        </button>
      }
    >
      <p>{t`Nu arătăm cifre parțiale sau de test în locul lor.`}</p>
    </Notice>
  )
}

function problemText(problem: QuestionProblem): string {
  switch (problem.kind) {
    case 'year':
      return t`Anul fiscal ${problem.year} nu este în această ediție.`
    case 'metric':
      return t`Indicatorul „${metricLabel(problem.metric)}" nu este disponibil pentru anul ales: valorile nu sunt admise sau nu a raportat nicio firmă.`
    case 'range':
      return t`Filtrul pe „${metricLabel(problem.metric)}" nu se poate aplica în anul ales: indicatorul nu este disponibil.`
    case 'limit':
      return t`Filtrul „${problem.field}" are mai mult de ${problem.max} valori, cât primește analiza.`
  }
}

/** The release cannot answer the question as asked: why, in words; the controls above stay to change it. */
export function QuestionProblemsNotice({ problems }: { readonly problems: readonly QuestionProblem[] }) {
  return (
    <Notice title={t`Întrebarea nu are răspuns în această ediție`}>
      <ul className="list-disc space-y-1 pl-4">
        {problems.map((problem) => (
          <li key={`${problem.kind}-${'metric' in problem ? problem.metric : 'field' in problem ? problem.field : problem.year}`}>{problemText(problem)}</li>
        ))}
      </ul>
    </Notice>
  )
}

/** Values in the address the page could not read: said, so the answer below is not taken for the question the link meant. */
export function UnreadNotice({ keys }: { readonly keys: readonly string[] }) {
  return (
    <Notice title={t`Unele valori din adresă nu au putut fi citite`}>
      <p>{t`Răspunsul de mai jos nu le folosește: ${keys.join(', ')}.`}</p>
    </Notice>
  )
}
