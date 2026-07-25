import type { ReactElement } from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { openSentryFeedback } from "@/lib/sentry";
import { useSentryConsent } from "@/hooks/useSentryConsent";
import { useTheme } from "@/components/theme/theme-provider";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { defaultYearRange } from "@/schemas/charts";

/**
 * App-wide footer displayed at the bottom of the main layout.
 *
 * Notes:
 * - Kept lightweight and semantic. Lives inside `SidebarInset` so it naturally
 *   sticks to the bottom when content is short, and pushes below long content.
 * - Uses internal `Link` for app routes and external anchors for resources.
 */
export function AppFooter(): ReactElement {
    const defaultYear = defaultYearRange.end;
    const showSentryFeedback = useSentryConsent();
    const location = useLocation();
    const { resolvedTheme } = useTheme();
    const isPnrrPage = /(^|\/)pnrr(\/|$)/.test(location.pathname);

    const handleLinkClick = () => {
        // Scroll to top of page when navigating
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <footer className="w-full border-t bg-muted/30 text-muted-foreground">
            <div className="mx-auto w-full max-w-7xl px-6 py-10">

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {/* Brand + short description */}
                    <div className="space-y-3">
                        <div className="font-semibold text-lg text-foreground">Transparenta.eu</div>
                        <p className="text-sm leading-relaxed">
                            <Trans>A platform for exploring public financial data for citizens, journalists, public figures, and other interested parties.</Trans>
                        </p>
                        <div className="flex items-center gap-4 pt-1">
                            <a
                                href="https://github.com/ClaudiuBogdan/hack-for-facts-eb-client"
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-2 hover:text-foreground"
                                aria-label="GitHub"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 fill-current"
                                    role="img"
                                    aria-hidden="true"
                                    focusable="false"
                                    aria-label="GitHub"
                                >
                                    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.334-1.754-1.334-1.754-1.089-.745.084-.729.084-.729 1.205.086 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.418-1.305.762-1.605-2.665-.305-5.467-1.332-5.467-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.527.117-3.176 0 0 1.009-.322 3.3 1.23.957-.266 1.984-.399 3.005-.404 1.02.005 2.047.138 3.006.404 2.29-1.552 3.297-1.23 3.297-1.23.655 1.649.243 2.873.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.371.823 1.102.823 2.222 0 1.604-.014 2.896-.014 3.293 0 .321.216.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                                </svg>
                                <span className="text-sm">GitHub</span>
                            </a>
                            <a
                                href="https://www.linkedin.com/in/claudiuconstantinbogdan/"
                                target="_blank"
                                rel="noreferrer noopener"
                                className="inline-flex items-center gap-2 hover:text-foreground"
                                aria-label="LinkedIn"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    className="h-4 w-4 fill-current"
                                    role="img"
                                    aria-hidden="true"
                                    focusable="false"
                                    aria-label="LinkedIn"
                                >
                                    <path d="M20.447 20.452h-3.554V14.87c0-1.332-.024-3.048-1.86-3.048-1.862 0-2.146 1.453-2.146 2.953v5.677H9.332V9h3.414v1.561h.049c.476-.9 1.637-1.848 3.367-1.848 3.6 0 4.264 2.37 4.264 5.451v6.288zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM6.993 20.452H3.678V9h3.315v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.226.792 24 1.771 24h20.451C23.2 24 24 23.226 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                                </svg>
                                <span className="text-sm">LinkedIn</span>
                            </a>
                        </div>
                    </div>

                    {/* Product */}
                    <nav aria-label="Product" className="space-y-3" aria-labelledby="footer-product-heading">
                        <h2 id="footer-product-heading" className="font-medium text-foreground text-base"><Trans>Product</Trans></h2>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/" className="hover:text-foreground" onClick={handleLinkClick}>
                                    <Trans>Home</Trans>
                                </Link>
                            </li>
                            <li>
                                <Link to="/entity-analytics" className="hover:text-foreground" onClick={handleLinkClick}>
                                    <Trans>Entity Analytics</Trans>
                                </Link>
                            </li>
                            <li>
                                <Link to="/map" className="hover:text-foreground" onClick={handleLinkClick}>
                                    <Trans>Maps</Trans>
                                </Link>
                            </li>
                            <li>
                                <Link to="/charts" className="hover:text-foreground" onClick={handleLinkClick}>
                                    <Trans>Charts</Trans>
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    {/* Legal */}
                    <nav aria-label="Legal" className="space-y-3" aria-labelledby="footer-legal-heading">
                        <h2 id="footer-legal-heading" className="font-medium text-foreground text-base"><Trans>Legal</Trans></h2>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/privacy" className="hover:text-foreground" onClick={handleLinkClick}><Trans>Privacy Policy</Trans></Link>
                            </li>
                            <li>
                                <Link to="/terms" className="hover:text-foreground" onClick={handleLinkClick}><Trans>Terms of Service</Trans></Link>
                            </li>
                            <li>
                                <Link
                                    to="/cookies"
                                    search={{ redirect: `${location.pathname}${location.searchStr ?? ""}` }}
                                    className="hover:text-foreground"
                                    onClick={handleLinkClick}
                                >
                                    <Trans>Cookie Settings</Trans>
                                </Link>
                            </li>
                        </ul>
                    </nav>
                </div>

                {/* Divider */}
                <div className="my-8 h-px w-full bg-border" />

                {/* Data source and copyright */}
                <div className="flex flex-col items-start justify-between gap-4 text-xs text-muted-foreground md:flex-row">
                    <p className="break-words">
                        {isPnrrPage ? (
                            <>
                                <Trans>PNRR data source: Ministry of Investments and European Projects (MIPE). See the official dashboard:</Trans>
                                {" "}
                                <a
                                    href="https://mfe.gov.ro/pnrr-dashboard"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="break-all underline underline-offset-2 hover:text-foreground"
                                >
                                    mfe.gov.ro/pnrr-dashboard
                                </a>
                                .
                            </>
                        ) : (
                            <>
                                <Trans>Data source: &quot;Budget Transparency&quot; portal administered by ANAF/Ministry of Finance. See official resources:</Trans>
                                {" "}
                                <a
                                    href="https://mfinante.gov.ro/transparenta-bugetara"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="break-all underline underline-offset-2 hover:text-foreground"
                                >
                                    mfinante.gov.ro/transparenta-bugetara
                                </a>
                                {" "}<Trans>and</Trans>{" "}
                                <a
                                    href="https://extranet.anaf.mfinante.gov.ro/anaf/extranet/EXECUTIEBUGETARA"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="break-all underline underline-offset-2 hover:text-foreground"
                                >
                                    extranet.anaf.mfinante.gov.ro
                                </a>
                                .
                            </>
                        )}
                    </p>
                    <p className="shrink-0 sm:whitespace-nowrap"><Trans>&copy; {defaultYear} Transparenta.eu. All rights reserved.</Trans></p>
                </div>

                {/* Bottom utilities: Feedback / Status / Back to top */}
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4">
                        <a
                            href="https://github.com/ClaudiuBogdan/hack-for-facts-eb-client/issues"
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline hover:text-foreground"
                        >
                            <Trans>Feedback / Report an issue</Trans>
                        </a>
                        {showSentryFeedback && (
                            <button
                                type="button"
                                className="underline hover:text-foreground"
                                onClick={() => openSentryFeedback?.()}
                                aria-label={t`Open feedback dialog`}
                            >
                                <Trans>Send feedback</Trans>
                            </button>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <a
                            href="https://status.transparenta.eu"
                            target="_blank"
                            rel="noreferrer noopener"
                            aria-label={t`System status`}
                            className="max-w-full"
                        >
                            <iframe
                                src={`https://status.transparenta.eu/badge?theme=${resolvedTheme}`}
                                width="250"
                                height="30"
                                frameBorder="0"
                                scrolling="no"
                                title={t`System status badge`}
                                className="max-w-full pointer-events-none"
                            />
                        </a>
                        <button
                            type="button"
                            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                            className="rounded-md border px-2.5 py-1.5 text-[11px] font-medium text-foreground hover:bg-muted"
                            aria-label={t`Back to top`}
                        >
                            <Trans>Back to top</Trans>
                        </button>
                    </div>
                </div>
            </div>
        </footer>
    );
}
