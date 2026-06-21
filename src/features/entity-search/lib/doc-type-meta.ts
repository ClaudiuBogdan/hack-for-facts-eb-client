import { t } from '@lingui/core/macro'
import {
  Building,
  Building2,
  FileSignature,
  FileText,
  Gavel,
  HeartHandshake,
  Landmark,
  Newspaper,
  PackageOpen,
  Scale,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react'
import {
  ENTITY_SEARCH_DOC_TYPES,
  type EntitySearchDocType,
} from '@/schemas/entity-search'

export type EntityDocTypeMeta = {
  readonly label: string
  readonly color: string
  readonly Icon: LucideIcon
}

export const DOC_TYPE_META = {
  company: {
    label: t`Firmă`,
    color:
      'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
    Icon: Building2,
  },
  ngo: {
    label: t`ONG`,
    color:
      'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
    Icon: HeartHandshake,
  },
  public_enterprise: {
    label: t`Companie de stat`,
    color:
      'border-[var(--pnrr-green)]/40 bg-[var(--pnrr-green)]/15 text-emerald-900 dark:text-emerald-200',
    Icon: Landmark,
  },
  organization: {
    label: t`Instituție`,
    color:
      'border-[var(--pnrr-green)]/40 bg-[var(--pnrr-green)]/15 text-emerald-900 dark:text-emerald-200',
    Icon: Landmark,
  },
  procurement_contract: {
    label: t`Contract`,
    color:
      'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    Icon: FileSignature,
  },
  procurement_procedure: {
    label: t`Licitație`,
    color:
      'border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200',
    Icon: Gavel,
  },
  legal_act: {
    label: t`Legislație`,
    color:
      'border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200',
    Icon: Scale,
  },
  bill: {
    label: t`Proiect de lege`,
    color:
      'border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200',
    Icon: ScrollText,
  },
  mo_act: {
    label: t`Monitorul Oficial`,
    color:
      'border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200',
    Icon: Newspaper,
  },
  pnrr_entity: {
    label: t`PNRR`,
    color:
      'border-teal-200 bg-teal-100 text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200',
    Icon: Building,
  },
  pnrr_project: {
    label: t`PNRR`,
    color:
      'border-teal-200 bg-teal-100 text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200',
    Icon: PackageOpen,
  },
  member: {
    label: t`Parlamentar`,
    color:
      'border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
    Icon: Users,
  },
} satisfies Record<EntitySearchDocType, EntityDocTypeMeta>

export const UNKNOWN_DOC_TYPE_META = {
  label: t`Document`,
  color:
    'border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200',
  Icon: FileText,
} satisfies EntityDocTypeMeta

const ENTITY_SEARCH_DOC_TYPE_SET = new Set<string>(ENTITY_SEARCH_DOC_TYPES)

export function isEntitySearchDocType(
  value: string,
): value is EntitySearchDocType {
  return ENTITY_SEARCH_DOC_TYPE_SET.has(value)
}

export function getDocTypeMeta(docType: string): EntityDocTypeMeta {
  if (isEntitySearchDocType(docType)) {
    return DOC_TYPE_META[docType]
  }

  return UNKNOWN_DOC_TYPE_META
}
