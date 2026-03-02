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
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import type { AdvancedMapAnalyticsUrlState } from '@/schemas/advanced-map-analytics';
import { t } from '@lingui/core/macro';

interface MapAnalyticsQuickActionsProps {
  mode: 'owner' | 'public';
  mapState: AdvancedMapAnalyticsUrlState;
  className?: string;
  hiddenOnMobile?: boolean;
}

export function MapAnalyticsQuickActions({
  mode,
  mapState,
  className,
  hiddenOnMobile,
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
    navigate({
      to: '/maps/editor/new',
      search: { state: mapState },
    });
  }, [mapState, navigate]);

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
      void handleCopyShareLink();
    },
    { enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'] }
  );

  return (
    <>
      <div
        className={cn(
          'fixed z-[700] flex gap-2',
          'md:top-10 md:right-4 md:flex-col',
          'bottom-4 right-4 flex-row md:bottom-auto',
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
          className="h-10 w-10 rounded-full shadow-lg border border-border hover:bg-secondary/50 transition-colors"
          onClick={handleOpenSearch}
        >
          <Search className="h-5 w-5" />
        </Button>
        {mode === 'public' ? (
          <Button
            type="button"
            aria-label={t`Create editable copy`}
            title={t`Create editable copy`}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full shadow-lg border border-border hover:bg-secondary/50 transition-colors"
            onClick={handleCreateEditableCopy}
          >
            <Pencil className="h-5 w-5" />
          </Button>
        ) : null}
        <Button
          type="button"
          aria-label={t`Copy share link`}
          title={t`Copy share link`}
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg border border-border hover:bg-secondary/50 transition-colors"
          onClick={() => void handleCopyShareLink()}
        >
          {isShareCopied ? (
            <Check className="h-5 w-5 text-green-600" />
          ) : (
            <Link2 className="h-5 w-5" />
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
