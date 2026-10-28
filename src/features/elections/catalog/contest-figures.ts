import type { I18n, MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import {
  ELECTION_ALLOCATION_PHASES,
  type ElectionAllocationPhase,
  type ElectionContest,
  type ElectionResult,
  type ElectionTally,
  type ElectionTurnoutFigure,
  type ElectionTurnoutMeasure,
} from '@/schemas/elections-catalog'

/**
 * A contest's figures as its page groups them: the votes in the API's order
 * (by value), the mandates per allocation phase (never summed across
 * phases), one turnout figure per measure, and what a reader must know
 * before trusting them. A measure the data does not hold is absent, never 0.
 */

export function votesOf(result: ElectionResult): readonly ElectionTally[] {
  return result.tallies.filter((tally) => tally.measure === 'votes')
}

export interface MandatePhase {
  readonly phase: ElectionAllocationPhase
  readonly tallies: readonly ElectionTally[]
}

/** The mandates of each phase the data holds, in allocation order. */
export function mandatesByPhase(result: ElectionResult): readonly MandatePhase[] {
  return ELECTION_ALLOCATION_PHASES.map((phase) => ({
    phase,
    tallies: result.tallies.filter((tally) => tally.measure === 'mandates' && tally.allocationPhase === phase),
  })).filter((group) => group.tallies.length > 0)
}

export function turnoutOf(result: ElectionResult, measure: ElectionTurnoutMeasure): ElectionTurnoutFigure | null {
  return result.turnout.find((figure) => figure.measure === measure) ?? null
}

/** A figure's measure in a list of measures: „voturi", „înscriși pe liste". */
const MEASURE_LABEL: Readonly<Record<ElectionTally['measure'] | ElectionTurnoutMeasure, MessageDescriptor>> = {
  votes: msg`voturile competitorilor`,
  mandates: msg`mandatele`,
  registered: msg`înscrișii pe liste`,
  voted: msg`votanții`,
  valid: msg`voturile valabile`,
  invalid: msg`voturile nule`,
  blank: msg`voturile albe`,
}

/** The measures of the figures that state the diaspora's inclusion one way, each named once, in the page's order. */
function measuresWith(i18n: I18n, figures: readonly (ElectionTally | ElectionTurnoutFigure)[], included: boolean): string {
  const measures = [...new Set(figures.filter((figure) => figure.includesDiaspora === included).map((figure) => figure.measure))]
  return measures.map((measure) => i18n._(MEASURE_LABEL[measure])).join(', ')
}

/**
 * The notes behind the page's one caveats marker. Each is said once, for the
 * contest as a whole; a suspect figure is also marked where it is shown.
 * Issue codes are the API's public codes, listed as they come. The race is
 * the result's own, read with the figures it describes.
 */
export function contestNotes(i18n: I18n, contest: Pick<ElectionContest, 'status'>, result: ElectionResult | null | undefined): readonly string[] {
  const notes: string[] = []
  if (contest.status === 'annulled') notes.push(i18n._(msg`Scrutinul a fost anulat; cifrele lui, unde există, sunt cele numărate înainte de anulare.`))
  if (!result) return notes
  const figures = [...result.tallies, ...result.turnout]
  if (figures.some((figure) => figure.status === 'SUSPECT')) notes.push(i18n._(msg`Unele cifre au un defect cunoscut; sunt marcate acolo unde apar.`))
  if (figures.some((figure) => figure.status === 'UNCHECKED')) notes.push(i18n._(msg`Unele cifre nu au un total publicat separat cu care să fie comparate.`))
  if (figures.some((figure) => figure.finality === 'provisional')) notes.push(i18n._(msg`Unele cifre sunt provizorii.`))
  if (figures.some((figure) => figure.finality === 'unknown')) notes.push(i18n._(msg`Pentru unele cifre nu se știe dacă sunt finale.`))
  if (figures.some((figure) => figure.geographicCompleteness === 'partial')) notes.push(i18n._(msg`Unele cifre nu acoperă tot locul scrutinului.`))
  if (result.tallies.some((tally) => tally.countedPopulation === 'linked_only')) notes.push(i18n._(msg`Unele voturi nu numără toți votanții locului.`))
  // National figures say whether they include the diaspora; when they differ, each side is named by its measures.
  const withDiaspora = figures.some((figure) => figure.includesDiaspora === true)
  const withoutDiaspora = figures.some((figure) => figure.includesDiaspora === false)
  if (withDiaspora && withoutDiaspora) {
    const included = measuresWith(i18n, figures, true)
    const excluded = measuresWith(i18n, figures, false)
    notes.push(i18n._(msg`Cifrele naționale nu numără aceiași votanți: diaspora e inclusă în ${included} și nu e inclusă în ${excluded}.`))
  } else if (withDiaspora) notes.push(i18n._(msg`Cifrele naționale includ diaspora.`))
  else if (withoutDiaspora) notes.push(i18n._(msg`Cifrele naționale nu includ diaspora.`))
  // The API leaves a share out for more than one reason (no valid votes to divide by, or votes that count other voters).
  if (votesOf(result).some((tally) => tally.share === null)) notes.push(i18n._(msg`Unele procente lipsesc: API-ul nu le calculează din voturile valabile ale locului.`))
  // The API computes the race only where every vote tally counts the same voters and none is suspect.
  if (result.race === null && votesOf(result).length > 0)
    notes.push(i18n._(msg`Diferența dintre primii doi nu e calculată: voturile locului nu numără aceiași votanți sau au un defect cunoscut.`))
  if (!result.tallies.some((tally) => tally.measure === 'mandates')) notes.push(i18n._(msg`Mandatele nu sunt în date.`))
  if (result.coverage.some((cell) => cell.state === 'links_missing' || cell.state === 'links_wrong'))
    notes.push(i18n._(msg`La unele măsuri, legăturile dintre secții și locuri lipsesc sau sunt greșite.`))
  // The coverage cells' codes too: they are the API's only explanation for a measure the data lacks.
  const codes = [...new Set([...figures, ...result.coverage].flatMap((entry) => entry.issues).concat(result.race?.issues ?? []))].sort()
  if (codes.length > 0) {
    const list = codes.join(', ')
    notes.push(i18n._(msg`Semnalări în date: ${list}.`))
  }
  return notes
}
