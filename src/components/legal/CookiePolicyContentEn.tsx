import { Link } from '@tanstack/react-router'

export function CookiePolicyContentEn() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground">Effective Date: April 3, 2026 · Version: 3.0</p>
      </div>
      <div className="space-y-2">
        <h2 className="text-lg font-medium">At a Glance</h2>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li>Essential storage is required for the app to work.</li>
          <li>Authentication cookies are used if you create an account.</li>
          <li>Analytics and enhanced error reporting are opt-in.</li>
          <li>Manage preferences anytime in <Link to="/cookies" className="underline">Cookie Settings</Link>.</li>
        </ul>
      </div>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <h3>Technologies we use</h3>
        <p>We use cookies and browser storage technologies such as localStorage, sessionStorage, and IndexedDB to operate the app and, with consent, to measure usage and improve reliability.</p>

        <h3>Categories</h3>
        <ul>
          <li><strong>Essential</strong>: Consent preferences and core UI state (always active).</li>
          <li><strong>Authentication (essential, if you have an account)</strong>: Clerk session cookies for secure login and account management.</li>
          <li><strong>Analytics (opt-in)</strong>: PostHog custom events only (no autocapture).</li>
          <li><strong>Enhanced error reporting (opt-in)</strong>: Sentry optional context.</li>
        </ul>

        <h3>Detailed breakdown</h3>

        <h4>Essential Cookies and Storage (always active)</h4>
        <p>These are necessary for the Service to function and cannot be disabled:</p>
        <ul>
          <li><strong>localStorage</strong>: Includes items such as <code>cookie-consent</code> (consent preferences), <code>saved-charts</code> and <code>chart-categories</code> (saved visualizations and organization), language, theme, currency and inflation preferences, recent entities, alerts, learning progress, campaign progress, onboarding state, and other feature settings or locally stored drafts.</li>
          <li><strong>sessionStorage</strong>: May be used for temporary runtime state, recovery flows, or editor/session handoff features.</li>
          <li><strong>IndexedDB</strong>: May be used by advanced features such as local map snapshots or other larger client-side datasets needed for offline-friendly or draft-saving behavior.</li>
        </ul>

        <h4>Authentication Cookies (essential if you have an account)</h4>
        <p>If you create an account, Clerk sets the following cookies for authentication and session management:</p>
        <ul>
          <li><strong>__clerk_db_jwt</strong>: Session token for authentication (httpOnly, secure).</li>
          <li><strong>__session</strong>: Session identifier (httpOnly, secure).</li>
          <li><strong>__clerk_*</strong>: Various Clerk cookies for account management and security.</li>
        </ul>
        <p>These cookies are essential for account functionality. If you delete them, you will be signed out.</p>

        <h4>Analytics Cookies (opt-in only)</h4>
        <p>Only set if you consent to analytics:</p>
        <ul>
          <li><strong>PostHog</strong>: <code>ph_*</code> identifiers for usage analytics. Custom events only, no autocapture or session recordings.</li>
        </ul>

        <h4>Error Reporting (opt-in only)</h4>
        <p>Only set if you consent to enhanced error reporting:</p>
        <ul>
          <li><strong>Sentry</strong>: Session keys for error context and replay if enabled.</li>
        </ul>

        <h3>Cookie duration</h3>
        <ul>
          <li><strong>Essential browser storage</strong>: localStorage, sessionStorage, and IndexedDB entries may persist until manually cleared by you, overwritten by the relevant feature, or removed by your browser.</li>
          <li><strong>Clerk authentication cookies</strong>: Session cookies (expire when you close browser) and persistent cookies (up to 30 days for "remember me").</li>
          <li><strong>PostHog analytics</strong>: Up to 1 year.</li>
          <li><strong>Sentry</strong>: Session duration only, although submitted feedback or bug reports may be retained server-side under the retention rules described in the Privacy Policy.</li>
        </ul>

        <h3>Managing preferences</h3>
        <p>Use <Link to="/cookies" className="underline">Cookie Settings</Link> to manage analytics and error reporting consent, or use your browser controls to clear site data.</p>
        <p>Note: Deleting authentication cookies will sign you out of your account. Clearing localStorage, sessionStorage, or IndexedDB may reset saved charts, progress, maps, alerts, and other locally stored preferences or drafts.</p>
        <p>See also our <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </div>
    </div>
  )
}
