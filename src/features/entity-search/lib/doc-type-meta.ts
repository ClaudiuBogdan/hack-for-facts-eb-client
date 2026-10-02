import { i18n, type MessageDescriptor } from '@lingui/core'
import { msg } from '@lingui/core/macro'
import {
  ChartNoAxesCombined,
  Building,
  Building2,
  FileText,
  Gavel,
  HeartHandshake,
  Landmark,
  Newspaper,
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

/** A doc type's label kept as a message, read in the reader's language when it is drawn, not when the module loads. */
type DocTypeEntry = Omit<EntityDocTypeMeta, 'label'> & { readonly label: MessageDescriptor }

export const DOC_TYPE_META = {
  ins_dataset: {
    label: msg`Statistici INS`,
    color: 'border-teal-200 bg-teal-100 text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200',
    Icon: ChartNoAxesCombined,
  },
  company: {
    label: msg`Firmă`,
    color:
      'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
    Icon: Building2,
  },
  ngo: {
    label: msg`ONG`,
    color:
      'border-blue-200 bg-blue-100 text-blue-900 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200',
    Icon: HeartHandshake,
  },
  organization_unclassified: {
    label: msg`Organizație`,
    color:
      'border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200',
    Icon: Building,
  },
  public_enterprise: {
    label: msg`Companie de stat`,
    color:
      'border-[var(--pnrr-green)]/40 bg-[var(--pnrr-green)]/15 text-emerald-900 dark:text-emerald-200',
    Icon: Landmark,
  },
  organization: {
    label: msg`Instituție`,
    color:
      'border-[var(--pnrr-green)]/40 bg-[var(--pnrr-green)]/15 text-emerald-900 dark:text-emerald-200',
    Icon: Landmark,
  },
  legal_act: {
    label: msg`Legislație`,
    color:
      'border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200',
    Icon: Scale,
  },
  bill: {
    label: msg`Proiect de lege`,
    color:
      'border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200',
    Icon: ScrollText,
  },
  mo_act: {
    label: msg`Monitorul Oficial`,
    color:
      'border-violet-200 bg-violet-100 text-violet-900 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-200',
    Icon: Newspaper,
  },
  pnrr_entity: {
    label: msg`PNRR`,
    color:
      'border-teal-200 bg-teal-100 text-teal-900 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-200',
    Icon: Building,
  },
  member: {
    label: msg`Parlamentar`,
    color:
      'border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
    Icon: Users,
  },
  committee: {
    label: msg`Comisie`,
    color:
      'border-rose-200 bg-rose-100 text-rose-900 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-200',
    Icon: Gavel,
  },
} satisfies Record<EntitySearchDocType, DocTypeEntry>

export const UNKNOWN_DOC_TYPE_META = {
  label: msg`Document`,
  color:
    'border-neutral-200 bg-neutral-100 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-200',
  Icon: FileText,
} satisfies DocTypeEntry

const ENTITY_SEARCH_DOC_TYPE_SET = new Set<string>(ENTITY_SEARCH_DOC_TYPES)

export function isEntitySearchDocType(
  value: string,
): value is EntitySearchDocType {
  return ENTITY_SEARCH_DOC_TYPE_SET.has(value)
}

export function getDocTypeMeta(docType: string): EntityDocTypeMeta {
  const entry: DocTypeEntry = isEntitySearchDocType(docType) ? DOC_TYPE_META[docType] : UNKNOWN_DOC_TYPE_META
  return { ...entry, label: i18n._(entry.label) }
}
