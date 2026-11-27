import { t } from '@lingui/core/macro'
import { BookText, BriefcaseBusiness, ChartColumn, Landmark, Scale, Table2, type LucideIcon } from 'lucide-react'

export type ProfileSectionId = 'afacerea' | 'bani-publici' | 'activitati' | 'litigii' | 'an-cu-an' | 'registru'

export type ProfileSection = { readonly id: ProfileSectionId; readonly label: () => string; readonly icon: LucideIcon }

// The owner's order (25 November 2026): what the company does and its statements right under its chart. Each with
// an icon in the bar, as on the national budget page (owner, 25 November 2026).
export const PROFILE_SECTIONS: readonly ProfileSection[] = [
  { id: 'afacerea', label: () => t`Afacerea`, icon: ChartColumn },
  { id: 'activitati', label: () => t`Activități`, icon: BriefcaseBusiness },
  { id: 'an-cu-an', label: () => t`An cu an`, icon: Table2 },
  { id: 'bani-publici', label: () => t`Bani publici`, icon: Landmark },
  { id: 'litigii', label: () => t`Litigii`, icon: Scale },
  { id: 'registru', label: () => t`Registru`, icon: BookText },
]
