import { t } from '@lingui/core/macro';
import { Series, Calculation, Operation, AnalyticsSeries, Chart, defaultYearRange } from '@/schemas/charts';
import type { DataValidationError } from '@/lib/chart-data-validation';
import { parseMonth, parseQuarter } from '@/lib/chart-data-utils';

type CalculationXAxisUnit = 'year' | 'quarter' | 'month';

interface EvaluatedOperand {
  points: { x: string; y: number }[];
  isConstant: boolean;
  constantValue?: number;
}

interface CalculationResult {
  constantValue?: number;
  points: { x: string; y: number }[];
  warnings: DataValidationError[];
  unavailable?: boolean;
}

function unavailableInsCalculation(seriesId: string, dependency?: string): CalculationResult {
  return { points: [], unavailable: true, warnings: [{ type: 'missing_data', seriesId,
    message: t`The calculation depends on INS data with missing coverage or an undefined result. Inspect its source series.`,
    ...(dependency ? { value: { dependency } } : {}),
  }] };
}

// ============================================================================
// CYCLE DETECTION
// ============================================================================

/**
 * Detects if adding a series to a calculation would create a cycle
 * @param seriesId - The ID of the series being modified/checked
 * @param calculation - The calculation to check
 * @param allSeries - All series in the chart
 * @returns true if a cycle is detected, false otherwise
 */
export function hasCalculationCycle(
  seriesId: string,
  calculation: Calculation,
  allSeries: Series[]
): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  // Build adjacency list for all calculation series
  const adjacencyList = new Map<string, Set<string>>();

  // Add the current series being checked
  adjacencyList.set(seriesId, new Set());
  addCalculationDependencies(calculation, adjacencyList.get(seriesId)!);

  // Add all existing calculation series
  for (const series of allSeries) {
    if (series.type === 'aggregated-series-calculation' && series.id !== seriesId) {
      const dependencies = new Set<string>();
      addCalculationDependencies(series.calculation, dependencies);
      adjacencyList.set(series.id, dependencies);
    }
  }

  // Check for cycles using DFS
  function hasCycleDFS(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const dependencies = adjacencyList.get(nodeId);
    if (dependencies) {
      for (const depId of dependencies) {
        if (!visited.has(depId)) {
          if (hasCycleDFS(depId)) {
            return true;
          }
        } else if (recursionStack.has(depId)) {
          // Found a back edge - cycle detected
          return true;
        }
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Start DFS from the series being checked
  return hasCycleDFS(seriesId);
}

/**
 * Helper function to extract all series IDs referenced in a calculation
 */
function addCalculationDependencies(
  calculation: Calculation,
  dependencies: Set<string>,
  visited: WeakSet<Calculation> = new WeakSet()
): void {
  if (visited.has(calculation)) return;
  visited.add(calculation);

  for (const arg of calculation.args) {
    if (typeof arg === 'string') {
      dependencies.add(arg);
    } else if (arg && typeof arg === 'object') {
      // Recursive calculation; guard against circular calculation objects.
      addCalculationDependencies(arg, dependencies, visited);
    }
  }
}

// ============================================================================
// CALCULATION EVALUATION
// ============================================================================

function normalizeXAxisUnit(unit: string | undefined | null): CalculationXAxisUnit {
  const normalized = String(unit ?? 'year').toLowerCase();
  if (normalized === 'month') return 'month';
  if (normalized === 'quarter') return 'quarter';
  return 'year';
}

function sortXAxisLabels(values: string[], unit: CalculationXAxisUnit): string[] {
  return [...values].sort((a, b) => {
    if (unit === 'year') return Number(a) - Number(b);
    if (unit === 'quarter') {
      const left = parseQuarter(a);
      const right = parseQuarter(b);
      const leftYear = left.y ?? 0;
      const rightYear = right.y ?? 0;
      if (leftYear !== rightYear) return leftYear - rightYear;
      return (left.q ?? 0) - (right.q ?? 0);
    }

    const left = parseMonth(a);
    const right = parseMonth(b);
    const leftYear = left.y ?? 0;
    const rightYear = right.y ?? 0;
    if (leftYear !== rightYear) return leftYear - rightYear;
    return (left.m ?? 0) - (right.m ?? 0);
  });
}

/**
 * Evaluates a calculation series and returns its data points
 * @param calculation - The calculation to evaluate
 * @param seriesData - Map of series ID to their data points
 * @param allSeries - All series definitions (for recursive calculations)
 * @returns The calculated data points
 */
export function evaluateCalculation(
  calculation: Calculation,
  seriesData: Map<string, AnalyticsSeries>,
  allSeries: Series[],
  seriesIdForWarnings: string,
  xAxisUnit: CalculationXAxisUnit = 'year',
  requireCompleteOperands = false
): CalculationResult {
  const operandResults: EvaluatedOperand[] = [];
  const warnings: DataValidationError[] = [];

  // Evaluate each operand
  for (const operand of calculation.args) {
    if (typeof operand === 'number') {
      operandResults.push({
        points: [],
        isConstant: true,
        constantValue: operand,
      });
    } else if (typeof operand === 'string') {
      // Direct series reference
      const data = seriesData.get(operand);
      if (data) {
        operandResults.push({
          points: data.data,
          isConstant: false,
        });
      } else {
        // Strict calculations use the topological result; never recompute an unavailable dependency.
        if (requireCompleteOperands) return unavailableInsCalculation(seriesIdForWarnings, operand);
        // Check if it's a calculation series that needs evaluation
        const series = allSeries.find(s => s.id === operand);
        if (series && series.type === 'aggregated-series-calculation') {
          const result = evaluateCalculation(series.calculation, seriesData, allSeries, series.id, xAxisUnit);
          operandResults.push({
            points: result.points,
            isConstant: false,
          });
          warnings.push(...result.warnings);
        } else {
          // Series not found or no data - use empty array
          operandResults.push({
            points: [],
            isConstant: false,
          });
        }
      }
    } else {
      // Nested calculation
      const result = evaluateCalculation(operand, seriesData, allSeries, seriesIdForWarnings, xAxisUnit, requireCompleteOperands);
      if (result.unavailable) return result;
      operandResults.push(result.constantValue !== undefined
        ? { points: [], isConstant: true, constantValue: result.constantValue }
        : { points: result.points, isConstant: false });

      warnings.push(...result.warnings);
    }
  }

  // Perform the operation
  const opResult = performOperation(calculation.op, operandResults, seriesIdForWarnings, xAxisUnit, requireCompleteOperands);
  return { ...opResult, warnings: warnings.concat(opResult.warnings) };
}

/**
 * Performs the specified operation on the operand results
 */
function performOperation(
  operation: Operation,
  operands: EvaluatedOperand[],
  seriesIdForWarnings: string,
  xAxisUnit: CalculationXAxisUnit,
  requireCompleteOperands = false
): CalculationResult {
  if (requireCompleteOperands && operands.some(operand => !operand.isConstant && operand.points.length === 0)) return unavailableInsCalculation(seriesIdForWarnings);
  if (operands.length === 0) {
    return { points: [], warnings: [] };
  }

  // Get all unique x labels across non-constant operands.
  const allXLabels = new Set<string>();
  for (const operand of operands) {
    if (operand.isConstant) continue;
    for (const point of operand.points) {
      allXLabels.add(point.x);
    }
  }

  // Fallback only when every operand is constant.
  const hasOnlyConstantOperands = operands.every((operand) => operand.isConstant);
  if (allXLabels.size === 0 && hasOnlyConstantOperands && requireCompleteOperands) {
    // Evaluate nested scalar expressions once without inventing annual coverage.
    allXLabels.add('constant');
  } else if (allXLabels.size === 0 && hasOnlyConstantOperands) {
    const years = Array.from(
      { length: defaultYearRange.end - defaultYearRange.start + 1 },
      (_, i) => String(defaultYearRange.start + i)
    );
    years.forEach((year) => allXLabels.add(year));
  }

  const sortedLabels = sortXAxisLabels(Array.from(allXLabels), xAxisUnit);

  // Create maps for quick lookup
  const operandMaps = operands.map(operand => {
    if (operand.isConstant) return null;
    const map = new Map<string, number>();
    for (const point of operand.points) {
      map.set(point.x, point.y);
    }
    return map;
  });

  const getOperandValue = (index: number, label: string): number | undefined => {
    const operand = operands[index];
    if (operand?.isConstant) {
      return operand.constantValue;
    }
    const map = operandMaps[index];
    return map?.get(label);
  };

  const result: { x: string; y: number }[] = [];
  const warnings: DataValidationError[] = [];

  for (const label of sortedLabels) {
    if (requireCompleteOperands && operands.some((_, index) => !Number.isFinite(getOperandValue(index, label)))) return unavailableInsCalculation(seriesIdForWarnings);
    let value: number | null = null;

    switch (operation) {
      case 'sum':
        value = 0;
        for (let i = 0; i < operands.length; i++) {
          value += getOperandValue(i, label) || 0;
        }
        break;

      case 'subtract':
        if (operands.length > 0) {
          value = getOperandValue(0, label) || 0;
          for (let i = 1; i < operands.length; i++) {
            value -= getOperandValue(i, label) || 0;
          }
        }
        break;

      case 'multiply':
        if (operands.length > 0) {
          // Multiplication requires all operands to be present
          // If any operand is missing, the result is undefined (null)
          let allPresent = true;
          let tempValue = 1;
          
          for (let i = 0; i < operands.length; i++) {
            const operandValue = getOperandValue(i, label);
            if (operandValue === undefined) {
              allPresent = false;
              break;
            }
            tempValue *= operandValue;
          }
          
          if (allPresent) {
            value = tempValue;
          } else {
            value = null;
          }
        }
        break;

      case 'divide':
        if (operands.length >= 2) {
          const numerator = getOperandValue(0, label);
          const denominator = getOperandValue(1, label);

          if (numerator !== undefined && denominator !== undefined && denominator !== 0) {
            value = numerator / denominator;

            // Handle additional divisors if any
            for (let i = 2; i < operands.length; i++) {
              const divisor = getOperandValue(i, label);
              if (divisor !== undefined && divisor !== 0) {
                value /= divisor;
              } else if (divisor === 0) {
                value = null; // Division by zero
                warnings.push({
                  type: 'auto_adjusted_value',
                  seriesId: seriesIdForWarnings,
                  message: `Division by zero at ${label} (auto-removed)`,
                  value: { numerator, denominator: divisor },
                });
                break;
              } else if (divisor === undefined) {
                value = null; // Missing divisor
                break;
              }
            }
          } else if (denominator === 0) {
            value = null;
            warnings.push({
              type: 'auto_adjusted_value',
              seriesId: seriesIdForWarnings,
              message: `Division by zero at ${label} (auto-removed)`,
              value: { numerator, denominator },
            });
          }
        }
        break;
    }

    if (requireCompleteOperands && (value === null || !Number.isFinite(value))) return unavailableInsCalculation(seriesIdForWarnings);
    if (value !== null) {
      result.push({ x: label, y: value });
    }
  }

  if (requireCompleteOperands && hasOnlyConstantOperands) return { points: [], warnings, constantValue: result[0]?.y };
  return { points: result, warnings };
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example: Validate before adding a new calculation series
 */
export function validateNewCalculationSeries(
  seriesId: string,
  calculation: Calculation,
  existingSeries: Series[]
): { valid: boolean; error?: string } {
  // Check for cycles
  if (hasCalculationCycle(seriesId, calculation, existingSeries)) {
    return {
      valid: false,
      error: 'This calculation would create a circular dependency'
    };
  }

  // Additional validation: check if all referenced series exist
  const allSeriesIds = new Set(existingSeries.map(s => s.id));
  allSeriesIds.add(seriesId); // Include the new series itself

  const referencedIds = new Set<string>();
  addCalculationDependencies(calculation, referencedIds);

  for (const refId of referencedIds) {
    if (!allSeriesIds.has(refId)) {
      return {
        valid: false,
        error: `Referenced series "${refId}" does not exist`
      };
    }
  }

  return { valid: true };
}

function resolveCalculationXAxisUnit(
  calculation: Calculation,
  dataSeriesMap: Map<string, AnalyticsSeries>
): {
  xAxisUnit: CalculationXAxisUnit;
  isCompatible: boolean;
  observedUnits: CalculationXAxisUnit[];
} {
  const dependencies = new Set<string>();
  addCalculationDependencies(calculation, dependencies);

  const observedUnits = Array.from(dependencies)
    .map((id) => dataSeriesMap.get(id))
    .filter((series): series is AnalyticsSeries => Boolean(series))
    .map((series) => normalizeXAxisUnit(series.xAxis?.unit));

  const uniqueUnits = Array.from(new Set(observedUnits));
  if (uniqueUnits.length === 0) {
    return { xAxisUnit: 'year', isCompatible: true, observedUnits: [] };
  }

  if (uniqueUnits.length === 1) {
    return { xAxisUnit: uniqueUnits[0] as CalculationXAxisUnit, isCompatible: true, observedUnits: uniqueUnits as CalculationXAxisUnit[] };
  }

  return {
    xAxisUnit: uniqueUnits[0] as CalculationXAxisUnit,
    isCompatible: false,
    observedUnits: uniqueUnits as CalculationXAxisUnit[],
  };
}

/**
 * Example: Calculate all series data including calculations and update the dataSeriesMap.
 */
export function calculateAllSeriesData(
  series: Series[],
  dataSeriesMap: Map<string, AnalyticsSeries>
): { dataSeriesMap: Map<string, AnalyticsSeries>; warnings: DataValidationError[] } {
  // Sort series by dependency order (topological sort)
  const sortedSeries = topologicalSortSeries(series);
  const insDependentIds = getInsDependentSeriesIds(series);

  const defaultYears = Array.from({ length: defaultYearRange.end - defaultYearRange.start + 1 }, (_, index) => index + defaultYearRange.start);

  const warnings: DataValidationError[] = [];

  // Set custom series and custom value series data. Used by calculation series.
  for (const s of series) {
    if (s.type === 'custom-series') {
      dataSeriesMap.set(s.id, {
        seriesId: s.id,
        xAxis: { name: 'Year', type: 'INTEGER', unit: 'year' },
        yAxis: { name: 'Amount', type: 'FLOAT', unit: s.unit || '' },
        data: s.data.map(d => ({ x: String(d.year), y: d.value })),
      });
    }
    if (s.type === 'custom-series-value') {
      dataSeriesMap.set(s.id, {
        seriesId: s.id,
        xAxis: { name: 'Year', type: 'INTEGER', unit: 'year' },
        yAxis: { name: 'Amount', type: 'FLOAT', unit: s.unit || '' },
        data: defaultYears.map(year => ({ x: String(year), y: s.value })),
      });
    }
  }

  // Calculate each calculation series in order
  for (const s of sortedSeries) {
    if (s.type === 'aggregated-series-calculation') {
      const xAxisResolution = resolveCalculationXAxisUnit(s.calculation, dataSeriesMap);
      if (!xAxisResolution.isCompatible) {
        warnings.push({
          type: 'auto_adjusted_value',
          seriesId: s.id,
          message: `Calculation skipped due to mixed periodicities (${xAxisResolution.observedUnits.join(', ')}).`,
          value: xAxisResolution.observedUnits,
        });
        continue;
      }

      const { points, warnings: calcWarnings, unavailable } = evaluateCalculation(
        s.calculation,
        dataSeriesMap,
        series,
        s.id,
        xAxisResolution.xAxisUnit,
        insDependentIds.has(s.id)
      );
      warnings.push(...calcWarnings);
      if (unavailable) {
        dataSeriesMap.delete(s.id);
        continue;
      }
      dataSeriesMap.set(s.id, {
        seriesId: s.id,
        xAxis: { name: 'Period', type: 'STRING', unit: xAxisResolution.xAxisUnit },
        yAxis: { name: 'Amount', type: 'FLOAT', unit: s.unit || '' },
        data: points,
      });
    }
  }

  return { dataSeriesMap, warnings };
}

/**
 * Topological sort of series based on dependencies
 */
function topologicalSortSeries(series: Series[]): Series[] {
  const adjacencyList = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();

  // Initialize
  for (const s of series) {
    adjacencyList.set(s.id, new Set());
    inDegree.set(s.id, 0);
  }

  // Build graph
  for (const s of series) {
    if (s.type === 'aggregated-series-calculation') {
      const dependencies = new Set<string>();
      addCalculationDependencies(s.calculation, dependencies);

      for (const dep of dependencies) {
        if (adjacencyList.has(dep)) {
          adjacencyList.get(dep)!.add(s.id);
          inDegree.set(s.id, (inDegree.get(s.id) || 0) + 1);
        }
      }
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const sorted: Series[] = [];

  // Find all nodes with no incoming edges
  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentSeries = series.find(s => s.id === current);
    if (currentSeries) {
      sorted.push(currentSeries);
    }

    // Remove edges from current
    for (const neighbor of adjacencyList.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);

      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return sorted;
}

/**
 * Get the dependencies of a calculation
 * @param calculation - The calculation to get the dependencies of
 * @param series - The series to get the dependencies of
 * @returns The dependencies of the calculation
 */
export function getCalculationDependencies(calculation: Calculation, series: Series[]): string[] {
  const dependencies = new Set<string>();
  addCalculationDependencies(calculation, dependencies);
  return Array.from(dependencies).filter(id => series.find(s => s.id === id));
}

/**
 * Get all dependencies of a series
 * @param series - The series to get the dependencies of
 * @param chart - The chart to get the dependencies of 
 * @returns All dependencies of the series
 */
export function getAllDependencies(series: Series, chart: Pick<Chart, 'series'>): Series[] {
  const seriesCalculation = series.calculation as Calculation;
  if (!seriesCalculation) return [series];

  const visited = new Set<string>([series.id]);
  const collected: Series[] = [];
  const stack: Series[] = [];

  const seedIds = getCalculationDependencies(seriesCalculation, chart.series)
    .filter((id) => id !== series.id);
  for (const id of seedIds) {
    const dep = chart.series.find(s => s.id === id);
    if (!dep || visited.has(dep.id)) continue;
    visited.add(dep.id);
    collected.push(dep);
    if (dep.calculation) stack.push(dep);
  }

  while (stack.length > 0) {
    const current = stack.pop()!;
    const currentCalculation = current.calculation as Calculation | undefined;
    if (!currentCalculation) continue;

    const depIds = getCalculationDependencies(currentCalculation, chart.series)
      .filter((id) => id !== current.id);
    for (const id of depIds) {
      if (visited.has(id)) continue;
      const dep = chart.series.find(s => s.id === id);
      if (!dep) continue;
      visited.add(dep.id);
      collected.push(dep);
      if (dep.calculation) stack.push(dep);
    }
  }

  return collected;
}

/** One dependency identity shared by arithmetic and rendering availability checks. */
export function getInsDependentSeriesIds(series: Series[]): Set<string> {
  return new Set(series.filter(item => item.type === 'ins-series' ||
    (item.type === 'aggregated-series-calculation' && getAllDependencies(item, { series }).some(dependency => dependency.type === 'ins-series'))
  ).map(item => item.id));
}
