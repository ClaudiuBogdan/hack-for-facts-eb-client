import { useEffect, useId, useState } from 'react'
import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Check, Share2 } from 'lucide-react'
import { getSiteUrl } from '@/config/env'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { buildCampaignProvocariModulePath } from '../../constants'

type CivicModuleShareCtaProps = {
  readonly entityCui: string
  readonly moduleSlug?: string
}

const DEFAULT_MODULE_SLUG = 'civic-campaign'

function buildShareSearchSuffix(): string {
  if (typeof window === 'undefined') {
    return ''
  }

  const searchParams = new URLSearchParams(window.location.search)

  return searchParams.get('lang') === 'en' ? '?lang=en' : ''
}

export function CivicModuleShareCta({
  entityCui,
  moduleSlug = DEFAULT_MODULE_SLUG,
}: CivicModuleShareCtaProps) {
  const inputId = useId()
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const siteOrigin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : getSiteUrl()
  const shareSearchSuffix = buildShareSearchSuffix()

  const shareUrl = `${siteOrigin}${buildCampaignProvocariModulePath(entityCui, moduleSlug)}${shareSearchSuffix}`

  useEffect(() => {
    if (copyState !== 'copied') {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCopyState('idle')
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copyState])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopyState('copied')
    } catch (error) {
      console.error('Failed to copy civic module link', error)
      setCopyState('error')
    }
  }

  return (
    <div className="rounded-[28px] border border-border/50 bg-gradient-to-br from-background via-background to-primary/[0.03] p-6 shadow-sm md:p-8">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
            <Trans>Share civic module</Trans>
          </p>
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-lg font-black tracking-tight text-foreground">
              <Trans>Copy the civic module link</Trans>
            </h3>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={inputId} className="text-sm font-bold text-foreground">
            <Trans>Module link</Trans>
          </Label>
          <Input
            id={inputId}
            readOnly
            value={shareUrl}
            onFocus={(event) => event.currentTarget.select()}
            className="rounded-xl h-12 text-base"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button
            type="button"
            onClick={handleCopy}
            className="rounded-[22px] h-12 font-black shadow-lg shadow-primary/15 hover:scale-[1.02] active:scale-95 transition-transform sm:w-auto"
          >
            {copyState === 'copied' ? (
              <>
                <Check className="mr-2 h-4 w-4" aria-hidden="true" />
                {t`Copied`}
              </>
            ) : (
              t`Copy link`
            )}
          </Button>

          {copyState === 'error' && (
            <p className="text-sm text-destructive">
              <Trans>Copy failed. You can still select and copy the link manually.</Trans>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
