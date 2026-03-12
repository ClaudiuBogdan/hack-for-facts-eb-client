import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getChallengeModules } from './modules'
import { parseSectionedChallengeStep } from './sectioned-step-markdown.build'

describe('challenge module content', () => {
  it('orders the civic challenge modules explicitly', () => {
    const modules = getChallengeModules()

    expect(modules[0]?.slug).toBe('budget-basics')
    expect(modules[1]?.slug).toBe('read-local-execution')
  })

  it('keeps step 1 non-interactive and step 2 as the first live reveal', () => {
    const stepOnePath = resolve(
      process.cwd(),
      'src/content/challenges/steps/read-local-execution/01-why-2025-execution-matters/index.ro.mdx',
    )
    const stepTwoPath = resolve(
      process.cwd(),
      'src/content/challenges/steps/read-local-execution/02-total-budget-in-context/index.ro.mdx',
    )

    const stepOneContent = readFileSync(stepOnePath, 'utf8')
    const stepTwoContent = readFileSync(stepTwoPath, 'utf8')

    expect(stepOneContent).not.toContain('<LessonEntitySnapshot')
    expect((stepOneContent.match(/<Quiz/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect((stepTwoContent.match(/<LessonBudgetContextFlow/g) ?? []).length).toBe(5)
    expect(stepTwoContent).toContain('<LessonBudgetContextFlow stage="expenses-quiz" />')
    expect(stepTwoContent).toContain('<LessonBudgetContextFlow stage="income-quiz" />')
    expect(stepTwoContent).toContain('<LessonBudgetContextFlow stage="per-capita" />')
    expect(stepTwoContent).toContain('<LessonBudgetContextFlow stage="county-quiz" />')
    expect(stepTwoContent).toContain('<LessonBudgetContextFlow stage="county-context" />')
    expect(stepTwoContent).not.toContain('<LessonBudgetEstimate')
  })

  it('does not create a standalone recap section before the first quiz in step 1', () => {
    const stepOnePath = resolve(
      process.cwd(),
      'src/content/challenges/steps/read-local-execution/01-why-2025-execution-matters/index.ro.mdx',
    )

    const stepOneContent = readFileSync(stepOnePath, 'utf8')
    const parsedStep = parseSectionedChallengeStep({ source: stepOneContent })

    const recapSection = parsedStep.sections.find(
      (section) =>
        section.title === 'Recapitulare rapidă' && section.interactive === null,
    )

    expect(recapSection).toBeUndefined()
  })

  it('keeps the five step-2 exercises as separate sections for section view', () => {
    const stepTwoPath = resolve(
      process.cwd(),
      'src/content/challenges/steps/read-local-execution/02-total-budget-in-context/index.ro.mdx',
    )

    const stepTwoContent = readFileSync(stepTwoPath, 'utf8')
    const parsedStep = parseSectionedChallengeStep({ source: stepTwoContent })
    const sectionTitles = parsedStep.sections.map((section) => section.title)

    expect(sectionTitles).toContain('Exercițiul 1: estimează cheltuielile totale')
    expect(sectionTitles).toContain('Exercițiul 2: estimează veniturile totale')
    expect(sectionTitles).toContain('Cum arată totalurile per capita')
    expect(sectionTitles).toContain('Exercițiul 3: cine este pe primul loc în județ')
    expect(sectionTitles).toContain('Contextul județean')
  })
})
