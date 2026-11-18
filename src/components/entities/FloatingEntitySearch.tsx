import { useEffect, useState, useSyncExternalStore, type ComponentProps } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { EntitySearchInput } from './EntitySearch';
import { reloadForFreshCode } from '@/lib/chunk-recovery';
import { quietImport } from '@/lib/quiet-chunk-load';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHotkeys } from 'react-hotkeys-hook';
import { t } from '@lingui/core/macro';
import { useNavigate } from '@tanstack/react-router';
import type { EntitySearchNode } from '@/schemas/entities';

type Input = typeof EntitySearchInput;
type LoadState = 'idle' | 'loading' | 'failed' | Input;

let state: LoadState = 'idle';
const listeners = new Set<() => void>();

function publish(next: LoadState) {
    state = next;
    for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
}

/**
 * The reader's „try again": a fresh page, as the landing search does, since the
 * browser keeps a failed import failed for this document; offline, the fetch
 * once more in place.
 */
function retryInput() {
    if (reloadForFreshCode()) return;
    loadInput(true);
}

function loadInput(retry = false) {
    if (state !== 'idle' && !(retry && state === 'failed')) return;
    publish('loading');
    void quietImport(() => import('./EntitySearch')).then(
        ({ EntitySearchInput }) => publish(EntitySearchInput),
        () => publish('failed'),
    );
}

const snapshot = () => state;
const serverSnapshot = () => 'idle' as const;

function usePrefetchEntitySearchInput() {
    useEffect(() => {
        if (state !== 'idle') return;
        const prefetch = () => loadInput();
        if (typeof window.requestIdleCallback === 'function') {
            const id = window.requestIdleCallback(prefetch, { timeout: 3000 });
            return () => window.cancelIdleCallback(id);
        }
        const id = window.setTimeout(prefetch, 1000);
        return () => window.clearTimeout(id);
    }, []);
}

/** The dialog mounts its contents only when opened. Opening wins over an idle prefetch. */
function DeferredEntitySearchInput(props: ComponentProps<Input>) {
    const Input = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    const [focusOnLoad, setFocusOnLoad] = useState<boolean>();

    useEffect(() => { loadInput(); }, []);

    if (typeof Input === 'function') return <Input {...props} autoFocus={focusOnLoad ?? props.autoFocus} />;

    const failed = Input === 'failed';
    return (
        <div className="mx-auto w-full max-w-3xl pt-8">
            <button
                type="button"
                aria-disabled={!failed}
                onClick={failed ? retryInput : undefined}
                onFocus={() => setFocusOnLoad(true)}
                onBlur={() => setFocusOnLoad(false)}
                className="min-h-14 w-full rounded-3xl border bg-background px-6 text-start shadow-sm"
            >
                <span role="status">{failed ? t`Căutarea nu a răspuns.` : t`Loading...`}</span>
                {failed && <span className="ml-2 underline">{t`Încearcă din nou`}</span>}
            </button>
        </div>
    );
}

interface FloatingEntitySearchProps {
    className?: string;
    externalOpen?: boolean;
    showButton?: boolean;
    onOpenChange?: (open: boolean) => void;
    openNotificationModal?: boolean;
}

export function FloatingEntitySearch({ className, externalOpen, showButton, onOpenChange, openNotificationModal = false }: FloatingEntitySearchProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [hasMounted, setHasMounted] = useState(false);
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    usePrefetchEntitySearchInput();

    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Use external state if provided, otherwise use internal state
    const isOpen = externalOpen ?? internalOpen;
    const setIsOpen = (open: boolean) => {
        if (onOpenChange) {
            onOpenChange(open);
        } else {
            setInternalOpen(open);
        }
    };

    const toggleSearchOpen = () => {
        setIsOpen(!isOpen);
    };

    // Use keyboard shortcuts to open and close the dialog react-hotkeys-hook
    useHotkeys('mod+k', (e) => {
        e.preventDefault();
        toggleSearchOpen();
    }, {
        enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
    });
    useHotkeys('esc', () => setIsOpen(false));

    const handleSelect = (entity: EntitySearchNode) => {
        if (openNotificationModal) {
            // Navigate to entity page with notification modal open
            navigate({
                to: "/entities/$cui",
                params: { cui: entity.cui },
                search: {
                    notificationModal: 'open' as const,
                },
            } as never);
        }
        setIsOpen(false);
    };

    return (
        <>
            {showButton && <div className={cn(className)}>
                <Button
                    onClick={() => setIsOpen(true)}
                    className={cn(isMobile ? "fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg z-40" : "fixed top-8 right-8 h-8 w-8 rounded-full shadow-lg z-40 border-1 border-slate-200 dark:border-slate-700")}
                    aria-label={t`Search for another entity`}
                    variant="ghost"
                    size="icon"
                >
                    <Search className="h-8 w-8" />
                </Button>
            </div>}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent hideCloseButton={true} className={cn(
                    "fixed max-w-3xl w-full p-0 bg-transparent border-0 shadow-none outline-none focus:outline-none",
                    isMobile ? "top-16 max-h-[60vh]" : "top-1/3"
                )}>
                    <DialogTitle className="sr-only">{t`Search for another entity`}</DialogTitle>
                    <DialogDescription className="sr-only">
                        {t`Search and select an entity to navigate to its page.`}
                    </DialogDescription>
                    <DeferredEntitySearchInput
                        onSelect={handleSelect}
                        autoFocus={hasMounted && !isMobile}
                        scrollToTopOnFocus={true}
                    />
                    {/* This dialog SELECTS a public institution by CUI — it searches
                        organizations only. The global palette covers all ten identity
                        types (companies, NGOs, MPs, bills, committees, legislation,
                        Monitorul Oficial), so offer it rather than leaving it
                        unreachable from the shell. */}
                    <button
                        type="button"
                        onClick={() => {
                            setIsOpen(false);
                            void navigate({ to: '/experimental/search' } as never);
                        }}
                        className="mt-2 w-full rounded-md bg-white/95 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 transition-colors hover:bg-white dark:bg-slate-900/95 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-900"
                    >
                        {t`Caută în tot: firme, ONG-uri, parlamentari, legislație…`}
                    </button>
                </DialogContent>
            </Dialog>
        </>
    );
} 
