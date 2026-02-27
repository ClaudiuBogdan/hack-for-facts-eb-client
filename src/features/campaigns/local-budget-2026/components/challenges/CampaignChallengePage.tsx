import { Link } from '@tanstack/react-router'
import { AlertCircle } from 'lucide-react'
import {
  getCampaignChallengeBySlug,
  getCampaignText,
  useCampaignChallengeContent,
} from '../../hooks/use-campaign-content'
import { campaignInteractiveComponents } from '../../adapters/learning/interactive-components-registry'
import { CAMPAIGN_BASE_PATH } from '../../constants'
import { CampaignActionGate } from '../shared/CampaignActionGate'
import { useChallengeInteractionAdapter } from '../../adapters/learning/challenge-interaction-adapter'
import type { CampaignLocale } from '../../types'

type CampaignChallengePageProps = {
  readonly challengeSlug: string
  readonly locale: CampaignLocale
}

export function CampaignChallengePage({ challengeSlug, locale }: CampaignChallengePageProps) {
  const challenge = getCampaignChallengeBySlug(challengeSlug)
  const { Component, error } = useCampaignChallengeContent({
    challengeSlug,
    locale,
  })

  const staticText = locale === 'en'
    ? {
        challengeLabel: 'Challenge',
        statusLabel: 'Status',
        difficultyLabel: 'Difficulty',
        verificationLabel: 'Verification',
        startAction: 'Start challenge',
        submitReviewAction: 'Submit for review',
        markCompletedAction: 'Mark as completed',
      }
    : {
        challengeLabel: 'Provocare',
        statusLabel: 'Status',
        difficultyLabel: 'Dificultate',
        verificationLabel: 'Verificare',
        startAction: 'Începe provocarea',
        submitReviewAction: 'Trimite pentru review',
        markCompletedAction: 'Marchează completat',
      }

  const {
    status,
    markInteractionStarted,
    markInteractionCompleted,
    markInteractionPendingReview,
  } = useChallengeInteractionAdapter(challengeSlug)

  if (!challenge) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
        <AlertCircle className="mx-auto h-8 w-8 text-zinc-400" />
        <h1 className="mt-3 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Provocare inexistentă</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          Slug-ul cerut nu există în catalogul campaniei.
        </p>
        <Link to={`${CAMPAIGN_BASE_PATH}/challenges` as '/'} className="mt-4 inline-block text-sm font-medium text-blue-600">
          Înapoi la catalog
        </Link>
      </section>
    )
  }

  return (
    <article className="space-y-6">
      <header className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{staticText.challengeLabel}</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50">
          {getCampaignText(challenge.title, locale)}
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-300">{getCampaignText(challenge.summary, locale)}</p>

        <div className="mt-4 flex flex-wrap gap-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{staticText.statusLabel}: {status}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{staticText.difficultyLabel}: {challenge.difficulty}</span>
          <span className="rounded-full bg-zinc-100 px-2.5 py-1 dark:bg-zinc-800">{staticText.verificationLabel}: {challenge.verificationMode}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <CampaignActionGate
            actionId={`challenge.start.${challenge.slug}`}
            challengeSlug={challenge.slug}
            label={staticText.startAction}
            onAuthorizedAction={async () => {
              markInteractionStarted()
            }}
          />

          {challenge.verificationMode === 'manual' ? (
            <CampaignActionGate
              actionId={`challenge.submit.${challenge.slug}`}
              challengeSlug={challenge.slug}
              label={staticText.submitReviewAction}
              onAuthorizedAction={async () => {
                markInteractionPendingReview()
              }}
              className="bg-amber-600 hover:bg-amber-700"
            />
          ) : (
            <CampaignActionGate
              actionId={`challenge.complete.${challenge.slug}`}
              challengeSlug={challenge.slug}
              label={staticText.markCompletedAction}
              onAuthorizedAction={async () => {
                markInteractionCompleted()
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            />
          )}
        </div>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        {Component ? (
          <div className="prose prose-zinc dark:prose-invert max-w-none">
            <Component components={campaignInteractiveComponents} />
          </div>
        ) : null}
      </section>
    </article>
  )
}
