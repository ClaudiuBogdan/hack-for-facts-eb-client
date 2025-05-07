import { z } from "zod";

const envSchema = z.object({
  VITE_APP_VERSION: z.string().min(1),
  VITE_APP_NAME: z.string().min(1),
  VITE_APP_ENVIRONMENT: z.string().min(1),

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
