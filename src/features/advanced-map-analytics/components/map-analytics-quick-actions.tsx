import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Check, Link2, Pencil, Search } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';
import { toast } from 'sonner';
import { FloatingEntitySearch } from '@/components/entities/FloatingEntitySearch';
import { Button } from '@/components/ui/button';
import { getSiteUrl } from '@/config/env';
import { ensureShortRedirectUrl } from '@/lib/api/shortLinks';
import { Analytics } from '@/lib/analytics';
import { useAuth } from '@/lib/auth';
import { cn, slugify } from '@/lib/utils';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { createMapCloneHandoff } from '@/features/advanced-map-analytics/store/map-clone-handoff';
import { createMapConfigTransferEnvelope } from '@/features/advanced-map-analytics/store/map-config-transfer';
import { t } from '@lingui/core/macro';

interface MapAnalyticsQuickActionsProps {
  mode: 'owner' | 'public';
  mapState: AdvancedMapAnalyticsUrlState;
  mapDescription?: string;
  onBeforeExportConfig?: () => Promise<void> | void;
  className?: string;
  hidden?: boolean;
  hiddenOnMobile?: boolean;
  /**
   * Layout for the action cluster.
   * - `floating` (default): fixed-positioned overlay used by the editor and
   *   workspace map view.
   * - `inline`: render the buttons in normal document flow so a parent header
   *   can position the cluster (used by the public map view).
   */
  variant?: 'floating' | 'inline';
}

export function MapAnalyticsQuickActions({
  mode,
  mapState,
  mapDescription = '',
  onBeforeExportConfig,
  className,
  hidden = false,
  hiddenOnMobile,
  variant = 'floating',
}: Readonly<MapAnalyticsQuickActionsProps>) {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isShareCopied, setIsShareCopied] = useState(false);
  const [isEntitySearchOpen, setIsEntitySearchOpen] = useState(false);
  const shareCopiedResetTimeoutRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => {
      if (shareCopiedResetTimeoutRef.current !== undefined) {
        window.clearTimeout(shareCopiedResetTimeoutRef.current);
      }
    };
  }, []);

  const resetShareCopiedStateWithDelay = useCallback(() => {
    if (shareCopiedResetTimeoutRef.current !== undefined) {
      window.clearTimeout(shareCopiedResetTimeoutRef.current);
    }

    shareCopiedResetTimeoutRef.current = window.setTimeout(() => {
      setIsShareCopied(false);
    }, 2000);
  }, []);

  const handleCopyShareLink = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      let linkToCopy = currentUrl;

      if (isSignedIn) {
        try {
          linkToCopy = await ensureShortRedirectUrl(currentUrl, getSiteUrl(), queryClient);
        } catch (error) {
          console.error('Failed to generate short link, falling back to full URL', error);
        }
      }

      await navigator.clipboard.writeText(linkToCopy);
      toast.success(t`Link copied to clipboard`);
      setIsShareCopied(true);
      resetShareCopiedStateWithDelay();
    } catch (error) {
      console.error('Copy failed', error);
      toast.error(t`Failed to copy link`);
    }
  }, [isSignedIn, queryClient, resetShareCopiedStateWithDelay]);

  const handleOpenSearch = useCallback(() => {
    setIsEntitySearchOpen(true);
  }, []);

  const handleCreateEditableCopy = useCallback(() => {
    const cloneRef = createMapCloneHandoff({
      mapState,
      mapDescription,
    });
    Analytics.capture(Analytics.EVENTS.AdvancedMapAnalyticsCloneHandoffUsed, {
      source: 'public_quick_actions',
    });

    navigate({
      to: '/maps/editor/new',
      search: { cloneRef },
    });
  }, [mapDescription, mapState, navigate]);

  const getConfigExportFileName = useCallback(() => {
    const normalizedMapName = slugify(mapState.mapName) || 'untitled-map';
    const exportTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `map-config-${normalizedMapName}-${exportTimestamp}.json`;
  }, [mapState.mapName]);

  const handleExportConfigFile = useCallback(async () => {
    if (onBeforeExportConfig) {
      try {
        await onBeforeExportConfig();
      } catch {
        toast.warning(t`Local backup failed. Exporting configuration anyway.`);
      }
    }

    try {
      const transferPayload = createMapConfigTransferEnvelope({
        mapState,
        mapDescription,
      });
      const configBlob = new Blob([JSON.stringify(transferPayload, null, 2)], {
        type: 'application/json',
      });
      const configBlobUrl = URL.createObjectURL(configBlob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.href = configBlobUrl;
      downloadAnchor.download = getConfigExportFileName();
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(configBlobUrl);
      toast.success(t`Configuration exported`);
    } catch {
      toast.error(t`Failed to export configuration`);
    }
  }, [getConfigExportFileName, mapDescription, mapState, onBeforeExportConfig]);

  useHotkeys(
    'mod+k',
    (event) => {
      event.preventDefault();
      setIsEntitySearchOpen(true);
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'] }
  );
  useHotkeys(
    'mod+s',
    (event) => {
      event.preventDefault();
      if (mode === 'owner') {
        void handleExportConfigFile();
        return;
      }

      void handleCopyShareLink();
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'] }
  );

  const isFloating = variant === 'floating';
  const buttonClassName = isFloating
    ? 'h-10 w-10 rounded-full shadow-lg border border-border hover:bg-secondary/50 transition-colors'
    : 'h-9 w-9 rounded-full border border-border hover:bg-secondary/50 transition-colors';
  const iconClassName = isFloating ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <>
      <div
        className={cn(
          'flex gap-2',
          isFloating && [
            'fixed z-30',
            'md:top-10 md:right-4 md:flex-col',
            'bottom-4 right-4 flex-row md:bottom-auto',
          ],
          hidden && 'hidden',
          hiddenOnMobile && 'hidden md:flex',
          className
        )}
        data-testid="map-analytics-quick-actions"
      >
        <Button
          type="button"
          aria-label={t`Search entities`}
          title={t`Search entities`}
          variant="ghost"
          size="icon"
          className={buttonClassName}
          onClick={handleOpenSearch}
        >
          <Search className={iconClassName} />
        </Button>
        {mode === 'public' ? (
          <Button
            type="button"
            aria-label={t`Create editable copy`}
            title={t`Create editable copy`}
            variant="ghost"
            size="icon"
            className={buttonClassName}
            onClick={handleCreateEditableCopy}
          >
            <Pencil className={iconClassName} />
          </Button>
        ) : null}
        <Button
          type="button"
          aria-label={t`Copy share link`}
          title={t`Copy share link`}
          variant="ghost"
          size="icon"
          className={buttonClassName}
          onClick={() => void handleCopyShareLink()}
        >
          {isShareCopied ? (
            <Check className={cn(iconClassName, 'text-green-600')} />
          ) : (
            <Link2 className={iconClassName} />
          )}
        </Button>
      </div>
      <FloatingEntitySearch
        externalOpen={isEntitySearchOpen}
        onOpenChange={setIsEntitySearchOpen}
      />
    </>
  );
}
