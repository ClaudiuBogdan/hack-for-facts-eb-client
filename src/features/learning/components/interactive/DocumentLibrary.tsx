/**
 * DocumentLibrary Component
 *
 * An interactive tabbed view of key budget documents organized by phase.
 * Shows document name, Romanian name, description, and external links.
 *
 * @example
 * ```mdx
 * <DocumentLibrary locale="en" />
 * ```
 */

import { useState } from 'react'
import { t } from '@lingui/core/macro'
import { ExternalLink, FileText, Scale, BarChart3 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LearningLocale } from '../../types'
import type { DocumentPhase, BudgetDocument } from './document-tracking-data'

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

type DocumentLibraryProps = {
  readonly locale?: LearningLocale
  readonly documents: readonly BudgetDocument[]
  readonly phaseLabels: Record<DocumentPhase, { name: string; timing: string }>
}

// ═══════════════════════════════════════════════════════════════════════════
// Phase Icons
// ═══════════════════════════════════════════════════════════════════════════

const PHASE_ICONS: Record<DocumentPhase, typeof FileText> = {
  approval: FileText,
  execution: BarChart3,
  audit: Scale,
}

// ═══════════════════════════════════════════════════════════════════════════
// Document Card Component
// ═══════════════════════════════════════════════════════════════════════════

type DocumentCardProps = {
  readonly doc: BudgetDocument
}

function DocumentCard({ doc }: DocumentCardProps) {
  return (
    <div
      className="rounded-lg border border-border p-4 bg-card"
    >
      <div className="space-y-2">
        {/* Title */}
        <h4 className="font-semibold text-foreground">{doc.name}</h4>

        {/* Description */}
        <p className="text-sm text-muted-foreground">{doc.description}</p>

        {/* Links */}
        <div className="flex flex-wrap gap-2 pt-1">
          {doc.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium',
                'bg-muted text-primary',
                'hover:underline transition-colors'
              )}
            >
              {link.label}
              <ExternalLink className="w-3 h-3" />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Tab Button Component
// ═══════════════════════════════════════════════════════════════════════════

type TabButtonProps = {
  readonly phase: DocumentPhase
  readonly label: { name: string; timing: string }
  readonly isActive: boolean
  readonly onClick: () => void
  readonly count: number
}

function TabButton({ phase, label, isActive, onClick, count }: TabButtonProps) {
  const Icon = PHASE_ICONS[phase]

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border',
        isActive
          ? 'bg-primary text-primary-foreground border-primary'
          : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="w-4 h-4" />
      <span>{label.name}</span>
      <span className="text-xs">({count})</span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export function DocumentLibrary({ documents, phaseLabels }: DocumentLibraryProps) {
  const [activePhase, setActivePhase] = useState<DocumentPhase | 'all'>('all')

  const phases: DocumentPhase[] = ['approval', 'execution', 'audit']

  const filteredDocs = activePhase === 'all' ? documents : documents.filter((d) => d.phase === activePhase)

  const countByPhase = (phase: DocumentPhase) => documents.filter((d) => d.phase === phase).length

  return (
    <div className="my-8 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h3 className="text-lg font-semibold text-foreground">{t`Budget Documents`}</h3>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActivePhase('all')}
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all border',
            activePhase === 'all'
              ? 'bg-primary text-primary-foreground border-primary'
              : 'text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'
          )}
        >
          {t`All`}
          <span className="text-xs">({documents.length})</span>
        </button>
        {phases.map((phase) => (
          <TabButton
            key={phase}
            phase={phase}
            label={phaseLabels[phase]}
            isActive={activePhase === phase}
            onClick={() => setActivePhase(phase)}
            count={countByPhase(phase)}
          />
        ))}
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredDocs.map((doc) => (
          <DocumentCard key={doc.id} doc={doc} />
        ))}
      </div>

      {/* Phase Legend (when showing all) */}
      {activePhase === 'all' && (
        <div className="flex flex-wrap gap-4 pt-2 text-xs text-muted-foreground">
          {phases.map((phase) => {
            return (
              <div key={phase} className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <span>
                  {phaseLabels[phase].name} ({phaseLabels[phase].timing})
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export type { DocumentLibraryProps }
