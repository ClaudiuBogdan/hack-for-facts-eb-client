import { useClassificationData } from '@/components/classification-explorer/hooks/useClassificationData'
import {
  useEconomicClassificationLabel,
  useEntityLabel,
  useFunctionalClassificationLabel,
} from '@/hooks/filters/useFilterLabels'
import { getClassificationName } from '@/lib/classifications'
import {
  normalizeBudgetItemAnalyticsCode,
  type BudgetItemAnalyticsPageContext,
} from './budget-item-analytics-context'

type BudgetItemAnalyticsTitleInput = Pick<
  BudgetItemAnalyticsPageContext,
  'entityCui' | 'subjectLabel' | 'functionalCode' | 'economicCode' | 'language'
>

export function useBudgetItemAnalyticsTitle(
  input: Readonly<BudgetItemAnalyticsTitleInput>,
) {
  const normalizedFunctionalCode = normalizeBudgetItemAnalyticsCode(
    input.functionalCode,
  )
  const normalizedEconomicCode = normalizeBudgetItemAnalyticsCode(
    input.economicCode,
  )
  const { classificationMap: functionalClassificationMap } =
    useClassificationData('functional')
  const { classificationMap: economicClassificationMap } =
    useClassificationData('economic')
  const functionalLabelStore = useFunctionalClassificationLabel(
    normalizedFunctionalCode ? [normalizedFunctionalCode] : [],
  )
  const economicLabelStore = useEconomicClassificationLabel(
    normalizedEconomicCode ? [normalizedEconomicCode] : [],
  )
  const entityLabelStore = useEntityLabel(
    input.entityCui ? [input.entityCui] : [],
  )

  const functionalLabelCandidate = normalizedFunctionalCode
    ? functionalLabelStore.map(normalizedFunctionalCode)
    : undefined
  const economicLabelCandidate = normalizedEconomicCode
    ? economicLabelStore.map(normalizedEconomicCode)
    : undefined
  const functionalName =
    functionalLabelCandidate && !functionalLabelCandidate.startsWith('id::')
      ? functionalLabelCandidate
      : normalizedFunctionalCode
        ? functionalClassificationMap.get(normalizedFunctionalCode)?.name ??
          getClassificationName(normalizedFunctionalCode)
        : undefined
  const economicName =
    economicLabelCandidate && !economicLabelCandidate.startsWith('id::')
      ? economicLabelCandidate
      : normalizedEconomicCode
        ? economicClassificationMap.get(normalizedEconomicCode)?.name
        : undefined
  const entityLabelCandidate = input.entityCui
    ? entityLabelStore.map(input.entityCui)
    : undefined
  const entityName =
    entityLabelCandidate && !entityLabelCandidate.startsWith('id::')
      ? entityLabelCandidate
      : undefined
  const classificationLabels = [
    functionalName ??
      (normalizedFunctionalCode ? `fn:${normalizedFunctionalCode}` : undefined),
    economicName ??
      (normalizedEconomicCode ? `ec:${normalizedEconomicCode}` : undefined),
  ].filter(Boolean)
  const seriesLabel =
    classificationLabels.length > 0
      ? classificationLabels.join(' · ')
      : input.subjectLabel

  return {
    resolvedTitle:
      classificationLabels.length > 0
        ? [entityName, seriesLabel].filter(Boolean).join(' · ')
        : input.subjectLabel,
    seriesLabel,
  }
}
