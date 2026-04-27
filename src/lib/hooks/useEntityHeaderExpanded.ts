import { useState, useEffect, useRef } from 'react';

type UseHeaderVisibilityOptions = {
    /** The scroll distance (in px) from the top of the page after which the header can hide. */
    hideThreshold?: number;
};

const DEFAULT_HIDE_THRESHOLD = 200;

/**
 * A hook to control header visibility based on scroll direction.
 * The header hides on scroll down (past a threshold) and reappears on scroll up.
 *
 * @param {UseHeaderVisibilityOptions} options - Configuration options for the hook.
 * @returns {boolean} - Returns 'true' if the header should be expanded/visible.
 */
export const useEntityHeaderExpanded = ({
    hideThreshold = DEFAULT_HIDE_THRESHOLD,
}: UseHeaderVisibilityOptions = {}) => {
    const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
    // Refs to store values between renders without causing re-renders
    const lastScrollY = useRef(0);
    const ticking = useRef(false);
    const hiddenContentRef = useRef<HTMLDivElement>(null);
    const isHeaderExpandedRef = useRef(isHeaderExpanded);

    useEffect(() => {
        lastScrollY.current = window.scrollY;

        const handleScroll = () => {
            // Use requestAnimationFrame to avoid performance issues
            if (ticking.current) return;

            ticking.current = true;
            window.requestAnimationFrame(() => {
                const currentScrollY = window.scrollY;

                // Always show the header when near the top of the page

                const hiddenContentHeight = hiddenContentRef.current?.clientHeight || 0;
                if (currentScrollY - hiddenContentHeight < hideThreshold && !isHeaderExpandedRef.current) {
                    isHeaderExpandedRef.current = true;
                    setIsHeaderExpanded(true);
                }

                if (currentScrollY - hiddenContentHeight > hideThreshold && isHeaderExpandedRef.current) {
                    // Hide header when scrolling down
                    isHeaderExpandedRef.current = false;
                    setIsHeaderExpanded(false);
                }

                lastScrollY.current = currentScrollY;
                ticking.current = false;
            });
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        // Cleanup listener on unmount
        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, [hideThreshold]);

    return { isHeaderExpanded, hiddenContentRef };
};