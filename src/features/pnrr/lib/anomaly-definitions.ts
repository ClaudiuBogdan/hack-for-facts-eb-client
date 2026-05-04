import { t } from '@lingui/core/macro'
import type { AnomalyType, DataQualitySignalType } from '@/schemas/pnrr'
import {
  AlertTriangle,
  Banknote,
  ClipboardX,
  Copy,
  FileQuestion,
  FileWarning,
  TrendingUp,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Severity styling maps
// ---------------------------------------------------------------------------

export const SEVERITY_RING: Record<AnomalySeverity, string> = {
  critical: 'ring-red-400/50 dark:ring-red-500/30',
  warning: 'ring-amber-400/50 dark:ring-amber-500/30',
  attention: 'ring-blue-400/50 dark:ring-blue-500/30',
  info: 'ring-sky-400/50 dark:ring-sky-500/30',
}

export const SEVERITY_BORDER: Record<AnomalySeverity, string> = {
  critical: 'bg-red-500',
  warning: 'bg-amber-500',
  attention: 'bg-blue-500',
  info: 'bg-sky-500',
}

export const SEVERITY_BG: Record<AnomalySeverity, string> = {
  critical: 'bg-red-50/50 dark:bg-red-950/20',
  warning: 'bg-amber-50/50 dark:bg-amber-950/20',
  attention: 'bg-blue-50/50 dark:bg-blue-950/20',
  info: 'bg-sky-50/50 dark:bg-sky-950/20',
}

export const SEVERITY_ICON_BG: Record<AnomalySeverity, string> = {
  critical: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  warning:
    'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  attention: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  info: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
}

export type AnomalySeverity = 'critical' | 'warning' | 'attention' | 'info'

// ---------------------------------------------------------------------------
// Signal configuration
// ---------------------------------------------------------------------------

export type SignalConfig<TType extends string> = {
  readonly type: TType
  readonly label: string
  readonly shortDescription: string
  readonly explanation: string
  readonly investigationTip: string
  readonly detectionRule: string
  readonly icon: React.ElementType
  readonly severity: AnomalySeverity
}

export type AnomalyConfig = SignalConfig<AnomalyType>
export type DataQualitySignalConfig = SignalConfig<DataQualitySignalType>

export const ANOMALY_CONFIG: readonly AnomalyConfig[] = [
  {
    type: 'financial-overrun',
    label: t`Progres financiar raportat peste 100%`,
    shortDescription: t`Procent financiar peste pragul obișnuit`,
    explanation: t`Acest filtru arată proiecte unde progresul financiar raportat depășește 100%. Este o anomalie de date care poate veni din regularizări, schimbări ale valorii de referință, actualizări întârziate sau erori.`,
    investigationTip: t`Verifică valoarea actualizată a proiectului, actele adiționale și rapoartele recente înainte de a trage concluzii despre plăți.`,
    detectionRule: t`Progres financiar raportat > 100%`,
    icon: TrendingUp,
    severity: 'critical',
  },
  {
    type: 'payment-ahead-delivery',
    label: t`Decalaj financiar-tehnic`,
    shortDescription: t`Progres financiar mult peste progresul tehnic`,
    explanation: t`Acest filtru arată proiecte unde progresul financiar raportat este mult peste progresul tehnic raportat. Poate avea explicații legitime, inclusiv avansuri sau raportare tehnică întârziată.`,
    investigationTip: t`Verifică dacă există avans contractual, recepții parțiale, livrabile acceptate sau actualizări tehnice întârziate.`,
    detectionRule: t`Progres tehnic = 0% și progres financiar > 0% sau diferență financiar-tehnic > 50 pp, cu progres tehnic sub 90%`,
    icon: Banknote,
    severity: 'critical',
  },
  {
    type: 'large-low-progress',
    label: t`Valoare mare și progres scăzut`,
    shortDescription: t`Valoare peste 10 mil. EUR și progres sub 30%`,
    explanation: t`Acest filtru scoate în față proiecte cu valoare listată mare și progres tehnic raportat scăzut. Este presiune de implementare și necesită verificare în documente oficiale.`,
    investigationTip: t`Verifică achiziții întârziate, autorizații, dispute, capacitatea beneficiarului și blocaje de execuție.`,
    detectionRule: t`Valoare listată >= 10.000.000 EUR și progres tehnic raportat sub 30% sau „în implementare”`,
    icon: AlertTriangle,
    severity: 'critical',
  },
  {
    type: 'stalled-completion',
    label: t`Finalizat tehnic, progres financiar scăzut`,
    shortDescription: t`100% tehnic, dar sub 80% financiar`,
    explanation: t`Acest filtru arată proiecte raportate ca finalizate tehnic, dar cu progres financiar raportat sub 80%. Nu afirmă că rambursarea este blocată sau refuzată.`,
    investigationTip: t`Verifică recepția finală, cererile de transfer, documentele de închidere și actualizările financiare recente.`,
    detectionRule: t`Progres tehnic raportat = 100% și progres financiar raportat < 80%`,
    icon: ClipboardX,
    severity: 'warning',
  },
] as const

export const DATA_QUALITY_SIGNAL_CONFIG: readonly DataQualitySignalConfig[] = [
  {
    type: 'duplicate-conflict',
    label: t`Posibile duplicate cu date diferite`,
    shortDescription: t`Rânduri similare cu valori sau progres diferit`,
    explanation: t`Acest filtru marchează rânduri care par să descrie același proiect, dar au informații diferite. Este o problemă de interpretare a datelor, nu dovadă de dublă finanțare.`,
    investigationTip: t`Compară variantele și identifică rândul curent înainte de calcule despre totaluri, progres sau beneficiar.`,
    detectionRule: t`Titlu, CUI, componentă și măsură identice, dar valoare, progres, localitate, finanțare, beneficiar sau CRI diferite`,
    icon: Copy,
    severity: 'attention',
  },
  {
    type: 'large-missing-financial-progress',
    label: t`Valoare mare fără progres financiar publicat`,
    shortDescription: t`Peste 10 mil. EUR fără date financiare utilizabile`,
    explanation: t`Acest filtru arată proiecte mari fără progres financiar publicat în set. Lipsa datelor nu înseamnă zero plăți; poate indica raportare incompletă sau actualizare întârziată.`,
    investigationTip: t`Verifică sursa oficială a proiectului, cererile de transfer și alte documente publice de plată sau raportare financiară.`,
    detectionRule: t`Valoare listată >= 10.000.000 EUR și progres financiar nepublicat în set`,
    icon: FileQuestion,
    severity: 'attention',
  },
  {
    type: 'completed-missing-financial-progress',
    label: t`Finalizat tehnic fără progres financiar publicat`,
    shortDescription: t`100% tehnic, peste 1 mil. EUR, fără date financiare`,
    explanation: t`Acest filtru arată proiecte raportate ca finalizate tehnic și fără progres financiar publicat în set. Este o limitare de date care împiedică comparația dintre livrare și execuția financiară.`,
    investigationTip: t`Verifică dacă raportarea financiară lipsește din dataset, dacă proiectul a fost închis tehnic înaintea actualizării financiare sau dacă există documente separate de plată.`,
    detectionRule: t`Progres tehnic raportat = 100%, valoare listată >= 1.000.000 EUR și progres financiar nepublicat în set`,
    icon: FileWarning,
    severity: 'attention',
  },
] as const

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const CONFIG_MAP = new Map(ANOMALY_CONFIG.map((c) => [c.type, c]))
const DATA_QUALITY_CONFIG_MAP = new Map(
  DATA_QUALITY_SIGNAL_CONFIG.map((c) => [c.type, c]),
)

export function getAnomalyConfig(type: AnomalyType): AnomalyConfig | undefined {
  return CONFIG_MAP.get(type)
}

export function getDataQualitySignalConfig(
  type: DataQualitySignalType,
): DataQualitySignalConfig | undefined {
  return DATA_QUALITY_CONFIG_MAP.get(type)
}

export function getAnomalyLabel(type: AnomalyType): string {
  return CONFIG_MAP.get(type)?.label ?? type
}

export function getDataQualitySignalLabel(type: DataQualitySignalType): string {
  return DATA_QUALITY_CONFIG_MAP.get(type)?.label ?? type
}

export function getAnomalyShortDescription(type: AnomalyType): string {
  return CONFIG_MAP.get(type)?.shortDescription ?? ''
}
