import { useEffect, useId, useRef, useState, useSyncExternalStore, type ComponentProps, type SyntheticEvent } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input as TextInput } from '@/components/ui/input';
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

/**
 * The dialog mounts its contents only when opened; opening wins over an idle
 * prefetch. Until the input arrives the dialog holds a plain field in its box,
 * which the dialog focuses as it would the input: what the reader types there,
 * and whether they were in it, carry over to the input when it mounts.
 */
function DeferredEntitySearchInput(props: ComponentProps<Input>) {
    const Input = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
    const [term, setTerm] = useState('');
    const [focused, setFocused] = useState<boolean>();
    const [composing, setComposing] = useState(false);
    const selection = useRef<{ start: number; end: number; direction: 'forward' | 'backward' | 'none' } | undefined>(undefined);
    const statusId = useId();

    useEffect(() => { loadInput(); }, []);

    // A composition in progress (an IME, a dead key) finishes in this field first.
    if (typeof Input === 'function' && !composing) {
        return <Input {...props} initialTerm={term} initialSelection={selection.current} autoFocus={focused ?? props.autoFocus} />;
    }

    const rememberSelection = (event: SyntheticEvent<HTMLInputElement>) => {
        const { selectionStart, selectionEnd, selectionDirection } = event.currentTarget;
        if (selectionStart !== null && selectionEnd !== null) {
            selection.current = { start: selectionStart, end: selectionEnd, direction: selectionDirection ?? 'none' };
        }
    };

    const failed = Input === 'failed';
    const placeholder = props.placeholder ?? t`Search entities by name or CUI...`;
    return (
        <div className="relative mx-auto w-full max-w-3xl pt-8">
            <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 text-slate-400 sm:left-7 sm:h-8 sm:w-8" />
                <TextInput
                    type="text"
                    value={term}
                    onChange={(event) => {
                        setTerm(event.target.value);
                        rememberSelection(event);
                    }}
                    onSelect={rememberSelection}
                    onCompositionStart={() => setComposing(true)}
                    onCompositionEnd={(event) => {
                        setComposing(false);
                        setTerm(event.currentTarget.value);
                        rememberSelection(event);
                    }}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoFocus={props.autoFocus}
                    placeholder={placeholder}
                    aria-label={placeholder}
                    aria-busy={!failed}
                    aria-describedby={statusId}
                    // The input's own box (EntitySearch/index.tsx), so nothing moves when it arrives.
                    className="w-full py-7 pl-14 pr-4 text-base bg-white dark:bg-slate-800 rounded-3xl placeholder:text-slate-400 shadow-sm hover:shadow-md focus:shadow-lg transition-shadow duration-300 border-slate-300 dark:border-slate-700 focus:border-slate-400 dark:focus:border-slate-600 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-600 sm:px-20 md:text-xl"
                />
            </div>
            <p id={statusId} role="status" className="mt-2 rounded-md bg-white/95 px-4 py-2 text-sm text-slate-600 dark:bg-slate-900/95 dark:text-slate-300">
                {failed ? t`Căutarea nu a răspuns.` : t`Loading...`}
                {failed && (
                    <>
                        {' '}
                        <button type="button" onClick={retryInput} className="font-medium underline underline-offset-4">
                            {t`Încearcă din nou`}
                        </button>
                    </>
                )}
            </p>
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
