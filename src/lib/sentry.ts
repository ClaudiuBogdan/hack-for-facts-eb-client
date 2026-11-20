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
 * A procurement or company page anywhere in a performance event (TEL-001, D6):
 * the router's spans carry its `cui` param as a bare value no URL scrub reads.
 * The company list's own `/companies/search` and `/companies/analytics` are not
 * party pages.
 */
const PARTY_ROUTE_IN_EVENT = /(?:\/|%2F)(?:procurement(?=[/"?#\s%]|$)|companies(?:\/|%2F)(?!(?:search|analytics)(?=[/"?#\s%]|$)))/iu;

/** Keys a performance event's route is not read from: the SDK's own circular metadata, and earlier pages' breadcrumbs. */
const NOT_THE_ROUTE = new Set(["sdkProcessingMetadata", "breadcrumbs"]);

/**
 * Whether any string in a value, at any depth, matches. Cycle-safe and never
 * throwing: SDK metadata can be circular, and a throw here would have the SDK
 * send its own internal error — raw URL and all — past every hook. A value that
 * cannot be read in full counts as matching: it is dropped, never sent unread.
 */
export function anyStringMatches(value: unknown, pattern: RegExp, skip: ReadonlySet<string> = new Set()): boolean {
  try {
    const seen = new WeakSet<object>();
    const stack: unknown[] = [value];
    let visited = 0;
    while (stack.length > 0) {
      const item = stack.pop();
      if ((visited += 1) > 50_000) return true;
      if (typeof item === "string") {
        if (pattern.test(item)) return true;
        continue;
      }
      if (!item || typeof item !== "object" || seen.has(item)) continue;
      seen.add(item);
      // What the serializer will send: a URL's address, an object's own `toJSON()`.
      if (item instanceof URL) {
        stack.push(item.href);
        continue;
      }
      const toJSON = (item as { toJSON?: unknown }).toJSON;
      if (typeof toJSON === "function") {
        stack.push((toJSON as () => unknown).call(item));
        continue;
      }
      for (const [key, child] of Object.entries(item)) {
        if (skip.has(key)) continue;
        if (pattern.test(key)) return true;
        stack.push(child);
      }
    }
    return false;
  } catch {
    return true;
  }
}

/** Whether a performance event or span touches a justice page, or a procurement or company page (TEL-001). */
export function touchesSensitiveRoute(event: unknown): boolean {
  // Justice as before TEL-001: any mention, breadcrumbs included. A party page by the event's own route.
  return anyStringMatches(event, JUSTICE_ROUTE_IN_EVENT, SDK_METADATA) || anyStringMatches(event, PARTY_ROUTE_IN_EVENT, NOT_THE_ROUTE);
}

const SDK_METADATA = new Set(["sdkProcessingMetadata"]);

/**
 * A performance transaction as it leaves. One that touches a justice page, or
 * a procurement or company page (TEL-001), is dropped whole: the router's spans
 * carry its route params — a case page's splat is the case number, a party
 * page's `cui` its code — under keys the URL sanitizer does not read. Any other
 * is scrubbed like an error event.
 */
export function sanitizeSentryTransaction<T extends SentryTelemetryEventLike>(event: T): T | null {
  if (touchesSensitiveRoute(event)) return null;
  return sanitizeSentryEventPayload(event);
}

type EnvelopeItem = readonly [Record<string, unknown>, unknown];
type Envelope = readonly [Record<string, unknown>, readonly EnvelopeItem[]];

/**
 * An envelope as it is about to be sent (TEL-001): the one point every Sentry
 * payload passes — events, the SDK's internal errors, standalone spans,
 * feedback, client reports — whatever was added after the event hooks. Each
 * item is read as the serializer will write it (`toJSON`, URLs) and scrubbed;
 * a transaction or span that touches a sensitive page is dropped; an item that
 * cannot be read is dropped; of the binary items only an image attachment (a
 * feedback screenshot the reader chose to attach, accepted P3) is kept.
 */
export function scrubEnvelope(envelope: Envelope): Envelope {
  const [headers, items] = envelope;
  const kept: EnvelopeItem[] = [];
  for (const [itemHeaders, payload] of items) {
    if (typeof payload === "string" || payload instanceof Uint8Array) {
      const image = itemHeaders.type === "attachment" && typeof itemHeaders.content_type === "string" && itemHeaders.content_type.startsWith("image/");
      if (image) kept.push([itemHeaders, payload]);
      continue;
    }
    try {
      const plain: unknown = JSON.parse(JSON.stringify(payload));
      if ((itemHeaders.type === "transaction" || itemHeaders.type === "span") && touchesSensitiveRoute(plain)) continue;
      kept.push([sanitizeJusticeTelemetryValue(itemHeaders), sanitizeJusticeTelemetryValue(plain)]);
    } catch {
      // Not readable as JSON: not sent.
    }
  }
  let scrubbedHeaders: Record<string, unknown> = {};
  try {
    scrubbedHeaders = sanitizeJusticeTelemetryValue(JSON.parse(JSON.stringify(headers)) as Record<string, unknown>);
  } catch {
    // The headers the transport needs are rebuilt from nothing: a DSN-less envelope is refused, which fails closed.
  }
  return [scrubbedHeaders, kept];
}

type TransportLike = { send: (envelope: never) => PromiseLike<unknown>; flush: (timeout?: number) => PromiseLike<boolean> };

/** The SDK's transport, every envelope scrubbed before it is sent (`scrubEnvelope`). */
export function scrubbingTransport<T extends TransportLike>(transport: T): T {
  return { ...transport, send: (envelope: never) => transport.send(scrubEnvelope(envelope as unknown as Envelope) as never) };
}

/** The fields of an event that can carry an address or a party code, of every event type the SDK prepares. */
const SCRUBBED_EVENT_FIELDS = ["message", "exception", "request", "breadcrumbs", "extra", "contexts", "tags", "transaction", "spans", "urls", "logentry", "user"] as const;

/**
 * Every event the SDK prepares — errors, its own internal errors, transactions,
 * feedback, replay events — scrubbed in place before any hook or transport
 * sees it (the client's `preprocessEvent`; TEL-001). If scrubbing fails, the
 * fields that could carry an address are dropped: fail closed, never sent raw.
 */
export function scrubSentryEventInPlace(event: Record<string, unknown>): void {
  try {
    for (const field of SCRUBBED_EVENT_FIELDS) {
      // A code named in text („X SRL (CUI 14837428)") too: the shared string rules (TEL-001).
      if (field in event && event[field] !== undefined) event[field] = sanitizeJusticeTelemetryValue(event[field]);
    }
  } catch {
    for (const field of SCRUBBED_EVENT_FIELDS) {
      try {
        delete event[field];
      } catch {
        // A field that cannot be removed (a frozen event): the others still go.
      }
    }
    try {
      event.message = "[telemetry scrub failed]";
    } catch {
      // As above.
    }
  }
}

/** A breadcrumb as it is recorded (`beforeBreadcrumb`), scrubbed like an event; one that cannot be scrubbed is not kept. */
export function scrubSentryBreadcrumb<T>(breadcrumb: T): T | null {
  try {
    return sanitizeJusticeTelemetryValue(breadcrumb);
  } catch {
    return null;
  }
}
