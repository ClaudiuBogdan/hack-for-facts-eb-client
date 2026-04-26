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

/**
 * Per-zoom-band caps on how many labels survive collision selection.
 *
 * Sized to feel "filled in" rather than "decluttered":
 * - `lowZoom` (country/regional view): keep enough labels to anchor the user's
 *   sense of where they are without becoming a wall of text.
 * - `midZoom` (county-ish view, ~zoom 9-11): the screen comfortably fits this
 *   many UAT labels with the configured collision padding, so we cap here
 *   instead of in the collision grid.
 * - `highZoom` (zoomed close to a UAT): essentially "show everything that
 *   doesn't overlap" — at this zoom collision padding is doing all the work.
 */
export const ADAPTIVE_LABEL_BUDGETS = {
  lowZoom: 60,
  midZoom: 160,
  highZoom: 400,
} as const;

export const ADAPTIVE_LABEL_ZOOM_THRESHOLDS = {
  lowToMid: 9.5,
  midToHigh: 11.5,
} as const;

const DEFAULT_GRID_CELL_SIZE = 56;
/**
 * Chunk size for the chunked collision pass. Tuned so a chunk completes well
 * inside a 16ms frame budget on mid-tier hardware.
 */
const DEFAULT_CHUNK_SIZE = 64;
/**
 * Coarse-filter ratio applied to candidate count vs. budget. When the ratio is
 * exceeded, candidates are pre-clipped to a viewport-anchored window before
 * sorting so the O(n log n) sort and the grid loop stay bounded.
 */
const COARSE_FILTER_OVERSHOOT_RATIO = 8;

interface BoundingBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface ViewportClip {
  /** Viewport width in CSS pixels. */
  width: number;
  /** Viewport height in CSS pixels. */
  height: number;
  /** Optional padding (pixels) around the viewport before culling. */
  padding?: number;
}

export interface SelectNonOverlappingLabelOptions {
  cellSize?: number;
  signal?: AbortSignal;
  viewport?: ViewportClip;
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

/**
 * Coarse pre-filter that drops candidates whose bounding box is entirely
 * outside the (padded) viewport. Returns the original array if no viewport is
 * supplied or if the input is already small enough to skip the optimization.
 */
function coarseFilterCandidates<T extends LabelCollisionCandidate>(
  candidates: readonly T[],
  budget: number,
  viewport: ViewportClip | undefined,
): readonly T[] {
  if (!viewport) {
    return candidates;
  }

  if (candidates.length <= budget * COARSE_FILTER_OVERSHOOT_RATIO) {
    return candidates;
  }

  const padding = viewport.padding ?? 0;
  const minX = -padding;
  const maxX = viewport.width + padding;
  const minY = -padding;
  const maxY = viewport.height + padding;

  const filtered: T[] = [];
  for (const candidate of candidates) {
    const halfWidth = candidate.width / 2;
    const halfHeight = candidate.height / 2;
    if (
      candidate.x + halfWidth < minX ||
      candidate.x - halfWidth > maxX ||
      candidate.y + halfHeight < minY ||
      candidate.y - halfHeight > maxY
    ) {
      continue;
    }
    filtered.push(candidate);
  }

  return filtered;
}

interface CollisionAccumulator<T extends LabelCollisionCandidate> {
  selectedCandidates: T[];
  selectedBoxes: BoundingBox[];
  occupiedCells: Map<string, number[]>;
  budget: number;
  cellSize: number;
}

function processCandidate<T extends LabelCollisionCandidate>(
  candidate: T,
  accumulator: CollisionAccumulator<T>,
): boolean {
  if (accumulator.selectedCandidates.length >= accumulator.budget) {
    return false;
  }

  const nextBox = buildBoundingBox(candidate);
  const keys = getGridKeys(nextBox, accumulator.cellSize);

  for (const key of keys) {
    const boxIndexes = accumulator.occupiedCells.get(key);
    if (!boxIndexes) {
      continue;
    }
    for (const boxIndex of boxIndexes) {
      if (overlaps(nextBox, accumulator.selectedBoxes[boxIndex])) {
        return true;
      }
    }
  }

  const nextIndex = accumulator.selectedCandidates.length;
  accumulator.selectedCandidates.push(candidate);
  accumulator.selectedBoxes.push(nextBox);

  for (const key of keys) {
    const boxIndexes = accumulator.occupiedCells.get(key) ?? [];
    boxIndexes.push(nextIndex);
    accumulator.occupiedCells.set(key, boxIndexes);
  }

  return true;
}

function createAccumulator<T extends LabelCollisionCandidate>(
  budget: number,
  cellSize: number,
): CollisionAccumulator<T> {
  return {
    selectedCandidates: [],
    selectedBoxes: [],
    occupiedCells: new Map<string, number[]>(),
    budget,
    cellSize,
  };
}

function readOptions(
  zoom: number,
  cellSizeOrOptions: number | SelectNonOverlappingLabelOptions | undefined,
): { cellSize: number; signal?: AbortSignal; viewport?: ViewportClip; budget: number } {
  let cellSize = DEFAULT_GRID_CELL_SIZE;
  let signal: AbortSignal | undefined;
  let viewport: ViewportClip | undefined;

  if (typeof cellSizeOrOptions === 'number') {
    cellSize = cellSizeOrOptions;
  } else if (cellSizeOrOptions) {
    cellSize = cellSizeOrOptions.cellSize ?? DEFAULT_GRID_CELL_SIZE;
    signal = cellSizeOrOptions.signal;
    viewport = cellSizeOrOptions.viewport;
  }

  return {
    cellSize,
    signal,
    viewport,
    budget: resolveAdaptiveLabelBudget(zoom),
  };
}

/**
 * Synchronous, abortable collision selection. Backwards-compatible signature:
 * a number `cellSize` argument is still supported, but new call sites should
 * pass an options bag with `signal` and `viewport` for cancellation and
 * coarse pre-filtering.
 */
export function selectNonOverlappingLabelCandidates<T extends LabelCollisionCandidate>(
  candidates: readonly T[],
  zoom: number,
  cellSizeOrOptions?: number | SelectNonOverlappingLabelOptions,
): T[] {
  if (candidates.length === 0) {
    return [];
  }

  const { cellSize, signal, viewport, budget } = readOptions(zoom, cellSizeOrOptions);
  const filteredCandidates = coarseFilterCandidates(candidates, budget, viewport);
  const sortedCandidates = [...filteredCandidates].sort(compareCandidates);
  const accumulator = createAccumulator<T>(budget, cellSize);

  for (const candidate of sortedCandidates) {
    if (signal?.aborted) {
      break;
    }
    const shouldContinue = processCandidate(candidate, accumulator);
    if (!shouldContinue) {
      break;
    }
  }

  return accumulator.selectedCandidates;
}

export interface ChunkedSelectionOptions extends SelectNonOverlappingLabelOptions {
  /** Number of candidates evaluated per event-loop task. Defaults to 64. */
  chunkSize?: number;
}

function yieldToBrowserTask(): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, 0);
  });
}

/**
 * Chunked, abortable variant. Yields control between chunks via browser tasks
 * so a large collision pass cannot monopolize the event loop. The promise
 * resolves with whatever candidates were selected before abortion or budget
 * exhaustion.
 *
 * The selection order and final result are equivalent to the synchronous
 * variant when no abort/budget interruption occurs.
 */
export async function selectNonOverlappingLabelCandidatesChunked<T extends LabelCollisionCandidate>(
  candidates: readonly T[],
  zoom: number,
  options: ChunkedSelectionOptions = {},
): Promise<T[]> {
  if (candidates.length === 0) {
    return [];
  }

  const { cellSize, signal, viewport, budget } = readOptions(zoom, options);
  const chunkSize = Math.max(1, options.chunkSize ?? DEFAULT_CHUNK_SIZE);

  const filteredCandidates = coarseFilterCandidates(candidates, budget, viewport);
  const sortedCandidates = [...filteredCandidates].sort(compareCandidates);
  const accumulator = createAccumulator<T>(budget, cellSize);

  for (let index = 0; index < sortedCandidates.length; index += 1) {
    if (signal?.aborted) {
      break;
    }

    const candidate = sortedCandidates[index];
    const shouldContinue = processCandidate(candidate, accumulator);
    if (!shouldContinue) {
      break;
    }

    if ((index + 1) % chunkSize === 0) {
      // Yield to the event loop between chunks.
      await yieldToBrowserTask();
    }
  }

  return accumulator.selectedCandidates;
}
