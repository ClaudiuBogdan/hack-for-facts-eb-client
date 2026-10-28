import type * as SentryNamespace from "@sentry/react";
import { env } from "@/config/env";
import { quietImport } from "@/lib/quiet-chunk-load";
import { hasSentryConsent } from "@/lib/consent";
import { sanitizeJusticeTelemetryValue } from "@/lib/privacy/sensitive-route-sanitizer";

/**
 * Sentry, loaded when it is first needed. The SDK and its setup live in
 * `sentry-sdk.ts`, a chunk of its own: this module only queues calls for it.
 *
 * - `initSentry` starts the load and initialises the SDK when it arrives. Its
 *   callers decide when, as before: the app shell once the visitor consents,
 *   the global error page always.
 * - A call made while the SDK loads (`withSentry`, the React root handlers,
 *   `cleanupSentry`) waits, and runs in order once `initSentry` has, so an
 *   error raised in that window is still reported; so does an uncaught error
 *   or rejection, which Sentry's own handlers only catch after `init`.
 * - A call made before any `initSentry` finds no client, as calling the SDK
 *   before `Sentry.init` always did: it is dropped, and nothing is loaded.
 * - The SDK loads quietly (`quietImport`): if its chunk fails, telemetry is
 *   lost, but the page is not reloaded for it.
 */

type SentrySdk = typeof import("./sentry-sdk");
export type SentryApi = typeof SentryNamespace;
type SentryTask = (sdk: SentrySdk) => void;
/** A lifecycle task (init, cleanup, a feedback click) is never dropped; a report may be. */
type SentryTaskKind = "lifecycle" | "report";

/**
 * Public handles to open customized Sentry Feedback dialogs programmatically.
 * These are set only after Sentry.init + feedbackIntegration are active on the client,
 * or, while the SDK loads for an init that will enable Feedback, open it once it has.
 */
export let openSentryFeedback: (() => void) | null = null;
export let openSentryBugReport: (() => void) | null = null;

const isBrowser = typeof window !== "undefined";
/** Reports kept while the SDK loads; past this, newer ones are dropped. */
const MAX_PENDING_REPORTS = 100;

let loadedSdk: SentrySdk | null = null;
let sdkLoad: Promise<void> | null = null;
let pendingTasks: SentryTask[] = [];
let pendingReports = 0;

function runTask(sdk: SentrySdk, task: SentryTask): void {
  try {
    task(sdk);
  } catch {
    // Keep the app unaffected if a Sentry call throws.
  }
}

/**
 * Uncaught errors and rejections while the SDK loads. Sentry's own global
 * handlers start with `Sentry.init`; until then these listeners keep what
 * they would have caught, and leave once the SDK has arrived.
 */
function queueGlobalError(event: ErrorEvent): void {
  const error: unknown = event.error ?? event.message;
  whenSdkLoaded((sdk) => {
    sdk.Sentry.captureException(error, {
      mechanism: { type: "auto.browser.global_handlers.onerror", handled: false },
    });
  });
}

function queueUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason: unknown = event.reason;
  whenSdkLoaded((sdk) => {
    sdk.Sentry.captureException(reason, {
      mechanism: { type: "auto.browser.global_handlers.onunhandledrejection", handled: false },
    });
  });
}

function listenForGlobalErrors(listen: boolean): void {
  if (listen) {
    window.addEventListener("error", queueGlobalError);
    window.addEventListener("unhandledrejection", queueUnhandledRejection);
  } else {
    window.removeEventListener("error", queueGlobalError);
    window.removeEventListener("unhandledrejection", queueUnhandledRejection);
  }
}

function loadSdk(): void {
  if (loadedSdk || sdkLoad) return;
  listenForGlobalErrors(true);
  sdkLoad = quietImport(() => import("./sentry-sdk")).then(
    (sdk) => {
      listenForGlobalErrors(false);
      loadedSdk = sdk;
      const tasks = pendingTasks;
      pendingTasks = [];
      pendingReports = 0;
      for (const task of tasks) runTask(sdk, task);
    },
    () => {
      // The chunk did not load (offline, or a deploy removed it): drop what
      // waited for it; the next `initSentry` tries again.
      listenForGlobalErrors(false);
      pendingTasks = [];
      pendingReports = 0;
      sdkLoad = null;
      openSentryFeedback = null;
      openSentryBugReport = null;
    },
  );
}

function whenSdkLoaded(task: SentryTask, kind: SentryTaskKind = "report"): void {
  if (loadedSdk) {
    runTask(loadedSdk, task);
    return;
  }
  if (!sdkLoad) return;
  if (kind === "report") {
    if (pendingReports >= MAX_PENDING_REPORTS) return;
    pendingReports += 1;
  }
  pendingTasks.push(task);
}

function syncFeedbackOpeners(sdk: SentrySdk): void {
  openSentryFeedback = sdk.openSentryFeedback;
  openSentryBugReport = sdk.openSentryBugReport;
}

/**
 * Initialize Sentry for the client app: loads the SDK, then runs its setup
 * (`sentry-sdk.ts`). A no-op on the server and when Sentry is not configured.
 */
export function initSentry(router: unknown): void {
  if (!isBrowser) return;
  if (!env.VITE_SENTRY_ENABLED || !env.VITE_SENTRY_DSN) return;
  loadSdk();
  // The setup enables Feedback under these same conditions (`sentry-sdk.ts`);
  // a click on it while the SDK loads opens it once it is up.
  if (!loadedSdk && env.VITE_SENTRY_FEEDBACK_ENABLED !== false && hasSentryConsent()) {
    openSentryFeedback ??= () => whenSdkLoaded((sdk) => sdk.openSentryFeedback?.(), "lifecycle");
    openSentryBugReport ??= () => whenSdkLoaded((sdk) => sdk.openSentryBugReport?.(), "lifecycle");
  }
  whenSdkLoaded((sdk) => {
    sdk.initSentry(router);
    syncFeedbackOpeners(sdk);
  }, "lifecycle");
}

/**
 * Disable Sentry without tearing down the app.
 * (We avoid draining/closing to keep it instant; flip `enabled` instead.)
 */
export function cleanupSentry(): void {
  if (!isBrowser) return;
  openSentryFeedback = null;
  openSentryBugReport = null;
  whenSdkLoaded((sdk) => {
    sdk.cleanupSentry();
    syncFeedbackOpeners(sdk);
  }, "lifecycle");
}

/**
 * Runs `report` with the Sentry SDK: now when it is loaded, once it is when
 * `initSentry` has started loading it, and not at all before that.
 */
export function withSentry(report: (sentry: SentryApi) => void): void {
  whenSdkLoaded((sdk) => report(sdk.Sentry));
}

/**
 * React 19 createRoot error handlers.
 * These capture uncaught, caught, and recoverable errors via Sentry.
 */
export function getReactRootErrorHandlers() {
  const report = (error: unknown, info: { componentStack?: string }) => {
    withSentry((Sentry) => {
      Sentry.reactErrorHandler()(error, info);
    });
  };
  return {
    onUncaughtError: report,
    onCaughtError: report,
    onRecoverableError: report,
  } as const;
}

export type SentryTelemetryEventLike = {
  readonly [key: string]: unknown;
  user?: unknown;
  request?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
  contexts?: unknown;
  tags?: unknown;
  server_name?: unknown;
};

export function sanitizeSentryEventPayload<T extends SentryTelemetryEventLike>(
  event: T
): T {
  return sanitizeJusticeTelemetryValue(event);
}

/** A justice route anywhere in a performance event: its name, its URL, its spans' attributes. */
const JUSTICE_ROUTE_IN_EVENT = /\/(?:justice|justitie)(?=[/"?#\s]|$)/;

/**
 * A performance transaction as it leaves. One that touches a justice page is
 * dropped whole: the router's spans carry its route params — a case page's
 * splat is the case number — under keys the URL sanitizer does not read.
 * Any other is scrubbed like an error event.
 */
export function sanitizeSentryTransaction<T extends SentryTelemetryEventLike>(event: T): T | null {
  if (JUSTICE_ROUTE_IN_EVENT.test(JSON.stringify(event))) return null;
  return sanitizeSentryEventPayload(event);
}
