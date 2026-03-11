import { evaluateSync } from '@mdx-js/mdx'
import matter from 'gray-matter'
import type { Root, RootContent } from 'mdast'
import type { ComponentType } from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import remarkGfm from 'remark-gfm'
import remarkMdx from 'remark-mdx'
import remarkParse from 'remark-parse'
import remarkStringify from 'remark-stringify'
import { unified } from 'unified'
import type { MDXComponents } from 'mdx/types'
import type {
  ChallengeStepFrontmatter,
  ChallengeStepSectionMeta,
} from '../types'

type MdxContentProps = {
  readonly components?: MDXComponents
}

type MdxComponent = ComponentType<MdxContentProps>

type QuizOption = {
  readonly id: string
  readonly text: string
  readonly isCorrect: boolean
}

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

export type ChallengeStepSectionInteractive =
  | {
      readonly kind: 'quiz'
      readonly id: string
      readonly question: string
      readonly options: readonly QuizOption[]
      readonly explanation: string
    }

export type SerializedChallengeStepSection = ChallengeStepSectionMeta & {
  readonly bodySource: string
  readonly interactive: ChallengeStepSectionInteractive | null
}

export type ChallengeStepSection = SerializedChallengeStepSection & {
  readonly Component: MdxComponent
}

type ParsedChallengeSection = {
  readonly isIntro: boolean
  readonly title: string
  readonly nodes: RootContent[]
}

type TransformSectionedChallengeStepSourceResult = {
  readonly didTransform: boolean
  readonly source: string
  readonly frontmatter: ChallengeStepFrontmatter
  readonly sections: readonly SerializedChallengeStepSection[]
}

const parseProcessor = unified().use(remarkParse).use(remarkMdx).use(remarkGfm)
const stringifyProcessor = unified().use(remarkStringify).use(remarkMdx).use(remarkGfm)
const SECTION_COMPONENT_CACHE = new Map<string, MdxComponent>()
const IS_DEV_ENVIRONMENT = Boolean(import.meta.env?.DEV)

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
    }
  }

  return null
}

function stringifyNodes(nodes: readonly RootContent[]): string {
  return stringifyProcessor
    .stringify({
      type: 'root',
      children: [...nodes],
    } as Root)
    .trim()
}

function compileSectionComponent(source: string): MdxComponent {
  const cachedComponent = SECTION_COMPONENT_CACHE.get(source)
  if (cachedComponent) {
    return cachedComponent
  }

  const evaluated = evaluateSync(source, {
    ...jsxRuntime,
    remarkPlugins: [remarkGfm],
  }) as { readonly default: MdxComponent }

  SECTION_COMPONENT_CACHE.set(source, evaluated.default)
  return evaluated.default
}

function createSerializedSection(
  section: ParsedChallengeSection,
  seenIds: Map<string, number>,
): SerializedChallengeStepSection | null {
  let interactive: ChallengeStepSectionInteractive | null = null
  const nodes: RootContent[] = []

  for (const node of section.nodes) {
    if (isSupportedInteractiveNode(node)) {
      if (!interactive) {
        interactive = extractInteractive(node)
        nodes.push(node)
      } else if (IS_DEV_ENVIRONMENT) {
        console.warn(
          `[Challenges] Ignoring extra interactive "${node.name}" in section "${section.title}".`,
        )
      }
      continue
    }

    nodes.push(node)
  }

  const bodySource = stringifyNodes(nodes)
  if (!bodySource) {
    return null
  }

  const safeTitle = normalizeInlineText(section.title) || 'Intro'
  const baseId = section.isIntro ? 'intro' : slugifySectionId(safeTitle)

  return {
    id: dedupeSectionId(baseId, seenIds),
    title: safeTitle,
    bodySource,
    interactive,
  }
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

export function parseSectionedChallengeStep(params: {
  readonly source: string
  readonly frontmatter?: ChallengeStepFrontmatter
}): {
  readonly frontmatter: ChallengeStepFrontmatter
  readonly sections: readonly SerializedChallengeStepSection[]
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
    .map((section) => createSerializedSection(section, seenIds))
    .filter(
      (section): section is SerializedChallengeStepSection => section !== null,
    )

  return {
    frontmatter,
    sections,
  }
}

export function hydrateChallengeStepSections(
  sections: readonly SerializedChallengeStepSection[],
): readonly ChallengeStepSection[] {
  return sections.map((section) => ({
    ...section,
    Component: compileSectionComponent(section.bodySource),
  }))
}

export function transformSectionedChallengeStepSource(
  source: string,
): TransformSectionedChallengeStepSourceResult {
  const parsedFile = matter(source)
  const frontmatter = parsedFile.data as ChallengeStepFrontmatter

  if (frontmatter.stepType !== 'sectioned') {
    return {
      didTransform: false,
      source,
      frontmatter,
      sections: [],
    }
  }

  const parsed = parseSectionedChallengeStep({ source })
  const sectionsExport = `export const challengeSections = ${JSON.stringify(
    parsed.sections,
    null,
    2,
  )}\n\n`

  return {
    didTransform: true,
    source: `${extractRawFrontmatterBlock(source)}${sectionsExport}${parsedFile.content}`,
    frontmatter: parsed.frontmatter,
    sections: parsed.sections,
  }
}
