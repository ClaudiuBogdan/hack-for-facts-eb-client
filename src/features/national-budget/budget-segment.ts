import type { AggregatedNode } from '@/components/budget-explorer/budget-transform'

import type {
  NationalBudgetComputedMetrics,
  NationalBudgetFormulaRule,
  NationalBudgetClassification,
} from './national-budget-types'

function normalizeCode(code: string | null | undefined): string {
  return (code ?? '').replace(/[^0-9.]/g, '')
}

function matchesPrefix(code: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => code.startsWith(prefix))
}

function getCodeByClassification(node: AggregatedNode, classification: NationalBudgetClassification): string {
  if (classification === 'fn') return normalizeCode(node.fn_c)
  return normalizeCode(node.ec_c)
}

export function evaluateBudgetSegment(
  nodes: AggregatedNode[],
  rules: NationalBudgetFormulaRule[],
): NationalBudgetComputedMetrics {
  const rawTotal = nodes.reduce((sum, node) => sum + (node.amount ?? 0), 0)

  const deductions = rules.map((rule) => {
    const amount = nodes.reduce((sum, node) => {
      const code = getCodeByClassification(node, rule.classification)
      if (!code || !matchesPrefix(code, rule.prefixes)) return sum
      return sum + (node.amount ?? 0)
    }, 0)

    return {
      id: rule.id,
      label: rule.label,
      classification: rule.classification,
      prefixes: rule.prefixes,
      amount,
    }
  })

  const totalAdjustments = deductions.reduce((sum, deduction) => sum + deduction.amount, 0)

  const filteredNodes = nodes.filter((node) => {
    return !rules.some((rule) => {
      const code = getCodeByClassification(node, rule.classification)
      return Boolean(code) && matchesPrefix(code, rule.prefixes)
    })
  })

  const qualityNotes = Array.from(new Set(rules.map((rule) => rule.qualityNote).filter(Boolean)))

  return {
    rawTotal,
    totalAdjustments,
    netTotal: rawTotal - totalAdjustments,
    deductions,
    filteredNodes,
    qualityNote: qualityNotes.length > 0 ? qualityNotes.join(' ') : undefined,
  }
}
