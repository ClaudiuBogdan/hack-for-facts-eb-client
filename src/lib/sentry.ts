import * as Sentry from "@sentry/react";
import { env } from "@/config/env";
import { hasAnalyticsConsent, hasSentryConsent } from "@/lib/consent";
import {
  captureConsoleIntegration,
  extraErrorDataIntegration,
  replayIntegration,
} from "@sentry/react";

/**
 * Public handles to open customized Sentry Feedback dialogs programmatically.
 * These are set only after Sentry.init + feedbackIntegration are active on the client.
 */
export let openSentryFeedback: (() => void) | null = null;
export let openSentryBugReport: (() => void) | null = null;

/** Small helper */
const isBrowser = typeof window !== "undefined";
const CSS_CROSS_ORIGIN_ERROR_MARKERS = [
  "cssrules",
  "cssstylesheet",
  "cannot access rules",
  "failed to read the 'cssrules' property",
  "failed to read the \"cssrules\" property",
  "securityerror",
] as const;
const DOM_NODE_REMOVAL_ERROR_MARKERS = [
  "removechild",
  "not a child of this node",
  "notfounderror",
] as const;
const FACEBOOK_IN_APP_BROWSER_USER_AGENT_MARKERS = [
  "fban/",
  "fbav/",
  "fb_iab",
] as const;
const FACEBOOK_DOM_PROBE_MESSAGE_PATTERN = /^[a-z_]+_and_dom:\s*[a-f0-9]{8,}$/i;
const FACEBOOK_IAB_INVALID_ACCESS_ERROR_MESSAGE =
  "the object does not support the operation or argument.";
const FACEBOOK_IN_APP_BROWSER_MESSAGE_PREFIX = "fbnav";
const CLERK_FAILED_TO_LOAD_MESSAGE_MARKER = "clerk: failed to load clerk";
const CLERK_FAILED_TO_LOAD_TIMEOUT_CODE = "failed_to_load_clerk_js_timeout";
const CLERK_REDIRECT_URL_DEPRECATION_DOC_ANCHOR =
  "clerk.com/docs/guides/custom-redirects#redirect-url-props";

type SentryStackFrameLike = {
  function?: string;
  filename?: string;
  abs_path?: string;
};

type SentryExceptionValueLike = {
  type?: string;
  value?: string;
  mechanism?: {
    type?: string;
  };
  stacktrace?: {
    frames?: SentryStackFrameLike[];
  };
  raw_stacktrace?: {
    frames?: SentryStackFrameLike[];
  };
};

type SentryBeforeSendEventLike = {
  message?: string;
  logger?: string;
  exception?: {
    values?: SentryExceptionValueLike[];
  };
  contexts?: Record<string, unknown>;
};

function isFacebookInAppBrowserUserAgent(): boolean {
  if (!isBrowser) return false;
  const userAgent = window.navigator?.userAgent?.toLowerCase() ?? "";
  return FACEBOOK_IN_APP_BROWSER_USER_AGENT_MARKERS.some((marker) =>
    userAgent.includes(marker)
  );
}

function isFacebookInAppPostMessageInvalidAccessError(
  event: SentryBeforeSendEventLike
): boolean {
  if (!isFacebookInAppBrowserUserAgent()) return false;

  const exception = event.exception?.values?.[0];
  if (!exception) return false;

  const exceptionType = exception.type?.toLowerCase() ?? "";
  const exceptionValue = exception.value?.toLowerCase() ?? "";
  const mechanismType = exception.mechanism?.type ?? "";

  if (exceptionType !== "invalidaccesserror") return false;
  if (!exceptionValue.includes(FACEBOOK_IAB_INVALID_ACCESS_ERROR_MESSAGE)) {
    return false;
  }
  if (mechanismType !== "auto.browser.global_handlers.onunhandledrejection") {
    return false;
  }

  const frames = [
    ...(exception.stacktrace?.frames ?? []),
    ...(exception.raw_stacktrace?.frames ?? []),
  ];

  const hasPostMessageFrame = frames.some((frame) =>
    (frame.function ?? "").toLowerCase().includes("postmessage")
  );
  const hasNativeCodeFrame = frames.some((frame) =>
    `${frame.filename ?? frame.abs_path ?? ""}`.toLowerCase().includes("[native code]")
  );
  const hasUserScriptFrame = frames.some((frame) =>
    `${frame.filename ?? frame.abs_path ?? ""}`.toLowerCase().includes("user-script")
  );

  const invalidAccessContext = event.contexts?.InvalidAccessError as
    | { sourceURL?: unknown }
    | undefined;
  const hasUserScriptContext =
    typeof invalidAccessContext?.sourceURL === "string" &&
    invalidAccessContext.sourceURL.toLowerCase().includes("user-script");

  return (
    (hasPostMessageFrame && hasNativeCodeFrame) ||
    hasUserScriptFrame ||
    hasUserScriptContext
  );
}

function isFacebookInAppClerkTimeoutMessage(normalizedMessage: string): boolean {
  return (
    isFacebookInAppBrowserUserAgent() &&
    normalizedMessage.includes(CLERK_FAILED_TO_LOAD_MESSAGE_MARKER) &&
    normalizedMessage.includes(CLERK_FAILED_TO_LOAD_TIMEOUT_CODE)
  );
}

function isFacebookInAppConsoleNoiseMessage(
  event: SentryBeforeSendEventLike,
  normalizedMessage: string
): boolean {
  if (!isFacebookInAppBrowserUserAgent()) return false;
  if (event.logger !== "console") return false;

  if (normalizedMessage.startsWith(FACEBOOK_IN_APP_BROWSER_MESSAGE_PREFIX)) {
    return true;
  }

  return FACEBOOK_DOM_PROBE_MESSAGE_PATTERN.test(normalizedMessage);
}

/**
 * Disable Sentry without tearing down the app.
 * (We avoid draining/closing to keep it instant; flip `enabled` instead.)
 */
export function cleanupSentry(): void {
  if (!isBrowser) return;
  const client = Sentry.getClient();
  if (client) client.getOptions().enabled = false;
  openSentryFeedback = null;
  openSentryBugReport = null;
}

/**
 * React 19 createRoot error handlers.
 * These capture uncaught, caught, and recoverable errors via Sentry.
 */
export function getReactRootErrorHandlers() {
  const sentryErrorHandler = Sentry.reactErrorHandler();
  return {
    onUncaughtError: (error: unknown, info: { componentStack?: string }) => {
      sentryErrorHandler(error, info);
    },
    onCaughtError: (error: unknown, info: { componentStack?: string }) => {
      sentryErrorHandler(error, info);
    },
    onRecoverableError: (error: unknown, info: { componentStack?: string }) => {
      sentryErrorHandler(error, info);
    },
  } as const;
}

/**
 * Initialize Sentry for the client app.
 * Call before rendering React.
 */
export function initSentry(router: unknown): void {
  const sentryEnabled = Boolean(env.VITE_SENTRY_ENABLED) && Boolean(env.VITE_SENTRY_DSN);
  if (!sentryEnabled || !isBrowser) return;

  // If already initialized, just re-enable and stop.
  const existing = Sentry.getClient();
  if (existing) {
    existing.getOptions().enabled = true;
    return;
  }

  const analyticsConsent = hasAnalyticsConsent();
  const sentryConsent = hasSentryConsent();

  const integrations: NonNullable<
    Parameters<typeof Sentry.init>[0]
  >["integrations"] = [];

  // Replays (only with analytics consent)
  if (analyticsConsent) {
    integrations.push(replayIntegration());
  }

  // Performance tracing — only if sampling > 0 AND analytics consent granted
  const configuredTracesSampleRate = Number(env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0);
  const tracesSampleRate =
    analyticsConsent && !Number.isNaN(configuredTracesSampleRate)
      ? configuredTracesSampleRate
      : 0;

  if (tracesSampleRate > 0 && router) {
    const anySentry = Sentry as unknown as Record<string, unknown>;
    const tanstack = anySentry["tanstackRouterBrowserTracingIntegration"];
    if (typeof tanstack === "function") {
      type SentryIntegrationArray = Extract<NonNullable<(typeof integrations)>, unknown[]>
      ;(integrations as SentryIntegrationArray).push(
        (tanstack as (r: unknown) => unknown)(router) as SentryIntegrationArray[number]
      );
    } else if (typeof Sentry.browserTracingIntegration === "function") {
      integrations.push(Sentry.browserTracingIntegration());
    }
  }

  // Feedback widget (only if allowed + consented)
  const feedbackEnabled = env.VITE_SENTRY_FEEDBACK_ENABLED !== false;
  if (feedbackEnabled && sentryConsent) {
    integrations.push(
      Sentry.feedbackIntegration({
        colorScheme: "system",
        enableScreenshot: true,
        autoInject: false,
        // Default text (you can still override per-open via attachTo)
        formTitle: "Send Feedback",
        messageLabel: "What happened?",
        messagePlaceholder:
          "Describe the bug or request. Steps to reproduce, expected vs. actual…",
        submitButtonLabel: "Send Feedback",
        cancelButtonLabel: "Close",
      }),
    );
  }

  // Extra context + console capture
  integrations.push(
    extraErrorDataIntegration({ depth: 5 }),
    captureConsoleIntegration({
      // Keep logs if you want Sentry breadcrumbs to mirror console activity
      levels: ["error", "warn", "log", "info", "debug"],
    }),
  );

  // Helper to aggressively sanitize events when consent is not granted
  type SentryEventLike = {
    readonly [key: string]: unknown;
    user?: unknown;
    request?: unknown;
    breadcrumbs?: unknown;
    extra?: unknown;
    contexts?: unknown;
    tags?: unknown;
    server_name?: unknown;
  };

  function sanitizeEventForNoConsent(event: SentryEventLike): SentryEventLike {
    return {
      ...event,
      user: undefined,
      request: undefined,
      breadcrumbs: undefined,
      extra: undefined,
      contexts: undefined,
      tags: undefined,
      server_name: undefined,
    };
  }

  try {
    Sentry.init({
      dsn: env.VITE_SENTRY_DSN!,
      environment: env.VITE_APP_ENVIRONMENT,
      release: env.VITE_APP_VERSION,
      integrations,
      ignoreErrors: [
        /cssrules/i,
        /cssstylesheet/i,
        /cannot access rules/i,
        /failed to read the ['"]cssrules['"] property/i,
        /securityerror/i,
        /failed to execute 'removechild' on 'node'/i,
      ],
      // Performance
      tracesSampleRate,
      replaysOnErrorSampleRate: 1.0,
      replaysSessionSampleRate: analyticsConsent ? 0.1 : 0,
      // Respect privacy consent
      beforeSend(event) {
        if (
          isFacebookInAppPostMessageInvalidAccessError(
            event as SentryBeforeSendEventLike
          )
        ) {
          return null;
        }

        // Filter out Facebook in-app browser telemetry noise
        const message = event.message || event.exception?.values?.[0]?.value;
        if (message && typeof message === "string") {
          // Facebook in-app browser telemetry noise (e.g. FBNavCLS:0, FBNavLoadEventEnd:...)
          if (message.match(/^FB[A-Z][a-zA-Z]+Event(Start|End):/)) {
            return null;
          }
          const normalizedMessage = message.toLowerCase();
          // Facebook IAB can block/timeout third-party script loading for ClerkJS.
          // Keep this scoped to IAB + explicit timeout code to avoid hiding real Clerk incidents.
          if (isFacebookInAppClerkTimeoutMessage(normalizedMessage)) {
            return null;
          }
          if (
            isFacebookInAppConsoleNoiseMessage(
              event as SentryBeforeSendEventLike,
              normalizedMessage
            )
          ) {
            return null;
          }
          // Clerk console warning noise (known deprecation emitted by ClerkJS)
          if (
            normalizedMessage.startsWith("clerk:") &&
            normalizedMessage.includes(CLERK_REDIRECT_URL_DEPRECATION_DOC_ANCHOR)
          ) {
            return null;
          }
          if (
            CSS_CROSS_ORIGIN_ERROR_MARKERS.some((marker) =>
              normalizedMessage.includes(marker)
            )
          ) {
            return null;
          }
          if (
            DOM_NODE_REMOVAL_ERROR_MARKERS.some((marker) =>
              normalizedMessage.includes(marker)
            )
          ) {
            return null;
          }
        }

        if (!hasSentryConsent()) {
          // Send a minimal, anonymous error payload (no breadcrumbs/contexts/user/request)
          const sanitized = sanitizeEventForNoConsent(event as unknown as SentryEventLike);
          return sanitized as unknown as typeof event;
        }
        return event;
      },
    });
  } catch {
    // If init fails, keep openers null and return quietly.
    openSentryFeedback = null;
    openSentryBugReport = null;
    return;
  }

  // Ensure no user identity is attached without consent
  if (!sentryConsent) {
    Sentry.setUser(null);
  }

  // Programmatic Feedback openers (client-only, after init)
  const feedback = Sentry.getFeedback?.();
  if (!feedback) {
    openSentryFeedback = null;
    openSentryBugReport = null;
    return;
  }

  // Utility to open with per-call overrides using attachTo()
  const createOpener = (
    options: Parameters<NonNullable<typeof feedback>["attachTo"]>[1],
  ) => () => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.style.display = "none";
    document.body.appendChild(btn);
    try {
      feedback.attachTo(btn, options);
      btn.click();
    } finally {
      // Clean up immediately after triggering
      btn.remove();
    }
  };

  openSentryFeedback = createOpener({
    formTitle: "Send Feedback",
    messageLabel: "What happened?",
    messagePlaceholder:
      "Describe your feedback or idea. Steps, expectations, or suggestions…",
    submitButtonLabel: "Send Feedback",
  });

  openSentryBugReport = createOpener({
    formTitle: "Report a Bug",
    messageLabel: "What is the bug?",
    messagePlaceholder:
      "Describe the bug. Include steps to reproduce, expected vs actual, and any screenshots.",
    submitButtonLabel: "Report Bug",
  });
}
