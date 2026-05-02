import { t } from '@lingui/core/macro'
import type { PnrrBeneficiaryType, PnrrProjectStatus } from '@/schemas/pnrr'

// ---------------------------------------------------------------------------
// Progress category labels — single source of truth
// ---------------------------------------------------------------------------

export type ProgressCategoryKey =
  | 'completed'
  | 'advanced'
  | 'mid'
  | 'under30'
  | 'not-started'
  | 'unknown'

export const PROGRESS_CATEGORY_LABELS: Readonly<Record<ProgressCategoryKey, string>> = {
  completed: t`Finalizat`,
  advanced: t`Avansat (70-99%)`,
  mid: t`În progres (30-70%)`,
  under30: t`Sub 30%`,
  'not-started': t`Neînceput`,
  unknown: t`Necunoscut`,
}

/**
 * Map URL-serialised progress category keys to the internal PnrrProjectStatus values.
 * The Zod schema uses short keys (e.g. 'mid') for URL readability, while the engine
 * uses hyphenated forms (e.g. 'mid-progress') for semantic clarity.
 */
export const PROGRESS_CATEGORY_TO_STATUS: Readonly<
  Record<ProgressCategoryKey, PnrrProjectStatus>
> = {
  completed: 'completed',
  advanced: 'advanced',
  mid: 'mid-progress',
  under30: 'under-30',
  'not-started': 'not-started',
  unknown: 'unknown',
}

// ---------------------------------------------------------------------------
// Funding source labels
// ---------------------------------------------------------------------------

export const FUNDING_SOURCE_LABELS: Readonly<Record<string, string>> = {
  grant: t`Grant`,
  loan: t`Împrumut`,
  'grant/loan': t`Grant + Împrumut`,
}

// ---------------------------------------------------------------------------
// Entity type labels
// ---------------------------------------------------------------------------

export const ENTITY_TYPE_LABELS: Readonly<Record<string, string>> = {
  public: t`Instituții publice`,
  private: t`Companii private`,
  national: t`Entități naționale`,
}

// ---------------------------------------------------------------------------
// Beneficiary type labels
// ---------------------------------------------------------------------------

export const BENEFICIARY_TYPE_LABELS: Readonly<Record<PnrrBeneficiaryType, string>> = {
  public: t`Publice`,
  private: t`Private`,
  national: t`Naționale`,
  uat: t`UAT`,
  'county-council': t`Consilii județene`,
  ministry: t`Ministere`,
  'central-agency': t`Agenții centrale`,
  education: t`Educație`,
  health: t`Sănătate`,
  military: t`Militare`,
  company: t`Companii`,
  ngo: t`ONG / asociații`,
  religious: t`Culte`,
  culture: t`Cultură`,
  social: t`Social`,
  'other-public': t`Alte instituții publice`,
}

export const BENEFICIARY_TYPE_OPTIONS: readonly {
  readonly value: PnrrBeneficiaryType
  readonly label: string
  readonly description?: string
}[] = [
  {
    value: 'public',
    label: BENEFICIARY_TYPE_LABELS.public,
    description: t`Toate instituțiile publice locale și centrale`,
  },
  {
    value: 'private',
    label: BENEFICIARY_TYPE_LABELS.private,
    description: t`Companii și beneficiari privați`,
  },
  {
    value: 'national',
    label: BENEFICIARY_TYPE_LABELS.national,
    description: t`Ministere și instituții centrale fără UAT local`,
  },
  { value: 'uat', label: BENEFICIARY_TYPE_LABELS.uat, description: t`Primării, municipii, orașe și comune` },
  { value: 'county-council', label: BENEFICIARY_TYPE_LABELS['county-council'] },
  { value: 'ministry', label: BENEFICIARY_TYPE_LABELS.ministry },
  { value: 'central-agency', label: BENEFICIARY_TYPE_LABELS['central-agency'] },
  { value: 'education', label: BENEFICIARY_TYPE_LABELS.education },
  { value: 'health', label: BENEFICIARY_TYPE_LABELS.health },
  { value: 'military', label: BENEFICIARY_TYPE_LABELS.military },
  { value: 'company', label: BENEFICIARY_TYPE_LABELS.company },
  { value: 'ngo', label: BENEFICIARY_TYPE_LABELS.ngo },
  { value: 'religious', label: BENEFICIARY_TYPE_LABELS.religious },
  { value: 'culture', label: BENEFICIARY_TYPE_LABELS.culture },
  { value: 'social', label: BENEFICIARY_TYPE_LABELS.social },
  { value: 'other-public', label: BENEFICIARY_TYPE_LABELS['other-public'] },
]
