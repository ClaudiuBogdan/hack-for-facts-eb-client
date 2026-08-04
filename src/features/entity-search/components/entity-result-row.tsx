import { t } from '@lingui/core/macro'
import { Trans } from '@lingui/react/macro'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, ExternalLink, MapPin } from 'lucide-react'
import type { MouseEvent, ReactNode } from 'react'
import type { EntitySearchHit } from '@/schemas/entity-search'
import { cn } from '@/lib/utils'
import { EntityTypeBadge } from './entity-type-badge'

type Props = {
  readonly hit: EntitySearchHit
  readonly id: string
  readonly active: boolean
  readonly rowRef: (node: HTMLLIElement | null) => void
  readonly actionRef: (node: HTMLAnchorElement | null) => void
}

type MetaPiece = {
  readonly key: string
  readonly label: string
  readonly icon?: 'map-pin'
}

const CUI_SPINE_DOC_TYPES = new Set([
  'company',
  'organization',
  'public_enterprise',
  'ngo',
])

function isSafeExternalHref(href: string): boolean {
  try {
    const parsedUrl = new URL(href)
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

function getHitMetaPieces(hit: EntitySearchHit): readonly MetaPiece[] {
  const pieces: MetaPiece[] = []

  // The server maps snippet = subtitle for palette hits, so rendering both
  // printed every secondary line twice ("uat, uat_municipality" ×2).
  const subtitle = hit.subtitle?.trim()
  if (subtitle && subtitle !== hit.snippet?.trim()) {
    pieces.push({ key: 'subtitle', label: subtitle })
  }

  // identifiers carries every searchable form; the CUI is the numeric one.
  const cui = hit.identifiers.find((value) => /^\d+$/.test(value))?.trim()
  if (cui && CUI_SPINE_DOC_TYPES.has(hit.docType)) {
    pieces.push({ key: 'cui', label: t`CUI ${cui}` })
  }

  if (hit.countyName?.trim()) {
    pieces.push({
      key: 'county',
      label: hit.countyName.trim(),
      icon: 'map-pin',
    })
  }

  // Struck-off companies and repealed acts are half the corpus; say so rather
  // than letting a dead entity look identical to a live one.
  if (!hit.isActive) {
    pieces.push({ key: 'inactive', label: t`Inactiv` })
  }

  return pieces
}

function HitMeta({ pieces }: { readonly pieces: readonly MetaPiece[] }) {
  if (pieces.length === 0) {
    return null
  }

  return (
    <p className="truncate text-xs text-[var(--pnrr-muted)] sm:text-sm">
      {pieces.map((piece, index) => (
        <span key={piece.key} className="inline-flex max-w-full items-center">
          {index > 0 ? (
            <span aria-hidden="true" className="px-1">
              ·
            </span>
          ) : null}
          {piece.icon === 'map-pin' ? (
            <MapPin aria-hidden="true" className="mr-1 h-3 w-3 shrink-0" />
          ) : null}
          <span className="truncate">{piece.label}</span>
        </span>
      ))}
    </p>
  )
}

function RowContent({
  hit,
  linkable,
}: {
  readonly hit: EntitySearchHit
  readonly linkable: boolean
}) {
  const snippet = hit.snippet?.trim()
  const metaPieces = getHitMetaPieces(hit)

  return (
    <>
      <EntityTypeBadge docType={hit.docType} className="mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-bold text-[var(--pnrr-fg)] group-hover:underline group-data-[active=true]:underline sm:text-base">
          {hit.title}
        </p>
        {snippet ? (
          <p className="line-clamp-2 text-xs leading-snug text-[var(--pnrr-muted)] sm:text-sm">
            {snippet}
          </p>
        ) : null}
        <HitMeta pieces={metaPieces} />
      </div>
      {linkable ? (
        hit.isExternal ? (
          <span className="shrink-0">
            <ExternalLink
              aria-hidden="true"
              className="h-4 w-4 text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-fg)] group-data-[active=true]:text-[var(--pnrr-fg)]"
            />
            <span className="sr-only">
              <Trans>se deschide într-o pagină nouă</Trans>
            </span>
          </span>
        ) : (
          <ArrowUpRight
            aria-hidden="true"
            className="h-4 w-4 shrink-0 text-[var(--pnrr-muted)] group-hover:text-[var(--pnrr-fg)] group-data-[active=true]:text-[var(--pnrr-fg)]"
          />
        )
      ) : null}
    </>
  )
}

function getRowClassName(active: boolean): string {
  return cn(
    'group flex w-full items-start gap-3 px-4 py-3.5 text-left outline-none transition-colors motion-reduce:transition-none sm:gap-4 sm:px-5 sm:py-4',
    'hover:bg-[var(--pnrr-hover)] focus-visible:bg-[var(--pnrr-hover)] focus-visible:ring-2 focus-visible:ring-[var(--pnrr-green)] focus-visible:ring-inset',
    active &&
      'bg-[var(--pnrr-hover)] shadow-[inset_2px_0_0_var(--pnrr-green)]',
  )
}

export function EntityResultRow({
  hit,
  id,
  active,
  rowRef,
  actionRef,
}: Props) {
  const hasHref = hit.href.trim() !== ''
  const externalLinkable =
    hasHref && hit.isExternal && isSafeExternalHref(hit.href)
  const internalLinkable = hasHref && !hit.isExternal
  const linkable = externalLinkable || internalLinkable
  const rowClassName = getRowClassName(active)

  const handleInternalClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!internalLinkable) {
      return
    }

    if (event.metaKey || event.ctrlKey) {
      event.preventDefault()
      window.open(hit.href, '_blank', 'noopener,noreferrer')
    }
  }

  let content: ReactNode
  if (!linkable) {
    content = (
      <div className={rowClassName} data-active={active}>
        <RowContent hit={hit} linkable={false} />
      </div>
    )
  } else if (externalLinkable) {
    content = (
      <a
        ref={actionRef}
        href={hit.href}
        target="_blank"
        rel="noopener noreferrer"
        className={rowClassName}
        data-active={active}
      >
        <RowContent hit={hit} linkable />
      </a>
    )
  } else if (internalLinkable) {
    content = (
      <Link
        ref={actionRef}
        to={hit.href as '/'}
        preload="intent"
        onClick={handleInternalClick}
        className={rowClassName}
        data-active={active}
      >
        <RowContent hit={hit} linkable />
      </Link>
    )
  } else {
    content = (
      <div className={rowClassName} data-active={active}>
        <RowContent hit={hit} linkable={false} />
      </div>
    )
  }

  return (
    <li
      ref={rowRef}
      id={id}
      role="option"
      aria-selected={active}
      aria-disabled={!linkable || undefined}
    >
      {content}
    </li>
  )
}
