import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { t } from '@lingui/core/macro';
import {
  ArrowUpRight,
  ExternalLink,
  Mail,
  MapPinned,
  Phone,
  ShieldAlert,
  UserRound,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ResponsivePopover } from '@/components/ui/ResponsivePopover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdvancedMapDatasetJsonItem } from '@/features/advanced-map-datasets/types';
import type { EntityProfileData } from '@/lib/api/entities';
import { cn } from '@/lib/utils';
import type { Components } from 'react-markdown';

export interface MapAnalyticsEntityDetailsSelection {
  readonly countyName?: string;
  readonly entityCui?: string;
  readonly sirutaCode: string;
  readonly title: string;
  readonly uatName: string;
}

export interface MapAnalyticsEntitySeriesRow {
  readonly id: string;
  readonly isActive: boolean;
  readonly label: string;
  readonly payload?: AdvancedMapDatasetJsonItem | null;
  readonly value: string;
}

export interface MapAnalyticsEntityGroupContext {
  readonly groupLabel: string;
  readonly groupSeriesRows: readonly MapAnalyticsEntitySeriesRow[];
  readonly memberCount: number;
  readonly memberPreviewLabels?: readonly string[];
  readonly memberRows?: readonly MapAnalyticsEntityGroupMemberRow[];
  readonly primaryUatName?: string;
  readonly selectedUatName: string;
  readonly uatSeriesRows: readonly MapAnalyticsEntitySeriesRow[];
  readonly workspaceLabel: string;
}

export interface MapAnalyticsEntityGroupMemberRow {
  readonly label: string;
  readonly sirutaCode: string;
  readonly value?: number;
  readonly formattedValue: string;
  readonly isSelected: boolean;
}

interface MapAnalyticsEntityDetailsPanelProps {
  readonly isMobile: boolean;
  readonly isProfileLoading: boolean;
  readonly onClose: () => void;
  readonly entityHref?: string;
  readonly groupContext?: MapAnalyticsEntityGroupContext;
  readonly profile: EntityProfileData | null | undefined;
  readonly profileErrorMessage?: string;
  readonly selection: MapAnalyticsEntityDetailsSelection;
  readonly seriesRows: readonly MapAnalyticsEntitySeriesRow[];
}

export function MapAnalyticsEntityDetailsPanel({
  isMobile,
  isProfileLoading,
  onClose,
  entityHref,
  groupContext,
  profile,
  profileErrorMessage,
  selection,
  seriesRows,
}: Readonly<MapAnalyticsEntityDetailsPanelProps>) {
  const canOpenEntityPage = typeof entityHref === 'string' && entityHref.length > 0;
  const desktopPanelRef = useRef<HTMLDivElement | null>(null);
  const [isGroupContextExpanded, setIsGroupContextExpanded] = useState(false);
  const hasProfileDetails = Boolean(
    profile?.leader_name ||
      profile?.leader_title ||
      profile?.address_raw ||
      profile?.address_locality ||
      profile?.official_email ||
      profile?.phone_primary ||
      profile?.website_url
  );
  const displayedSeriesRows = groupContext?.uatSeriesRows ?? seriesRows;

  useEffect(() => {
    if (isMobile) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (
        target instanceof Element &&
        target.closest('[data-map-interaction-root="true"]')
      ) {
        return;
      }

      if (desktopPanelRef.current?.contains(target)) {
        return;
      }

      onClose();
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isMobile, onClose]);

  useEffect(() => {
    setIsGroupContextExpanded(false);
  }, [groupContext?.groupLabel, groupContext?.workspaceLabel, selection.sirutaCode]);

  const panelContent = (
    <div
      ref={desktopPanelRef}
      className="flex h-full flex-col"
      data-testid="map-entity-details-panel"
    >
      <header
        className={cn(
          'border-b border-border/70 bg-gradient-to-br from-background via-background to-primary/[0.06] px-4 py-4 sm:px-5',
          isMobile && 'pr-14'
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="rounded-full px-2.5 py-0.5">
                {t`Selected UAT`}
              </Badge>
              {selection.countyName ? (
                <span className="text-xs font-medium text-muted-foreground">
                  {selection.countyName}
                </span>
              ) : null}
            </div>
            <h2 className="mt-3 text-balance text-lg font-semibold leading-tight text-foreground sm:text-xl">
              {selection.title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t`Inspect the live values for this UAT.`}
            </p>
          </div>

          {!isMobile ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 rounded-full"
              onClick={onClose}
              aria-label={t`Close details`}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={selection.entityCui ?? selection.sirutaCode}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="space-y-6 px-4 py-5 sm:px-5"
          >
          <section className="space-y-2.5">
            <SectionLabel icon={<MapPinned className="h-3.5 w-3.5" />} title={t`Identifiers`} />
            <dl className="divide-y divide-border/40">
              <DetailRow label={t`SIRUTA`} value={selection.sirutaCode} />
              <DetailRow label={t`CUI`} value={selection.entityCui ?? t`N/A`} />
            </dl>
          </section>

          {groupContext ? (
            <section className="space-y-2.5">
              <SectionLabel title={t`Group context`} />
              <div className="rounded-2xl border border-border/70 bg-muted/[0.12] px-3 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight text-foreground">
                      {groupContext.groupLabel}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {groupContext.workspaceLabel}
                    </div>
                  </div>
                  <Badge variant="secondary" className="shrink-0 rounded-full px-2.5 py-0.5">
                    {groupContext.memberCount === 1
                      ? t`1 UAT`
                      : t`${groupContext.memberCount} UATs`}
                  </Badge>
                </div>
                {!isGroupContextExpanded &&
                groupContext.memberPreviewLabels &&
                groupContext.memberPreviewLabels.length > 0 ? (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {groupContext.memberPreviewLabels.map((label, index) => (
                      <Badge
                        key={`${label}-${index}`}
                        variant="outline"
                        className="max-w-full rounded-full px-2 py-0.5 text-[11px]"
                      >
                        <span className="truncate">{label}</span>
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {groupContext.memberRows && groupContext.memberRows.length > 0 ? (
                  <div className="mt-3 border-t border-border/50 pt-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-mx-2 h-8 px-2 text-xs font-medium text-primary"
                      onClick={() => setIsGroupContextExpanded((current) => !current)}
                    >
                      {isGroupContextExpanded ? t`Show less` : t`Show more`}
                    </Button>
                    {isGroupContextExpanded ? (
                      <GroupMemberValuesList groupContext={groupContext} />
                    ) : null}
                  </div>
                ) : null}
              </div>

              <GroupSeriesComparisonList
                groupRows={groupContext.groupSeriesRows}
                uatRows={groupContext.uatSeriesRows}
              />
            </section>
          ) : (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel title={t`Map values`} />
              <div className="text-xs text-muted-foreground">
                {displayedSeriesRows.length > 0 ? t`${displayedSeriesRows.length} enabled series` : t`No enabled series`}
              </div>
            </div>

            {displayedSeriesRows.length > 0 ? (
              <SeriesRowsList rows={displayedSeriesRows} />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t`Enable at least one series to inspect values for the selected UAT here.`}
              </p>
            )}
          </section>
          )}

          <Separator className="bg-border/50" />

          <section className="space-y-2.5">
            <SectionLabel title={t`Profile details`} />

            {isProfileLoading ? (
              <div className="space-y-3 py-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-4/5 rounded-xl" />
              </div>
            ) : profileErrorMessage ? (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-500/[0.10] px-3 py-3 text-sm text-amber-950 dark:text-amber-100">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{profileErrorMessage}</span>
              </div>
            ) : hasProfileDetails ? (
              <ul className="-mx-1 divide-y divide-border/40">
                {profile?.leader_name || profile?.leader_title ? (
                  <ProfileRow
                    icon={<UserRound className="h-4 w-4" />}
                    label={t`Leadership`}
                    value={[profile?.leader_title, profile?.leader_name].filter(Boolean).join(' · ')}
                  />
                ) : null}

                {profile?.address_raw || profile?.address_locality ? (
                  <ProfileRow
                    icon={<MapPinned className="h-4 w-4" />}
                    label={t`Address`}
                    value={profile?.address_raw || profile?.address_locality || ''}
                  />
                ) : null}

                {profile?.official_email ? (
                  <ProfileRow
                    icon={<Mail className="h-4 w-4" />}
                    label={t`Official email`}
                    value={profile.official_email}
                    href={`mailto:${profile.official_email}`}
                  />
                ) : null}

                {profile?.phone_primary ? (
                  <ProfileRow
                    icon={<Phone className="h-4 w-4" />}
                    label={t`Phone`}
                    value={profile.phone_primary}
                    href={`tel:${profile.phone_primary}`}
                  />
                ) : null}

                {profile?.website_url ? (
                  <ProfileRow
                    icon={<ExternalLink className="h-4 w-4" />}
                    label={t`Official website`}
                    value={profile.website_url}
                    href={isSafeHttpUrl(profile.website_url) ? profile.website_url : undefined}
                  />
                ) : null}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {selection.entityCui
                  ? t`No extra profile details are available yet for this UAT.`
                  : t`Profile details require a mapped entity CUI for this selected UAT.`}
              </p>
            )}
          </section>
          </motion.div>
        </AnimatePresence>
      </ScrollArea>

      <footer className="border-t border-border/70 bg-background/90 px-4 py-4 sm:px-5">
        {canOpenEntityPage ? (
          <Button asChild className="w-full rounded-full">
            <a href={entityHref} target="_blank" rel="noopener noreferrer">
              {t`Open entity page`}
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        ) : (
          <Button type="button" className="w-full rounded-full" disabled>
            {t`Open entity page`}
            <ArrowUpRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </footer>
    </div>
  );

  if (isMobile) {
    return (
      <ResponsivePopover
        open={true}
        onOpenChange={(open) => {
          if (!open) {
            onClose();
          }
        }}
        trigger={<button type="button" className="hidden" aria-hidden="true" tabIndex={-1} />}
        content={panelContent}
        breakpoint={Number.MAX_SAFE_INTEGER}
        mobileSide="bottom"
        className="min-h-[62vh] max-h-[90vh] rounded-t-[28px] p-0 [&>button]:right-5 [&>button]:top-5"
      />
    );
  }

  // z-50 so the side panel sits above floating UI like the global feedback /
  // chat FABs that share the lower z-40 layer.
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 z-50 w-full max-w-[28rem]">
      <motion.aside
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 12 }}
        transition={{
          type: 'tween',
          duration: 0.22,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="pointer-events-auto h-full w-full overflow-hidden border-l border-border/70 bg-background/95 shadow-[-22px_0_48px_-28px_rgba(15,23,42,0.4)] backdrop-blur-xl"
        style={{ transformOrigin: 'right center' }}
        role="complementary"
        aria-label={t`Selected UAT details`}
      >
        {panelContent}
      </motion.aside>
    </div>
  );
}

function GroupMemberValuesList({
  groupContext,
}: Readonly<{
  groupContext: MapAnalyticsEntityGroupContext;
}>) {
  const activeGroupRow =
    groupContext.groupSeriesRows.find((row) => row.isActive) ?? groupContext.groupSeriesRows[0];
  const sortedMemberRows = useMemo(() => {
    return [...(groupContext.memberRows ?? [])].sort((left, right) => {
      if (left.value === undefined && right.value === undefined) {
        return left.label.localeCompare(right.label);
      }
      if (left.value === undefined) {
        return 1;
      }
      if (right.value === undefined) {
        return -1;
      }
      return right.value - left.value;
    });
  }, [groupContext.memberRows]);

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-border/60 bg-background/60">
      <dl className="divide-y divide-border/40">
        {activeGroupRow ? (
          <GroupMemberValueRow
            label={groupContext.groupLabel}
            sublabel={t`Group value`}
            value={activeGroupRow.value}
            emphasized
          />
        ) : null}
        {sortedMemberRows.map((row) => (
          <GroupMemberValueRow
            key={row.sirutaCode}
            label={row.label}
            sublabel={row.isSelected ? t`Selected UAT` : undefined}
            value={row.formattedValue}
            emphasized={row.isSelected}
          />
        ))}
      </dl>
    </div>
  );
}

function GroupMemberValueRow({
  emphasized = false,
  label,
  sublabel,
  value,
}: Readonly<{
  emphasized?: boolean;
  label: string;
  sublabel?: string;
  value: string;
}>) {
  return (
    <div className={cn('flex items-baseline justify-between gap-3 px-3 py-2', emphasized && 'bg-primary/[0.04]')}>
      <dt className="min-w-0">
        <span className="block truncate text-sm font-medium text-foreground">{label}</span>
        {sublabel ? (
          <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {sublabel}
          </span>
        ) : null}
      </dt>
      <dd className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function GroupSeriesComparisonList({
  groupRows,
  uatRows,
}: Readonly<{
  groupRows: readonly MapAnalyticsEntitySeriesRow[];
  uatRows: readonly MapAnalyticsEntitySeriesRow[];
}>) {
  const uatRowsById = new Map(uatRows.map((row) => [row.id, row]));
  const rows = groupRows.map((groupRow) => ({
    groupRow,
    uatRow: uatRowsById.get(groupRow.id),
  }));

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <SectionLabel title={t`Values`} />
        <div className="text-xs text-muted-foreground">
          {rows.length > 0 ? t`${rows.length} enabled series` : t`No enabled series`}
        </div>
      </div>
      {rows.length > 0 ? (
        <ul className="-mx-1 divide-y divide-border/40">
          {rows.map(({ groupRow, uatRow }) => (
            <li
              key={groupRow.id}
              className={cn(
                'px-1 py-3 transition-colors',
                groupRow.isActive && 'bg-primary/[0.03]'
              )}
            >
              <div className="min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 truncate text-sm font-medium text-foreground">
                    {groupRow.label}
                  </div>
                  {groupRow.isActive ? (
                    <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-primary">
                      {t`Active series`}
                    </span>
                  ) : null}
                </div>
                <dl className="mt-2 divide-y divide-border/40 rounded-xl border border-border/60 bg-muted/[0.08] px-3">
                  <CompactValue label={t`Group`} value={groupRow.value} />
                  <CompactValue label={t`Selected UAT`} value={uatRow?.value ?? t`N/A`} />
                </dl>
              </div>
              {uatRow?.payload ? (
                <div className="mt-3">
                  <MapAnalyticsPayloadRenderer payload={uatRow.payload} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t`No group values are available for this selection.`}
        </p>
      )}
    </div>
  );
}

function CompactValue({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2.5">
      <dt className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right text-sm font-semibold tabular-nums text-foreground">
        {value}
      </dd>
    </div>
  );
}

function SeriesRowsList({
  rows,
}: Readonly<{
  rows: readonly MapAnalyticsEntitySeriesRow[];
}>) {
  return (
    <ul className="-mx-1 divide-y divide-border/40">
      {rows.map((seriesRow) => (
        <li
          key={seriesRow.id}
          className={cn(
            'rounded-2xl px-3 py-2.5 transition-colors',
            seriesRow.isActive && 'bg-primary/[0.06]'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-foreground">
                {seriesRow.label}
              </div>
              {seriesRow.isActive ? (
                <span className="mt-1 inline-block text-[10px] font-medium uppercase tracking-wide text-primary">
                  {t`Active series`}
                </span>
              ) : null}
            </div>
            <div className="shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
              {seriesRow.value}
            </div>
          </div>
          {seriesRow.payload ? (
            <div className="mt-3">
              <MapAnalyticsPayloadRenderer payload={seriesRow.payload} />
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function SectionLabel({
  icon,
  title,
}: Readonly<{
  icon?: ReactNode;
  title: string;
}>) {
  return (
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {icon ? <span aria-hidden="true">{icon}</span> : null}
      {title}
    </div>
  );
}

function DetailRow({
  label,
  value,
}: Readonly<{
  label: string;
  value: string;
}>) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <dt className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-right text-sm font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  );
}

function MapAnalyticsPayloadRenderer({
  payload,
}: Readonly<{
  payload: AdvancedMapDatasetJsonItem;
}>) {
  const markdownComponents: Components = {
    p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
    ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
    li: ({ children }) => <li>{children}</li>,
    strong: ({ children }) => (
      <strong className="font-semibold text-foreground">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.92em]">
        {children}
      </code>
    ),
    a: ({ href, children }) => {
      const safeHref = typeof href === 'string' && isSafeHttpUrl(href) ? href : undefined;
      if (!safeHref) {
        return <span>{children}</span>;
      }

      return (
        <a
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {children}
        </a>
      );
    },
  };

  if (payload.type === 'text') {
    return (
      <div
        data-testid="map-entity-series-payload-text"
        className="rounded-[18px] border border-border/70 bg-muted/[0.12] px-3 py-3"
      >
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground/90">
          {payload.value.text}
        </p>
      </div>
    );
  }

  if (payload.type === 'markdown') {
    return (
      <div
        data-testid="map-entity-series-payload-markdown"
        className="rounded-[18px] border border-border/70 bg-muted/[0.12] px-3 py-3"
      >
        <div className="break-words text-sm leading-6 text-foreground/90">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {payload.value.markdown}
          </ReactMarkdown>
        </div>
      </div>
    );
  }

  const safeHref = isSafeHttpUrl(payload.value.url) ? payload.value.url : undefined;
  const linkLabel = payload.value.label?.trim() || getPayloadLinkFallbackLabel(payload.value.url);

  if (!safeHref) {
    return (
      <div
        data-testid="map-entity-series-payload-link"
        className="rounded-[18px] border border-border/70 bg-muted/[0.12] px-3 py-3"
      >
        <p className="break-words text-sm font-medium text-foreground/90">{linkLabel}</p>
      </div>
    );
  }

  return (
    <a
      data-testid="map-entity-series-payload-link"
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start justify-between gap-3 rounded-[18px] border border-border/70 bg-background/80 px-3 py-3 transition-colors hover:border-primary/30 hover:bg-primary/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0">
        <div className="break-words text-sm font-medium text-foreground">{linkLabel}</div>
        {linkLabel !== payload.value.url ? (
          <div className="mt-1 break-all text-xs text-muted-foreground">
            {payload.value.url}
          </div>
        ) : null}
      </div>
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
    </a>
  );
}

function getPayloadLinkFallbackLabel(url: string): string {
  const trimmedUrl = url.trim();

  try {
    return new URL(trimmedUrl).host || trimmedUrl;
  } catch {
    return trimmedUrl;
  }
}

function ProfileRow({
  href,
  icon,
  label,
  value,
}: Readonly<{
  href?: string;
  icon: ReactNode;
  label: string;
  value: string;
}>) {
  const isExternal = typeof href === 'string' && href.startsWith('http');
  const innerContent = (
    <span className="flex min-w-0 flex-1 items-start gap-3">
      <span className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden="true">
        {icon}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
          {label}
        </span>
        <span className="mt-0.5 break-words text-sm font-medium text-foreground">{value}</span>
      </span>
      {href ? (
        <ArrowUpRight
          className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
          aria-hidden="true"
        />
      ) : null}
    </span>
  );

  if (!href) {
    return (
      <li className="flex items-start gap-3 rounded-xl px-3 py-3">{innerContent}</li>
    );
  }

  return (
    <li>
      <a
        href={href}
        target={isExternal ? '_blank' : undefined}
        rel={isExternal ? 'noreferrer' : undefined}
        className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {innerContent}
      </a>
    </li>
  );
}

function isSafeHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
