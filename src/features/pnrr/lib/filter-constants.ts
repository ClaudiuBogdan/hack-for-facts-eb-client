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

export const PROGRESS_CATEGORY_LABELS: Readonly<
  Record<ProgressCategoryKey, string>
> = {
  completed: t`Completed`,
  advanced: t`Advanced (70-99%)`,
  mid: t`In progress (30-70%)`,
  under30: t`Under 30%`,
  'not-started': t`Not started`,
  unknown: t`Unknown`,
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
  loan: t`Loan`,
  'grant/loan': t`Grant + loan`,
}

// ---------------------------------------------------------------------------
// Entity type labels
// ---------------------------------------------------------------------------

export const ENTITY_TYPE_LABELS: Readonly<Record<string, string>> = {
  public: t`Public institutions`,
  private: t`Private companies`,
  national: t`National entities`,
}

// ---------------------------------------------------------------------------
// Beneficiary type labels
// ---------------------------------------------------------------------------

export const BENEFICIARY_TYPE_LABELS: Readonly<
  Record<PnrrBeneficiaryType, string>
> = {
  public: t`Public`,
  private: t`Private`,
  national: t`National`,
  uat: t`UAT`,
  'county-council': t`County councils`,
  ministry: t`Ministries`,
  'central-agency': t`Central agencies`,
  education: t`Education`,
  health: t`Health`,
  military: t`Military`,
  company: t`Companies`,
  ngo: t`NGOs / associations`,
  religious: t`Religious organizations`,
  culture: t`Culture`,
  social: t`Social`,
  'other-public': t`Other public institutions`,
}

export const BENEFICIARY_TYPE_OPTIONS: readonly {
  readonly value: PnrrBeneficiaryType
  readonly label: string
  readonly description?: string
}[] = [
  {
    value: 'public',
    label: BENEFICIARY_TYPE_LABELS.public,
    description: t`All local and central public institutions`,
  },
  {
    value: 'private',
    label: BENEFICIARY_TYPE_LABELS.private,
    description: t`Companies and private beneficiaries`,
  },
  {
    value: 'national',
    label: BENEFICIARY_TYPE_LABELS.national,
    description: t`Ministries and central institutions without local UAT`,
  },
  {
    value: 'uat',
    label: BENEFICIARY_TYPE_LABELS.uat,
    description: t`City halls, municipalities, towns, and communes`,
  },
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
