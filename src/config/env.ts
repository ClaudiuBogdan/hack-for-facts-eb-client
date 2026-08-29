import { z } from "zod";

const PUBLIC_RUNTIME_CONFIG_KEYS = [
  "NODE_ENV",
  "VITE_APP_VERSION",
  "VITE_APP_NAME",
  "VITE_APP_ENVIRONMENT",
  "VITE_API_URL",
  "VITE_API_USE_PROXY",
  "VITE_API_MODE",
  "VITE_SITE_URL",
  "VITE_POSTHOG_ENABLED",
  "VITE_POSTHOG_API_KEY",
  "VITE_POSTHOG_HOST",
  "VITE_POSTHOG_PERSON_PROFILES",
  "VITE_SENTRY_ENABLED",
  "VITE_SENTRY_DSN",
  "VITE_SENTRY_TRACES_SAMPLE_RATE",
  "VITE_SENTRY_FEEDBACK_ENABLED",
  "VITE_CLERK_PUBLISHABLE_KEY",
  "VITE_BETTER_STACK_STATUS_WIDGET_ID",
  "VITE_DISCOURSE_BASE_URL",
  "VITE_CAMPAIGN_SELF_SEND_CC_EMAILS",
] as const;

export type PublicRuntimeConfigKey =
  (typeof PUBLIC_RUNTIME_CONFIG_KEYS)[number];
export type PublicRuntimeConfig = Partial<
  Record<PublicRuntimeConfigKey, string>
>;

const envSchema = z
  .object({
    VITE_APP_VERSION: z.string().min(1),
    VITE_APP_NAME: z.string().min(1),
    VITE_APP_ENVIRONMENT: z.string().min(1),
    VITE_API_URL: z.string().url(),
    VITE_API_USE_PROXY: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
    VITE_API_MODE: z.enum(["legacy", "redesign"]).optional().default("legacy"),
    // Optional canonical site URL used for SEO metadata generation
    VITE_SITE_URL: z.string().url().optional(),

    // Environment
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .optional()
      .default("production"),

    // PostHog
    VITE_POSTHOG_ENABLED: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => val === "true"),
    VITE_POSTHOG_API_KEY: z.string().min(1).optional(),
    VITE_POSTHOG_HOST: z.string().url().optional(),
    VITE_POSTHOG_PERSON_PROFILES: z
      .enum(["identified_only", "always", "never"])
      .optional(),

    // Sentry
    VITE_SENTRY_ENABLED: z
      .enum(["true", "false"]) // must be provided explicitly to enable
      .optional()
      .transform((val) => val === "true"),
    VITE_SENTRY_DSN: z.string().min(1).optional(),
    VITE_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
    VITE_SENTRY_FEEDBACK_ENABLED: z
      .enum(["true", "false"]) // enabled unless explicitly set to false
      .optional()
      .transform((val) => val !== "false"),

    // Clerk
    VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),

    // Better Stack
    VITE_BETTER_STACK_STATUS_WIDGET_ID: z.string().min(1).optional(),

    // Discourse (Learning lesson discussion embedding)
    VITE_DISCOURSE_BASE_URL: z.string().url().optional(),

    // Campaign self-send email CC list (comma-separated)
    VITE_CAMPAIGN_SELF_SEND_CC_EMAILS: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.VITE_POSTHOG_ENABLED) {
      if (!values.VITE_POSTHOG_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["VITE_POSTHOG_API_KEY"],
          message: "Required when VITE_POSTHOG_ENABLED=true",
        });
      }
      if (!values.VITE_POSTHOG_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["VITE_POSTHOG_HOST"],
          message: "Required when VITE_POSTHOG_ENABLED=true",
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

type RuntimeEnvSource = Record<string, unknown>;

function toOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  return undefined;
}

function readProcessRuntimeConfig(): RuntimeEnvSource {
  if (typeof process === "undefined") return {};
  return process.env ?? {};
}

function readBrowserRuntimeConfig(): RuntimeEnvSource {
  if (typeof window === "undefined") return {};
  return window.__APP_RUNTIME_CONFIG__ ?? {};
}

function normalizeRuntimeValues(source: RuntimeEnvSource): RuntimeEnvSource {
  const normalized: RuntimeEnvSource = {};
  for (const key of PUBLIC_RUNTIME_CONFIG_KEYS) {
    normalized[key] = toOptionalString(source[key]);
  }

  // Allow infrastructure-level aliases for runtime-only deployments.
  normalized.VITE_APP_VERSION =
    normalized.VITE_APP_VERSION ?? toOptionalString(source.APP_VERSION);
  normalized.VITE_APP_NAME =
    normalized.VITE_APP_NAME ?? toOptionalString(source.APP_NAME);
  normalized.VITE_APP_ENVIRONMENT =
    normalized.VITE_APP_ENVIRONMENT ?? toOptionalString(source.APP_ENVIRONMENT);
  normalized.VITE_API_URL =
    normalized.VITE_API_URL ?? toOptionalString(source.API_URL);
  normalized.VITE_SITE_URL =
    normalized.VITE_SITE_URL ?? toOptionalString(source.SITE_URL);

  return normalized;
}

function getRuntimeEnvSource(): RuntimeEnvSource {
  const viteEnv = import.meta.env as unknown as RuntimeEnvSource;
  if (typeof window !== "undefined") {
    return normalizeRuntimeValues({
      ...viteEnv,
      ...readBrowserRuntimeConfig(),
    });
  }

  return normalizeRuntimeValues({
    ...viteEnv,
    ...readProcessRuntimeConfig(),
  });
}

function validateEnv(): Env {
  try {
    return envSchema.parse(getRuntimeEnvSource());
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `${issue.path.join(".")}: ${issue.message}`;
      });
      const wrappedError = new Error(
        `Environment validation failed:\n${issues.join("\n")}`,
      ) as Error & { cause: unknown };
      wrappedError.cause = error;
      throw wrappedError;
    }
    throw error;
  }
}

export const env = validateEnv();

export function getPublicRuntimeConfig(): PublicRuntimeConfig {
  const source =
    typeof window === "undefined"
      ? readProcessRuntimeConfig()
      : readBrowserRuntimeConfig();
  const normalizedValues = normalizeRuntimeValues(source);
  const runtimeConfig: PublicRuntimeConfig = {};
  for (const key of PUBLIC_RUNTIME_CONFIG_KEYS) {
    const value = normalizedValues[key];
    if (typeof value === "string") {
      runtimeConfig[key] = value;
    }
  }
  return runtimeConfig;
}

function serializeForInlineScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

const browserCryptoBootstrapScript = `(function(){if(typeof globalThis==="undefined"||!globalThis.crypto||typeof globalThis.crypto.randomUUID==="function")return;var fallback=function(){var bytes=new Uint8Array(16);if(typeof globalThis.crypto.getRandomValues==="function"){globalThis.crypto.getRandomValues(bytes);}else{for(var i=0;i<bytes.length;i+=1){bytes[i]=Math.floor(Math.random()*256);}}bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;var hex=[];for(var j=0;j<256;j+=1){hex[j]=(j+256).toString(16).slice(1);}return hex[bytes[0]]+hex[bytes[1]]+hex[bytes[2]]+hex[bytes[3]]+"-"+hex[bytes[4]]+hex[bytes[5]]+"-"+hex[bytes[6]]+hex[bytes[7]]+"-"+hex[bytes[8]]+hex[bytes[9]]+"-"+hex[bytes[10]]+hex[bytes[11]]+hex[bytes[12]]+hex[bytes[13]]+hex[bytes[14]]+hex[bytes[15]];};try{Object.defineProperty(globalThis.crypto,"randomUUID",{value:fallback,configurable:true});}catch(_){try{globalThis.crypto.randomUUID=fallback;}catch(__){}}})();`;

export function getRuntimeConfigBootstrapScript(): string {
  return `${browserCryptoBootstrapScript}\nwindow.__APP_RUNTIME_CONFIG__ = ${serializeForInlineScript(
    getPublicRuntimeConfig(),
  )};`;
}

/**
 * Returns the absolute site URL used for generating canonical URLs and OpenGraph `og:url`.
 * Falls back to the browser origin at runtime if not provided via VITE_SITE_URL.
 */
export function getSiteUrl(): string {
  if (env.VITE_SITE_URL) return env.VITE_SITE_URL;
  if (typeof window !== "undefined" && window.location?.origin)
    return window.location.origin;
  // Sensible default for build-time usage where window is not available
  return "https://transparenta.eu";
}

function getInternalApiBaseUrl(): string | undefined {
  if (typeof window !== "undefined" || typeof process === "undefined") {
    return undefined;
  }

  const value = toOptionalString(process.env?.INTERNAL_API_URL);
  if (!value) return undefined;

  const parsed = z.string().url().safeParse(value);
  if (!parsed.success) {
    throw new Error("INTERNAL_API_URL must be a valid absolute URL");
  }

  return parsed.data.replace(/\/+$/u, "");
}

/**
 * Returns the API base URL. Server rendering can use the private cluster
 * service while the browser retains the public API authority. In development,
 * opt into same-origin to allow Vite proxying and avoid browser CORS issues.
 */
export function getApiBaseUrl(): string {
  const internalApiBaseUrl = getInternalApiBaseUrl();
  if (internalApiBaseUrl) return internalApiBaseUrl;

  const devProxyTarget = toOptionalString(
    (import.meta.env as unknown as Record<string, unknown>)
      .VITE_API_PROXY_TARGET,
  );
  const hasDevProxyTarget = Boolean(devProxyTarget);
  const shouldUseDevProxy =
    import.meta.env.DEV && (env.VITE_API_USE_PROXY || hasDevProxyTarget);

  if (typeof window !== "undefined" && shouldUseDevProxy) {
    return window.location.origin;
  }

  if (typeof window === "undefined" && shouldUseDevProxy && devProxyTarget) {
    return devProxyTarget;
  }

  return env.VITE_API_URL;
}
