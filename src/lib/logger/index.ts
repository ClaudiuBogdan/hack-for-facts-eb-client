interface ExtraInfo {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

enum LogLevel {
  VERBOSE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

const logLevel = LogLevel.INFO;

const emitLog = (level: string, body: unknown, extraInfo?: ExtraInfo) => {
  console.log(level, body, extraInfo);
};

/**
 * A simple logger interface that writes to the console and emits logs via OpenTelemetry.
 */
export const createLogger = (args: { context: string } | string) => {
  const extraArgs = typeof args === "string" ? { context: args } : args;

  const getAttributes = (attrs: { message: string }) => {
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
