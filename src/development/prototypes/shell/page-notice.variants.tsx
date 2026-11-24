import { useState, type ReactNode } from 'react'
import { useLingui } from '@lingui/react/macro'
import { Construction, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { PageNotice } from '@/components/data-trust/page-notice'
import { cn } from '@/lib/utils'

/** Literal marker. `yarn build:validate` fails if this reaches `.output/`. */
const PROTOTYPE_MARKER = 'TRANSPARENTA_PROTOTYPE_MUST_NOT_SHIP'

/** Stands in for the feedback form, so the prototype opens nothing. */
function FeedbackLink({ className }: { readonly className?: string }) {
  const { t } = useLingui()
  return (
    <button
      type="button"
      onClick={() => toast.info(t`Aici se deschide formularul de feedback.`)}
      className={cn('font-medium underline underline-offset-2 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
    >
      {t`Spune-ne dacă vezi o greșeală.`}
    </button>
  )
}

/**
 * A page as the notice meets it: the notice on top, then the page's own head.
 * Dismissing is local state here; the real component remembers it per page for
 * the session. „Arată din nou” brings it back for comparing.
 */
function Page({ notice }: { readonly notice: (dismiss: () => void) => ReactNode }) {
  const { t } = useLingui()
  const [shown, setShown] = useState(true)
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="space-y-2">
      <div className="flex h-6 justify-end">
        {!shown && (
          <button type="button" onClick={() => setShown(true)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <RotateCcw className="size-3" aria-hidden />
            {t`Arată din nou`}
          </button>
        )}
      </div>
      <div className="overflow-hidden rounded-md border bg-background">
        {shown && notice(() => setShown(false))}
        <div className="space-y-4 p-5 md:p-8">
          <p className="text-xs text-muted-foreground">{t`Instituții și organizații`}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{t`Întreprinderi publice`}</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t`Companiile controlate de stat și de autoritățile locale: cine le deține, cât încasează și cât cheltuiesc.`}
          </p>
          <div className="grid grid-cols-2 gap-3 pt-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((key) => (
              <div key={key} className="h-20 rounded border bg-card p-3">
                <div className="h-3 w-1/2 rounded bg-muted" />
                <div className="mt-3 h-5 w-2/3 rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * A: the GOV.UK phase banner. A slim strip across the top of the page: a tag, one
 * sentence, the feedback link, and „Am înțeles” as a quiet button on the right.
 */
export function PhaseStrip() {
  const { t } = useLingui()
  return (
    <Page
      notice={(dismiss) => (
        <section aria-label={t`Pagină în lucru`} className="border-b px-5 py-3 md:px-8">
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:gap-3">
            <span className="w-fit shrink-0 rounded-sm bg-status-partial-bg px-2 py-0.5 text-xs font-semibold text-status-partial-fg">{t`În lucru`}</span>
            <p className="min-w-0 flex-1 text-foreground">
              {t`Încă verificăm datele de pe această pagină, așa că unele cifre se pot schimba.`} <FeedbackLink className="text-primary" />
            </p>
            <Button variant="outline" size="sm" onClick={dismiss} className="w-fit shrink-0">
              {t`Am înțeles`}
            </Button>
          </div>
        </section>
      )}
    />
  )
}

/**
 * B: the GOV.UK notification banner. A box with a navy title bar, a short heading,
 * one sentence, the feedback link, then „Am înțeles”.
 */
export function NoticeBox() {
  const { t } = useLingui()
  return (
    <Page
      notice={(dismiss) => (
        <div className="px-5 pt-5 md:px-8 md:pt-8">
          <section aria-labelledby="notice-box-title" className="overflow-hidden rounded-md border-2 border-primary">
            <h2 id="notice-box-title" className="bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
              {t`În lucru`}
            </h2>
            <div className="space-y-2 bg-card px-4 py-4">
              <p className="text-base font-semibold">{t`Încă verificăm datele de pe această pagină`}</p>
              <p className="text-sm text-muted-foreground">
                {t`Unele cifre se pot schimba până terminăm verificarea.`} <FeedbackLink className="text-primary" />
              </p>
              <Button size="sm" onClick={dismiss} className="mt-2">
                {t`Am înțeles`}
              </Button>
            </div>
          </section>
        </div>
      )}
    />
  )
}

/**
 * C: an amber band across the page, with a construction icon. The loudest: it
 * uses the „partial” status colours, which the app keeps for data with known gaps.
 */
export function AmberBand() {
  const { t } = useLingui()
  return (
    <Page
      notice={(dismiss) => (
        <section aria-label={t`Pagină în lucru`} className="border-b border-status-partial-fg/20 bg-status-partial-bg px-5 py-4 text-status-partial-fg md:px-8">
          <div className="flex gap-3">
            <Construction className="mt-0.5 size-5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 space-y-1 text-sm">
              <p className="font-semibold">{t`Pagină în lucru: încă verificăm datele`}</p>
              <p>
                {t`Unele cifre se pot schimba până terminăm verificarea.`} <FeedbackLink />
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={dismiss} aria-label={t`Am înțeles, ascunde mesajul`} className="-mt-1 -mr-2 shrink-0 text-status-partial-fg hover:bg-status-partial-fg/10 hover:text-status-partial-fg">
              <X className="size-4" aria-hidden />
            </Button>
          </div>
        </section>
      )}
    />
  )
}

/**
 * D: the notice box with GOV.UK's cookie-banner ending. „Am înțeles” swaps the
 * message for a one-line confirmation that says when it comes back, and
 * „Ascunde mesajul” clears it.
 */
export function NoticeConfirm() {
  return <Page notice={(dismiss) => <ConfirmingNotice onHide={dismiss} />} />
}

function ConfirmingNotice({ onHide }: { readonly onHide: () => void }) {
  const { t } = useLingui()
  const [acknowledged, setAcknowledged] = useState(false)
  return (
    <div className="px-5 pt-5 md:px-8 md:pt-8">
      <section aria-labelledby="notice-confirm-title" aria-live="polite" className="overflow-hidden rounded-md border-2 border-primary">
        <h2 id="notice-confirm-title" className="bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground">
          {t`În lucru`}
        </h2>
        {acknowledged ? (
          <div className="flex flex-col gap-3 bg-card px-4 py-4 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 text-sm">{t`Mulțumim. Nu-ți mai arătăm mesajul pe această pagină până închizi browserul.`}</p>
            <Button variant="outline" size="sm" onClick={onHide} className="w-fit shrink-0">
              {t`Ascunde mesajul`}
            </Button>
          </div>
        ) : (
          <div className="space-y-2 bg-card px-4 py-4">
            <p className="text-base font-semibold">{t`Încă verificăm datele de pe această pagină`}</p>
            <p className="text-sm text-muted-foreground">
              {t`Unele cifre se pot schimba până terminăm verificarea.`} <FeedbackLink className="text-primary" />
            </p>
            <Button size="sm" onClick={() => setAcknowledged(true)} className="mt-2">
              {t`Am înțeles`}
            </Button>
          </div>
        )}
      </section>
    </div>
  )
}

/**
 * E: a quiet line: neutral, no colour block, the icon and a dotted rule carry it.
 * The calmest: for pages where the data is mostly right and the page mostly done.
 */
export function QuietLine() {
  const { t } = useLingui()
  return (
    <Page
      notice={(dismiss) => (
        <section aria-label={t`Pagină în lucru`} className="border-b border-dashed bg-muted/50 px-5 py-2.5 md:px-8">
          <div className="flex items-start gap-2.5 text-sm text-muted-foreground sm:items-center">
            <Construction className="mt-0.5 size-4 shrink-0 text-foreground sm:mt-0" aria-hidden />
            <p className="min-w-0 flex-1">
              <span className="font-medium text-foreground">{t`Pagină în lucru.`}</span> {t`Încă verificăm datele; unele cifre se pot schimba.`}{' '}
              <FeedbackLink className="text-foreground" />
            </p>
            <button type="button" onClick={dismiss} className="shrink-0 text-sm font-medium text-foreground underline underline-offset-2 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {t`Am înțeles`}
            </button>
          </div>
        </section>
      )}
    />
  )
}

/**
 * The GOV.UK cookie-banner shape, in this app's system: a full-width band at the
 * top of the page, its text aligned with the page's own column; a section title,
 * two short sentences at reading size, then the action row. `tone` picks the band.
 */
function Band({ tone, tag = false, feedbackAs = 'link' }: { readonly tone: 'muted' | 'tint'; readonly tag?: boolean; readonly feedbackAs?: 'link' | 'button' }) {
  const { t } = useLingui()
  const openFeedback = () => toast.info(t`Aici se deschide formularul de feedback.`)
  return (
    <Page
      notice={(dismiss) => (
        <section
          aria-labelledby={`band-${tone}-title`}
          className={cn('border-b px-5 py-6 md:px-8 md:py-7', tone === 'muted' ? 'bg-muted' : 'border-primary/15 bg-primary/5')}
        >
          <div className="max-w-2xl">
            {tag && <p className="mb-2 w-fit rounded-sm bg-status-partial-bg px-2 py-0.5 text-xs font-semibold text-status-partial-fg">{t`În lucru`}</p>}
            <h2 id={`band-${tone}-title`} className="text-lg font-semibold">
              {t`Această pagină este în lucru`}
            </h2>
            <div className="mt-2 space-y-2 text-base text-foreground/90">
              <p>{t`Încă verificăm datele afișate aici, așa că unele cifre se pot schimba.`}</p>
              <p>{t`Dacă vezi ceva greșit, spune-ne: ne ajută să terminăm mai repede.`}</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button onClick={dismiss} className="h-10 px-5">
                {t`Am înțeles`}
              </Button>
              {feedbackAs === 'button' ? (
                <Button variant="outline" onClick={openFeedback} className="h-10 bg-background px-5">
                  {t`Trimite feedback`}
                </Button>
              ) : (
                <button
                  type="button"
                  onClick={openFeedback}
                  className="text-sm font-medium text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {t`Trimite feedback`}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    />
  )
}

/** F: the GOV.UK cookie banner, neutral: grey band, one navy button, feedback as a link. */
export function BandMuted() {
  return <Band tone="muted" />
}

/** G: the same on a faint navy tint, as GOV.UK's grey-blue band, with two buttons. */
export function BandTint() {
  return <Band tone="tint" feedbackAs="button" />
}

/** H: the grey band with an „În lucru” status tag above the title. */
export function BandTagged() {
  return <Band tone="muted" tag />
}

/**
 * Round 3: F's band with polished copy, in four type treatments, all Inter
 * (DESIGN.md: one typeface, no second display font).
 */
type Treatment = 'gov' | 'balanced' | 'compact' | 'lead'

const TREATMENT: Record<Treatment, { readonly band: string; readonly title: string; readonly body: string; readonly button: string }> = {
  // GOV.UK's scale: a large bold title, body a step up from the page's.
  gov: { band: 'py-7 md:py-9', title: 'text-2xl font-bold tracking-tight', body: 'mt-3 space-y-3 text-lg leading-relaxed', button: 'h-11 px-6 text-base' },
  // The section title a step up, body at reading size, the second sentence quieter.
  balanced: { band: 'py-6 md:py-8', title: 'text-xl font-semibold tracking-tight', body: 'mt-2 space-y-1.5 text-base leading-relaxed', button: 'h-10 px-5' },
  // Operational: the app's own density, as a band header.
  compact: { band: 'py-5', title: 'text-base font-semibold', body: 'mt-1 space-y-1 text-sm', button: 'h-9 px-4' },
  // No title: one paragraph whose first words carry the weight.
  lead: { band: 'py-5 md:py-6', title: '', body: 'space-y-1.5 text-base leading-relaxed', button: 'h-10 px-5' },
}

function PolishedBand({ treatment }: { readonly treatment: Treatment }) {
  const { t } = useLingui()
  const style = TREATMENT[treatment]
  const titleId = `band-${treatment}-title`
  const openFeedback = () => toast.info(t`Aici se deschide formularul de feedback.`)
  return (
    <Page
      notice={(dismiss) => (
        <section
          aria-labelledby={treatment === 'lead' ? undefined : titleId}
          aria-label={treatment === 'lead' ? t`Pagină în lucru` : undefined}
          className={cn('border-b bg-muted px-5 md:px-8', style.band)}
        >
          <div className="max-w-2xl">
            {treatment !== 'lead' && (
              <h2 id={titleId} className={cn('text-balance', style.title)}>
                {t`Lucrăm încă la această pagină`}
              </h2>
            )}
            <div className={cn('text-pretty', style.body)}>
              {treatment === 'lead' ? (
                <p>
                  <strong className="font-semibold">{t`Lucrăm încă la această pagină.`}</strong>{' '}
                  {t`Verificăm datele, așa că unele cifre se pot schimba până terminăm.`}
                </p>
              ) : (
                <p>{t`Verificăm datele, așa că unele cifre se pot schimba până terminăm.`}</p>
              )}
              <p className={treatment === 'gov' ? undefined : 'text-muted-foreground'}>{t`Ai găsit ceva greșit? Spune-ne și ne ajuți să verificăm mai repede.`}</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Button onClick={dismiss} className={style.button}>
                {t`Am înțeles`}
              </Button>
              <button
                type="button"
                onClick={openFeedback}
                className={cn(
                  'font-medium text-primary underline underline-offset-4 hover:decoration-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  treatment === 'gov' ? 'text-base' : 'text-sm',
                )}
              >
                {t`Semnalează o greșeală`}
              </button>
            </div>
          </div>
        </section>
      )}
    />
  )
}

/** I: GOV.UK's scale: large bold title, body a step up. */
export function TypeGov() {
  return <PolishedBand treatment="gov" />
}

/** J: balanced: a slightly larger title, the second sentence quieter. */
export function TypeBalanced() {
  return <PolishedBand treatment="balanced" />
}

/** K: compact: the app's own operational density. */
export function TypeCompact() {
  return <PolishedBand treatment="compact" />
}

/** L: no title, one paragraph led by bold words. */
export function TypeLead() {
  return <PolishedBand treatment="lead" />
}

/**
 * The real component (`src/components/data-trust/page-notice.tsx`), cookie and
 * all: dismiss it and reload, or open another tab; it stays hidden until the
 * browser closes. Clear the `page-notices-dismissed` cookie to see it again.
 */
export function Live() {
  const { t } = useLingui()
  return (
    <div data-dev-marker={PROTOTYPE_MARKER} className="overflow-hidden rounded-md border bg-background">
      <PageNotice id="prototype-page-notice" contentClassName="px-5 md:px-8" />
      <div className="space-y-4 p-5 md:p-8">
        <p className="text-xs text-muted-foreground">{t`Instituții și organizații`}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{t`Întreprinderi publice`}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{t`Companiile controlate de stat și de autoritățile locale: cine le deține, cât încasează și cât cheltuiesc.`}</p>
      </div>
    </div>
  )
}
