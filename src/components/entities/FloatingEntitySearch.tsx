import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { EntitySearchInput } from './EntitySearch';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useHotkeys } from 'react-hotkeys-hook';
import { t } from '@lingui/core/macro';
import { useNavigate } from '@tanstack/react-router';
import { EntitySearchNode } from '@/schemas/entities';

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
                    <EntitySearchInput
                        onSelect={handleSelect}
                        autoFocus={hasMounted && !isMobile}
                        scrollToTopOnFocus={true}
                    />
                </DialogContent>
            </Dialog>
        </>
    );
} 
