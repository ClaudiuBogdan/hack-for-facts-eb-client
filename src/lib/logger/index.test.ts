import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sentryMocks = vi.hoisted(() => ({
  getClient: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock("@sentry/react", () => sentryMocks);

type LoggerModule = typeof import("./index");

type LoadLoggerOptions = {
  /** Value of `VITE_APP_ENVIRONMENT`; `development` is the console runtime. */
  readonly appEnvironment?: string;
  /** Explicit `VITE_LOG_LEVEL` override. */
  readonly logLevel?: string;
  /** Simulates `vite dev` (`true`) versus a production build (`false`). */
  readonly dev?: boolean;
};

/**
 * The threshold is resolved once at module load, so every scenario re-imports
 * the module with a fresh env.
 */
const loadLogger = async ({
  appEnvironment = "development",
  logLevel,
  dev = true,
}: LoadLoggerOptions = {}): Promise<LoggerModule> => {
  vi.resetModules();
  vi.stubEnv("DEV", dev);
  vi.stubEnv("PROD", !dev);
  vi.stubEnv("VITE_LOG_LEVEL", logLevel ?? "");
  vi.doMock("@/config/env", () => ({
    env: {
      VITE_APP_ENVIRONMENT: appEnvironment,
      NODE_ENV: dev ? "development" : "production",
    },
    getSiteUrl: () => "http://localhost:3000",
  }));

  return import("./index");
};

describe("createLogger level gating", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    sentryMocks.getClient.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/config/env");
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("defaults to debug in development: debug reaches the sink, verbose does not", async () => {
    const { createLogger } = await loadLogger();
    const log = createLogger("test");

    log.verbose("verbose message");
    expect(consoleSpy).not.toHaveBeenCalled();

    log.debug("debug message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      "debug",
      { message: "debug message", extraInfo: undefined },
      { context: "test", message: "debug message" },
    );
  });

  it("still defaults to debug for a production build flagged as a development environment", async () => {
    const { createLogger } = await loadLogger({
      appEnvironment: "development",
      dev: false,
    });
    const log = createLogger("test");

    log.verbose("verbose message");
    expect(consoleSpy).not.toHaveBeenCalled();

    log.debug("debug message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("honours an explicit VITE_LOG_LEVEL above the default", async () => {
    const { createLogger } = await loadLogger({ logLevel: "warn" });
    const log = createLogger("test");

    log.debug("debug message");
    log.info("info message");
    expect(consoleSpy).not.toHaveBeenCalled();

    log.warn("warn message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("honours an explicit VITE_LOG_LEVEL below the default", async () => {
    const { createLogger } = await loadLogger({
      logLevel: "verbose",
      dev: false,
    });
    const log = createLogger("test");

    log.verbose("verbose message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("falls back to the default when VITE_LOG_LEVEL is not a known level", async () => {
    const { createLogger } = await loadLogger({ logLevel: "not-a-level" });
    const log = createLogger("test");

    log.verbose("verbose message");
    expect(consoleSpy).not.toHaveBeenCalled();

    log.debug("debug message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });

  it("never gates error, whatever the threshold", async () => {
    const { createLogger } = await loadLogger({ logLevel: "error" });
    const log = createLogger("test");

    log.warn("warn message");
    expect(consoleSpy).not.toHaveBeenCalled();

    log.error("error message");
    expect(consoleSpy).toHaveBeenCalledTimes(1);
  });
});

describe("createLogger production sink", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    sentryMocks.getClient.mockReturnValue({});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.doUnmock("@/config/env");
    vi.resetModules();
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  const loadProductionLogger = () =>
    loadLogger({ appEnvironment: "production", dev: false });

  it("reports an error-level log to Sentry as an exception when one is supplied", async () => {
    const { createLogger } = await loadProductionLogger();
    const log = createLogger("graphql-client");
    const cause = new Error("boom");

    log.error("GraphQL transport error", { error: cause, label: "entities" });

    expect(sentryMocks.captureException).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureException).toHaveBeenCalledWith(cause, {
      level: "error",
      tags: { logger_context: "graphql-client" },
      extra: { details: { error: cause, label: "entities" } },
    });
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it("reports an error-level log without an Error as a Sentry message", async () => {
    const { createLogger } = await loadProductionLogger();
    const log = createLogger("graphql-client");

    log.error("GraphQL HTTP error", { status: 500 });

    expect(sentryMocks.captureMessage).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureMessage).toHaveBeenCalledWith("GraphQL HTTP error", {
      level: "error",
      tags: { logger_context: "graphql-client" },
      extra: { details: { status: 500 } },
    });
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it("reports a warn-level log to Sentry with warning severity", async () => {
    const { createLogger } = await loadProductionLogger();
    const log = createLogger("data-discovery-api");

    log.warn("Received null response");

    expect(sentryMocks.captureMessage).toHaveBeenCalledWith(
      "Received null response",
      expect.objectContaining({ level: "warning" }),
    );
  });

  it("leaves a breadcrumb instead of an event for levels below warn", async () => {
    const { createLogger } = await loadProductionLogger();
    const log = createLogger("data-discovery-api");

    log.info("Fetching entities");

    expect(sentryMocks.addBreadcrumb).toHaveBeenCalledTimes(1);
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it("does not reach the Sentry sink for a level below the threshold", async () => {
    const { createLogger } = await loadProductionLogger();
    const log = createLogger("data-discovery-api");

    log.verbose("verbose message");
    log.debug("debug message");

    expect(sentryMocks.addBreadcrumb).not.toHaveBeenCalled();
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
    expect(sentryMocks.captureException).not.toHaveBeenCalled();
  });

  it("stays silent when no Sentry client is initialised", async () => {
    sentryMocks.getClient.mockReturnValue(undefined);
    const { createLogger } = await loadProductionLogger();
    const log = createLogger("ssr");

    log.error("error during SSR");

    expect(sentryMocks.captureException).not.toHaveBeenCalled();
    expect(sentryMocks.captureMessage).not.toHaveBeenCalled();
    expect(console.log).not.toHaveBeenCalled();
  });

  it("never lets a Sentry failure escape into the caller", async () => {
    sentryMocks.captureMessage.mockImplementationOnce(() => {
      throw new Error("sentry is down");
    });
    const { createLogger } = await loadProductionLogger();
    const log = createLogger("resilience");

    expect(() => log.error("still fine")).not.toThrow();
  });
});
