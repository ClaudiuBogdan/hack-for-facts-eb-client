import { t } from '@lingui/core/macro'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { cn } from '@/lib/utils'
import { useLearningProgress } from '../../hooks/use-learning-progress'
import { getLearningOnboardingTree, type LearningOnboardingNode, type LearningOnboardingOption } from '../../utils/onboarding'
import { getLearningPathById, getTranslatedText } from '../../utils/paths'

export function LearningOnboarding() {
  const { lang } = useParams({ strict: false })
  const locale = lang === 'ro' ? 'ro' : 'en'
  const navigate = useNavigate()
  const { saveOnboarding } = useLearningProgress()

  const onboardingTree = useMemo(() => getLearningOnboardingTree(), [])
  const nodeById = useMemo(
    () => new Map<string, LearningOnboardingNode>(onboardingTree.nodes.map((node) => [node.id, node])),
    [onboardingTree],
  )
  const [nodePath, setNodePath] = useState<string[]>([])
  const [selections, setSelections] = useState<Record<string, LearningOnboardingOption>>({})
  const [overridePathId, setOverridePathId] = useState<string | null>(null)

  const currentNodeId = nodePath.length > 0 ? nodePath[nodePath.length - 1] : null
  const currentNode = currentNodeId ? (nodeById.get(currentNodeId) ?? null) : null

  const context = useMemo(() => {
    const next: Record<string, string | string[] | undefined> = {}
    for (const nodeId of nodePath) {
      const selection = selections[nodeId]
      if (selection?.set) {
        Object.assign(next, selection.set)
      }
    }
    return next
  }, [nodePath, selections])

  const selectedOption = currentNode?.type === 'choice' ? selections[currentNode.id] : null

  const recommendedPathId = useMemo(() => {
    if (overridePathId) return overridePathId
    if (!currentNode || currentNode.type !== 'result') return null
    if (currentNode.pathId) return currentNode.pathId
    if (currentNode.pathIdFrom) {
      const value = context[currentNode.pathIdFrom]
      return typeof value === 'string' ? value : null
    }
    return null
  }, [context, currentNode, overridePathId])

  const relatedPaths = useMemo(() => {
    const value = context.relatedPaths
    return Array.isArray(value) ? value : []
  }, [context])

  const recommendedPath = useMemo(
    () => (recommendedPathId ? getLearningPathById(recommendedPathId) : null),
    [recommendedPathId],
  )

  const canComplete = Boolean(recommendedPath)

  const handleStart = () => {
    setSelections({})
    setOverridePathId(null)
    setNodePath([onboardingTree.rootNodeId])
  }

  const handleBack = () => {
    setOverridePathId(null)
    setNodePath((prev) => {
      if (prev.length <= 1) {
        setSelections({})
        return []
      }
      return prev.slice(0, -1)
    })
  }

  const handleOptionSelect = (value: string) => {
    if (!currentNode || currentNode.type !== 'choice') return
    const option = currentNode.options.find((item) => item.id === value)
    if (!option) return
    setSelections((prev) => ({
      ...prev,
      [currentNode.id]: option,
    }))
    advanceWithOption(option)
  }

  const advanceWithOption = (option: LearningOnboardingOption) => {
    const nextId = option.nextNodeId
    if (nextId) {
      setOverridePathId(null)
      setNodePath((prev) => [...prev, nextId])
      return
    }
    if (option.pathId) {
      const resultNode = onboardingTree.nodes.find((node) => node.type === 'result')
      setOverridePathId(option.pathId)
      if (resultNode) {
        setNodePath((prev) => [...prev, resultNode.id])
      }
    }
  }

  const handleComplete = async () => {
    if (!recommendedPath) return
    await saveOnboarding({ pathId: recommendedPath.id, relatedPaths })
    void navigate({ to: `/${lang}/learning/${recommendedPath.id}` as '/', replace: true })
  }

  const handleStartOver = () => {
    setSelections({})
    setOverridePathId(null)
    setNodePath([])
  }

  const resultTitle =
    currentNode?.type === 'result' && currentNode.title
      ? getTranslatedText(currentNode.title, locale)
      : t`Your path is ready`

  const resultDescription =
    currentNode?.type === 'result' && currentNode.description
      ? getTranslatedText(currentNode.description, locale)
      : t`We'll start with the path that matches your goal and choices.`

  const resultCtaLabel =
    currentNode?.type === 'result' && currentNode.ctaLabel
      ? getTranslatedText(currentNode.ctaLabel, locale)
      : t`Start Learning`

  return (
    <div className="min-h-[90vh] flex flex-col items-center justify-center p-8 bg-background">
      <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
        <div className="w-full flex-1 flex flex-col items-center justify-center">
          {nodePath.length === 0 && (
            <div className="text-center space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-xl mx-auto">
              <div className="text-8xl md:text-9xl mb-4">
                🦉
              </div>

              <div className="space-y-6">
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-[1.1]">
                  {t`Learn public budgeting.`}
                </h1>
                <p className="text-lg text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed opacity-80">
                  {t`Personalized paths and interactive lessons.`}
                </p>
              </div>

              <div className="pt-6">
                <Button
                  size="lg"
                  className="group px-10 py-7 text-lg font-bold rounded-full transition-all bg-foreground text-background hover:bg-foreground/90 hover:scale-[1.02] active:scale-98"
                  onClick={handleStart}
                >
                  <span className="flex items-center gap-3 tracking-tight">
                    {t`Get Started`}
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Button>
              </div>
            </div>
          )}

          {currentNode?.type === 'choice' && (
            <div
              key={currentNode.id}
              className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700"
            >
              <div className="text-center mb-12 space-y-3">
                <h2 className="text-3xl font-black text-foreground tracking-tight">
                  {getTranslatedText(currentNode.prompt, locale)}
                </h2>
                {currentNode.description && (
                  <p className="text-sm text-muted-foreground font-medium">
                    {getTranslatedText(currentNode.description, locale)}
                  </p>
                )}
              </div>

              <RadioGroup
                value={selectedOption?.id ?? ''}
                onValueChange={handleOptionSelect}
                className="grid gap-3"
              >
                {currentNode.options.map((item) => {
                  const isSelected = selectedOption?.id === item.id
                  const label = getTranslatedText(item.label, locale)
                  const description = item.description ? getTranslatedText(item.description, locale) : null

                  return (
                    <Label
                      key={item.id}
                      onClick={() => {
                        if (isSelected) {
                          advanceWithOption(item)
                        }
                      }}
                      className={cn(
                        'relative flex items-center gap-5 rounded-2xl border-2 p-5 cursor-pointer transition-all duration-300 bg-card',
                        isSelected
                          ? 'border-primary bg-primary/[0.02]'
                          : 'border-muted bg-transparent hover:border-muted-foreground/30',
                      )}
                    >
                      <RadioGroupItem value={item.id} className="sr-only" />

                      <div className="flex-1 space-y-0.5">
                        <div className="font-bold text-base text-foreground tracking-tight">{label}</div>
                        {description && (
                          <div className="text-xs text-muted-foreground font-medium opacity-70">{description}</div>
                        )}
                      </div>

                      <div
                        className={cn(
                          'flex h-5 w-5 items-center justify-center rounded-full border-2 transition-all',
                          isSelected ? 'bg-primary border-primary' : 'border-muted',
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                      </div>
                    </Label>
                  )
                })}
              </RadioGroup>

              <div className="mt-10 flex flex-col gap-3">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="w-full text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {nodePath.length <= 1 ? t`Back to welcome` : t`Go back`}
                </Button>
              </div>
            </div>
          )}

          {currentNode?.type === 'result' && (
            <div
              key={currentNode.id}
              className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700"
            >
              <div className="text-center mb-12 space-y-3">
                <h2 className="text-3xl font-black text-foreground tracking-tight">{resultTitle}</h2>
                <p className="text-sm text-muted-foreground font-medium">{resultDescription}</p>
              </div>

              {recommendedPath ? (
                <div className="w-full rounded-2xl border-2 border-muted p-6 text-left bg-card">
                  <div className="text-2xl font-black text-foreground tracking-tight">
                    {getTranslatedText(recommendedPath.title, locale)}
                  </div>
                  <p className="text-sm text-muted-foreground font-medium mt-2">
                    {getTranslatedText(recommendedPath.description, locale)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-status-blocked-fg text-center">
                  {t`The learning path you're looking for doesn't exist.`}
                </p>
              )}

              <div className="mt-10 flex flex-col gap-3">
                <Button
                  onClick={handleComplete}
                  disabled={!canComplete}
                  size="lg"
                  className="w-full py-7 text-base font-bold rounded-2xl transition-all tracking-tight"
                >
                  {resultCtaLabel}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleStartOver}
                  className="w-full text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  {t`Start over`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
