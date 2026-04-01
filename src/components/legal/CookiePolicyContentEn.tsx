import { Link } from '@tanstack/react-router'

export function CookiePolicyContentEn() {
  return (
    <div className="mx-auto w-full max-w-4xl p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Cookie Policy</h1>
        <p className="text-sm text-muted-foreground">Effective Date: October 17, 2025 · Version: 2.0</p>
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
        <p>We use cookies and localStorage to operate the app and, with consent, to measure usage and improve reliability.</p>

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
          <li><strong>localStorage</strong>: <code>cookie-consent</code> (stores your consent preferences), <code>saved-charts</code> (your saved visualizations), <code>chart-categories</code> (chart organization), <code>theme-preference</code> (dark/light mode).</li>
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
          <li><strong>Essential localStorage</strong>: Persists until manually cleared by you.</li>
          <li><strong>Clerk authentication cookies</strong>: Session cookies (expire when you close browser) and persistent cookies (up to 30 days for "remember me").</li>
          <li><strong>PostHog analytics</strong>: Up to 1 year.</li>
          <li><strong>Sentry</strong>: Session duration only.</li>
        </ul>

        <h3>Managing preferences</h3>
        <p>Use <Link to="/cookies" className="underline">Cookie Settings</Link> to manage analytics and error reporting consent, or use your browser controls to clear site data.</p>
        <p>Note: Deleting authentication cookies will sign you out of your account. Deleting essential localStorage will reset your saved charts and preferences.</p>
        <p>See also our <Link to="/privacy" className="underline">Privacy Policy</Link>.</p>
      </div>
    </div>
  )
}
