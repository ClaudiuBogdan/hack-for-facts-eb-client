import { z } from "zod";

const PUBLIC_RUNTIME_CONFIG_KEYS = [
  "NODE_ENV",
  "VITE_APP_VERSION",
  "VITE_APP_NAME",
  "VITE_APP_ENVIRONMENT",
  "VITE_API_URL",
  "VITE_API_USE_PROXY",
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
] as const;

export type PublicRuntimeConfigKey = (typeof PUBLIC_RUNTIME_CONFIG_KEYS)[number];
export type PublicRuntimeConfig = Partial<Record<PublicRuntimeConfigKey, string>>;

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
  VITE_SENTRY_TRACES_SAMPLE_RATE: z
    .string()
    .optional(),
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
  if (typeof value === "number" || typeof value === "boolean") return String(value);
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
      throw new Error(`Environment validation failed:\n${issues.join("\n")}`);
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

export function getRuntimeConfigBootstrapScript(): string {
  return `window.__APP_RUNTIME_CONFIG__ = ${serializeForInlineScript(
    getPublicRuntimeConfig(),
  )};`;
}

/**
 * Returns the absolute site URL used for generating canonical URLs and OpenGraph `og:url`.
 * Falls back to the browser origin at runtime if not provided via VITE_SITE_URL.
 */
export function getSiteUrl(): string {
  if (env.VITE_SITE_URL) return env.VITE_SITE_URL;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  // Sensible default for build-time usage where window is not available
  return 'https://transparenta.eu';
}

/**
 * Returns the API base URL. In development, opt into same-origin to allow Vite
 * proxying and avoid browser CORS issues when the configured API host differs.
 */
export function getApiBaseUrl(): string {
  if (import.meta.env.DEV && typeof window !== "undefined" && env.VITE_API_USE_PROXY) {
    return window.location.origin;
  }
  return env.VITE_API_URL;
}
