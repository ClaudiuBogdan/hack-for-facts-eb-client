import matter from 'gray-matter'
import type { Root, RootContent } from 'mdast'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import type {
  ChallengeStepFrontmatter,
  ChallengeStepLessonChallengeDescriptor,
  ChallengeStepSectionMeta,
} from '../types'
import type { ChallengeStepSectionInteractive } from './sectioned-step-markdown'

type ParsedChallengeSection = {
  readonly isIntro: boolean
  readonly title: string
  readonly nodes: RootContent[]
}

type QuizOption = Extract<ChallengeStepSectionInteractive, { readonly kind: 'quiz' }>['options'][number]

type MdxJsxAttribute = {
  readonly type: 'mdxJsxAttribute'
  readonly name: string
  readonly value?:
    | string
    | number
    | boolean
    | null
    | {
        readonly type: 'mdxJsxAttributeValueExpression'
        readonly value: string
      }
}

type MdxJsxNode = RootContent & {
  readonly name?: string | null
  readonly attributes?: readonly MdxJsxAttribute[]
}

export type BuildChallengeStepSection = ChallengeStepSectionMeta & {
  readonly bodySource: string
  readonly interactive: ChallengeStepSectionInteractive | null
}

type TransformSectionedChallengeStepSourceResult = {
  readonly didTransform: boolean
  readonly source: string
  readonly frontmatter: ChallengeStepFrontmatter
  readonly sections: readonly BuildChallengeStepSection[]
}

const parseProcessor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm)
const stringifyProcessor = unified().use(remarkStringify).use(remarkMdx).use(remarkGfm)
const SECTION_QUERY_PARAM = 'challenge-step-section'
const IS_DEV_ENVIRONMENT = process.env.NODE_ENV !== 'production'

function normalizeInlineText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function slugifySectionId(value: string): string {
  const normalized = normalizeInlineText(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'section'
}

function dedupeSectionId(baseId: string, seenIds: Map<string, number>): string {
  const nextCount = (seenIds.get(baseId) ?? 0) + 1
  seenIds.set(baseId, nextCount)

  if (nextCount === 1) {
    return baseId
  }

  return `${baseId}-${nextCount}`
}

function getNodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return ''

  const record = node as {
    readonly value?: string
    readonly alt?: string
    readonly children?: readonly unknown[]
  }

  if (typeof record.value === 'string') {
    return record.value
  }

  if (typeof record.alt === 'string') {
    return record.alt
  }

  if (!Array.isArray(record.children)) {
    return ''
  }

  return record.children.map((child) => getNodeText(child)).join('')
}

function isSupportedInteractiveNode(node: RootContent): node is MdxJsxNode {
  if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') {
    return false
  }

  return node.name === 'Quiz'
}

const DYNAMIC_QUIZ_STAGES = new Set(['expenses-quiz', 'income-quiz', 'county-quiz'])

function hasDynamicQuizStageNode(nodes: readonly RootContent[]): boolean {
  return nodes.some((node) => {
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') {
      return false
    }

    const jsxNode = node as MdxJsxNode
    if (jsxNode.name !== 'LessonBudgetContextFlow') return false

    const stageAttr = (jsxNode.attributes ?? []).find(
      (a) => a.type === 'mdxJsxAttribute' && a.name === 'stage',
    )

    return (
      stageAttr !== undefined &&
      typeof stageAttr.value === 'string' &&
      DYNAMIC_QUIZ_STAGES.has(stageAttr.value)
    )
  })
}

function isIgnoredSectionNode(node: RootContent): node is MdxJsxNode {
  if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') {
    return false
  }

  return node.name === 'MarkComplete'
}

function evaluateExpression(value: string): unknown {
  try {
    return Function(`"use strict"; return (${value})`)()
  } catch {
    return undefined
  }
}

function getAttributeMap(node: MdxJsxNode): Record<string, unknown> {
  const props: Record<string, unknown> = {}

  for (const attribute of node.attributes ?? []) {
    if (attribute.type !== 'mdxJsxAttribute') continue

    if (attribute.value === null || attribute.value === undefined) {
      props[attribute.name] = true
      continue
    }

    if (
      typeof attribute.value === 'string' ||
      typeof attribute.value === 'number' ||
      typeof attribute.value === 'boolean'
    ) {
      props[attribute.name] = attribute.value
      continue
    }

    if (attribute.value.type === 'mdxJsxAttributeValueExpression') {
      props[attribute.name] = evaluateExpression(attribute.value.value)
    }
  }

  return props
}

function normalizeQuizOptions(value: unknown): readonly QuizOption[] {
  if (!Array.isArray(value)) return []

  return value
    .filter(
      (option): option is Record<string, unknown> =>
        Boolean(option) && typeof option === 'object',
    )
    .map((option) => ({
      id: typeof option.id === 'string' ? option.id : '',
      text: typeof option.text === 'string' ? option.text : '',
      isCorrect: Boolean(option.isCorrect),
    }))
    .filter(
      (option) =>
        option.id.trim().length > 0 && option.text.trim().length > 0,
    )
}

function extractInteractive(node: MdxJsxNode): ChallengeStepSectionInteractive | null {
  const props = getAttributeMap(node)

  if (node.name === 'Quiz') {
    const id = typeof props.id === 'string' ? props.id : ''
    const question = typeof props.question === 'string' ? props.question : ''
    const explanation =
      typeof props.explanation === 'string' ? props.explanation : ''
    const scopePolicy =
      props.scopePolicy === 'entity' ? 'entity' : 'global'
    const options = normalizeQuizOptions(props.options)

    if (!id || !question || options.length === 0) {
      return null
    }

    return {
      kind: 'quiz',
      id,
      question,
      options,
      explanation,
      scopePolicy,
    }
  }

  return null
}

function buildLessonChallengeDescriptorKey(
  descriptor: ChallengeStepLessonChallengeDescriptor,
): string {
  return descriptor.kind === 'fixed'
    ? `fixed:${descriptor.id}`
    : `step:${descriptor.prefix}`
}

function dedupeLessonChallengeDescriptors(
  descriptors: readonly ChallengeStepLessonChallengeDescriptor[],
): readonly ChallengeStepLessonChallengeDescriptor[] {
  const seenDescriptorKeys = new Set<string>()

  return descriptors.filter((descriptor) => {
    const descriptorKey = buildLessonChallengeDescriptorKey(descriptor)
    if (seenDescriptorKeys.has(descriptorKey)) {
      return false
    }

    seenDescriptorKeys.add(descriptorKey)
    return true
  })
}

function extractLessonChallengeDescriptors(
  nodes: readonly RootContent[],
): readonly ChallengeStepLessonChallengeDescriptor[] {
  const descriptors: ChallengeStepLessonChallengeDescriptor[] = []

  for (const node of nodes) {
    if (node.type !== 'mdxJsxFlowElement' && node.type !== 'mdxJsxTextElement') {
      continue
    }

    const jsxNode = node as MdxJsxNode
    const props = getAttributeMap(jsxNode)

    if (jsxNode.name === 'Quiz') {
      const quizId = typeof props.id === 'string' ? props.id.trim() : ''
      if (quizId.length > 0) {
        descriptors.push({
          kind: 'fixed',
          id: `quiz:${quizId}`,
        })
      }
      continue
    }

    if (jsxNode.name === 'LessonEntitySnapshot') {
      descriptors.push({
        kind: 'step',
        prefix: 'lesson-entity-snapshot',
      })
      continue
    }

    if (jsxNode.name === 'LessonBudgetEstimate') {
      const metric =
        props.metric === 'expenses' ? 'expenses' : 'income'
      descriptors.push({
        kind: 'fixed',
        id: `quiz:lesson-budget-estimate-${metric}`,
      })
      continue
    }

    if (jsxNode.name === 'LessonGroupedExplorer') {
      descriptors.push({
        kind: 'fixed',
        id: 'quiz:lesson-grouped-explorer',
      })
      continue
    }

    if (jsxNode.name === 'LessonClassificationCrosswalk') {
      descriptors.push({
        kind: 'fixed',
        id: 'quiz:lesson-classification-crosswalk',
      })
      continue
    }

    if (jsxNode.name === 'LessonExecutionTableExcerpt') {
      descriptors.push({
        kind: 'step',
        prefix: 'lesson-execution-table-excerpt',
      })
      continue
    }

    if (jsxNode.name === 'LessonAggregateDetailedCompare') {
      descriptors.push({
        kind: 'step',
        prefix: 'lesson-aggregate-detailed-compare',
      })
      continue
    }

    if (jsxNode.name === 'LessonAggregateDetailedQuiz') {
      descriptors.push({
        kind: 'fixed',
        id: 'quiz:lesson-aggregate-detailed-interpretation',
      })
      continue
    }

    if (jsxNode.name === 'LessonEntityDataQuiz') {
      const variant =
        typeof props.variant === 'string' && props.variant.trim().length > 0
          ? props.variant.trim()
          : 'top-income'
      descriptors.push({
        kind: 'fixed',
        id: `quiz:lesson-entity-quiz-${variant}`,
      })
      continue
    }

    if (jsxNode.name === 'LessonBudgetContextFlow') {
      const stage =
        typeof props.stage === 'string' ? props.stage.trim() : ''

      if (stage === 'expenses-quiz') {
        descriptors.push({
          kind: 'fixed',
          id: 'quiz:lesson-budget-context-expenses',
        })
      } else if (stage === 'income-quiz') {
        descriptors.push({
          kind: 'fixed',
          id: 'quiz:lesson-budget-context-income',
        })
      } else if (stage === 'county-quiz') {
        descriptors.push({
          kind: 'fixed',
          id: 'quiz:lesson-budget-context-county-top',
        })
      }
    }
  }

  return dedupeLessonChallengeDescriptors(descriptors)
}

function stringifyNodes(nodes: readonly RootContent[]): string {
  return stringifyProcessor
    .stringify({
      type: 'root',
      children: [...nodes],
    } as Root)
    .trim()
}

function createBuildSection(params: {
  readonly title: string
  readonly nodes: readonly RootContent[]
  readonly interactive: ChallengeStepSectionInteractive | null
  readonly section: ParsedChallengeSection
  readonly seenIds: Map<string, number>
  readonly baseIdOverride?: string
}): BuildChallengeStepSection | null {
  const { nodes, interactive, section, seenIds, baseIdOverride } = params
  const bodySource = stringifyNodes(nodes)
  if (!bodySource) {
    return null
  }

  const normalizedTitle = normalizeInlineText(params.title)
  const safeTitle = normalizedTitle
  const lessonChallengeDescriptors = extractLessonChallengeDescriptors(nodes)
  const baseId =
    baseIdOverride ??
    (section.isIntro
      ? 'intro'
      : slugifySectionId(normalizedTitle || 'section'))

  return {
    id: dedupeSectionId(baseId, seenIds),
    title: safeTitle,
    ...(hasDynamicQuizStageNode(nodes) ? { hideSectionTitle: true } : {}),
    ...(lessonChallengeDescriptors.length > 0
      ? { lessonChallengeDescriptors }
      : {}),
    bodySource,
    interactive,
  }
}

function createBuildSections(
  section: ParsedChallengeSection,
  seenIds: Map<string, number>,
): readonly BuildChallengeStepSection[] {
  const builtSections: BuildChallengeStepSection[] = []
  let bufferedNodes: RootContent[] = []

  const flushContentSection = () => {
    const contentSection = createBuildSection({
      title: section.title,
      nodes: bufferedNodes,
      interactive: null,
      section,
      seenIds,
    })

    if (contentSection) {
      builtSections.push(contentSection)
    }

    bufferedNodes = []
  }

  for (const node of section.nodes) {
    if (isIgnoredSectionNode(node)) {
      continue
    }

    if (!isSupportedInteractiveNode(node)) {
      bufferedNodes.push(node)
      continue
    }

    const interactive = extractInteractive(node)
    if (!interactive) {
      bufferedNodes.push(node)
      continue
    }

    flushContentSection()

    const quizSection = createBuildSection({
      title: '',
      nodes: [node],
      interactive,
      section,
      seenIds,
      baseIdOverride: slugifySectionId(interactive.id),
    })

    if (quizSection) {
      builtSections.push(quizSection)
    } else if (IS_DEV_ENVIRONMENT) {
      console.warn(
        `[Challenges] Failed to build quiz section for "${interactive.id}" in section "${section.title}".`,
      )
    }
  }

  flushContentSection()

  return builtSections
}

function splitIntoSections(params: {
  readonly content: string
  readonly frontmatter: ChallengeStepFrontmatter
}): readonly ParsedChallengeSection[] {
  const tree = parseProcessor.parse(params.content) as Root
  const parsedSections: ParsedChallengeSection[] = []
  const introNodes: RootContent[] = []
  let introTitle =
    typeof params.frontmatter.title === 'string' &&
    params.frontmatter.title.trim().length > 0
      ? params.frontmatter.title
      : 'Intro'
  let currentSection: ParsedChallengeSection | null = null

  for (const node of tree.children) {
    if (node.type === 'heading' && node.depth === 2) {
      if (currentSection) {
        parsedSections.push(currentSection)
      } else if (introNodes.length > 0) {
        parsedSections.push({
          isIntro: true,
          title: introTitle,
          nodes: [...introNodes],
        })
      }

      currentSection = {
        isIntro: false,
        title: normalizeInlineText(getNodeText(node)) || 'Section',
        nodes: [],
      }
      continue
    }

    if (!currentSection) {
      if (
        introNodes.length === 0 &&
        node.type === 'heading' &&
        node.depth === 1 &&
        normalizeInlineText(getNodeText(node)).length > 0
      ) {
        introTitle = normalizeInlineText(getNodeText(node))
        continue
      }

      introNodes.push(node)
      continue
    }

    currentSection.nodes.push(node)
  }

  if (currentSection) {
    parsedSections.push(currentSection)
  } else {
    parsedSections.push({
      isIntro: true,
      title: introTitle,
      nodes: introNodes,
    })
  }

  return parsedSections.filter((section) => section.nodes.length > 0)
}

function extractRawFrontmatterBlock(source: string): string {
  const match = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n)?/)
  if (!match) {
    return ''
  }

  const frontmatterBlock = match[0]
  return frontmatterBlock.endsWith('\n') ? frontmatterBlock : `${frontmatterBlock}\n`
}

function getSectionComponentImportName(sectionIndex: number): string {
  return `ChallengeStepSection${sectionIndex}`
}

function formatSectionExportEntry(
  section: BuildChallengeStepSection,
  sectionIndex: number,
): string {
  return `  {
    id: ${JSON.stringify(section.id)},
    title: ${JSON.stringify(section.title)},${section.hideSectionTitle ? `\n    hideSectionTitle: true,` : ''}
    ${section.lessonChallengeDescriptors ? `lessonChallengeDescriptors: ${JSON.stringify(section.lessonChallengeDescriptors)},\n    ` : ''}interactive: ${JSON.stringify(section.interactive)},
    Component: ${getSectionComponentImportName(sectionIndex)},
  }`
}

function normalizeFilePath(filePath: string): string {
  return filePath.replace(/\\/g, '/')
}

export function isChallengeStepMdxFile(id: string): boolean {
  const normalizedId = normalizeFilePath(id.split('?')[0] ?? id)
  return /\/src\/content\/challenges\/steps\/.+\/index\.(en|ro)\.mdx$/.test(normalizedId)
}

export function buildChallengeStepSectionRequestId(
  filePath: string,
  sectionIndex: number,
): string {
  return `${normalizeFilePath(filePath)}?${SECTION_QUERY_PARAM}=${sectionIndex}`
}

export function parseChallengeStepSectionRequestId(id: string): {
  readonly filePath: string
  readonly sectionIndex: number
} | null {
  const [filePath, query] = id.split('?')
  if (!query) {
    return null
  }

  const searchParams = new URLSearchParams(query)
  const sectionIndexValue = searchParams.get(SECTION_QUERY_PARAM)
  if (sectionIndexValue === null) {
    return null
  }

  const sectionIndex = Number.parseInt(sectionIndexValue, 10)
  if (!Number.isInteger(sectionIndex) || sectionIndex < 0) {
    return null
  }

  return {
    filePath: normalizeFilePath(filePath),
    sectionIndex,
  }
}

export function parseSectionedChallengeStep(params: {
  readonly source: string
  readonly frontmatter?: ChallengeStepFrontmatter
}): {
  readonly frontmatter: ChallengeStepFrontmatter
  readonly sections: readonly BuildChallengeStepSection[]
} {
  const parsedFile = matter(params.source)
  const frontmatter = {
    ...(parsedFile.data as ChallengeStepFrontmatter),
    ...(params.frontmatter ?? {}),
  }

  const rawSections = splitIntoSections({
    content: parsedFile.content,
    frontmatter,
  })
  const seenIds = new Map<string, number>()
  const sections = rawSections
    .flatMap((section) => createBuildSections(section, seenIds))

  return {
    frontmatter,
    sections,
  }
}

export function transformSectionedChallengeStepSource(params: {
  readonly source: string
  readonly filePath: string
}): TransformSectionedChallengeStepSourceResult {
  const parsedFile = matter(params.source)
  const frontmatter = parsedFile.data as ChallengeStepFrontmatter

  if (frontmatter.stepType !== 'sectioned') {
    return {
      didTransform: false,
      source: params.source,
      frontmatter,
      sections: [],
    }
  }

  const parsed = parseSectionedChallengeStep({ source: params.source })
  const sectionImports = parsed.sections
    .map(
      (_, sectionIndex) =>
        `import ${getSectionComponentImportName(sectionIndex)} from ${JSON.stringify(
          buildChallengeStepSectionRequestId(params.filePath, sectionIndex),
        )}`,
    )
    .join('\n')
  const sectionsExport = `export const challengeSections = [
${parsed.sections
  .map((section, sectionIndex) => formatSectionExportEntry(section, sectionIndex))
  .join(',\n')}
]\n\n`

  return {
    didTransform: true,
    source: `${extractRawFrontmatterBlock(params.source)}${sectionImports ? `${sectionImports}\n\n` : ''}${sectionsExport}${parsedFile.content}`,
    frontmatter: parsed.frontmatter,
    sections: parsed.sections,
  }
}
