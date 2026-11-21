import { Link } from '@tanstack/react-router'
import { useLingui } from '@lingui/react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { AlertTriangle, ExternalLink } from 'lucide-react'
import {
  useLegislationFreshness,
  useLegislationStatusCounts,
} from '../hooks/use-legislation'
import { formatLegalDate, formatLegalNumber } from '../lib/legal-format'
import {
  legislationAlertClassName,
  legislationLinkClassName,
} from '../lib/legislation-theme'
import { LegislationSection } from './legislation-section'

const paragraphClassName = 'text-sm leading-6 text-[var(--pnrr-fg)]'

const externalLinkClassName =
  'inline-flex items-center gap-1 font-semibold underline underline-offset-2 transition-colors hover:text-[var(--pnrr-muted)]'

/**
 * `/legislation/guide` — the Ghid tab: what a reader must know to use this
 * corpus HONESTLY, stated in plain Romanian.
 *
 * Every figure here is LIVE (2026-11-20): the act total from the STATUS
 * aggregate, the CCR count and the two frontiers from
 * `useLegislationFreshness`. The measured constants it used to print
 * described the previous corpus and could not stay true under legal_v2. A
 * sentence has no loading or failure state: while a figure is unknown the
 * sentence is written without it, never with a zero or a stale number.
 *
 * The section order is the reader's path: what this is → how to find a law →
 * how to read its status → the Constitutional Court gap (the module's
 * top-listed honesty risk, in the warning treatment) → how fresh the data is
 * → what text you are actually reading and where the official form lives.
 * Each section routes INTO the module (finder, directory, changes, gazette),
 * so the guide is an entry point rather than a dead-end essay.
 */
export function LegislationGuide() {
  const { i18n } = useLingui()
  const number = (value: number) => formatLegalNumber(value, i18n.locale)
  const date = (value: string) => formatLegalDate(value, i18n.locale)
  const { data: counts } = useLegislationStatusCounts()
  const { data: freshness } = useLegislationFreshness()
  const actTotal = counts?.total
  const ccrCount = freshness?.ccrDecisionCount ?? null
  const latestIssue = freshness?.latestIssueDate ?? null
  const latestChange = freshness?.latestEffectiveChangeDate ?? null

  return (
    <div className="flex flex-col gap-12">
      <LegislationSection
        id="legislation-guide-corpus-heading"
        title={t`Ce este acest corpus`}
        description={t`Ce conține modulul de legislație și de unde vin datele.`}
      >
        <div className="flex flex-col gap-3">
          <p className={paragraphClassName}>
            {actTotal !== undefined ? (
              <Trans>
                Corpusul conține {number(actTotal)} de acte normative, preluate
                din Portal Legislativ și din Monitorul Oficial: legi, ordonanțe,
                hotărâri și celelalte tipuri de acte, cu statutul lor, cu
                trimiterile dintre ele și cu numărul de Monitor în care au
                apărut.
              </Trans>
            ) : (
              <Trans>
                Corpusul conține acte normative preluate din Portal Legislativ
                și din Monitorul Oficial: legi, ordonanțe, hotărâri și celelalte
                tipuri de acte, cu statutul lor, cu trimiterile dintre ele și cu
                numărul de Monitor în care au apărut.
              </Trans>
            )}
          </p>
          <p className={paragraphClassName}>
            <Trans>
              Poți răsfoi actele în{' '}
              <Link to="/legislation/acts" className={legislationLinkClassName}>
                directorul de acte
              </Link>{' '}
              și edițiile Monitorului Oficial în{' '}
              <Link
                to="/legislation/gazette"
                className={legislationLinkClassName}
              >
                directorul Monitorului
              </Link>
              .
            </Trans>
          </p>
        </div>
      </LegislationSection>

      <LegislationSection
        id="legislation-guide-find-heading"
        title={t`Cum găsești o lege`}
        description={t`Ce funcționează în căutare — și ce nu funcționează încă.`}
      >
        <div className="flex flex-col gap-3">
          <p className={paragraphClassName}>
            <Trans>
              Cauți fie după citare — „Legea 53/2003” — fie după denumire —
              „Codul muncii”. Ambele te duc la fișa actului, cu statutul lui și
              istoricul modificărilor.
            </Trans>
          </p>
          <p className={paragraphClassName}>
            <Trans>
              Ce NU funcționează încă: căutarea după sens. O întrebare
              formulată liber poate să nu găsească prevederea pe care o
              cauți.{' '}
              <Link
                to="/legislation/search"
                className={legislationLinkClassName}
              >
                Pagina de căutare
              </Link>{' '}
              spune la fiecare căutare dacă a căutat și în textul legilor sau
              doar după numărul și denumirea actelor, ca să nu iei o listă
              goală drept „legea nu există”.
            </Trans>
          </p>
        </div>
      </LegislationSection>

      <LegislationSection
        id="legislation-guide-status-heading"
        title={t`Cum citești statutul unui act`}
        description={t`Statutul din Portal spune mai puțin decât pare — iată cum îl interpretezi corect.`}
      >
        <div className="flex flex-col gap-3">
          <p className={paragraphClassName}>
            <Trans>
              „Abrogat parțial” NU înseamnă că legea nu mai e în vigoare. Este
              statutul firesc al unei legi modificate ani la rând: unele
              articole au fost abrogate, restul produc efecte în continuare.
              Printre cele mai citate acte din corpus, Codul de procedură
              penală — aplicat zi de zi în instanțe — poartă exact acest
              statut.
            </Trans>
          </p>
          <p className={paragraphClassName}>
            <Trans>
              Înainte să te bazezi pe un articol, deschide fișa actului și
              verifică ce versiune afișăm și din ce dată este — statutul
              singur nu îți spune dacă articolul care te interesează mai e în
              forma pe care o citești.
            </Trans>
          </p>
        </div>
      </LegislationSection>

      <LegislationSection
        id="legislation-guide-ccr-heading"
        title={t`Golul cel mai important: deciziile Curții Constituționale`}
        description={t`Riscul principal de interpretare greșită din acest modul, spus pe față.`}
      >
        <div className={legislationAlertClassName}>
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-[var(--pnrr-warning-fg)]"
            aria-hidden
          />
          <p className="text-sm font-medium leading-6 text-[var(--pnrr-fg)]">
            {ccrCount !== null ? (
              <Trans>
                Cele {number(ccrCount)} de decizii ale Curții Constituționale
                există ca acte în corpus, dar nu modifică niciodată statutul
                actelor pe care le vizează. O prevedere declarată
                neconstituțională poate apărea în continuare „în vigoare” aici.
                Verifică întotdeauna separat deciziile Curții înainte să te
                bazezi pe un articol contestat.
              </Trans>
            ) : (
              <Trans>
                Deciziile Curții Constituționale există ca acte în corpus, dar
                nu modifică niciodată statutul actelor pe care le vizează. O
                prevedere declarată neconstituțională poate apărea în continuare
                „în vigoare” aici. Verifică întotdeauna separat deciziile Curții
                înainte să te bazezi pe un articol contestat.
              </Trans>
            )}
          </p>
        </div>
      </LegislationSection>

      <LegislationSection
        id="legislation-guide-freshness-heading"
        title={t`Cât de proaspete sunt datele`}
        description={t`Datele au o margine — schimbările de după ea pot lipsi.`}
      >
        <div className="flex flex-col gap-3">
          <p className={paragraphClassName}>
            {latestIssue !== null && latestChange !== null ? (
              <Trans>
                Edițiile Monitorului Oficial din corpus se opresc la{' '}
                {date(latestIssue)}, iar cea mai recentă modificare intrată în
                vigoare pe care o avem înregistrată este din{' '}
                {date(latestChange)}. O lege publicată sau o modificare intrată
                în vigoare după aceste date poate lipsi de aici — absența ei nu
                înseamnă că nu există.
              </Trans>
            ) : (
              <Trans>
                Edițiile Monitorului Oficial și modificările din corpus se opresc
                la o anumită dată. O lege publicată sau o modificare intrată în
                vigoare după ea poate lipsi de aici — absența ei nu înseamnă că
                nu există.
              </Trans>
            )}
          </p>
          <p className={paragraphClassName}>
            <Trans>
              Fluxul{' '}
              <Link
                to="/legislation/changes"
                className={legislationLinkClassName}
              >
                modificărilor
              </Link>{' '}
              și{' '}
              <Link
                to="/legislation/gazette"
                className={legislationLinkClassName}
              >
                directorul Monitorului
              </Link>{' '}
              își afișează fiecare propria margine de acoperire, ca să vezi
              exact până unde ajung datele.
            </Trans>
          </p>
        </div>
      </LegislationSection>

      <LegislationSection
        id="legislation-guide-text-heading"
        title={t`Ce text citești aici — și unde e forma oficială`}
        description={t`Textul afișat este o formă publicată a actului sau o formă consolidată neoficială — niciuna nu este „textul în vigoare la o dată”.`}
      >
        <div className="flex flex-col gap-3">
          {/* True on both sources: the previous corpus serves published forms
              only, legal_v2 also serves Portal consolidations — unofficial
              and informative (LEG-X3AV). The server's own published-form
              caveat is no longer quoted here: on legal_v2 it is not the
              caveat the server attaches. */}
          <p className={paragraphClassName}>
            <Trans>
              Pe fișa unui act citești fie o formă publicată în Monitorul
              Oficial (actul inițial sau o republicare), fie o formă
              consolidată preluată din Portalul Legislativ. Versiunea afișată
              este numită deasupra textului și o poți schimba acolo.
            </Trans>
          </p>
          <p className={paragraphClassName}>
            <Trans>
              O formă consolidată este neoficială și are caracter informativ:
              poartă mențiunea Portalului și data ei, care nu este data la care
              te interesează legea. O formă publicată nu include modificările
              ulterioare. Pentru a stabili dispozițiile aplicabile la o dată,
              consultă în Monitorul Oficial actul, republicările, actele
              modificatoare și dispozițiile tranzitorii relevante:
            </Trans>
          </p>
          <ul className="flex flex-col gap-2 text-sm leading-6 text-[var(--pnrr-fg)]">
            <li>
              <a
                href="https://legislatie.just.ro"
                target="_blank"
                rel="noopener noreferrer"
                className={externalLinkClassName}
              >
                legislatie.just.ro
                <ExternalLink className="size-3" aria-hidden />
              </a>{' '}
              <Trans>— Portalul Legislativ, cu formele consolidate neoficiale ale actelor;</Trans>
            </li>
            <li>
              <a
                href="https://monitoruloficial.ro"
                target="_blank"
                rel="noopener noreferrer"
                className={externalLinkClassName}
              >
                monitoruloficial.ro
                <ExternalLink className="size-3" aria-hidden />
              </a>{' '}
              <Trans>— Monitorul Oficial, publicația oficială a României.</Trans>
            </li>
          </ul>
        </div>
      </LegislationSection>
    </div>
  )
}
