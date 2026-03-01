export interface LabelCollisionCandidate {
  featureId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  hasValue: boolean;
  area: number;
  valuePriority: number;
}

export const ADAPTIVE_LABEL_BUDGETS = {
  lowZoom: 30,
  midZoom: 70,
  highZoom: 130,
} as const;

export const ADAPTIVE_LABEL_ZOOM_THRESHOLDS = {
  lowToMid: 9.5,
  midToHigh: 11.5,
} as const;

const DEFAULT_GRID_CELL_SIZE = 56;

interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function resolveAdaptiveLabelBudget(zoom: number): number {
  if (!Number.isFinite(zoom)) {
    return ADAPTIVE_LABEL_BUDGETS.lowZoom;
  }

  if (zoom >= ADAPTIVE_LABEL_ZOOM_THRESHOLDS.midToHigh) {
    return ADAPTIVE_LABEL_BUDGETS.highZoom;
  }

  if (zoom >= ADAPTIVE_LABEL_ZOOM_THRESHOLDS.lowToMid) {
    return ADAPTIVE_LABEL_BUDGETS.midZoom;
  }

  return ADAPTIVE_LABEL_BUDGETS.lowZoom;
}

function buildBoundingBox(candidate: LabelCollisionCandidate): BoundingBox {
  const halfWidth = candidate.width / 2;
  const halfHeight = candidate.height / 2;

  return {
    left: candidate.x - halfWidth,
    right: candidate.x + halfWidth,
    top: candidate.y - halfHeight,
    bottom: candidate.y + halfHeight,
  };
}

function overlaps(left: BoundingBox, right: BoundingBox): boolean {
  if (left.right <= right.left || left.left >= right.right) {
    return false;
  }

  if (left.bottom <= right.top || left.top >= right.bottom) {
    return false;
  }

  return true;
}

function getGridKeys(box: BoundingBox, cellSize: number): string[] {
  const keys: string[] = [];
  const minColumn = Math.floor(box.left / cellSize);
  const maxColumn = Math.floor(box.right / cellSize);
  const minRow = Math.floor(box.top / cellSize);
  const maxRow = Math.floor(box.bottom / cellSize);

  for (let column = minColumn; column <= maxColumn; column += 1) {
    for (let row = minRow; row <= maxRow; row += 1) {
      keys.push(`${column}:${row}`);
    }
  }

  return keys;
}

function compareCandidates(left: LabelCollisionCandidate, right: LabelCollisionCandidate): number {
  if (left.hasValue !== right.hasValue) {
    return left.hasValue ? -1 : 1;
  }

  if (left.valuePriority !== right.valuePriority) {
    return right.valuePriority - left.valuePriority;
  }

  if (left.area !== right.area) {
    return right.area - left.area;
  }

  return left.featureId.localeCompare(right.featureId);
}

export function selectNonOverlappingLabelCandidates<T extends LabelCollisionCandidate>(
  candidates: readonly T[],
  zoom: number,
  cellSize: number = DEFAULT_GRID_CELL_SIZE
): T[] {
  if (candidates.length === 0) {
    return [];
  }

  const budget = resolveAdaptiveLabelBudget(zoom);
  const sortedCandidates = [...candidates].sort(compareCandidates);
  const selectedCandidates: T[] = [];
  const selectedBoxes: BoundingBox[] = [];
  const occupiedCells = new Map<string, number[]>();

  for (const candidate of sortedCandidates) {
    if (selectedCandidates.length >= budget) {
      break;
    }

    const nextBox = buildBoundingBox(candidate);
    const keys = getGridKeys(nextBox, cellSize);
    let collides = false;

    for (const key of keys) {
      const boxIndexes = occupiedCells.get(key);
      if (!boxIndexes) {
        continue;
      }

      for (const boxIndex of boxIndexes) {
        if (overlaps(nextBox, selectedBoxes[boxIndex])) {
          collides = true;
          break;
        }
      }

      if (collides) {
        break;
      }
    }

    if (collides) {
      continue;
    }

    const nextIndex = selectedCandidates.length;
    selectedCandidates.push(candidate);
    selectedBoxes.push(nextBox);

    for (const key of keys) {
      const boxIndexes = occupiedCells.get(key) ?? [];
      boxIndexes.push(nextIndex);
      occupiedCells.set(key, boxIndexes);
    }
  }

  return selectedCandidates;
}
