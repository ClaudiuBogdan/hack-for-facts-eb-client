import type {
  BillCurrentLocation,
  BillStageStatus,
  BillType,
  ParliamentBillDetail,
  ParliamentBillPassage,
  ParliamentBillPassageStage,
  ParliamentBillRelatedVote,
  ParliamentBillSummary,
} from '@/schemas/parliament'
import { ParliamentBillDetailSchema } from '@/schemas/parliament'

import billDetailsData from '../mocks/bill-details.json'

const billDetailsMap = billDetailsData as Record<string, unknown>

const CAMERA_STAGES: readonly { readonly stageId: string; readonly label: string }[] = [
  { stageId: 'depunere', label: 'Depunere și înregistrare' },
  { stageId: 'comisii', label: 'Trimitere la comisii' },
  { stageId: 'raport', label: 'Raportul comisiei' },
  { stageId: 'dezbatere', label: 'Dezbatere în plen' },
  { stageId: 'vot', label: 'Vot final' },
]

const SENAT_STAGES_CAMERA_ORIGIN: readonly {
  readonly stageId: string
  readonly label: string
}[] = [
  { stageId: 'primire', label: 'Primire de la Camera Deputaților' },
  { stageId: 'comisii', label: 'Trimitere la comisii' },
  { stageId: 'raport', label: 'Raportul comisiei' },
  { stageId: 'dezbatere', label: 'Dezbatere în plen' },
  { stageId: 'vot', label: 'Vot final' },
]

const SENAT_STAGES_SENAT_ORIGIN: readonly {
  readonly stageId: string
  readonly label: string
}[] = [
  { stageId: 'primire', label: 'Depunere și înregistrare' },
  { stageId: 'comisii', label: 'Trimitere la comisii' },
  { stageId: 'raport', label: 'Raportul comisiei' },
  { stageId: 'dezbatere', label: 'Dezbatere în plen' },
  { stageId: 'vot', label: 'Vot final' },
]

const FINAL_STAGES: readonly { readonly stageId: string; readonly label: string }[] = [
  { stageId: 'mediere', label: 'Comisie de mediere' },
  { stageId: 'promulgare', label: 'Promulgare' },
  { stageId: 'publicare', label: 'Publicare în Monitorul Oficial' },
]

function buildStage(
  stageId: string,
  label: string,
  status: BillStageStatus,
  completedAt?: string,
): ParliamentBillPassageStage {
  return { stageId, label, status, completedAt }
}

function synthesizePassage(bill: ParliamentBillSummary): ParliamentBillPassage {
  const senatStages =
    bill.originatingChamber === 'senat'
      ? SENAT_STAGES_SENAT_ORIGIN
      : SENAT_STAGES_CAMERA_ORIGIN

  const cameraStages = bill.originatingChamber === 'camera' ? CAMERA_STAGES : CAMERA_STAGES

  if (
    bill.currentLocation === 'respins' ||
    bill.currentLocation === 'retras' ||
    bill.currentLocation === 'clasat'
  ) {
    const activeChamber = bill.originatingChamber
    const activeStages = activeChamber === 'camera' ? cameraStages : senatStages
    const inactiveStages = activeChamber === 'camera' ? senatStages : cameraStages

    return {
      camera:
        activeChamber === 'camera'
          ? activeStages.map((stage, index) =>
              buildStage(
                stage.stageId,
                stage.label,
                index < activeStages.length - 1 ? 'complete' : 'complete',
                bill.lastUpdatedAt,
              ),
            )
          : inactiveStages.map((stage) =>
              buildStage(stage.stageId, stage.label, 'not_applicable'),
            ),
      senat:
        activeChamber === 'senat'
          ? activeStages.map((stage, index) =>
              buildStage(
                stage.stageId,
                stage.label,
                index < activeStages.length - 1 ? 'complete' : 'complete',
                bill.lastUpdatedAt,
              ),
            )
          : inactiveStages.map((stage) =>
              buildStage(stage.stageId, stage.label, 'not_applicable'),
            ),
      final: FINAL_STAGES.map((stage) =>
        buildStage(stage.stageId, stage.label, 'not_applicable'),
      ),
    }
  }

  if (bill.currentLocation === 'promulgat') {
    return {
      camera: cameraStages.map((stage) =>
        buildStage(stage.stageId, stage.label, 'complete', bill.lastUpdatedAt),
      ),
      senat: senatStages.map((stage) =>
        buildStage(stage.stageId, stage.label, 'complete', bill.lastUpdatedAt),
      ),
      final: FINAL_STAGES.map((stage) =>
        buildStage(stage.stageId, stage.label, 'complete', bill.lastUpdatedAt),
      ),
    }
  }

  const locationOrder: BillCurrentLocation[] = [
    'camera',
    'senat',
    'mediere',
    'presedinte',
    'promulgat',
  ]
  const locationIndex = locationOrder.indexOf(bill.currentLocation)

  function stageStatusForChamber(
    chamber: 'camera' | 'senat',
    stageIndex: number,
    totalStages: number,
  ): BillStageStatus {
    const chamberIndex = chamber === 'camera' ? 0 : 1
    if (locationIndex < chamberIndex) return 'complete'
    if (locationIndex > chamberIndex) return 'not_reached'
    if (stageIndex < totalStages - 2) return 'complete'
    if (stageIndex === totalStages - 2) return 'in_progress'
    return 'not_reached'
  }

  return {
    camera:
      bill.originatingChamber === 'senat' && bill.currentLocation === 'senat'
        ? cameraStages.map((stage) =>
            buildStage(stage.stageId, stage.label, 'not_applicable'),
          )
        : cameraStages.map((stage, index) =>
            buildStage(
              stage.stageId,
              stage.label,
              stageStatusForChamber('camera', index, cameraStages.length),
            ),
          ),
    senat: senatStages.map((stage, index) =>
      buildStage(
        stage.stageId,
        stage.label,
        stageStatusForChamber('senat', index, senatStages.length),
      ),
    ),
    final: FINAL_STAGES.map((stage, index) => {
      if (bill.currentLocation === 'mediere' && index === 0) {
        return buildStage(stage.stageId, stage.label, 'in_progress')
      }
      if (bill.currentLocation === 'presedinte' && index === 1) {
        return buildStage(stage.stageId, stage.label, 'in_progress')
      }
      if (locationIndex > 2 + index) {
        return buildStage(stage.stageId, stage.label, 'complete')
      }
      return buildStage(stage.stageId, stage.label, 'not_reached')
    }),
  }
}

function synthesizeInitiator(bill: ParliamentBillSummary) {
  if (bill.billType === 'guvern' || bill.billType === 'ordonanta') {
    return {
      type: 'guvern' as const,
      departmentName: 'Guvernul României',
    }
  }
  if (bill.billType === 'cetateni') {
    return {
      type: 'cetateni' as const,
      departmentName: 'Inițiativă legislativă a cetățenilor',
    }
  }
  return {
    type: 'parlamentar' as const,
    memberId: 'dep-001',
    memberName: 'Maria Popescu',
  }
}

function synthesizeDocuments(bill: ParliamentBillSummary) {
  return [
    {
      documentId: `${bill.billId}-doc-1`,
      label: `${bill.number} (forma depusă)`,
      url: `https://www.cdep.ro/pls/legis/legis_pck.htp_act?ida=${bill.billId}`,
      publishedAt: bill.lastUpdatedAt,
      chamber: bill.originatingChamber,
      versionLabel: 'Forma depusă',
    },
  ]
}

/**
 * Flatten passage stages into a chronological timeline for mock mode (the live
 * path builds the timeline from real events). Camera → Senat → final order;
 * milestone flag on vote/promulgation/law-becoming stages.
 */
function synthesizeTimeline(passage: ParliamentBillPassage) {
  const stages = [...passage.camera, ...passage.senat, ...passage.final]
  return stages.map((s, i) => {
    const folded = s.label.toLowerCase()
    return {
      stepId: `mock-step-${i}`,
      position: i,
      description: s.label,
      ...(s.completedAt ? { date: s.completedAt } : {}),
      isMilestone:
        folded.includes('vot') ||
        folded.includes('promulg') ||
        folded.includes('adopt'),
      docUrls: [] as string[],
    }
  })
}

function synthesizeBillDetail(bill: ParliamentBillSummary): ParliamentBillDetail {
  const passage = synthesizePassage(bill)
  return ParliamentBillDetailSchema.parse({
    ...bill,
    longTitle: `${bill.title}. Proiect în curs de examinare parlamentară în cadrul ${bill.legislatureId}.`,
    summary: `Proiect legislativ aflat în faza „${bill.currentStageLabel}”.`,
    initiator: synthesizeInitiator(bill),
    documents: synthesizeDocuments(bill),
    timeline: synthesizeTimeline(passage),
    relatedVotes: [],
  })
}

/** Resolve bill detail mock data, with synthesis fallback. */
export function resolveParliamentBillDetail(
  bill: ParliamentBillSummary,
  relatedVotes: readonly ParliamentBillRelatedVote[] = [],
): ParliamentBillDetail {
  const raw = billDetailsMap[bill.billId]
  if (raw) {
    const parsed = ParliamentBillDetailSchema.parse(raw)
    // Fixtures predate `timeline`; derive it from their `passage` when absent.
    const detail =
      parsed.timeline.length === 0 && parsed.passage
        ? { ...parsed, timeline: synthesizeTimeline(parsed.passage) }
        : parsed
    if (relatedVotes.length > 0 && detail.relatedVotes.length === 0) {
      return { ...detail, relatedVotes: [...relatedVotes] }
    }
    return detail
  }
  const synthesized = synthesizeBillDetail(bill)
  return relatedVotes.length > 0
    ? { ...synthesized, relatedVotes: [...relatedVotes] }
    : synthesized
}

export function getDefaultBillPassageLabels(
  originatingChamber: 'camera' | 'senat',
): ParliamentBillPassage {
  return {
    camera: CAMERA_STAGES.map((stage) =>
      buildStage(stage.stageId, stage.label, 'not_reached'),
    ),
    senat: (originatingChamber === 'senat'
      ? SENAT_STAGES_SENAT_ORIGIN
      : SENAT_STAGES_CAMERA_ORIGIN
    ).map((stage) => buildStage(stage.stageId, stage.label, 'not_reached')),
    final: FINAL_STAGES.map((stage) =>
      buildStage(stage.stageId, stage.label, 'not_reached'),
    ),
  }
}

export function getBillTypeLabel(billType: BillType): string {
  switch (billType) {
    case 'guvern':
      return 'Proiect al Guvernului'
    case 'parlamentar':
      return 'Inițiativă parlamentară'
    case 'cetateni':
      return 'Inițiativă a cetățenilor'
    case 'ordonanta':
      return 'Ordonanță de urgență'
  }
}

export function getBillLocationLabel(location: BillCurrentLocation): string {
  switch (location) {
    case 'camera':
      return 'Camera Deputaților'
    case 'senat':
      return 'Senat'
    case 'mediere':
      return 'Comisie de mediere'
    case 'presedinte':
      return 'La Președinte'
    case 'promulgat':
      return 'Promulgat'
    case 'respins':
      return 'Respins'
    case 'retras':
      return 'Retras'
    case 'clasat':
      return 'Clasat'
  }
}
