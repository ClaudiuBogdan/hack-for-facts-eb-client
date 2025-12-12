import { z } from "zod";

const envSchema = z.object({
  VITE_APP_VERSION: z.string().min(1),
  VITE_APP_NAME: z.string().min(1),
  VITE_APP_ENVIRONMENT: z.string().min(1),
  VITE_API_URL: z.string().url(),
  // Optional canonical site URL used for SEO metadata generation
  VITE_SITE_URL: z.string().url().optional(),

  // Environment
  NODE_ENV: z
    .enum(["development", "production"])
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
    .enum(["identified_only", "always"])
    .optional(),

  // Sentry
  VITE_SENTRY_ENABLED: z
    .enum(["true", "false"]) // must be provided explicitly to enable
    .optional()
    .transform((val) => val === "true"),
  VITE_SENTRY_DSN:
    import.meta.env.VITE_APP_ENVIRONMENT === "development" &&
    import.meta.env.VITE_SENTRY_ENABLED === "true"
      ? z.string().min(1)
      : z.string().optional(),
  VITE_SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  VITE_SENTRY_FEEDBACK_ENABLED: z
    .enum(["true", "false"]) // enabled unless explicitly set to false
    .optional()
    .transform((val) => val !== "false"),

  // Clerk
  VITE_CLERK_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  try {
    return envSchema.parse({
      ...import.meta.env,
      MODE: import.meta.env.MODE,
    });
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
