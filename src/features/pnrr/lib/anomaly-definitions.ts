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
  warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
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
    label: t`Depășiri financiare`,
    shortDescription: t`Progres financiar peste 100%`,
    explanation: t`Filtrul arată proiectele unde progresul financiar raportat trece de 100%. Într-un set de date curat, un proiect nu ar trebui să depășească integral valoarea raportată fără o explicație: modificare de buget, corecție întârziată sau eroare de raportare.`,
    investigationTip: t`Verificați valoarea actualizată a contractului, existența actelor adiționale și dacă procentul financiar a fost corectat în raportările recente.`,
    detectionRule: t`Progres financiar > 100%`,
    icon: TrendingUp,
    severity: 'critical',
  },
  {
    type: 'payment-ahead-delivery',
    label: t`Plăți înaintea livrării`,
    shortDescription: t`Banii sunt mult înaintea progresului tehnic`,
    explanation: t`Filtrul arată proiectele unde progresul financiar este mult peste progresul tehnic. Poate fi un avans legitim sau o întârziere de raportare tehnică, dar este relevant pentru utilizator deoarece banii par să fi avansat mai repede decât livrarea.`,
    investigationTip: t`Verificați dacă plata este un avans prevăzut contractual, dacă livrabilele au fost recepționate și dacă progresul tehnic este subraportat sau neactualizat.`,
    detectionRule: t`Progres tehnic = 0% și progres financiar > 0% SAU progres financiar − progres tehnic > 50 pp, cu progres tehnic sub 90%`,
    icon: Banknote,
    severity: 'critical',
  },
  {
    type: 'large-low-progress',
    label: t`Proiecte mari cu progres redus`,
    shortDescription: t`Valoare peste €10M și progres sub 30%`,
    explanation: t`Filtrul scoate în față proiectele mari care sunt încă la progres tehnic redus. Pragul de 10 milioane EUR păstrează lista concentrată pe proiecte cu impact bugetar mare. Statusul „în implementare” este interpretat ca sub 30% doar pentru acest filtru.`,
    investigationTip: t`Verificați cauza progresului redus: achiziții întârziate, autorizații, litigii, capacitatea beneficiarului sau blocaje de execuție.`,
    detectionRule: t`Valoare ≥ 10.000.000 EUR ȘI progres tehnic sub 30% sau „în implementare”`,
    icon: AlertTriangle,
    severity: 'critical',
  },
  {
    type: 'stalled-completion',
    label: t`Lucrări finalizate, decontare blocată`,
    shortDescription: t`100% tehnic dar sub 80% financiar`,
    explanation: t`Filtrul arată proiectele raportate ca finalizate tehnic, dar cu progres financiar sub 80%. Nu este automat o neregulă: plățile pot urma recepției. Totuși, un decalaj mare poate indica recepție blocată, documente incomplete sau litigii.`,
    investigationTip: t`Verificați stadiul recepției finale, cererile de plată, documentele de închidere și eventualele litigii care pot bloca decontarea.`,
    detectionRule: t`Progres tehnic = 100% ȘI progres financiar < 80%`,
    icon: ClipboardX,
    severity: 'warning',
  },
] as const

export const DATA_QUALITY_SIGNAL_CONFIG: readonly DataQualitySignalConfig[] = [
  {
    type: 'duplicate-conflict',
    label: t`Duplicate cu date diferite`,
    shortDescription: t`Același proiect are valori sau progres diferite`,
    explanation: t`Filtrul marchează proiectele care apar de mai multe ori cu aceeași identitate de bază, dar cu informații diferite. Este o problemă de interpretare a datelor: poate fi o actualizare incompletă, o raportare pe subcomponente sau o eroare de import.`,
    investigationTip: t`Comparați variantele și identificați rândul actual înainte de a calcula totaluri, progres sau concluzii despre beneficiar.`,
    detectionRule: t`Titlu, CUI, Componentă și Măsură identice, dar diferă valoarea, progresul, localitatea, finanțarea, beneficiarul sau CRI`,
    icon: Copy,
    severity: 'attention',
  },
  {
    type: 'large-missing-financial-progress',
    label: t`Proiecte mari fără progres financiar`,
    shortDescription: t`Valoare peste €10M fără decontare raportată`,
    explanation: t`Filtrul arată proiectele mari pentru care lipsește progresul financiar. Lipsa nu înseamnă automat că nu s-au făcut plăți; poate însemna că datele financiare nu sunt publicate sau nu au fost actualizate în acest snapshot.`,
    investigationTip: t`Verificați sursa oficială a proiectului, cererile de plată și dacă există raportări financiare în alte documente publice.`,
    detectionRule: t`Valoare ≥ 10.000.000 EUR ȘI progres financiar lipsă`,
    icon: FileQuestion,
    severity: 'attention',
  },
  {
    type: 'completed-missing-financial-progress',
    label: t`Finalizat fără progres financiar`,
    shortDescription: t`100% tehnic, peste €1M, fără date financiare`,
    explanation: t`Filtrul arată proiectele finalizate tehnic, cu valoare de peste un milion de euro, dar fără progres financiar publicat. Este relevant pentru calitatea analizei deoarece nu puteți compara livrarea cu decontarea.`,
    investigationTip: t`Verificați dacă decontarea lipsește din dataset, dacă proiectul a fost închis tehnic înainte de raportarea financiară sau dacă există documente de plată separate.`,
    detectionRule: t`Progres tehnic = 100%, valoare ≥ 1.000.000 EUR ȘI progres financiar lipsă`,
    icon: FileWarning,
    severity: 'attention',
  },
] as const

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const CONFIG_MAP = new Map(ANOMALY_CONFIG.map((c) => [c.type, c]))
const DATA_QUALITY_CONFIG_MAP = new Map(
  DATA_QUALITY_SIGNAL_CONFIG.map((c) => [c.type, c])
)

export function getAnomalyConfig(type: AnomalyType): AnomalyConfig | undefined {
  return CONFIG_MAP.get(type)
}

export function getDataQualitySignalConfig(
  type: DataQualitySignalType
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
