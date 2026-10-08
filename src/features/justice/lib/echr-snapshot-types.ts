/** The shape of `echr-snapshot.ts`, written by `scripts/generate-justice-echr-snapshot.mjs`. */

/** One HUDOC document of a judgment: its language and HUDOC item id (`001-97684`). */
export type EchrVersion = {
  readonly language: 'en' | 'fr'
  readonly item: string
}

/** A judgment in a case against Romania, one per ECLI (its English and French versions are one judgment). */
export type EchrJudgment = {
  readonly ecli: string
  /** The judgment's date, `YYYY-MM-DD`. */
  readonly date: string
  /** The application numbers it decides (`6946/03`), as HUDOC lists them; the number's suffix is the year it was lodged. */
  readonly applications: readonly string[]
  readonly versions: readonly EchrVersion[]
  /** The other respondent states, by ISO code, when the judgment names more than Romania. */
  readonly alsoAgainst?: readonly string[]
  /** A later judgment in a case already judged: every application it decides, an earlier judgment in the capture decided. */
  readonly followUp?: true
}

/** A year's documents: judgments, the applications first judged, decisions and communicated cases, each counted once. */
export type EchrYear = {
  readonly year: number
  readonly judgments: number
  /** The applications whose first judgment in the capture falls in the year: an application is counted once. */
  readonly applications: number
  readonly decisions: number
  readonly communicated: number
}

export type EchrSnapshot = {
  /** The day the snapshot was read. */
  readonly capturedAt: string
  /** The newest document date in the capture. */
  readonly newest: string
  readonly years: readonly EchrYear[]
  /** Newest first. */
  readonly judgments: readonly EchrJudgment[]
}
