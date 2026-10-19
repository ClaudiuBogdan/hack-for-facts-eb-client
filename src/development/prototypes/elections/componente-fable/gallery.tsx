import type { ReactNode } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { MonoLabel } from '@/components/landing-skin/mono-label'
import { RuledFrame } from '@/components/landing-skin/ruled-frame'
import { cn } from '@/lib/utils'
import { CaveatsMarker, useFormat } from '../shared/parts'
import { EvolutionGroup } from './evolutie'
import { RacesGroup } from './intreceri'
import { MandatesGroup } from './mandate'
import { MapsGroup } from './harti'
import { EVOLUTION } from './model'
import { TurnoutGroup } from './prezenta'

export type GalleryGroup = 'evolutie' | 'mandate' | 'harti' | 'prezenta' | 'intreceri'

const GROUPS: readonly GalleryGroup[] = ['evolutie', 'mandate', 'harti', 'prezenta', 'intreceri']

function groupTitle(group: GalleryGroup): string {
  switch (group) {
    case 'evolutie':
      return t`Cum s-au schimbat partidele`
    case 'mandate':
      return t`Cum arată un întreg: mandatele`
    case 'harti':
      return t`Hărți`
    case 'prezenta':
      return t`Prezența la vot`
    case 'intreceri':
      return t`Cât de strânse au fost alegerile`
  }
}

function groupLede(group: GalleryGroup): string {
  switch (group) {
    case 'evolutie':
      return t`Voturile la Cameră în 2008, 2016 și 2020 și primăriile în 2016, 2020 și 2024, în cinci forme.`
    case 'mandate':
      return t`Primăriile, consilierii locali și județeni: pătrățele, semicerc, județe ca pătrate egale.`
    case 'harti':
      return t`Puterea unui partid, schimbarea între alegeri, primăriile păstrate sau pierdute, prezența și cât de strânse au fost cursele.`
    case 'prezenta':
      return t`Prezența din 1992 până azi, județele, distribuția pe localități, străinătatea, orașele și satele.`
    case 'intreceri':
      return t`Diferențele la primării, cele mai strânse curse, câți candidați, unde e puternic fiecare partid.`
  }
}

/** The notes every results page carries behind its source line. */
export function galleryNotes(): readonly ReactNode[] {
  return [
    <Trans key="db">
      Rezultatele nu sunt încă servite de API: componentele citesc un extras al bazei de date electorale Transparenta.eu (BEC, AEP, ROAEP). Etichetele sunt ale sursei și nu sunt
      încă verificate.
    </Trans>,
    <Trans key="chamber">
      Camera Deputaților: 2008, 2016 și 2020 sunt singurele alegeri cu voturile legate de partide. La 1992–2004 și 2012 legăturile lipsesc sau sunt greșite; 2024 are doar listele
      de candidați. În 2016, restul rândurilor sunt coloane fără etichetă, deci procentele sunt din voturile partidelor identificate.
    </Trans>,
    <Trans key="local">
      Primării: 2016 vine din ediția etichetată „locale 2014" (date din 2016), 2020 din ediția AEP; toate fără București, ca să se compare cu 2024. Consilierii locali și județeni
      lipsesc pentru 2020.
    </Trans>,
    <Trans key="lines">
      Liniile de partid unesc un partid cu alianțele în care a candidat (de exemplu PSD cu PSD+PC în 2008, USR cu USR PLUS în 2020). Gruparea și culorile sunt ale Transparenta.eu.
    </Trans>,
    <Trans key="turnout">Prezența vine din tabelul de prezență derivat, cu statutul „neverificat" sau „suspect"; la prezidențiale e turul raportat de ediție, neverificat.</Trans>,
    <Trans key="people">Nicio componentă nu arată persoane: partide, numere și locuri. Nimeni nu e numit „ales".</Trans>,
  ]
}

/**
 * A gallery of visual components for the results page: each group shows the
 * same data in several forms (Varianta A, B, …) so the owner can pick which
 * ones go into the main prototype.
 */
export function Gallery({ group }: { readonly group: GalleryGroup }) {
  const format = useFormat()
  const body =
    group === 'evolutie' ? (
      <EvolutionGroup />
    ) : group === 'mandate' ? (
      <MandatesGroup />
    ) : group === 'harti' ? (
      <MapsGroup />
    ) : group === 'prezenta' ? (
      <TurnoutGroup />
    ) : (
      <RacesGroup />
    )
  return (
    <div className="w-full bg-background">
      <header className="border-b bg-muted/20">
        <RuledFrame className="py-10 sm:py-14">
          <MonoLabel className="block text-primary">
            <Trans>Alegeri · componente vizuale</Trans>
          </MonoLabel>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{groupTitle(group)}</h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">{groupLede(group)}</p>
          <nav aria-label={t`Grupurile de componente`} className="mt-6 flex flex-wrap gap-2">
            {GROUPS.map((key) => (
              <a
                key={key}
                href={`/development/elections/componente-fable?v=${key}`}
                aria-current={key === group ? 'page' : undefined}
                className={cn(
                  'rounded-sm border px-3 py-1.5 text-sm transition-colors',
                  key === group ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {groupTitle(key)}
              </a>
            ))}
          </nav>
          <p className="mt-6 flex flex-wrap items-center gap-x-1 text-sm text-muted-foreground">
            <span>
              <Trans>Sursa: BEC, AEP și ROAEP, din baza de date Transparenta.eu, extras pe {format.day(EVOLUTION.readAt)}</Trans>
            </span>
            <CaveatsMarker notes={galleryNotes()} />
          </p>
        </RuledFrame>
      </header>
      <RuledFrame className="py-10 sm:py-14">{body}</RuledFrame>
    </div>
  )
}
