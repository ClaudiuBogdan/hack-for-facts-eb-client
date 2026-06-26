import { t } from '@lingui/core/macro'
import type {
  AmountConfidence,
  DataAvailabilityStatus,
  DomainDataStatus,
  EvidenceLinkHealth,
  IdentityConfidence,
  PartyRole,
  ProgramCode,
  SourceUrlKind,
  StageBucket,
} from './types'
import { REDACTED_NAME_MARKER } from './filters'

export function programLabel(program: ProgramCode): string {
  switch (program) {
    case 'ANGHEL_SALIGNY':
      return t`Anghel Saligny`
    case 'PNDL':
      return t`PNDL`
    case 'PNCCRS':
      return t`PNCCRS`
    case 'PNMC':
      return t`PNMC`
    default:
      return program
  }
}

export function stageLabel(stage: StageBucket): string {
  switch (stage) {
    case 'contractat':
      return t`Contractat`
    case 'in_executie':
      return t`În execuție`
    case 'finalizat':
      return t`Finalizat`
    case 'receptionat':
      return t`Recepționat`
    case 'necunoscut':
      return t`Necunoscut`
    default:
      return stage
  }
}

export function confidenceLabel(confidence: AmountConfidence): string {
  switch (confidence) {
    case 'ok':
      return t`Validat`
    case 'precision_warning':
      return t`Atenționare de precizie`
    case 'suspect_x1000':
      return t`Valoare în verificare`
    default:
      return confidence
  }
}

export function identityConfidenceLabel(confidence: IdentityConfidence): string {
  switch (confidence) {
    case 'high':
      return t`Identitate ridicată`
    case 'medium':
      return t`Identitate medie`
    case 'low':
      return t`Identitate redusă`
    default:
      return confidence
  }
}

export function partyRoleLabel(role: PartyRole): string {
  switch (role) {
    case 'executant':
      return t`Executant`
    case 'proiectant':
      return t`Proiectant`
    case 'beneficiar':
      return t`Beneficiar`
    default:
      return role
  }
}

export function availabilityLabel(status: DataAvailabilityStatus): string {
  switch (status) {
    case 'live-not-connected':
      return t`API live neconectat`
    case 'mock-disabled':
      return t`Date mock dezactivate`
    case 'dataset-not-configured':
      return t`Dataset neconfigurat`
    case 'not-found':
      return t`Înregistrare negăsită`
    default:
      return status
  }
}

export function sourceKindLabel(kind: SourceUrlKind): string {
  switch (kind) {
    case 'workbook':
      return t`Fișier tabelar`
    case 'arcgis_api':
      return t`ArcGIS API`
    case 'dead':
      return t`Link istoric indisponibil`
    case 'unknown':
      return t`Sursă necunoscută`
    default:
      return kind
  }
}

export function linkHealthLabel(health: EvidenceLinkHealth): string {
  switch (health) {
    case 'ok':
      return t`Link verificat`
    case 'dead':
      return t`Link indisponibil`
    case 'unknown':
      return t`Neverificat`
    default:
      return health
  }
}

export function formatRon(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return t`Nedisponibil`
  }

  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'RON',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatPct(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return t`Nedisponibil`
  }

  return new Intl.NumberFormat('ro-RO', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100)
}

export function formatSnapshot(status: DomainDataStatus): string {
  return t`Snapshot ${status.snapshotDate}`
}

export function renderRedactedExcerpt(
  excerpt: string | null | undefined,
  replacement: string,
): string | null {
  if (!excerpt) return null
  return excerpt.split(REDACTED_NAME_MARKER).join(replacement)
}
