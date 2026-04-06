/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly PYODIDE_CDN_URL: string;
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_NAME?: string;
  readonly VITE_APP_ENVIRONMENT?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_USE_PROXY?: string;
  readonly VITE_SITE_URL?: string;
  readonly VITE_POSTHOG_ENABLED?: string;
  readonly VITE_POSTHOG_API_KEY?: string;
  readonly VITE_POSTHOG_HOST?: string;
  readonly VITE_POSTHOG_PERSON_PROFILES?: string;
  readonly VITE_SENTRY_ENABLED?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
  readonly VITE_SENTRY_FEEDBACK_ENABLED?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
  readonly VITE_BETTER_STACK_STATUS_WIDGET_ID?: string;
  readonly VITE_DISCOURSE_BASE_URL?: string;
  readonly VITE_CAMPAIGN_SELF_SEND_CC_EMAILS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace NodeJS {
  interface ProcessEnv {
    readonly PYODIDE_CDN_URL: string;
    readonly NODE_ENV?: "development" | "production" | "test";
    readonly APP_VERSION?: string;
    readonly APP_NAME?: string;
    readonly APP_ENVIRONMENT?: string;
    readonly API_URL?: string;
    readonly SITE_URL?: string;
    readonly VITE_APP_VERSION?: string;
    readonly VITE_APP_NAME?: string;
    readonly VITE_APP_ENVIRONMENT?: string;
    readonly VITE_API_URL?: string;
    readonly VITE_API_USE_PROXY?: string;
    readonly VITE_SITE_URL?: string;
    readonly VITE_POSTHOG_ENABLED?: string;
    readonly VITE_POSTHOG_API_KEY?: string;
    readonly VITE_POSTHOG_HOST?: string;
    readonly VITE_POSTHOG_PERSON_PROFILES?: string;
    readonly VITE_SENTRY_ENABLED?: string;
    readonly VITE_SENTRY_DSN?: string;
    readonly VITE_SENTRY_TRACES_SAMPLE_RATE?: string;
    readonly VITE_SENTRY_FEEDBACK_ENABLED?: string;
    readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
    readonly VITE_BETTER_STACK_STATUS_WIDGET_ID?: string;
    readonly VITE_DISCOURSE_BASE_URL?: string;
    readonly VITE_CAMPAIGN_SELF_SEND_CC_EMAILS?: string;
  }
}

interface Window {
  __APP_RUNTIME_CONFIG__?: Record<string, string | undefined>;
}
