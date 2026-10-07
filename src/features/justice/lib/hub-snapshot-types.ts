import type { JudicialCourtLevel } from '@/schemas/judicial'

/**
 * The shape of the justice front door's snapshot (`hub-snapshot.ts`): the
 * court portal's figures read once from the judicial API and kept in the
 * client. The capture of portal.just.ro stopped in June 2026, so the figures
 * hold until it resumes; the generator
 * (`scripts/generate-justice-hub-snapshot.mjs`) reads them again then.
 */

export interface HubCount {
  readonly key: string
  readonly count: number
}

export interface HubCourt {
  /** The Portal Just institution code. */
  readonly code: string
  readonly level: JudicialCourtLevel
  /** The county abbreviation the API stores for the court (`B`, `CJ`); null for the ÎCCJ. */
  readonly county: string | null
  /** Every case the API holds for the court. */
  readonly cases: number
  /** Its cases whose source date falls in the snapshot's year. */
  readonly casesInYear: number
}

export interface HubStage {
  /** The stage as the API stores it (`Fond`, `ContestaţieNCPP`). */
  readonly stage: string
  /** Cases in the snapshot's year at that stage, by court level. */
  readonly byLevelInYear: Readonly<Partial<Record<JudicialCourtLevel, number>>>
}

export interface JusticeHubSnapshot {
  /** The day the generator read the API. */
  readonly capturedAt: string
  readonly asOf: {
    /** The newest stored modification of a Portal case: the capture's end. */
    readonly portalModifiedAt: string
    /** The newest ÎCCJ archive date. */
    readonly iccjArchiveDate: string
  }
  /** The last calendar year the Portal capture covers whole: the year before its newest modification. */
  readonly year: number
  readonly cases: {
    readonly total: number
    readonly inYear: number
    readonly byLevelInYear: Readonly<Partial<Record<JudicialCourtLevel, number>>>
    /** Every case by the year of its source date; the API's keys (`(none)`, `infinity`) kept. */
    readonly byYear: readonly HubCount[]
  }
  readonly matters: {
    /** The year's cases by matter, as the API keys them (the ÎCCJ's raw labels beside the Portal's codes). */
    readonly inYear: readonly HubCount[]
    readonly byLevelInYear: Readonly<Partial<Record<JudicialCourtLevel, readonly HubCount[]>>>
  }
  readonly stages: readonly HubStage[]
  readonly courts: readonly HubCourt[]
  readonly decisions: {
    /** ECHR judgments (English and French one), one per ECLI, by the year of their date. */
    readonly echrJudgments: readonly HubCount[]
    /** CCR decisions captured so far, by their stored year. */
    readonly ccrByYear: readonly HubCount[]
    /** CNSC decisions captured so far, by month. */
    readonly cnscByMonth: readonly HubCount[]
  }
}
