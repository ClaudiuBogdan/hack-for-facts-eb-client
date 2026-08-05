import * as Sentry from "@sentry/react";
import { env } from "@/config/env";

type Primitive = string | number | boolean | null | undefined
type ExtraInfo = Record<string, unknown> | Primitive

enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

const LOG_LEVEL_BY_NAME = {
  verbose: LogLevel.VERBOSE,
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
} as const;

type LogLevelName = keyof typeof LOG_LEVEL_BY_NAME;

/** Sentry severities that correspond to each logger level. */
const SENTRY_SEVERITY_BY_LEVEL = {
  verbose: "debug",
  debug: "debug",
  info: "info",
  warn: "warning",
  error: "error",
} as const;

type LogBody = { message: string; extraInfo?: ExtraInfo };
type LogAttributes = { context: string; message: string };

const readEnvString = (key: string): string | undefined => {
  const fromVite = (import.meta.env as unknown as Record<string, unknown>)[key];
  if (typeof fromVite === "string" && fromVite.trim() !== "") return fromVite;

  if (typeof process !== "undefined") {
    const fromProcess = process.env?.[key];
    if (typeof fromProcess === "string" && fromProcess.trim() !== "") {
      return fromProcess;
    }
  }

  return undefined;
};

const parseLogLevel = (value: string | undefined): LogLevel | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  return (LOG_LEVEL_BY_NAME as Record<string, LogLevel | undefined>)[normalized];
};

/**
 * `import.meta.env.DEV` covers `vite dev` (client and SSR); the runtime env vars
 * cover deployed builds that are still flagged as a development environment.
 */
const isDevelopmentBuild =
  import.meta.env.DEV === true ||
  env.VITE_APP_ENVIRONMENT === "development" ||
  env.NODE_ENV === "development";

/** Only a development runtime writes to the console. */
const isDevelopmentRuntime = env.VITE_APP_ENVIRONMENT === "development";

/**
 * Resolved once, at module load: an explicit `VITE_LOG_LEVEL` wins, otherwise
 * development defaults to `debug` and everything else to `info`.
 */
const logLevel =
  parseLogLevel(readEnvString("VITE_LOG_LEVEL")) ??
  (isDevelopmentBuild ? LogLevel.DEBUG : LogLevel.INFO);

const extractError = (extraInfo?: ExtraInfo): Error | undefined => {
  if (!extraInfo || typeof extraInfo !== "object") return undefined;
  const candidate = (extraInfo as Record<string, unknown>).error;
  return candidate instanceof Error ? candidate : undefined;
};

/**
 * Forwards a log to Sentry when a client is initialised. `warn`/`error` become
 * Sentry events (an exception when the caller passed one, otherwise a message);
 * lower levels only leave a breadcrumb so they add context without cost.
 *
 * `Sentry.getClient()` is undefined during SSR, before `initSentry` runs, and
 * whenever Sentry is disabled by env — so this is a no-op there rather than a
 * queued event, which keeps the logger free of init-order coupling.
 */
const emitToSentry = (
  level: LogLevelName,
  body: LogBody,
  attributes: LogAttributes,
) => {
  try {
    if (!Sentry.getClient()) return;

    const severity = SENTRY_SEVERITY_BY_LEVEL[level];

    if (level !== "warn" && level !== "error") {
      Sentry.addBreadcrumb({
        category: "logger",
        level: severity,
        message: body.message,
        data: { context: attributes.context, details: body.extraInfo },
      });
      return;
    }

    const captureContext = {
      level: severity,
      tags: { logger_context: attributes.context },
      extra: { details: body.extraInfo },
    };

    const error = extractError(body.extraInfo);
    if (error) {
      Sentry.captureException(error, captureContext);
      return;
    }

    Sentry.captureMessage(body.message, captureContext);
  } catch {
    // Reporting must never break the code that is doing the logging.
  }
};

const emitLog = (
  level: LogLevelName,
  body: LogBody,
  attributes: LogAttributes,
) => {
  if (isDevelopmentRuntime) {
    console.log(level, body, attributes);
  }
  emitToSentry(level, body, attributes);
};

/**
 * A simple logger interface that writes to the console in development and
 * reports to Sentry everywhere else. The threshold is read once from
 * `VITE_LOG_LEVEL` (`verbose` | `debug` | `info` | `warn` | `error`), defaulting
 * to `debug` in development and `info` in production. `error` is never gated.
 *
 * Consent is deliberately not checked here: `initSentry` centralises it in
 * `beforeSend`, which downgrades events to an anonymous payload when the user
 * has not opted in. Gating at the call site would diverge from every other
 * `Sentry.captureException` in the app.
 */
export const createLogger = (args: { context: string } | string) => {
  const extraArgs = typeof args === "string" ? { context: args } : args;

  const getAttributes = (attrs: { message: string }): LogAttributes => {
    return {
      ...extraArgs,
      ...attrs,
    };
  };

  return {
    verbose(message: string, extraInfo?: ExtraInfo) {
      if (LogLevel.VERBOSE < logLevel) return;
      const attributes = getAttributes({
        message,
      });
      emitLog("verbose", { message, extraInfo }, attributes);
    },
    debug(message: string, extraInfo?: ExtraInfo) {
      if (LogLevel.DEBUG < logLevel) return;
      const attributes = getAttributes({
        message,
      });
      const body = {
        message,
        extraInfo,
      };
      emitLog("debug", body, attributes);
    },
    info(message: string, extraInfo?: ExtraInfo) {
      if (LogLevel.INFO < logLevel) return;
      const attributes = getAttributes({
        message,
      });
      const body = {
        message,
        extraInfo,
      };
      emitLog("info", body, attributes);
    },
    warn(message: string, extraInfo?: ExtraInfo) {
      if (LogLevel.WARN < logLevel) return;
      const attributes = getAttributes({
        message,
      });
      const body = {
        message,
        extraInfo,
      };
      emitLog("warn", body, attributes);
    },
    error(message: string, extraInfo?: ExtraInfo) {
      const attributes = getAttributes({
        message,
      });
      const body = {
        message,
        extraInfo,
      };
      emitLog("error", body, attributes);
    },
  };
};

export const logger = createLogger({ context: "Logger" });
